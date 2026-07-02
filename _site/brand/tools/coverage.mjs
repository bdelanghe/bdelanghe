#!/usr/bin/env node
// Design-system coverage — one tool, four checks. Zero deps (Node only).
//
//   1. Usage gate        raw hex/px/font values that bypass the tokens   (fails --check)
//   2. Unused-token audit tokens defined but referenced nowhere
//   3. Component matrix   which recipes/assets each surface actually uses
//   4. Hybrid sync        a Claude Design comp's colors → do they map to tokens?
//
// The design system (tokens + recipes) lives here; surfaces consume it via the
// brand submodule, so any surface can run:  node brand/tools/coverage.mjs <its dir>
//
// Usage:
//   node tools/coverage.mjs [--check] [--json] [--comp <file>] [surfaceDir ...]
//   --check   exit non-zero if any surface has usage-gate violations (CI gate)
//   --comp    a Claude Design export (html) to check colors against tokens (hybrid)
//   surfaceDir  one or more dirs to scan (default: this repo's css/ + design/)
import { readFile, readdir } from "node:fs/promises";
import { join, relative, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const brandRoot = join(here, "..");
const args = process.argv.slice(2);
const CHECK = args.includes("--check");
const COLORS = args.includes("--colors"); // gate only raw colours (layout px is allowed to be literal)
const JSON_OUT = args.includes("--json");
const compIdx = args.indexOf("--comp");
const compFile = compIdx !== -1 ? args[compIdx + 1] : null;
const surfaceArgs = args.filter((a, i) => !a.startsWith("--") && i !== compIdx + 1);

// ---- the contract: parse the generated tokens.css (authoritative var→value) ----
const tokensCssPath = join(brandRoot, "tokens", "tokens.css");
const tokensCss = await readFile(tokensCssPath, "utf8");
const cssVarToValue = new Map(); // --bs-color-forest → #0c5a42
for (const m of tokensCss.matchAll(/(--bs-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
  cssVarToValue.set(m[1], m[2].trim());
}
const valueToVar = new Map(); // normalized value → --bs-* (reverse lookup)
for (const [v, val] of cssVarToValue) {
  const norm = val.toLowerCase().replace(/\s+/g, " ").trim();
  if (!valueToVar.has(norm)) valueToVar.set(norm, v);
  if (/^#[0-9a-f]+$/i.test(norm)) valueToVar.set(norm, v); // hex wins
}
const tokenHexes = new Set([...cssVarToValue.values()].filter((v) => /^#[0-9a-f]{3,8}$/i.test(v.trim())).map((v) => v.toLowerCase().trim()));
const recipeClasses = [...tokensCss.matchAll(/^\.(bs-[a-z0-9-]+)\s*\{/gm)].map((m) => m[1]);

// ---- component inventory: recipes (from tokens.css) + visual assets -------------
const COMPONENTS = [
  ...recipeClasses.map((c) => ({ name: c, test: (t) => new RegExp(`\\b${c}\\b`).test(t) })),
  { name: "mark", test: (t) => /mark[-/]/.test(t) || /\bmark\b/.test(t) },
  { name: "lockup", test: (t) => /lockup/.test(t) },
  { name: "avatar", test: (t) => /avatar/.test(t) },
  { name: "card (surface)", test: (t) => /\b(bs-card|\.card\b|class="[^"]*\bcard\b)/.test(t) },
];

// ---- scan helpers --------------------------------------------------------------
const SKIP_FILES = new Set(["tokens.css", "tokens.json"]); // these DEFINE values
async function filesUnder(dir) {
  const out = [];
  async function walk(d) {
    let ents;
    try { ents = await readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      // skip vcs/build + the vendored `brand/` submodule (it's measured on its own)
      if ([".git", "node_modules", "dist", "brand"].includes(e.name)) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (/\.(css|html|svg)$/.test(e.name) && !SKIP_FILES.has(e.name)) out.push(p);
    }
  }
  await walk(dir);
  return out;
}

const HEX = /(?<!&)#[0-9a-fA-F]{3,8}\b/g; // (?<!&) skips HTML entities like &#8599;
const PX = /(?<![\w-])\d+(?:\.\d+)?px\b/g;
const VAR = /var\(\s*(--bs-[a-z0-9-]+)\s*\)/g;

function stripVarValues(line) {
  // don't count the var(--x) name itself as a raw value; and HTML meta attribute
  // values (e.g. <meta name="theme-color" content="#0C5A42">) can't use var() —
  // they're config, not styling, so don't flag them as hardcoded.
  return line.replace(VAR, "").replace(/content="[^"]*"/g, "");
}

async function scanSurface(dir) {
  const files = await filesUnder(dir);
  const violations = [];
  const localTokens = []; // custom-property DEFINITIONS — a token layer, not a bypass
  const usedVars = new Set();
  let varHits = 0;
  let text = "";
  for (const f of files) {
    const src = await readFile(f, "utf8");
    text += "\n" + src;
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      for (const m of raw.matchAll(VAR)) { usedVars.add(m[1]); varHits++; }
      const noVars = stripVarValues(raw);
      // SVGs legitimately carry hex fills; gate CSS/HTML styling only.
      const isSvg = f.endsWith(".svg");
      // A custom-property definition (`--x: #hex`) is a local token layer, not a raw
      // bypass — record it (aliasable if it equals a brand token) instead of flagging.
      const isDef = /^\s*--[\w-]+\s*:/.test(raw);
      for (const m of noVars.matchAll(HEX)) {
        if (isSvg) continue;
        const hex = m[0].toLowerCase();
        if (isDef) { localTokens.push({ value: m[0], aliasable: valueToVar.get(hex) || null }); continue; }
        violations.push({ file: relative(process.cwd(), f), line: i + 1, value: m[0], suggest: valueToVar.get(hex) || (tokenHexes.has(hex) ? null : "(not in palette)") });
      }
      if (!isSvg) {
        for (const m of noVars.matchAll(PX)) {
          const tok = valueToVar.get(m[0].toLowerCase());
          if (isDef) { if (tok) localTokens.push({ value: m[0], aliasable: tok }); continue; }
          if (tok) violations.push({ file: relative(process.cwd(), f), line: i + 1, value: m[0], suggest: tok });
        }
      }
    }
  }
  const total = varHits + violations.length;
  const coverage = total === 0 ? 100 : Math.round((varHits / total) * 100);
  const components = COMPONENTS.filter((c) => c.test(text)).map((c) => c.name);
  return { dir, files: files.length, coverage, varHits, violations, localTokens, usedVars, components };
}

// ---- run -----------------------------------------------------------------------
const surfaceDirs = surfaceArgs.length ? surfaceArgs : [join(brandRoot, "css"), join(brandRoot, "design")];
const results = [];
for (const d of surfaceDirs) results.push(await scanSurface(d));

// unused-token audit (across ALL scanned surfaces)
const allUsed = new Set();
for (const r of results) for (const v of r.usedVars) allUsed.add(v);
const unused = [...cssVarToValue.keys()].filter((v) => !allUsed.has(v));

// hybrid: a Claude Design comp's colors vs tokens
let hybrid = null;
if (compFile) {
  const src = await readFile(compFile, "utf8");
  const hexes = [...new Set([...src.matchAll(HEX)].map((m) => m[0].toLowerCase()))];
  hybrid = hexes.map((h) => ({ color: h, token: valueToVar.get(h) || null, inPalette: tokenHexes.has(h) }));
}

if (JSON_OUT) {
  console.log(JSON.stringify({ results: results.map(({ usedVars, ...r }) => ({ ...r, usedVars: [...usedVars] })), unused, hybrid }, null, 2));
} else {
  const bar = (p) => "█".repeat(Math.round(p / 10)) + "░".repeat(10 - Math.round(p / 10));
  console.log("\n  DESIGN-SYSTEM COVERAGE\n  " + "─".repeat(48));
  console.log(`  ${cssVarToValue.size} tokens · ${recipeClasses.length} type recipes\n`);

  console.log("  1. USAGE GATE — token coverage per surface");
  for (const r of results) {
    const aliasable = r.localTokens.filter((t) => t.aliasable).length;
    const local = r.localTokens.length ? `, ${r.localTokens.length} local token${r.localTokens.length > 1 ? "s" : ""}${aliasable ? ` (${aliasable} alias brand)` : ""}` : "";
    console.log(`     ${bar(r.coverage)} ${String(r.coverage).padStart(3)}%  ${basename(r.dir)}  (${r.varHits} token refs, ${r.violations.length} raw${local})`);
    for (const v of r.violations.slice(0, 8))
      console.log(`        ✗ ${v.file}:${v.line}  ${v.value}  →  ${v.suggest ? "use var(" + v.suggest + ")" : "(not in palette)"}`);
    if (r.violations.length > 8) console.log(`        … +${r.violations.length - 8} more`);
    for (const t of r.localTokens.filter((t) => t.aliasable).slice(0, 4))
      console.log(`        ↪ local ${t.value} aliases ${t.aliasable} — consider var(${t.aliasable})`);
  }

  console.log("\n  2. UNUSED-TOKEN AUDIT");
  console.log(unused.length ? unused.map((u) => `     • ${u}  (${cssVarToValue.get(u)})`).join("\n") : "     ✓ every token is referenced");

  console.log("\n  3. COMPONENT COVERAGE MATRIX");
  const allComp = COMPONENTS.map((c) => c.name);
  const head = allComp.map((c) => c.replace("bs-text-", "")).join(" ");
  console.log(`     surface          ${head}`);
  for (const r of results) {
    const row = allComp.map((c) => (r.components.includes(c) ? "✓" : "·"));
    console.log(`     ${basename(r.dir).padEnd(16)} ${row.map((x, i) => x.padEnd(allComp[i].replace("bs-text-", "").length)).join(" ")}`);
  }

  if (hybrid) {
    console.log("\n  4. HYBRID — comp colors vs tokens");
    for (const h of hybrid)
      console.log(`     ${h.token ? "✓" : "✗"} ${h.color}  ${h.token ? "→ var(" + h.token + ")" : "NOT in tokens"}`);
  }
  console.log("");
}

const gated = (r) => (COLORS ? r.violations.filter((v) => v.value.startsWith("#")) : r.violations);
const failing = results.filter((r) => gated(r).length > 0);
if (CHECK && failing.length) {
  const n = failing.reduce((s, r) => s + gated(r).length, 0);
  console.error(`✗ ${COLORS ? "colour " : ""}usage gate: ${n} hardcoded ${COLORS ? "colour" : "value"}(s) that should be tokens`);
  process.exit(1);
}

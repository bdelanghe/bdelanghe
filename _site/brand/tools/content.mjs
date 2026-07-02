#!/usr/bin/env node
// Content tokens — schema-driven, Gherkin-asserted, tag-scoped, multi-repo. Zero deps.
//
//   1. Validate   content/strings.json against content/strings.schema.json
//   2. Merge      core (this repo) + per-repo content/strings.json  (multi-repo catalog)
//   3. Spec link  content/*.feature quoted strings must exist in the catalog
//   4. Coverage   each surface must satisfy the scenarios that apply to IT
//
// Scenarios carry @tags; a surface declares which it claims in content/surface.json
// ({ "tags": ["marketing"] }). Untagged scenarios apply everywhere; tagged ones only
// to surfaces claiming the tag — so a personal page isn't held to org marketing copy.
//
// Usage: node tools/content.mjs [--check] [--json] [repoDir ...]
import { readFile, readdir } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const brandRoot = join(here, "..");
const args = process.argv.slice(2);
const CHECK = args.includes("--check");
const JSON_OUT = args.includes("--json");
const surfaceDirs = args.filter((a) => !a.startsWith("--"));
const repoDirs = [brandRoot, ...surfaceDirs];

const flatten = (obj, prefix = "") => {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("$")) continue;
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && "$value" in v) out[key] = v.$value;
    else if (v && typeof v === "object") Object.assign(out, flatten(v, key));
  }
  return out;
};

// ---- 1. schema-driven validation (driven by the schema file) -------------------
const schema = JSON.parse(await readFile(join(brandRoot, "content", "strings.schema.json"), "utf8"));
const keyRe = new RegExp(Object.keys(schema.patternProperties)[0]);
function validate(json, where) {
  const errs = [];
  for (const req of schema.required || []) if (!(req in json)) errs.push(`${where}: missing required token '${req}'`);
  for (const [k, v] of Object.entries(json)) {
    if (k.startsWith("$")) continue;
    if (!keyRe.test(k)) errs.push(`${where}: key '${k}' doesn't match ${keyRe}`);
    if (!v || typeof v !== "object" || typeof v.$value !== "string" || !v.$value.length)
      errs.push(`${where}: token '${k}' must have a non-empty string $value`);
    else for (const f of Object.keys(v)) if (!["$value", "$description"].includes(f)) errs.push(`${where}: token '${k}' unknown field '${f}'`);
  }
  return errs;
}

// ---- 2. merge core + per-repo catalogs (multi-repo) ----------------------------
const schemaErrors = [];
const catalog = {};
for (const dir of repoDirs) {
  let raw;
  try { raw = JSON.parse(await readFile(join(dir, "content", "strings.json"), "utf8")); } catch { continue; }
  schemaErrors.push(...validate(raw, basename(dir) + "/content/strings.json"));
  for (const [k, val] of Object.entries(flatten(raw))) catalog[k] = { value: val, source: basename(dir) };
}
const valueSet = new Set(Object.values(catalog).map((c) => c.value));

// ---- 3. gherkin scenarios with @tags -------------------------------------------
const scenarios = [];
for (const dir of repoDirs) {
  const cdir = join(dir, "content");
  let ents; try { ents = await readdir(cdir); } catch { continue; }
  for (const f of ents.filter((e) => e.endsWith(".feature"))) {
    const src = await readFile(join(cdir, f), "utf8");
    let scen = null, scenTags = [], pending = [];
    for (const line of src.split("\n")) {
      const s = line.trim();
      if (s.startsWith("@")) { pending = s.split(/\s+/).filter((t) => t.startsWith("@")).map((t) => t.slice(1)); continue; }
      if (s.startsWith("Scenario:")) { scen = s.slice(9).trim(); scenTags = pending; pending = []; continue; }
      const m = s.match(/^(?:Then|And)\b.*?"([^"]+)"/);
      if (m && scen) scenarios.push({ repo: basename(dir), scenario: scen, expect: m[1], inCatalog: valueSet.has(m[1]), tags: scenTags });
    }
  }
}

// ---- 4. coverage: each surface satisfies the scenarios that apply to it ---------
async function loadTags(dir) {
  try { return JSON.parse(await readFile(join(dir, "content", "surface.json"), "utf8")).tags || []; } catch { return []; }
}
async function htmlText(dir) {
  let text = "";
  async function walk(d) {
    let ents; try { ents = await readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if ([".git", "node_modules", "brand"].includes(e.name)) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (/\.(html?|md)$/.test(e.name)) text += "\n" + (await readFile(p, "utf8"));
    }
  }
  await walk(dir);
  return text;
}
const coverage = [];
for (const dir of surfaceDirs) {
  const text = await htmlText(dir);
  if (!text) continue;
  const tags = await loadTags(dir);
  const applies = (s) => s.tags.length === 0 || s.tags.some((t) => tags.includes(t));
  const applicable = scenarios.filter(applies);
  const failed = applicable.filter((s) => !text.includes(s.expect));
  coverage.push({ repo: basename(dir), tags, total: applicable.length, passed: applicable.length - failed.length, failed: failed.map((f) => `${f.scenario} ("${f.expect.slice(0, 30)}…")`) });
}

// ---- 5. copy lint (static analysis on the words themselves) --------------------
const PLACEHOLDER = /\b(lorem ipsum|todo|fixme|tbd|coming soon|placeholder|xxx+)\b/i;
const BUZZWORDS = /\b(leverage|synergy|cutting[- ]edge|world[- ]class|revolutionary|game[- ]?changing|click here|best[- ]in[- ]class|seamlessly)\b/i;
const CASING = [[/\bGithub\b/, "GitHub"], [/\bJavascript\b/, "JavaScript"], [/\bTypescript\b/, "TypeScript"]];
// Brand glossary: discouraged term → preferred. Keeps the vocabulary on-message.
const GLOSSARY = [
  [/\bpermissions?\b/i, "capability/capabilities"],
  [/\bbots?\b/i, "agent(s)"],
  [/\bwhitelist\w*\b/i, "allowlist"],
  [/\bblacklist\w*\b/i, "denylist"],
];
function lintCopy(text, { strict }) {
  const out = [];
  const ph = text.match(PLACEHOLDER);
  if (ph) out.push({ level: "error", msg: `placeholder/leftover: "${ph[0]}"` });
  if (strict) {
    const bz = text.match(BUZZWORDS);
    if (bz) out.push({ level: "warn", msg: `buzzword: "${bz[0]}"` });
    for (const [re, right] of CASING) if (re.test(text)) out.push({ level: "error", msg: `casing: write "${right}"` });
    for (const [re, pref] of GLOSSARY) { const g = text.match(re); if (g) out.push({ level: "warn", msg: `term "${g[0]}" → prefer ${pref}` }); }
    if (/\w  \w/.test(text)) out.push({ level: "warn", msg: "double space" });
  }
  return out;
}
const lint = [];
// strict on the canonical copy we own…
for (const [k, c] of Object.entries(catalog)) for (const v of lintCopy(c.value, { strict: true })) lint.push({ where: `token ${k}`, ...v });
// …leak-detection (placeholders only) on shipped surfaces
for (const dir of surfaceDirs) {
  const text = await htmlText(dir);
  for (const v of lintCopy(text, { strict: false })) lint.push({ where: `surface ${basename(dir)}`, ...v });
}
const lintErrors = lint.filter((l) => l.level === "error");

// ---- report --------------------------------------------------------------------
const unbacked = scenarios.filter((s) => !s.inCatalog);
const driftRepos = coverage.filter((c) => c.failed.length);
if (JSON_OUT) {
  console.log(JSON.stringify({ schemaErrors, catalog, scenarios, coverage, lint }, null, 2));
} else {
  console.log("\n  CONTENT TOKENS — schema-driven, Gherkin-asserted\n  " + "─".repeat(48));
  console.log(`  1. SCHEMA   ${schemaErrors.length ? "✗ " + schemaErrors.length + " error(s)" : "✓ valid"}`);
  for (const e of schemaErrors) console.log(`        ${e}`);
  console.log(`\n  2. CATALOG  ${Object.keys(catalog).length} tokens (${[...new Set(Object.values(catalog).map((c) => c.source))].join(" + ")})`);
  for (const [k, c] of Object.entries(catalog)) console.log(`        ${k} = "${c.value.length > 48 ? c.value.slice(0, 48) + "…" : c.value}"  ·${c.source}`);
  console.log(`\n  3. GHERKIN  ${scenarios.length} scenario(s), ${unbacked.length} not token-backed`);
  for (const s of scenarios) console.log(`        ${s.inCatalog ? "✓" : "✗"} ${s.tags.map((t) => "@" + t).join(" ")} ${s.scenario}`);
  if (coverage.length) {
    console.log("\n  4. COPY COVERAGE — surfaces satisfy the scenarios that apply");
    for (const c of coverage) {
      console.log(`        ${c.failed.length ? "✗" : "✓"} ${c.repo} [${c.tags.join(",") || "—"}]  ${c.passed}/${c.total}`);
      for (const f of c.failed) console.log(`            missing: ${f}`);
    }
  }
  console.log(`\n  5. COPY LINT  ${lint.length ? lintErrors.length + " error(s), " + (lint.length - lintErrors.length) + " warning(s)" : "✓ clean"}`);
  for (const l of lint) console.log(`        ${l.level === "error" ? "✗" : "⚠"} ${l.where}: ${l.msg}`);
  console.log("");
}

if (CHECK && (schemaErrors.length || unbacked.length || driftRepos.length || lintErrors.length)) {
  console.error(`✗ content check: ${schemaErrors.length} schema, ${unbacked.length} unbacked, ${driftRepos.length} drift, ${lintErrors.length} lint error(s)`);
  process.exit(1);
}

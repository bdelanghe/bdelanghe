#!/usr/bin/env node
// Static accessibility checks. Zero deps. Complements meta.mjs (lang, alt, <main>, h1).
//   1. Contrast  WCAG AA ratios for the design system's text/surface token pairs
//   2. Headings  single <h1> + no skipped levels, per HTML surface
//
// Usage: node tools/a11y.mjs [--check] [surfaceDir ...]
import { readFile, readdir } from "node:fs/promises";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const brandRoot = join(here, "..");
const args = process.argv.slice(2);
const CHECK = args.includes("--check");
const dirs = args.filter((a) => !a.startsWith("--"));

// token hex values from the generated CSS (skip color-mix/non-hex)
const css = await readFile(join(brandRoot, "tokens", "tokens.css"), "utf8");
const tok = {};
for (const m of css.matchAll(/(--bs-[a-z0-9-]+):\s*(#[0-9A-Fa-f]{3,6})\s*;/g)) tok[m[1]] = m[2];

const lum = (hex) => {
  let h = hex.replace("#", ""); if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const a = [0, 2, 4].map((i) => { const c = parseInt(h.slice(i, i + 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
};
const ratio = (a, b) => { const L1 = lum(a), L2 = lum(b), hi = Math.max(L1, L2), lo = Math.min(L1, L2); return (hi + 0.05) / (lo + 0.05); };

// semantic text-on-surface pairs (label, fg token, bg token, min ratio)
const PAIRS = [
  ["ink on paper", "--bs-color-ink", "--bs-color-paper", 4.5],
  ["ink on card", "--bs-color-ink", "--bs-color-card", 4.5],
  ["ink-soft on paper", "--bs-color-ink-soft", "--bs-color-paper", 4.5],
  ["ink-mono on paper", "--bs-color-ink-mono", "--bs-color-paper", 4.5],
  ["white on forest", "--bs-color-white", "--bs-color-forest", 4.5],
  ["white on forest-deep", "--bs-color-white", "--bs-color-forest-deep", 4.5],
  ["grade-enforced fg/bg", "--bs-grade-enforced-fg", "--bs-grade-enforced-bg", 4.5],
  ["grade-partial fg/bg", "--bs-grade-partial-fg", "--bs-grade-partial-bg", 4.5],
  ["grade-aspirational fg/bg", "--bs-grade-aspirational-fg", "--bs-grade-aspirational-bg", 4.5],
  ["grade-enforced on-dark/ink", "--bs-grade-enforced-on-dark", "--bs-color-ink", 4.5],
  ["grade-partial on-dark/ink", "--bs-grade-partial-on-dark", "--bs-color-ink", 4.5],
  ["grade-aspirational on-dark/ink", "--bs-grade-aspirational-on-dark", "--bs-color-ink", 4.5],
];
const contrast = PAIRS.map(([label, fg, bg, min]) => {
  if (!tok[fg] || !tok[bg]) return { label, missing: true };
  const r = ratio(tok[fg], tok[bg]);
  return { label, ratio: Math.round(r * 100) / 100, min, pass: r >= min };
});

async function htmlFiles(dir) {
  const out = [];
  async function w(d) { let e; try { e = await readdir(d, { withFileTypes: true }); } catch { return; } for (const x of e) { if ([".git", "node_modules", "brand"].includes(x.name)) continue; const p = join(d, x.name); if (x.isDirectory()) await w(p); else if (/\.html?$/.test(x.name)) out.push(p); } }
  await w(dir); return out;
}
const headingIssues = [];
for (const dir of dirs) for (const f of await htmlFiles(dir)) {
  const src = await readFile(f, "utf8");
  const levels = [...src.matchAll(/<h([1-6])[\s>]/gi)].map((m) => +m[1]);
  const h1 = levels.filter((l) => l === 1).length;
  let prev = 0; const skips = [];
  for (const l of levels) { if (prev && l > prev + 1) skips.push(`h${prev}→h${l}`); prev = l; }
  if (h1 !== 1 || skips.length) headingIssues.push({ file: relative(process.cwd(), f), h1, skips });
}

const failC = contrast.filter((c) => c.pass === false || c.missing);
console.log("\n  ACCESSIBILITY (static)\n  " + "─".repeat(48));
console.log("  1. CONTRAST — WCAG AA (normal text ≥ 4.5:1)");
for (const c of contrast) console.log(`     ${c.missing ? "?" : c.pass ? "✓" : "✗"} ${c.label.padEnd(30)} ${c.missing ? "(token missing)" : c.ratio + ":1"}`);
console.log("\n  2. HEADINGS — single h1, no skipped levels");
console.log(headingIssues.length ? headingIssues.map((h) => `     ✗ ${h.file}  h1×${h.h1}${h.skips.length ? " skips: " + h.skips.join(", ") : ""}`).join("\n") : "     ✓ all surfaces OK (or none scanned)");
console.log("");

if (CHECK && (failC.length || headingIssues.length)) { console.error(`✗ a11y: ${failC.length} contrast fail(s), ${headingIssues.length} heading issue(s)`); process.exit(1); }

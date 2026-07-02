#!/usr/bin/env node
// Generate brand/tokens/tokens.css from tokens.json (the source of truth).
//   node build-tokens.mjs          # write tokens.css
//   node build-tokens.mjs --check  # exit 1 if tokens.css is stale (for CI drift checks)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(join(here, "tokens.json"), "utf8"));
const cssPath = join(here, "tokens.css");

// Deterministic colour math for derived tints (pure → reproducible output).
const hexToRgb = (h) => { h = h.replace("#", ""); if (h.length === 3) h = [...h].map((c) => c + c).join(""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const rgbToHex = (r) => "#" + r.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((x, i) => x * (1 - t) + B[i] * t)); };

const fam = (v) => v.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(", ");
const resolveRef = (s) =>
  String(s).replace(/\{([^}]+)\}/g, (_, p) => {
    let n = tokens;
    for (const k of p.split(".")) n = n[k];
    return Array.isArray(n.$value) ? fam(n.$value) : n.$value;
  });

function genCss(t) {
  const L = [];
  L.push("/* AUTO-GENERATED from tokens.json by build-tokens.mjs — do not edit by hand. */");
  L.push(":root {");
  L.push("  /* color */");
  for (const k in t.color) L.push(`  --bs-color-${k}: ${resolveRef(t.color[k].$value)};`);
  L.push("  /* font family */");
  for (const k in t.font) L.push(`  --bs-font-${k}: ${fam(t.font[k].$value)};`);
  L.push("  /* size & radius */");
  for (const k in t.size) L.push(`  --bs-${k}: ${t.size[k].$value};`);
  for (const k in t.radius) L.push(`  --bs-${k}: ${t.radius[k].$value};`);
  if (t.grade) {
    L.push("  /* grade — base + derived bg/fg tints (deterministic) */");
    const ink = t.color.ink.$value, white = t.color.white.$value;
    for (const k in t.grade) {
      if (k.startsWith("$")) continue;
      const base = t.grade[k].$value;
      L.push(`  --bs-grade-${k}: ${base};`);
      L.push(`  --bs-grade-${k}-bg: ${mix(base, white, 0.85)};`);
      L.push(`  --bs-grade-${k}-fg: ${mix(base, ink, 0.55)};`);
      L.push(`  --bs-grade-${k}-on-dark: ${mix(base, white, 0.5)};`);
      L.push(`  --bs-grade-${k}-on-dark-bg: color-mix(in srgb, ${base} 14%, transparent);`);
    }
  }
  L.push("}");
  L.push("");
  L.push("/* Text styles — composite recipes built from the tokens above. */");
  for (const k in t.text) {
    const v = t.text[k].$value;
    L.push(`.bs-text-${k} {`);
    L.push(`  font-family: ${resolveRef(v.fontFamily)};`);
    L.push(`  font-size: ${resolveRef(v.fontSize)};`);
    if (v.fontWeight != null) L.push(`  font-weight: ${v.fontWeight};`);
    if (v.lineHeight != null) L.push(`  line-height: ${v.lineHeight};`);
    if (v.letterSpacing != null) L.push(`  letter-spacing: ${v.letterSpacing};`);
    if (v.textTransform) L.push(`  text-transform: ${v.textTransform};`);
    L.push("}");
  }
  return L.join("\n") + "\n";
}

const out = genCss(tokens);
const check = process.argv.includes("--check");
if (check) {
  let current = "";
  try { current = readFileSync(cssPath, "utf8"); } catch {}
  if (current !== out) {
    console.error("✗ tokens.css is stale. Run: node build-tokens.mjs");
    process.exit(1);
  }
  console.log("✓ tokens.css is up to date.");
} else {
  writeFileSync(cssPath, out);
  console.log("✓ wrote tokens.css");
}

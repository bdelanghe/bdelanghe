// @bounded-systems/brand — UnoCSS preset.
//
// Maps atomic utilities to the brand tokens (var(--bs-*)) so a surface gets
// ergonomic classes (text-forest, bg-paper, rounded-lg, font-mono, text-h1)
// WITHOUT duplicating the palette — the tokens stay the single source of truth.
// Derived from tokens.json, so utilities never drift from the tokens.
//
// Usage in a surface (after `npm i -D unocss`):
//   // uno.config.mjs
//   import { defineConfig } from "unocss";
//   import { presetBounded } from "./brand/uno-preset.mjs";
//   export default defineConfig({ presets: [presetBounded()] });
//
// Then in markup: <h1 class="text-h1 text-ink">…</h1> <span class="bg-grade-enforced-bg text-grade-enforced-fg">…</span>
// Ships only the classes you use (on-demand), zero runtime. Pair with the
// generated tokens.css (which defines the --bs-* vars the utilities reference).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(join(here, "tokens", "tokens.json"), "utf8"));
const keys = (o) => Object.keys(o).filter((k) => !k.startsWith("$"));

export function presetBounded() {
  // colours → var(--bs-color-*) (+ grade base/bg/fg/on-dark)
  const colors = {};
  for (const k of keys(tokens.color)) colors[k] = `var(--bs-color-${k})`;
  if (tokens.grade) for (const k of keys(tokens.grade)) {
    colors[`grade-${k}`] = `var(--bs-grade-${k})`;
    for (const v of ["bg", "fg", "on-dark", "on-dark-bg"]) colors[`grade-${k}-${v}`] = `var(--bs-grade-${k}-${v})`;
  }
  // type sizes → var(--bs-text-*); radii → var(--bs-radius-*)
  const fontSize = Object.fromEntries(keys(tokens.size).map((k) => [k.replace(/^text-/, ""), `var(--bs-${k})`]));
  const borderRadius = Object.fromEntries(keys(tokens.radius).map((k) => [k.replace(/^radius-/, ""), `var(--bs-${k})`]));

  return {
    name: "@bounded-systems/brand",
    theme: {
      colors,
      fontFamily: { display: "var(--bs-font-display)", mono: "var(--bs-font-mono)" },
      fontSize,
      borderRadius,
    },
    // composite type recipes as shortcuts → the .bs-text-* classes in tokens.css
    shortcuts: Object.fromEntries(keys(tokens.text).map((k) => [`type-${k}`, `bs-text-${k}`])),
  };
}

export default presetBounded;

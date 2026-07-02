#!/usr/bin/env node
// card.mjs — generate a 1200×630 social card (og:image) for a post, from tokens.
// Emits self-contained HTML; rasterize to PNG once with headless Chrome and commit
// to assets/cards/<slug>.png. Build-once: no runtime, no build dependency. Re-run
// the generator to refresh a card. Strings come from the same canonical tokens as
// everything else (profile.json + brand content strings).
//
// Usage: node card.mjs --title "…" --out card.html
//    or: node card.mjs --slug <slug>  (pulls the title from posts/<slug>.md)
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const arg = (f, d) => { const i = process.argv.indexOf(f); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const sval = (x) => (x && typeof x === "object" && "$value" in x ? x.$value : x);

const profile = JSON.parse(await readFile(arg("--profile", join(here, "data", "profile.json")), "utf8"));
let strings = {}; try { strings = JSON.parse(await readFile(arg("--strings", join(here, "brand", "content", "strings.json")), "utf8")); } catch {}
const org = sval(strings.name) || "Bounded Systems";

let title = arg("--title");
const slug = arg("--slug");
if (!title && slug) title = (/(?:^|\n)title:\s*(.+)/.exec(await readFile(join(here, "posts", `${slug}.md`), "utf8"))?.[1] || slug).trim();
title = (title || "Untitled").replace(/^["']|["']$/g, "");

// brand design tokens (inline — the card is a standalone raster source)
const C = { forest: "#0C5A42", forestDeep: "#073D2C", paper: "#EDEAE1", mint: "#D2E0D8", amber: "#B5762A", white: "#FFFFFF" };
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;box-sizing:border-box}
  html,body{width:1200px;height:630px}
  body{font-family:${FONT};background:linear-gradient(135deg,${C.forest},${C.forestDeep});color:${C.paper};
    padding:80px 72px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden}
  .bar{position:absolute;top:0;left:0;width:10px;height:100%;background:linear-gradient(${C.forest},${C.amber})}
  .eyebrow{font-size:22px;letter-spacing:.18em;text-transform:uppercase;color:${C.mint};font-weight:600}
  h1{font-size:66px;line-height:1.07;letter-spacing:-.02em;color:${C.white};font-weight:800;max-width:980px}
  .foot{display:flex;align-items:center;gap:14px;font-size:25px;color:${C.mint}}
  .foot b{color:${C.white};font-weight:700}
  .door{position:absolute;right:72px;top:64px;width:92px;height:100px}
</style></head><body>
  <div class="bar"></div>
  <svg class="door" viewBox="0 0 132 140" fill="none" stroke="${C.mint}" stroke-width="3">
    <rect x="1" y="1" width="130" height="138" rx="10"/><rect x="41" y="44" width="50" height="95" rx="6"/>
    <circle cx="80" cy="92" r="4.5" fill="${C.amber}" stroke="none"/></svg>
  <div class="eyebrow">${esc(org)}</div>
  <h1>${esc(title)}</h1>
  <div class="foot"><b>${esc(profile.name)}</b> &middot; robertdelanghe.dev</div>
</body></html>`;

const out = arg("--out", join(here, "card.html"));
await writeFile(out, html);
console.log(`✓ card html → ${out}  | title: ${title}`);

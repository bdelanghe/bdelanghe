#!/usr/bin/env node
// Page meta + agent-readiness coverage. Zero deps.
//
// Checks every HTML surface for the meta machines (search engines, social
// crawlers, AND AI agents) need to understand the page:
//   • base meta      lang · charset · viewport · title(≤60) · description(≤160)
//   • discovery      canonical · favicon · theme-color
//   • social         og:title/description/image/url/type · twitter:card/image
//   • agent-ready    JSON-LD (schema.org) · single <h1> · <main> landmark ·
//                    img alt-text · an llms.txt at the surface root
//
// Usage: node tools/meta.mjs [--check] [--json] <surfaceDir ...>
import { readFile, readdir, access } from "node:fs/promises";
import { join, relative, basename } from "node:path";

const args = process.argv.slice(2);
const CHECK = args.includes("--check");
const JSON_OUT = args.includes("--json");
const dirs = args.filter((a) => !a.startsWith("--"));

const REQUIRED = new Set(["lang", "charset", "viewport", "title", "description", "og:title", "og:description", "og:image", "h1"]);
// 404 / error pages need only base meta — not social cards or structured data.
const BASE_REQUIRED = new Set(["lang", "charset", "viewport", "title"]);
const requiredFor = (file) => (/40[0-9]\.html?$/.test(file) ? BASE_REQUIRED : REQUIRED);

const has = (re, s) => re.test(s);
const cap = (re, s) => (s.match(re) || [, null])[1];

function checkHtml(src) {
  const title = cap(/<title>([^<]*)<\/title>/i, src);
  const desc = cap(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i, src);
  const h1s = (src.match(/<h1[\s>]/gi) || []).length;
  const imgs = src.match(/<img\b[^>]*>/gi) || [];
  const imgsNoAlt = imgs.filter((t) => !/\balt=/i.test(t)).length;
  return {
    lang: has(/<html[^>]*\blang=/i, src),
    charset: has(/<meta[^>]*charset=/i, src),
    viewport: has(/<meta[^>]+name=["']viewport["']/i, src),
    title: !!title,
    "title≤60": title ? title.length <= 60 : false,
    description: !!desc,
    "description≤160": desc ? desc.length <= 160 : false,
    canonical: has(/<link[^>]+rel=["']canonical["']/i, src),
    favicon: has(/<link[^>]+rel=["'][^"']*icon[^"']*["']/i, src),
    "theme-color": has(/<meta[^>]+name=["']theme-color["']/i, src),
    "og:title": has(/<meta[^>]+property=["']og:title["']/i, src),
    "og:description": has(/<meta[^>]+property=["']og:description["']/i, src),
    "og:image": has(/<meta[^>]+property=["']og:image["']/i, src),
    "og:url": has(/<meta[^>]+property=["']og:url["']/i, src),
    "og:type": has(/<meta[^>]+property=["']og:type["']/i, src),
    "twitter:card": has(/<meta[^>]+name=["']twitter:card["']/i, src),
    "json-ld": has(/<script[^>]+type=["']application\/ld\+json["']/i, src),
    h1: h1s === 1,
    main: has(/<main[\s>]/i, src),
    "img-alt": imgsNoAlt === 0,
  };
}

async function htmlFiles(dir) {
  const out = [];
  async function walk(d) {
    let ents; try { ents = await readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if ([".git", "node_modules", "brand"].includes(e.name)) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (/\.html?$/.test(e.name)) out.push(p);
    }
  }
  await walk(dir);
  return out;
}

const surfaces = [];
for (const dir of dirs) {
  const files = await htmlFiles(dir);
  if (!files.length) continue;
  let llms = false; try { await access(join(dir, "llms.txt")); llms = true; } catch {}
  const pages = [];
  for (const f of files) pages.push({ file: relative(process.cwd(), f), checks: checkHtml(await readFile(f, "utf8")) });
  surfaces.push({ dir: basename(dir), llms, pages });
}

let failures = 0;
if (JSON_OUT) {
  console.log(JSON.stringify(surfaces, null, 2));
} else {
  console.log("\n  PAGE META + AGENT-READINESS\n  " + "─".repeat(48));
  for (const s of surfaces) {
    console.log(`\n  ${s.dir}   llms.txt ${s.llms ? "✓" : "✗ (add /llms.txt)"}`);
    for (const p of s.pages) {
      const miss = Object.entries(p.checks).filter(([, v]) => !v).map(([k]) => k);
      const req = requiredFor(p.file);
      const reqMiss = miss.filter((k) => req.has(k));
      const n = Object.keys(p.checks).length, ok = n - miss.length;
      console.log(`     ${reqMiss.length ? "✗" : "✓"} ${p.file}  ${ok}/${n}` + (miss.length ? `  missing: ${miss.join(", ")}` : ""));
      failures += reqMiss.length;
    }
  }
  console.log("");
}

if (CHECK && failures) { console.error(`✗ meta: ${failures} required tag(s) missing`); process.exit(1); }

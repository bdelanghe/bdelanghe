#!/usr/bin/env node
// Derive a typed-symbol *catalog* for the shared, owned auditor
// @bounded-systems/string-audit from this site's contracts. Every shipped string becomes
// a named, typed symbol; the auditor runs type-scoped audits over it — most usefully the
// `claim` → grounding check, which flags any metric not in the curated fact registry
// (data/audit/grounding.json).
//
// This is the bdelanghe/site half of using the shared auditor: fix a rule once upstream,
// re-vendor, and the gate inherits it. This script owns only the mapping contract→catalog;
// the audit logic and the grounding check live in the vendored auditor (vendor/string-audit/),
// run by `npm run audit` (scripts/audit.mjs).
//
//   node audit-catalog.mjs            # regenerate data/audit/catalog.json
//
// Pure + dependency-free: Node builtins only. Writes one file; reads the contracts.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const readJson = async (p) => JSON.parse(await readFile(join(root, p), "utf8"));

// A string that carries a number is a measurable *claim* — route it through the
// grounding check. Narrative copy (no digits) is `body`: prose checks only, no
// grounding pressure (it asserts nothing falsifiable).
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const claimOrBody = (v) => (/\d/.test(v) ? "claim" : "body");

function buildCatalog(profile, site, highlightCopy) {
  const c = {};
  const put = (key, type, value) => {
    if (value && value.trim()) c[key] = { type, value };
  };

  // Hero + identity copy.
  put("hero.headline", "headline", profile.headline);
  put("hero.intro", "body", profile.intro);
  put("hero.summary", "body", profile.summary);
  if (profile.banner?.tagline) put("banner.tagline", "tagline", profile.banner.tagline);

  // Open-to-roles callout.
  if (profile.seeking?.cta) put("seeking.cta", "cta", profile.seeking.cta);
  if (profile.seeking?.focus) put("seeking.focus", "body", profile.seeking.focus);
  if (profile.seeking?.detail) put("seeking.detail", "body", profile.seeking.detail);

  // Experience: the `what` line and every bullet. Metric-bearing strings become
  // `claim`s so string-audit checks them against the grounding registry.
  for (const e of profile.experience || []) {
    const s = slug(e.org);
    put(`exp.${s}.what`, claimOrBody(e.what), e.what);
    (e.bullets || []).forEach((b, i) => put(`exp.${s}.b${i}`, claimOrBody(b), b));
  }

  // Selected Work: the copy that actually ships (editorial overrides applied,
  // same as build.mjs + copy-review.mjs).
  for (const h of site.highlights || []) {
    const desc = highlightCopy[h.name] ?? h.description;
    put(`work.${slug(h.name)}`, claimOrBody(desc || ""), desc);
  }

  return c;
}

async function main() {
  const [profile, site, highlightCopy] = await Promise.all([
    readJson("data/profile.json"),
    readJson("data/site.json"),
    readJson("data/highlight-copy.json").catch(() => ({})),
  ]);

  const catalog = buildCatalog(profile, site, highlightCopy);
  await mkdir(join(root, "data", "audit"), { recursive: true });
  await writeFile(
    join(root, "data", "audit", "catalog.json"),
    JSON.stringify(catalog, null, 2) + "\n",
  );

  const types = Object.values(catalog).reduce((m, s) => ((m[s.type] = (m[s.type] || 0) + 1), m), {});
  const summary = Object.entries(types).map(([t, n]) => `${n} ${t}`).join(" · ");
  console.log(`audit-catalog: ${Object.keys(catalog).length} symbols → data/audit/catalog.json (${summary})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

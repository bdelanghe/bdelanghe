#!/usr/bin/env node
// Re-vendor the gate from @bounded-systems/string-audit at a given ref, refreshing
// vendor/string-audit/ and its provenance.json (sha256 + resolved commit). Needs network.
//
//   npm run audit:vendor -- --ref v0.6.0
//
// The single place the auditor version is pinned for this site. After running, the diff
// shows exactly what changed in the gate; commit it deliberately.
import { writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = "bounded-systems/string-audit";
const FILES = ["audit-gate.mjs", "prose.mjs", "catalog.mjs", "dictionary.txt", "ai-tells.json"];

const vendor = join(dirname(fileURLToPath(import.meta.url)), "..", "vendor", "string-audit");
const argRef = process.argv.indexOf("--ref");
const ref = argRef !== -1 ? process.argv[argRef + 1] : JSON.parse(readFileSync(join(vendor, "provenance.json"), "utf8")).ref;
if (!ref) throw new Error("no ref — pass --ref <tag>");

const get = async (url, json = false) => {
  const r = await fetch(url, { headers: { "user-agent": "vendor-audit" } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${url}`);
  return json ? r.json() : r.text();
};

const commit = (await get(`https://api.github.com/repos/${REPO}/commits/${ref}`, true)).sha;
const files = {};
for (const f of FILES) {
  const body = await get(`https://raw.githubusercontent.com/${REPO}/${ref}/${f}`);
  writeFileSync(join(vendor, f), body);
  files[f] = "sha256:" + createHash("sha256").update(body).digest("hex");
  console.log(`vendored ${f} (${Buffer.byteLength(body)} bytes)`);
}

const prov = {
  source: `https://github.com/${REPO}`,
  ref,
  commit,
  fetched: new Date().toISOString().slice(0, 10),
  note: "Vendored gate (audit-gate.mjs + prose.mjs/catalog.mjs and their data) from the shared, owned auditor. Content-addressed: `npm run audit` verifies each file against the sha256 below before running, and fails on drift. Update with `npm run audit:vendor -- --ref <tag>`.",
  files,
};
writeFileSync(join(vendor, "provenance.json"), JSON.stringify(prov, null, 2) + "\n");
console.log(`✓ pinned string-audit ${ref} (${commit.slice(0, 9)}) → vendor/string-audit/provenance.json`);

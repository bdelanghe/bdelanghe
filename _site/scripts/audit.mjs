#!/usr/bin/env node
// One content gate, run the same locally and in CI. Wraps the vendored, pinned
// auditor in vendor/string-audit/ (from the shared, owned @bounded-systems/string-audit):
//   1. verify each vendored file against vendor/string-audit/provenance.json (sha256) —
//      content-addressed integrity, so a drifted/edited gate fails closed;
//   2. regenerate the typed-symbol catalog from the contracts (audit-catalog.mjs);
//   3. run the gate over the curated audit data (catalog + grounding + attested).
//
//   npm run audit            # --strict gate (blocks on error-level / ungrounded)
//   node scripts/audit.mjs   # report-only (no --strict)
//
// Update the vendored gate to a new release: `npm run audit:vendor -- --ref <tag>`.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const vendor = join(root, "vendor", "string-audit");
const sha256 = (p) => "sha256:" + createHash("sha256").update(readFileSync(p)).digest("hex");

// 1. Provenance: every vendored file must match its pinned hash.
const prov = JSON.parse(readFileSync(join(vendor, "provenance.json"), "utf8"));
const drift = Object.entries(prov.files).filter(([f, want]) => sha256(join(vendor, f)) !== want);
if (drift.length) {
  console.error(`✗ provenance mismatch in vendor/string-audit/ — ${drift.map(([f]) => f).join(", ")}`);
  console.error(`  the vendored gate was edited or corrupted. Re-vendor: npm run audit:vendor -- --ref ${prov.ref}`);
  process.exit(2);
}
console.log(`✓ provenance ok — string-audit ${prov.ref} (${prov.commit.slice(0, 9)}), ${Object.keys(prov.files).length} files`);

// 2. Regenerate the catalog from the contracts (source of truth).
const cat = spawnSync(process.execPath, [join(root, "audit-catalog.mjs")], { stdio: "inherit" });
if (cat.status !== 0) process.exit(cat.status ?? 1);

// 3. Run the vendored gate over the curated audit data.
const audit = join(root, "data", "audit");
const gate = spawnSync(process.execPath, [join(vendor, "audit-gate.mjs"), ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    CATALOG: join(audit, "catalog.json"),
    GROUNDING: join(audit, "grounding.json"),
    ATTESTED: join(audit, "attested-claims.json"),
  },
});
process.exit(gate.status ?? 1);

// Load a catalog of typed symbols from either:
//   - native:  { "sym": { "type": "headline", "value": "…" } }
//   - DTCG content tokens (e.g. @bounded-systems/brand content/strings.json):
//              { "sym": { "$value": "…", "$description": "…" } }  → type inferred from the key
// Normalizes to { sym: { type, value } }.  CATALOG=<path> selects the source.
import { readFileSync } from "node:fs";

const inferType = (key) =>
  /tagline/i.test(key) ? "tagline" :
  /\bname\b/i.test(key) ? "name" :
  /desc|meta/i.test(key) ? "meta" :
  /headline|hero/i.test(key) ? "headline" :
  /cta|button/i.test(key) ? "cta" :
  /thesis|statement|claim/i.test(key) ? "claim" : "body";

export function loadCatalog(path) {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith("$") || !v || typeof v !== "object") continue;
    if ("value" in v) out[k] = { type: v.type || inferType(k), value: v.value };          // native
    else if ("$value" in v) out[k] = { type: v.type || v.$type || inferType(k), value: v.$value }; // DTCG
  }
  return out;
}

#!/usr/bin/env node
// Deterministic content gate — prose + grounding checks. No API calls, no JSR deps.
// Intended to be checked out into a site's CI as a submodule or workflow_call step;
// prose.mjs runs directly (requires an-array-of-english-words + write-good in the
// caller's node_modules — satisfied by the caller's own `npm ci`).
//
// Env vars (all optional except CATALOG):
//   CATALOG   path to the typed-symbol catalog JSON (required)
//   GROUNDING path to grounding-facts JSON (array of strings)
//   ATTESTED  path to attested-claims JSON (array of { symbol, check })
//
// Flags:
//   --strict  exit 1 when any non-attested error-level finding exists
//
// Attested-claims format:
//   [{ "symbol": "brand.claim.foo", "check": "overclaim" }]
//   `check` is matched against the check-name prefix of the finding message
//   (e.g. "overclaim" matches "overclaim: \"every effect\" — ...").
//   An entry with no symbol ("" or absent) matches that check on any symbol.

import { readFileSync, existsSync } from "node:fs";
import { aiIsms, overclaims, proofread, readability } from "./prose.mjs";
import { loadCatalog } from "./catalog.mjs";

const strict = process.argv.includes("--strict");

const catalogPath = process.env.CATALOG;
if (!catalogPath) {
  console.error("audit-gate: CATALOG env var is required");
  process.exit(1);
}

const catalog = loadCatalog(catalogPath);

const GROUNDED =
  process.env.GROUNDING && existsSync(process.env.GROUNDING)
    ? JSON.parse(readFileSync(process.env.GROUNDING, "utf8"))
    : [];

const attestedRaw =
  process.env.ATTESTED && existsSync(process.env.ATTESTED)
    ? JSON.parse(readFileSync(process.env.ATTESTED, "utf8"))
    : [];

// attested key: "<symbol>::<check>" — empty symbol matches any symbol
const attestedSet = new Set(
  attestedRaw.map(({ symbol = "", check = "" }) => `${symbol}::${check.toLowerCase()}`)
);
const checkName = (msg) => msg.split(":")[0].toLowerCase();
const isAttested = (symbol, msg) => {
  const c = checkName(msg);
  return attestedSet.has(`${symbol}::${c}`) || attestedSet.has(`::${c}`);
};

// Grounding check (inline — avoids importing verbs.mjs → store.mjs → JSR deps).
// Matches the deterministicAudits "claim" logic in verbs.mjs.
const STAT_RE = /\b\d[\d,. ]*\s*(%|stars?|customers?|reviews?|bpm|days?|x)\b/i;
function groundingFindings(value) {
  const stat = value.match(STAT_RE);
  const grounded = GROUNDED.some((g) => value.toLowerCase().includes(g));
  if (stat && !grounded)
    return [{ level: "error", msg: `grounding: UNGROUNDED stat "${stat[0].trim()}" — not in grounding source` }];
  if (!stat && !grounded)
    return [{ level: "error", msg: "grounding: claim asserts nothing grounded — verify against source" }];
  return [];
}

const ORDER = { error: 0, warn: 1, suggestion: 2 };
const GLYPH = { error: "✗", warn: "⚠", suggestion: "·" };

let totalErrors = 0;
const symbolsWithFindings = [];

for (const [symbol, { type, value }] of Object.entries(catalog)) {
  const raw = [
    ...aiIsms(value),
    ...overclaims(value),
    ...proofread(value),
    ...readability(value, type),
    ...(type === "claim" ? groundingFindings(value) : []),
  ];

  if (!raw.length) continue;

  const findings = raw
    .map((f) => (isAttested(symbol, f.msg) ? { ...f, level: "suggestion" } : f))
    .sort((a, b) => ORDER[a.level] - ORDER[b.level]);

  const errors = findings.filter((f) => f.level === "error").length;
  totalErrors += errors;
  symbolsWithFindings.push({ symbol, type, findings });
}

const symCount = Object.keys(catalog).length;
console.log(`\n  AUDIT GATE — prose + grounding · ${symCount} symbol${symCount !== 1 ? "s" : ""}\n  ${"─".repeat(52)}`);

for (const { symbol, type, findings } of symbolsWithFindings) {
  console.log(`  ${symbol.padEnd(24)} [${type.padEnd(8)}]`);
  for (const f of findings) console.log(`       ${GLYPH[f.level]} ${f.msg}`);
}

const attestedNote = attestedRaw.length ? ` · ${attestedRaw.length} attested (demoted to suggestion)` : "";
console.log(`\n  ${totalErrors} error(s)${attestedNote}`);
console.log(`  tiers: ✗ error · ⚠ warn · · suggestion\n`);

if (strict && totalErrors > 0) {
  console.error(`  ✗ gate failed — ${totalErrors} error(s) under --strict\n`);
  process.exit(1);
}

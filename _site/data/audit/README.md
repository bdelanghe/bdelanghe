# data/audit — content-audit inputs

Inputs for the deterministic copy-hygiene gate. The prose + grounding logic is the
**shared, owned** auditor [`@bounded-systems/string-audit`](https://github.com/bounded-systems/string-audit),
**vendored** into `vendor/string-audit/` and pinned by sha256 (`vendor/string-audit/provenance.json`).
`npm run audit` runs the same gate locally and in CI — it verifies the vendored files
against their hashes, regenerates the catalog, and runs the gate over the three files
below. Bump the auditor with `npm run audit:vendor -- --ref <tag>`.

| File | Authored by | What it is |
|---|---|---|
| `catalog.json` | **generated** (`npm run audit:catalog`) | Every shipped string as a typed symbol `{ type, value }`. Derived from `data/profile.json` + `data/site.json` (+ `data/highlight-copy.json` overrides). **Do not hand-edit** — edit the contracts and regenerate. |
| `grounding.json` | **curated** | The fact registry: the only metrics a `claim` may assert. An allowlist of attested numbers. |
| `attested-claims.json` | **curated** | Coverage-claim allowlist as `{ symbol, check }` entries (the gate's schema): each names a catalog symbol whose `overclaim` finding is confirmed defensible (enforced-by-construction + linked in `proof[]`), demoting it out of the blocking tier. A `note` records the rationale. (Empty `symbol` would match any symbol for that check.) |

## The gate

`npm run audit` runs two checks under `--strict`, both blocking:

| Check | Blocks on |
|---|---|
| Prose | `error`-level prose findings — chatbot artifacts, placeholders, lorem ipsum, **un-attested** absolutes. Attested overclaims, warns (em-dash cadence, tricolon) and suggestions (readability) are report-only. |
| Grounding | any `claim` metric not in `grounding.json`. |

The same `npm run audit` runs locally and in CI (`.github/workflows/audit.yml`, on PRs
touching the contracts, the registries, the catalog generator, or the vendored gate).
Run `node scripts/audit.mjs` (no `--strict`) for a report-only pass.

## Why grounding + attestation are separate and hand-curated

A `claim`'s number must be in `grounding.json`; an absolute coverage phrase must be in
`attested-claims.json`. Both are **independent human attestations**, not auto-derived from
the copy (which would let any claim ground itself). The rule: **a new metric or a new
absolute coverage claim must be added to its registry, deliberately** — "yes, this is real
and I can defend it." That is the gate: you can't ship an unbacked number or an unscoped
absolute without first attesting it. Same "attest, don't suppress" model throughout.

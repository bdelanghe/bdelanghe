# robertdelanghe.dev — operating manual

One **contract** drives every surface. Edit the contract, push, everything regenerates.
This file is the manual for humans and agents maintaining the system.

## The model

```
data/profile.json   ← identity / copy tokens (bio, experience, skills, seeking, proof, links)
data/site.json      ← the GitHub corpus (stats + curated highlights)   [generated]
        │
        ▼  build.mjs  (pure: no network — safe in nix; validates both contracts)
   dist/index.html   hero · proof · "open to roles" · background · corpus · selected work
   dist/resume.html  print-optimized résumé + "Download PDF" (window.print)
   dist/resume.json  JSON Résumé (machine-readable, schema-valid) — for parsers/ATS
   dist/blog.html    writing (placeholder)
   dist/brand/…      copied from the @bounded-systems/brand submodule
```

- **Contracts** live in `data/`; **schemas** in `contract/*.schema.json`.
- `profile.json` = content tokens ("slugs for copy"), curated by hand (e.g. from a LinkedIn webarchive). Never live-fetched.
- `site.json` = the corpus, produced by `fetch.mjs` (has network), validated against `contract/site.schema.json`.
- Visuals come from the `brand/` git submodule — never hard-code brand values.

## Make a change (the common cases)

| Want to… | Edit | Then |
|---|---|---|
| Change bio / headline / summary | `data/profile.json` | push |
| Add/edit a job (+ résumé bullets) | `data/profile.json` → `experience[]` (`bullets` show on the résumé) | push |
| Change "Open to roles" | `data/profile.json` → `seeking` | push |
| Change proof links | `data/profile.json` → `proof` | push |
| Refresh the GitHub corpus now | `GITHUB_TOKEN=$(gh auth token) GH_USER=bdelanghe ORGS=bounded-systems node fetch.mjs` | commit `data/site.json` |
| Change which repos are highlighted | `PINS` in `fetch.mjs` (editorial, pins-only) | re-run fetch (or hand-edit `data/site.json`) |
| Sharpen a Selected Work description | `data/highlight-copy.json` (overrides the GitHub repo description by repo name) | push |
| Attest a new metric (so a `claim` grounds) | `data/audit/grounding.json` (the fact registry) | push |
| Attest an absolute coverage claim (so an overclaim passes) | `data/audit/attested-claims.json` | push |
| Rebuild locally | `npm run build` (or `nix build .#site` for a hermetic build) | — |

A push to `main` is all you normally need: **Cloudflare Workers Builds** runs `npm run build`
and deploys `site` automatically (serves robertdelanghe.dev + www).

## Automation (what runs itself)

- **Deploy** — Workers Builds on every push to `main`. Fallback: `gh workflow run deploy.yml`
  (hermetic Nix → `wrangler deploy`, independent of Cloudflare's Git App).
- **Corpus refresh** — `.github/workflows/refresh.yml` weekly: re-runs `fetch.mjs`, commits
  `data/site.json` → triggers a redeploy.
- **GitHub profile** — `bdelanghe/bdelanghe` is a **handcrafted** README (the synoptic
  daily auto-gen was intentionally retired). Update it by hand. `synoptic-github` remains a
  standalone tool — `validate`/`suggest` still keep repo topics honest.
- **LinkedIn drift** — `profile.json` is canonical; LinkedIn is a downstream copy that
  drifts. `linkedin-check.mjs` (`npm run check:linkedin`) validates the committed LinkedIn
  export (`data/linkedin/resume.json`, [JSON Resume](https://jsonresume.org) format, schema
  vendored at `contract/jsonresume.schema.json`) and diffs its `work`/`skills` against
  `profile.json`, reporting title/date drift to fix **on LinkedIn**. Intentional
  divergences live in `data/linkedin/accepted-drift.json`. CI runs it advisory-only on PRs
  that touch `profile.json` or `data/linkedin/` (`.github/workflows/linkedin-check.yml`).
  Refresh the export per `data/linkedin/README.md`.

## Copy review — the gate and the loop

`copy-review.mjs` (`npm run check:copy`) is an **agentic gate**: it sends the authored prose
(`profile.json` + the `site.json` highlight descriptions) to Claude and gets back structured
findings (`blocker`/`suggestion`/`nit`) judged on four axes — **claim integrity, thesis
coherence, voice, clarity**. Report-only by default (findings → the Actions run summary);
`--strict` fails on blockers. It **skips cleanly** without `ANTHROPIC_API_KEY`, which must
live in the repo's **Actions** secret store (not the Codespaces / Dependabot / Copilot
stores — Actions can't read those). CI: `.github/workflows/copy-review.yml` runs it on PRs
touching `profile.json`, `site.json`, or the script.

It is **non-deterministic** — it won't converge to zero findings; each run scrutinises from a
fresh angle. That's the point: recurring pressure, not a one-time pass. The gate doesn't
decide — it surfaces; a human triages each finding through three questions:

1. **Is it true?** A real metric stays. The gate flags precise numbers it can't verify (a
   false positive) — that's a prompt to *confirm*, not an order to cut. Don't gut real
   achievements to satisfy a cautious reader.
2. **Is it interesting?** "Real" is the floor. A true-but-dull item (a boilerplate repo, a
   vague claim) dilutes the sharp ones around it. Rewording it is lipstick.
3. **Does it advance the thesis?** Off-throughline color earns less than on-thesis substance.

Then act: **fix** (sharpen — and prefer a *named standard metric* like FCP or Core Web Vitals
over a bespoke or vague one; never cross metrics, e.g. a page-load "before" with an FCP
"after"), **confirm-as-defensible** (real and on-thesis → keep, be ready to show the
methodology), or **cut** (real but dull / off-thesis → remove, don't reword). Re-run to
confirm the finding clears.

Selected Work follows the same bar — it's an **editorial set** (`PINS` in `fetch.mjs`,
pins-only), not an auto-filled tag dump. Breadth lives in the corpus stats.

## Grounded content audit — the shared, owned auditor

Content discipline runs through the **shared, owned** auditor
[`@bounded-systems/string-audit`](https://github.com/bounded-systems/string-audit), **vendored**
into `vendor/string-audit/` and pinned by sha256 (`vendor/string-audit/provenance.json`).
`npm run audit` runs **the same gate locally and in CI** — one mechanism, one pinned version.
Bump the auditor with `npm run audit:vendor -- --ref <tag>`; fix a rule upstream, re-vendor,
commit the diff deliberately.

It works on a **catalog** of typed symbols. `npm run audit:catalog` (`audit-catalog.mjs`)
derives `data/audit/catalog.json` from the contracts — every shipped string becomes
`{ type, value }`; a string carrying a number is typed `claim`. The catalog is **generated**
(don't hand-edit; the gate regenerates it before running). Two curated registries gate it (the
"attest, don't suppress" model): `data/audit/grounding.json` (metrics a `claim` may assert)
and `data/audit/attested-claims.json` (`{ symbol, check }` entries naming the coverage claims
confirmed defensible, demoting their `overclaim` findings). See `data/audit/README.md`.

`npm run audit` (`scripts/audit.mjs`) verifies the vendored gate against its hashes, then runs
two `--strict` checks, both blocking:
- **Prose** — aiIsms / overclaims / proofread / readability; blocks on `error` (chatbot
  artifacts, placeholders, **un-attested** absolutes). Attested overclaims, warns (em-dash
  cadence, tricolon), and readability are report-only.
- **Grounding** — every `claim` metric must be in the grounding registry.

It runs offline (the gate is vendored; its only npm deps are dev-installed). The cross-site
half (mirroring this into `bounded-systems/site`, and rule changes that belong upstream) lives
in those repos, not here.

## Determinism / provenance

`build.mjs` is a pure function of the two contracts + the pinned brand submodule, so the
output bytes are reproducible. The résumé "Download PDF" prints the live page, so the PDF
is always in sync — no committed binary to drift.

## Custom domains (Cloudflare)

`site` worker serves `robertdelanghe.dev` + `www` (custom domains attached to the worker).
DNS + zone are on Cloudflare. The Cloudflare MCP plugin can manage Workers/DNS/domains
directly (`/plugin install cloudflare@cloudflare`, OAuth).

## Handoff — running this yourself

Everything that renders is a function of files **in this repo** + the pinned `brand/`
submodule. No tribal knowledge: edit the contract, push, the site regenerates and redeploys.

**Run / change / review:**
- **Build:** `npm run build` → `dist/` (pure, no network — safe in `nix build`).
- **Change copy:** `data/profile.json` (bio, experience, seeking) or `data/highlight-copy.json`
  (Selected Work descriptions). Push — Cloudflare builds + deploys.
- **Change the corpus / pins:** `PINS` in `fetch.mjs`, then refresh (`refresh.yml` runs it weekly).
- **Review copy:** `npm run check:copy` locally, or it runs on every PR touching the copy
  (see §Copy review for how to triage findings).
- **Audit copy:** `npm run audit` locally (same gate as CI; vendored + pinned, runs offline).

**The gates:**
- `build.mjs` — schema-validates both contracts (blocking).
- `brand-checks.yml` — tokens, content, meta, a11y contrast (blocking).
- `copy-review.yml` — agentic copy review (report-only; `--strict` to block).
- `audit.yml` — `npm run audit`: prose + grounding gates via the vendored auditor (`--strict`: blocks on error / ungrounded).
- `linkedin-check.yml` — `profile.json` ↔ LinkedIn drift (report-only).

**Definition of done (handoff-ready):**
- [ ] `npm run build` green; both contracts schema-valid.
- [ ] `brand-checks` green.
- [ ] `copy-review` shows **zero blockers** (suggestions / nits triaged — fixed, confirmed-defensible, or cut).
- [ ] `ANTHROPIC_API_KEY` is in the repo's **Actions** secret store, so copy-review runs live.
- [ ] Selected Work is the editorial pin set; every description reads self-contained.

**Secrets** live in the repo's **Actions** secret store (Settings → Secrets and variables →
Actions): `ANTHROPIC_API_KEY` (copy review) and `CLOUDFLARE_API_TOKEN` (deploy). The
Codespaces / Dependabot / Copilot stores are separate — Actions can't read them.

# Core infra should not live in dot-named repositories

**Status:** recommendation, not a decision. Needs an issue in `.github-private`;
the session that wrote this could not reach that repo to file one.

**Date:** 2026-08-23. Written from measurements taken while porting the #690
part 3 ratchet.

---

## The claim

`bounded-systems/.github` and `bounded-systems/.github-private` hold the org's
most load-bearing automation — token brokering, commit signing, org defaults,
the package registry, and the ratchets that enforce all of it. They are also the
two repositories that agent tooling can least reach, and one of them cannot be
reached at all. That is not a coincidence to work around; it is a topology
problem that has already caused at least one defect to recur.

## What was measured

Four independent access paths, tested 2026-08-23 from a session that needed
`.github-private`:

| Path | `.github` (public) | `.github-private` (private) |
|---|---|---|
| `add_repo` | refused — name begins with `.` | refused — same rule |
| Anonymous git via session proxy | **works** (public repos only) | not served |
| REST API via session proxy | n/a | `403` — not enabled for this session |
| `git ls-remote` with token | n/a | `403` — no rule allows host |

`add_repo` refuses any repository whose name begins with `.`, because the clone
directory would be a hidden path that could collide with configuration
directories. That rule is reasonable on its own terms. Its consequence is not
obvious: a **private** dot-named repo has no fallback, because the anonymous lane
serves public repositories only. `.github` remains reachable purely because it is
public — a property of its visibility, not a designed access path.

`create_session` with `source_url` does accept a dot-named URL, so the situation
is not absolute. But that workaround means a bespoke session per piece of work,
and it does not compose: two dot-named repos cannot both be attached that way.

## Why this is more than tooling friction

**The dot-repo split caused #690 part 3.**

`.github`'s `workflows.test.mjs` asserts that no workflow writes history with
`git`. It resolves `.github/workflows` relative to its own checkout and runs from
`.github`'s own `schema` job, so its blast radius is exactly one repository.
`.github-private` was never covered, and the same unsigned-commit defect landed
there a third time.

Porting the ratchet fixes that instance. It does not fix the class: any future
repo is uncovered again, and the port itself must be maintained in parallel. A
single normal repository holding both the guarded workflows and the ratchet that
guards them would not have this shape at all.

Nor is the ratchet the only thing split this way. `org/rulesets/ci-green.json`
lives in `.github-private` while the job it would gate (`schema`) lives in
`.github`, which is why that gap is documented as open rather than closed.

## What is actually pinned to `.github`

Little of it. GitHub's conventions require only:

- `profile/README.md` — the org profile page
- `.github/ISSUE_TEMPLATE/` and `config.yml` — org-wide fallback templates
- `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md` — community health
  fallbacks
- `workflow-templates/` — starter workflows (none currently)

Everything else is ordinary infrastructure that happens to live there:

- **7 reusable `workflow_call` workflows** — `_claim`, `_labels`,
  `repo-flake-publish`, `repo-release`, `repo-scorecard`, `repo-standard`,
  `site-deploy`. Reusable workflows are callable from any repository.
- **2 composite actions** — `broker-gh-token`, `signed-commit`. Nothing requires
  these to be local.
- **~15 scheduled and dispatch workflows** — org-defaults, branch-sweep,
  registry-graph, release-cut, sign-branch, required-baseline, and the rest.
  These must run somewhere; that somewhere need not be a dot repo.
- **Root tooling** — `org-defaults.mjs`, `claim-digest.mjs`, `workflows.test.mjs`,
  `gh-permission-reconcile.test.mjs`, plus `knowledge/`, `scripts/`, `tools/`,
  `docs/`, `content/`, and a 20-file `.claude/` directory.

In `.github-private`: `registry/` (`generate.ts`, `scope.ts`, `registry.json`),
the rulesets, `registry-refresh.yml`, and the lint lanes. None of it is pinned
there by any GitHub convention; it is private because it should be private, which
is a property a normal private repo has too.

## A second benefit, independent of agent access

`uses: ./.github/actions/broker-gh-token` is a local path. It cannot be pinned by
SHA, cannot be released, and cannot be consumed by another org or by a repo that
has not vendored it. The org already pins third-party actions by SHA
(`actions/checkout@9c091bb…`) and by tag (`bdelanghe/synoptic-github@v2`), so the
discipline exists — the local-path actions are simply exempt from it by virtue of
where they live. Moving them to their own repositories would bring them under the
same pinning rules as everything else.

## Proposed shape

Not a migration plan — a direction to evaluate:

1. `broker-gh-token` and `signed-commit` become their own versioned repositories,
   consumed by SHA.
2. The reusable `workflow_call` workflows move to a normal repo (`ci-workflows`
   already exists and may be the home).
3. The registry moves out of `.github-private` into a normal private repo, taking
   `generate.ts`, `scope.ts`, its fixtures, and its lint lane with it — so the
   ratchet and the workflows it guards finally sit in one place.
4. `.github` and `.github-private` keep only what GitHub pins there.

## Cost, stated honestly

This is a migration with real churn: every `uses:` reference updates, the
rulesets' required-check names may change, and `CODEOWNERS` and branch protection
need revisiting per repo. It should not be done because one session found one
repo hard to reach. It should be done — if it is done — because the automation
that guards the org cannot currently be tested from the same place it runs, and
that has already produced a defect three times.

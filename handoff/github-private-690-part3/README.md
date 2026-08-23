# Staged — not this repository's code

This directory holds work destined for **`bounded-systems/.github-private`**
(issue #690 part 3). It is parked here only because the session that produced it
could not attach that repository.

**Nothing here is wired into `bdelanghe/bdelanghe`.** No workflow references it,
and it asserts about a workflow directory that is not this one's concern. Move it
to its destination and delete this directory; do not treat it as this repo's lint.

## Why it is parked here

`bounded-systems/.github-private` is private, and its name begins with `.`.
Those two facts close both routes into a session:

- `add_repo` refuses any repository whose name begins with `.` — the clone
  directory would be a hidden path. Confirmed 2026-08-23; this is the refusal the
  originating hand-off's §6 already recorded.
- The session git proxy serves anonymous reads of **public** GitHub repositories.
  A private repository does not qualify, so there is no read fallback either.

`list_repos` reports the repository with `can_push: true`. The permission exists;
the transport does not. Attaching it requires creating the session through the
web selector with the working set declared up front.

## What this file is

`workflow-commit-ratchet.test.mjs` — a port of the commit/push ratchet in
`bounded-systems/.github`'s `workflows.test.mjs`, read at `99e88a0`.

The original asserts that no workflow writes history with `git`. It resolves
`.github/workflows` relative to its own checkout and runs from `.github`'s
`schema` job, so it has only ever covered `.github`. `.github-private` was never
in its blast radius, and the same defect landed there a third time in
`registry-refresh.yml`.

### Verification

The source ratchet was confirmed live before porting: 75/75 pass, then an
injected executable `git commit` produced exactly one failure on the expected
test, then restore returned to green.

The port was then mutation-tested on its own fixture:

| Case | Expected | Result |
|---|---|---|
| Clean workflow tree | green | 23 pass, 0 fail |
| `git config … && git commit && git push` injected | red | 22 pass, 1 fail |
| Commented mention of the pattern | green | 23 pass, 0 fail |
| Empty workflow directory | red | 1 fail |

The last row is an addition, not a port. The original registers one test per
file, so an empty directory registers zero tests and reports green having
measured nothing — the same "we measured all 45" failure that `registry/scope.ts`
exists to prevent. It is asserted here rather than left implicit.

## What is NOT done

- **Wiring.** The lint lane invocation is unknown — whether `_workflow-lint.yml`
  or `_scripts-lint.yml` is the right home, whether it runs from the repository
  root, and whether `bun` or `node --test` is the runner. The file is written to
  be dropped in; it is not correct about its own wiring, because that could not
  be read.
- **#688** (`generate.ts` reading a 403 as "manifest absent") and **#690 part 2**
  (`createCommitOnBranch`). Both live entirely in `.github-private` and were not
  attempted. Writing them from the snippets quoted in a hand-off, against files
  never opened, would reproduce the exact defect #688 describes.
- **#690 part 1**, the GitHub App installation token, remains a `[settings]`
  action. Part 2 alone makes the commits signed and leaves the PRs unmergeable.

While in `.github-private`, note that `.github/actions/signed-commit/action.yml`
exists in `.github` and may be a cleaner reference for part 2 than the
`org-defaults.yml` `pin` job the hand-off cites.

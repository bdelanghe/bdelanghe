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

## What this ratchet cannot see — measured, not theorised

The YAML assertion proves only that no workflow **file** contains an executable
`git commit`/`git push`. It cannot see a git write inside a `uses:` action.

Measured in `bdelanghe/bdelanghe`, where this directory is parked. No workflow
there contains any executable git write, and the ratchet runs clean — 23 tests,
0 failures. Then the commit-verification check was run against the same branch:

```
Scanned 116 commit(s) on bdelanghe/bdelanghe@main (full history of the ref).
92 unverified:
    71  unsigned  github-actions[bot]
    18  unsigned  Robert
     3  unsigned  GitHub
```

The 71 bot commits come from `bdelanghe/synoptic-github@v2`, invoked by
`readme.yml`. `reason: unsigned` settles what the YAML could not: a
`createCommitOnBranch` call would have produced a *verified* bot commit, so the
action is writing history with `git` inside the runner. The exact defect of #690
part 2, in a lane the ported ratchet reports green on.

To be clear about relevance: `bdelanghe/bdelanghe` does not require signatures,
so this is not a defect *there* — it is simply the state, and it is being used
here as the fixture that proves the gap. In `.github-private`, where `main`
carries `required_signatures`, the same shape is what makes a PR unmergeable.

## The commit-verification check

`commit-verification.mjs` closes the class by asserting the **outcome** rather
than the mechanism: whatever wrote the commit, by whatever route, GitHub either
verified it or did not.

```
node check-commit-verification.mjs --owner bounded-systems --repo .github-private --ref main
```

Flags: `--since <ISO8601>`, `--allow <sha,sha>`. Token from `GH_TOKEN`, else
`GITHUB_TOKEN`. Exit 0 only when a non-empty scan completed and every commit was
verified.

Every failure mode is a throw, deliberately — this is the #688 lesson applied to
a new transport. A non-2xx throws; a missing token throws rather than skipping; an
empty scan throws rather than reporting clean; a truncated scan throws rather than
reporting on a prefix. There is no path through the module that reports success
from a failed or incomplete read.

`commit-verification.test.mjs` covers this with 15 pure tests, no network — the
transport is stubbed. Every guard was mutation-tested; each mutation reds exactly
its own tests and restore returns green:

| Mutation | Expected | Result |
|---|---|---|
| Non-2xx returns `[]` instead of throwing (the #688 shape) | red | 5 fail |
| Missing `verification` block reads as verified | red | 1 fail |
| Denominator guard removed | red | 1 fail |
| Truncated scan returns its prefix silently | red | 1 fail |
| Missing token skips instead of throwing | red | 1 fail |
| Restore | green | 15 pass, 0 fail |

### Two environment traps found while smoke-testing it

- **Node's `fetch` ignores `HTTPS_PROXY`.** `curl` honors the proxy and gets 200;
  the same request from node's global `fetch` goes direct and gets
  `401 Bad credentials`, because the proxy is what supplies working credentials.
  Run with `NODE_USE_ENV_PROXY=1` (node 22+). A session that reads the 401 as
  "my token is wrong" will chase the wrong thing for a while.
- **`GITHUB_TOKEN` and `GH_TOKEN` can both be set with only one valid.** Here
  `GITHUB_TOKEN` 401s and `GH_TOKEN` works. The CLI uses `gh`'s own precedence —
  `GH_TOKEN` first — which is the order that works in both environments.

Both were caught only because the check fails closed. Reading a 401 as "no
unverified commits found" would have printed a clean green run.

## What is NOT done

- **Wiring.** Neither the ratchet nor the verification check is wired into a
  lane. The invocation is unknown — whether `_workflow-lint.yml`
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

When wiring the verification check in `.github-private`, note that its history
predates the rule, so it will need either a `--since` boundary or an `--allow`
list on first run. Both are disclosed in the check's own output; neither is
silent. `findStaleAllowEntries` fails the run if an allowlisted SHA falls outside
the scanned range, so the exemption cannot quietly outlive what it excused.

While in `.github-private`, note that `.github/actions/signed-commit/action.yml`
exists in `.github` and may be a cleaner reference for part 2 than the
`org-defaults.yml` `pin` job the hand-off cites.

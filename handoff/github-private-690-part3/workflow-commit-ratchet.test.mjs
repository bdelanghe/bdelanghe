// Port of `.github`'s commit/push ratchet into this repo (#690 part 3).
//
// ── Why this file exists in THIS repo ────────────────────────────────────────
// `.github`'s workflows.test.mjs has asserted since #128/#129 that no workflow
// writes history with git. That assertion reads `.github/workflows` RELATIVE to
// the checkout it runs from, and it runs from `.github`'s own `schema` job — so
// it has only ever covered `.github`'s workflow directory. `.github-private` was
// never in its blast radius, and the identical defect landed here a third time
// in registry-refresh.yml (#690 part 2).
//
// Three instances of one mistake is where porting the ratchet stops being
// optional. The fix is not a better comment in the offending lane; it is this
// assertion running against THIS repo's workflow directory.
//
// ── The failure shape being ratcheted ────────────────────────────────────────
// `main` here carries `required_signatures`. A commit made by `git commit`
// inside a runner carries none (registry-refresh's f16b2fd -> verified: false,
// reason: unsigned). The lane still goes entirely green — the branch pushes, the
// PR opens — and the PR is simply unmergeable forever. Every check passing while
// the outcome is impossible is the required-baseline failure shape (infra#135).
//
// The fix each lane uses is `createCommitOnBranch`: commits made through the API
// are signed by GitHub as the token's identity, so the rule is satisfied with no
// signing key in the runner. See `.github`'s `org-defaults.yml` `pin` job, or the
// `.github/actions/signed-commit` composite action, for the reference shape.
//
// ── Scope caveat, stated because the same lane keeps overclaiming ────────────
// This ratchet makes commits SIGNED. It does not make the PRs MERGEABLE. A PR
// opened with `github.token` starts no workflow runs, so the required `gate`
// check never exists and the ruleset blocks the merge regardless of signature.
// That is #690 part 1 (a GitHub App installation token), a [settings] action,
// and nothing in this file touches it.
//
// `git push` is covered by the same assertion for the same reason: pushing is
// how a runner-made commit reaches the branch. Comments may name either — both
// fixed lanes explain themselves at length; only an executable occurrence is the
// defect.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = ".github/workflows";

// Resolved relative to the working directory, exactly as the upstream ratchet
// does — so this must run from the repository root. A wrong cwd raises ENOENT
// from readdirSync at module load, which fails the run but reports it as a
// filesystem stack rather than as the wiring mistake it is. Restated, because a
// check whose failure is unreadable gets rerun, not diagnosed.
let files;
try {
  files = readdirSync(DIR).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
} catch (err) {
  throw new Error(
    `Cannot read ${DIR} from ${process.cwd()}. This ratchet resolves the ` +
      `workflow directory relative to the working directory, so it must run ` +
      `from the repository root. (${err.code ?? err.message})`,
  );
}

// Guard the denominator. `readdirSync` on a path that exists but holds nothing
// yields `[]`, and a `for` loop over `[]` registers ZERO tests — a suite that
// passes by measuring nothing. This is the same "we measured all 45" failure
// the registry's scope.ts exists to prevent, so it is asserted, not assumed.
test("ratchet: the workflow directory is non-empty", () => {
  assert.ok(
    files.length > 0,
    `${DIR} yielded no workflow files. The per-file assertions below register ` +
      `one test per file, so an empty directory makes this suite green while ` +
      `checking nothing.`,
  );
});

for (const file of files) {
  test(`${file}: creates commits through the API, not git`, () => {
    const offenders = readFileSync(join(DIR, file), "utf8")
      .split("\n")
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => !line.trim().startsWith("#"))
      .filter(({ line }) => /\bgit\s+(commit|push)\b/.test(line));

    assert.deepEqual(
      offenders.map(({ n, line }) => `${n}: ${line.trim().slice(0, 70)}`),
      [],
      `${file} runs git commit/push in the runner. Runner-made commits are ` +
        `unsigned and this repo requires verified signatures, so the lane goes ` +
        `green and produces a PR that can never merge (#129, #690). Force the ` +
        `ref with the refs API, then carry the file changes in one ` +
        `createCommitOnBranch mutation — see the pin job in org-defaults.yml.`,
    );
  });
}

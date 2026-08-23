// Pure tests for commit-verification.mjs. No network: the transport is stubbed,
// per the originating hand-off's §2 ("cover both with pure tests (no network)
// and mutation-test them").

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  findUnverified,
  findStaleAllowEntries,
  assertScanned,
  fetchCommits,
} from "./commit-verification.mjs";

const commit = (sha, verified, reason = "valid", name = "Someone") => ({
  sha,
  commit: {
    author: { name },
    message: `subject for ${sha}\n\nbody`,
    verification: { verified, reason },
  },
});

// ── the core judgement ──────────────────────────────────────────────────────

test("all-verified history yields no offenders", () => {
  const commits = [commit("aaa", true), commit("bbb", true)];
  assert.deepEqual(findUnverified(commits), []);
});

test("an unsigned commit is reported with its reason", () => {
  // The exact shape measured on bdelanghe/bdelanghe: a third-party action
  // writing history with git inside the runner.
  const commits = [
    commit("aaa", true),
    commit("b8a5018", false, "unsigned", "github-actions[bot]"),
  ];
  const out = findUnverified(commits);
  assert.equal(out.length, 1);
  assert.equal(out[0].sha, "b8a5018");
  assert.equal(out[0].reason, "unsigned");
  assert.equal(out[0].author, "github-actions[bot]");
});

test("a missing verification block is an offender, not a pass", () => {
  // Absent data must never read as satisfied — the #688 lesson applied to the
  // shape of the payload rather than to the transport.
  const commits = [{ sha: "ccc", commit: { author: { name: "X" }, message: "m" } }];
  const out = findUnverified(commits);
  assert.equal(out.length, 1);
  assert.equal(out[0].reason, "no verification block");
});

test("an allowlisted sha is excused", () => {
  const commits = [commit("legacy", false, "unsigned")];
  assert.deepEqual(findUnverified(commits, { allow: ["legacy"] }), []);
});

test("an allowlist entry outside the scan is reported stale", () => {
  const commits = [commit("aaa", true)];
  assert.deepEqual(findStaleAllowEntries(commits, ["gone", "aaa"]), ["gone"]);
});

// ── the denominator ─────────────────────────────────────────────────────────

test("an empty scan throws rather than reporting clean", () => {
  assert.deepEqual(findUnverified([]), [], "precondition: empty looks clean");
  assert.throws(() => assertScanned([], { ref: "main" }), /Scanned 0 commits/);
});

test("a non-empty scan returns its denominator", () => {
  assert.equal(assertScanned([commit("aaa", true)], { ref: "main" }), 1);
});

// ── failing closed on transport, which is why this file exists ──────────────

test("a missing token throws instead of skipping", async () => {
  await assert.rejects(
    () => fetchCommits({ owner: "o", repo: "r", ref: "main", token: "" }),
    /refusing to skip/i,
  );
});

for (const status of [403, 429, 500, 502]) {
  test(`HTTP ${status} throws rather than reading as "no unverified commits"`, async () => {
    const real = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response("denied", { status, statusText: "Nope" });
    try {
      await assert.rejects(
        () => fetchCommits({ owner: "o", repo: "r", ref: "main", token: "t" }),
        new RegExp(`GitHub API ${status}`),
      );
    } finally {
      globalThis.fetch = real;
    }
  });
}

test("a 404 is fatal too — an audited ref must exist", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = async () => new Response("[]", { status: 404 });
  try {
    await assert.rejects(
      () => fetchCommits({ owner: "o", repo: "r", ref: "nope", token: "t" }),
      /GitHub API 404/,
    );
  } finally {
    globalThis.fetch = real;
  }
});

test("a truncated scan throws rather than reporting on a prefix", async () => {
  const real = globalThis.fetch;
  const full = Array.from({ length: 100 }, (_, i) => commit(`s${i}`, true));
  globalThis.fetch = async () =>
    new Response(JSON.stringify(full), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  try {
    await assert.rejects(
      () => fetchCommits({ owner: "o", repo: "r", ref: "main", token: "t" }),
      /MAX_PAGES/,
    );
  } finally {
    globalThis.fetch = real;
  }
});

test("pagination stops cleanly on a short page", async () => {
  const real = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    const body = calls === 1
      ? Array.from({ length: 100 }, (_, i) => commit(`a${i}`, true))
      : [commit("tail", true)];
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const out = await fetchCommits({ owner: "o", repo: "r", ref: "main", token: "t" });
    assert.equal(out.length, 101);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = real;
  }
});

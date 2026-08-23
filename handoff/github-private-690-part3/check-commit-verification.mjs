#!/usr/bin/env node
// CLI for commit-verification.mjs. Intended for a lint lane:
//
//   node check-commit-verification.mjs --owner bounded-systems --repo .github-private --ref main
//
// Env: GH_TOKEN, else GITHUB_TOKEN — gh's own precedence. Measured 2026-08-23: an
// environment can carry BOTH with only one valid, and the wrong order 401s. Optional --since <ISO8601>, --allow <sha,sha>.
// Exit 0 only when a non-empty scan completed and every commit was verified.

import {
  fetchCommits,
  findUnverified,
  findStaleAllowEntries,
  assertScanned,
  formatReport,
} from "./commit-verification.mjs";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

const owner = arg("owner");
const repo = arg("repo");
const ref = arg("ref", "main");
const since = arg("since");
const allow = (arg("allow", "") || "").split(",").filter(Boolean);
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

if (!owner || !repo) {
  console.error("usage: --owner <o> --repo <r> [--ref main] [--since ISO] [--allow sha,sha]");
  process.exit(2);
}

// No try/catch around this. Every failure mode in the module is deliberately a
// throw, and swallowing them here to print a tidy message would reintroduce the
// exact defect the module exists to avoid: a nonzero outcome rendered as a
// readable, ignorable line. Let it fail the lane with its stack.
const commits = await fetchCommits({ owner, repo, ref, since, token });
assertScanned(commits, { ref });

const stale = findStaleAllowEntries(commits, allow);
const offenders = findUnverified(commits, { allow });

console.log(formatReport({ owner, repo, ref, since, commits, offenders }));

if (stale.length) {
  console.error(`\nStale --allow entries, not present in the scanned range: ${stale.join(", ")}`);
}
if (offenders.length || stale.length) process.exit(1);
console.log("All scanned commits are verified.");

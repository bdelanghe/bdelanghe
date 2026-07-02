#!/usr/bin/env node
// Agentic copy review: the authored prose in data/profile.json + data/site.json,
// read by Claude and judged against the site's own thesis and voice.
//
// The other gates are deterministic — schemas, tokens, contrast, meta. Prose
// isn't: "this line overclaims", "this drifts off-thesis", "this reads like AI
// filler" are judgement calls a linter can't make. This gate asks a model to
// make them, so the copy that ships is held to the same bar as everything else.
//
// It reviews the *source* copy (what you author), not rendered HTML — findings
// point at the field to edit. Four axes: claim integrity, thesis coherence,
// voice, clarity. Returns structured findings by severity (blocker/suggestion/nit).
//
// Usage:  node copy-review.mjs            report-only (exit 0)  [npm run check:copy]
//         node copy-review.mjs --strict   exit 1 on any blocker-severity finding
//
// Auth: reads ANTHROPIC_API_KEY from the environment. If it's unset (e.g. a fork
// PR with no access to secrets), the review is SKIPPED cleanly (exit 0) — it
// never blocks a contributor who can't run it.
//
// In CI the key must live in the repo's *Actions* secret store
// (Settings → Secrets and variables → Actions) — the Codespaces, Dependabot,
// and Copilot-agent stores are separate and Actions workflows cannot read them.
//
// Dependency-free: Node builtins + global fetch (same as fetch.mjs). One call to
// the Anthropic Messages API; nothing is written.
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const strict = process.argv.includes("--strict");
const MODEL = "claude-opus-4-8";

// ---- the thesis the copy is measured against -----------------------------------
// One sentence, kept here so the reviewer judges against the site's actual
// argument rather than a generic "is this good writing" bar.
const THESIS =
  "Bobby is a senior software engineer who ships agent-authored software in " +
  "production and built the capability-security guardrails (signed owners, " +
  "contract-and-validation in CI) that make trusting agents in production possible. " +
  "The work generalises in prx and the bounded-systems libraries (capability-security " +
  "and agent-infrastructure). The throughline is an old instinct — make invalid " +
  "states unrepresentable — applied to agents.";

const SYSTEM =
  "You are a meticulous, senior copy editor reviewing the prose on a software " +
  "engineer's portfolio site (robertdelanghe.dev). You are tough but fair: most " +
  "lines are deliberate and fine — surface only real problems, and do not invent " +
  "issues to look useful. Judge each piece of copy on four axes:\n" +
  "1. CLAIM INTEGRITY — anything unsupported, inflated, or that an interviewer " +
  "could expose as a bluff. This is the highest-stakes axis.\n" +
  "2. THESIS COHERENCE — the site argues one thing (given below). Flag copy that " +
  "drifts off it, dilutes it, or contradicts it.\n" +
  "3. VOICE — declarative, specific, earned confidence. Flag AI-slop and filler: " +
  "generic phrasing, hedging, 'passionate about', resume cliché, marketing fluff. " +
  "(Em-dashes and a distinctive voice are intentional here — do not flag those.)\n" +
  "4. CLARITY — genuinely confusing or convoluted lines.\n\n" +
  "Severity: 'blocker' = a claim-integrity problem or a thesis contradiction " +
  "(something that should not ship); 'suggestion' = a voice or clarity improvement; " +
  "'nit' = minor polish. If the copy is clean, return verdict 'pass' with an empty " +
  "findings array. Each finding's `location` must name the exact field it refers to.";

// Structured-output schema (Opus 4.8). No length/numeric constraints — those are
// unsupported; enum + required + additionalProperties:false are fine.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: { type: "string", enum: ["pass", "issues"] },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          severity: { type: "string", enum: ["blocker", "suggestion", "nit"] },
          location: { type: "string" },
          issue: { type: "string" },
          fix: { type: "string" },
        },
        required: ["severity", "location", "issue", "fix"],
      },
    },
  },
  required: ["verdict", "findings"],
};

// ---- assemble the copy bundle (authored prose only) ----------------------------
const readJson = async (p) => JSON.parse(await readFile(join(root, p), "utf8"));

function bundle(profile, site, highlightCopy = {}) {
  const out = {
    headline: profile.headline,
    intro: profile.intro,
    summary: profile.summary,
    seeking: profile.seeking && {
      label: profile.seeking.label,
      focus: profile.seeking.focus,
      detail: profile.seeking.detail,
    },
    experience: (profile.experience || []).map((e) => ({
      org: e.org,
      role: e.role,
      what: e.what,
      bullets: e.bullets,
    })),
    // Review the copy that actually ships: apply the editorial overrides
    // (data/highlight-copy.json) that build.mjs applies, not the raw upstream
    // GitHub descriptions in site.json.
    selected_work: (site.highlights || []).map((h) => ({
      name: h.name,
      description: highlightCopy[h.name] ?? h.description,
    })),
  };
  return out;
}

// ---- report --------------------------------------------------------------------
const ICON = { blocker: "🔴", suggestion: "🟡", nit: "⚪" };

function render(result) {
  const { verdict, findings } = result;
  const lines = [];
  lines.push("# Copy review\n");
  if (!findings.length) {
    lines.push(`✓ ${MODEL} found no issues — copy is on-thesis and clean.`);
    return { md: lines.join("\n"), blockers: 0 };
  }
  const order = { blocker: 0, suggestion: 1, nit: 2 };
  const sorted = [...findings].sort((a, b) => order[a.severity] - order[b.severity]);
  const counts = sorted.reduce((m, f) => ((m[f.severity] = (m[f.severity] || 0) + 1), m), {});
  const blockers = counts.blocker || 0;
  lines.push(
    `Verdict: **${verdict}** — ` +
      `🔴 ${blockers} blocker${blockers === 1 ? "" : "s"} · ` +
      `🟡 ${counts.suggestion || 0} suggestion${(counts.suggestion || 0) === 1 ? "" : "s"} · ` +
      `⚪ ${counts.nit || 0} nit${(counts.nit || 0) === 1 ? "" : "s"}\n`,
  );
  for (const f of sorted) {
    lines.push(`### ${ICON[f.severity]} \`${f.location}\``);
    lines.push(`**Issue:** ${f.issue}`);
    lines.push(`**Fix:** ${f.fix}\n`);
  }
  return { md: lines.join("\n"), blockers };
}

// Write a line to the GitHub Actions run summary when present, so skips and
// errors are visible in the PR's checks tab — not buried in raw job logs.
async function summary(md) {
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFile } = await import("node:fs/promises");
    await appendFile(process.env.GITHUB_STEP_SUMMARY, md + "\n");
  }
}

// ---- main ----------------------------------------------------------------------
async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const msg = "copy-review: skipped — ANTHROPIC_API_KEY is not set.";
    console.log(msg);
    await summary(`# Copy review\n\n⚠️ _${msg}_`);
    return 0; // never block a contributor who can't run the review
  }

  const [profile, site, highlightCopy] = await Promise.all([
    readJson("data/profile.json"),
    readJson("data/site.json"),
    readJson("data/highlight-copy.json").catch(() => ({})),
  ]);
  const copy = bundle(profile, site, highlightCopy);

  let resp;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: SYSTEM,
        output_config: { format: { type: "json_schema", schema: SCHEMA } },
        messages: [
          {
            role: "user",
            content:
              `THESIS (what the whole site argues):\n${THESIS}\n\n` +
              `Review this copy. Return findings via the schema.\n\n` +
              "```json\n" +
              JSON.stringify(copy, null, 2) +
              "\n```",
          },
        ],
      }),
    });
    if (!r.ok) {
      const body = await r.text();
      throw new Error(`HTTP ${r.status}: ${body.slice(0, 300)}`);
    }
    resp = await r.json();
  } catch (err) {
    // Infrastructure failure (network, rate limit, API hiccup) must not block a
    // merge — the gate blocks on content problems, not on transient API errors.
    console.error(`copy-review: API call failed — ${err.message}`);
    console.error("copy-review: treating as a skip (no merge block on infra errors).");
    await summary(`# Copy review\n\n⚠️ _API call failed — ${err.message}. Treated as a skip._`);
    return 0;
  }

  if (resp.stop_reason === "refusal") {
    console.error("copy-review: model declined to review; skipping.");
    await summary("# Copy review\n\n⚠️ _Model declined to review; skipped._");
    return 0;
  }

  const text = (resp.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    console.error("copy-review: could not parse model response; skipping.");
    console.error(text.slice(0, 500));
    await summary("# Copy review\n\n⚠️ _Could not parse the model response; skipped._");
    return 0;
  }

  const { md, blockers } = render(result);
  console.log(md);
  await summary(md);

  if (strict && blockers > 0) {
    console.error(`\ncopy-review: ${blockers} blocker(s) under --strict → failing.`);
    return 1;
  }
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(strict ? 1 : 0);
  },
);

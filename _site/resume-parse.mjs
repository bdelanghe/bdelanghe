#!/usr/bin/env node
// Resume-parser gate: read the rendered résumé the way an automated parser (ATS)
// would, count its tokens, and have Claude parse it *as an ATS* — extract the
// structured fields a real applicant-tracking system pulls, and report what it
// could NOT confidently extract or would misread.
//
// The point: a résumé is read by machines before humans. This shows, concretely,
// how this one survives that pass — which fields land, which get mangled.
//
// Usage:  node resume-parse.mjs            report-only (exit 0)
//         node resume-parse.mjs --strict   exit 1 if ats_parseability < THRESHOLD
//
// Reads dist/resume.html (run `node build.mjs` first). Auth: ANTHROPIC_API_KEY
// from the environment (the repo's Actions secret store). Skips cleanly if unset.
// Dependency-free: raw fetch to the Messages + count_tokens APIs, like fetch.mjs.
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const strict = process.argv.includes("--strict");
const MODEL = "claude-opus-4-8";
const THRESHOLD = 80; // --strict fails below this ats_parseability

// What a naive parser ingests: the résumé page stripped to text (no markup,
// no structured data). The hard case — if it parses cleanly here, it parses
// anywhere.
async function resumeText() {
  const html = await readFile(join(root, "dist", "resume.html"), "utf8");
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&middot;/g, "·")
    .replace(/&amp;/g, "&")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SYSTEM =
  "You are an automated résumé parser — an applicant-tracking system (ATS). You are " +
  "given the raw text of a résumé exactly as extracted from the document (no markup, " +
  "no structured metadata). Parse it the way a real ATS does: extract only what is " +
  "literally present and unambiguous; do not infer, normalize, or fill gaps from world " +
  "knowledge. Where the text is ambiguous (a field that runs together with others, a " +
  "non-standard date, a location mixed with other tokens), record it as a parse gap " +
  "rather than guessing — that is what a real parser would surface as a low-confidence " +
  "or dropped field. Then give an honest ats_parseability score (0–100): how cleanly a " +
  "typical ATS would extract this résumé into structured fields.";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    ats_parseability: { type: "integer" },
    overall: { type: "string" },
    parsed: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        title: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        location: { type: "string" },
        links: { type: "array", items: { type: "string" } },
        work_experience: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              company: { type: "string" },
              title: { type: "string" },
              dates: { type: "string" },
              summary: { type: "string" },
            },
            required: ["company", "title", "dates", "summary"],
          },
        },
        education: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: { institution: { type: "string" }, dates: { type: "string" } },
            required: ["institution", "dates"],
          },
        },
        skills: { type: "array", items: { type: "string" } },
      },
      required: ["name", "title", "email", "phone", "location", "links", "work_experience", "education", "skills"],
    },
    gaps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          field: { type: "string" },
          issue: { type: "string" },
          severity: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["field", "issue", "severity"],
      },
    },
  },
  required: ["ats_parseability", "overall", "parsed", "gaps"],
};

async function summary(md) {
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFile } = await import("node:fs/promises");
    await appendFile(process.env.GITHUB_STEP_SUMMARY, md + "\n");
  }
}

async function countTokens(apiKey, text) {
  const r = await fetch("https://api.anthropic.com/v1/messages/count_tokens", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: text }] }),
  });
  if (!r.ok) return null;
  return (await r.json()).input_tokens ?? null;
}

const ICON = { high: "🔴", medium: "🟡", low: "⚪" };

function render(text, tokens, result) {
  const { ats_parseability, overall, parsed, gaps } = result;
  const L = [];
  L.push("# Résumé parser (ATS) check\n");
  L.push(`**ATS parseability: ${ats_parseability}/100** — ${overall}\n`);
  L.push(`Input: ${text.length} chars · ${tokens ?? "?"} tokens (Claude tokenizer)\n`);
  L.push("## What the parser extracted\n");
  L.push("```json\n" + JSON.stringify(parsed, null, 2) + "\n```\n");
  if (gaps.length) {
    const order = { high: 0, medium: 1, low: 2 };
    L.push("## Parse gaps (what an ATS drops or mangles)\n");
    for (const g of [...gaps].sort((a, b) => order[a.severity] - order[b.severity])) {
      L.push(`- ${ICON[g.severity]} **${g.field}** — ${g.issue}`);
    }
    L.push("");
  }
  return L.join("\n");
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const msg = "resume-parse: skipped — ANTHROPIC_API_KEY is not set.";
    console.log(msg);
    await summary(`# Résumé parser (ATS) check\n\n⚠️ _${msg}_`);
    return 0;
  }

  const text = await resumeText();

  let tokens = null;
  let result;
  try {
    tokens = await countTokens(apiKey, text);
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: SYSTEM,
        output_config: { format: { type: "json_schema", schema: SCHEMA } },
        messages: [{ role: "user", content: `Raw résumé text:\n\n"""\n${text}\n"""` }],
      }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const resp = await r.json();
    if (resp.stop_reason === "refusal") {
      console.error("resume-parse: model declined; skipping.");
      return 0;
    }
    result = JSON.parse((resp.content || []).filter((b) => b.type === "text").map((b) => b.text).join(""));
  } catch (err) {
    console.error(`resume-parse: failed — ${err.message}`);
    await summary(`# Résumé parser (ATS) check\n\n⚠️ _Failed: ${err.message}. Treated as a skip._`);
    return 0;
  }

  const md = render(text, tokens, result);
  console.log(md);
  await summary(md);

  if (strict && result.ats_parseability < THRESHOLD) {
    console.error(`\nresume-parse: ats_parseability ${result.ats_parseability} < ${THRESHOLD} under --strict → failing.`);
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

#!/usr/bin/env node
// Drift check: data/profile.json (canonical) vs a LinkedIn export (downstream copy).
//
// GitHub is the source of truth. LinkedIn drifts — titles, dates, and framing get
// edited there and fall out of sync. This compares the two and reports what to fix
// *on LinkedIn*, so the repo stays authoritative without manual eyeballing.
//
// Artifact: data/linkedin/resume.json in JSON Resume format (jsonresume.org) —
// an existing open standard with a published JSON Schema (vendored at
// contract/jsonresume.schema.json). Export your LinkedIn profile to JSON Resume
// (e.g. the JSON Resume exporter), drop it here, commit.
//
// Usage:  node linkedin-check.mjs           report-only (exit 0)
//         node linkedin-check.mjs --strict   exit 1 on schema-invalid or unaccepted drift
//
// Pure: reads files only, no network. Node builtins + the local validator.
import { readFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateSchema } from "./schema-validate.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const lkDir = join(root, "data", "linkedin");
const strict = process.argv.includes("--strict");
const exists = async (p) => { try { await access(p); return true; } catch { return false; } };

// ---- normalization -------------------------------------------------------------
const squish = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const orgMatch = (a, b) => {
  const x = squish(a), y = squish(b);
  if (!x || !y) return false;
  return x === y || (x.length >= 3 && y.length >= 3 && (x.includes(y) || y.includes(x)));
};
const normTitle = (s) => String(s).toLowerCase().replace(/\s+/g, " ").trim();

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const SEASONS = { spring: 3, summer: 6, fall: 9, autumn: 9, winter: 12 };
const PRESENT = Symbol("present");

// Accepts ISO8601 ("2023-10", "2025", "2014-06-29") and profile text
// ("Oct 2023", "2018", "Fall 2019", "present"). -> {year, month|null} | PRESENT | null
function parsePoint(s) {
  const t = String(s ?? "").trim().toLowerCase();
  if (!t) return null;
  if (t === "present") return PRESENT;
  const iso = t.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (iso) return { year: +iso[1], month: +iso[2] };
  const year = t.match(/\d{4}/);
  if (!year) return null;
  const word = t.match(/[a-z]+/);
  let month = null;
  if (word) month = MONTHS[word[0].slice(0, 3)] ?? SEASONS[word[0]] ?? null;
  return { year: +year[0], month };
}

// profile "when": "Oct 2023 — present" | "2018 — 2021" | "Fall 2019"
// loose = single token (e.g. "Fall 2019") — asserts a period, not a precise end
// month, so it's compared at year granularity.
function parseWhen(when) {
  const parts = String(when).split(/\s*[—–-]\s*|\s+to\s+/i);
  const start = parsePoint(parts[0]);
  const loose = parts[1] === undefined;
  const end = loose ? start : parsePoint(parts[1]);
  return { start, end, loose };
}

const isPresent = (p) => p === PRESENT || p === null;
function pointsMatch(a, b, { months }) {
  if (isPresent(a) && isPresent(b)) return true;
  if (isPresent(a) || isPresent(b)) return false;
  if (a.year !== b.year) return false;
  if (months && a.month && b.month && a.month !== b.month) return false;
  return true;
}
const fmtPoint = (p) => p === PRESENT ? "present" : p === null ? "—" : p.month ? `${p.year}-${String(p.month).padStart(2, "0")}` : `${p.year}`;

// ---- load ----------------------------------------------------------------------
const profile = JSON.parse(await readFile(join(root, "data", "profile.json"), "utf8"));

const resumePath = join(lkDir, "resume.json");
if (!(await exists(resumePath))) {
  console.error(`✗ no LinkedIn export at ${resumePath}\n  Export your profile to JSON Resume format and drop it here (see data/linkedin/README.md).`);
  process.exit(strict ? 1 : 0);
}
const resume = JSON.parse(await readFile(resumePath, "utf8"));

// validate the artifact against the vendored JSON Resume schema
const schema = JSON.parse(await readFile(join(root, "contract", "jsonresume.schema.json"), "utf8"));
const schemaErrors = validateSchema(schema, resume);

const positions = (resume.work ?? []).map((w) => ({
  org: w.name || "", title: w.position || "",
  start: parsePoint(w.startDate), end: w.endDate ? parsePoint(w.endDate) : PRESENT, raw: w,
}));

let accepted = [];
const accPath = join(lkDir, "accepted-drift.json");
if (await exists(accPath)) accepted = JSON.parse(await readFile(accPath, "utf8")).accepted ?? [];
const isAccepted = (org, field) => accepted.find((a) => orgMatch(a.org, org) && a.field === field);

// ---- expand canonical experience (some entries aggregate several orgs) ---------
// org "A · B · C" => one canonical title spread across orgs A, B, C.
// role "Title · Team" => compare only the Title half.
const canonical = (profile.experience ?? []).flatMap((e) => {
  const orgs = String(e.org).split(/\s+·\s+/);
  const title = String(e.role ?? "").split(/\s+·\s+/)[0].trim();
  const { start, end, loose } = parseWhen(e.when);
  const aggregated = orgs.length > 1;
  return orgs.map((org) => ({ org: org.trim(), title, start, end, aggregated, loose, when: e.when }));
});

// ---- compare -------------------------------------------------------------------
const findings = []; // {level, org, msg}
const matchedLi = new Set();
let factualDrift = 0;

for (const c of canonical) {
  const li = positions.find((p) => orgMatch(p.org, c.org));
  if (!li) {
    findings.push({ level: "warn", org: c.org, msg: `in profile.json, no matching LinkedIn position` });
    continue;
  }
  matchedLi.add(li);

  if (normTitle(c.title) !== normTitle(li.title)) {
    const acc = isAccepted(c.org, "title");
    findings.push({
      level: acc ? "accepted" : "drift", org: c.org,
      msg: `title — profile "${c.title}" vs LinkedIn "${li.title}"${acc ? `  (accepted: ${acc.note})` : ""}`,
    });
    if (!acc) factualDrift++;
  }

  if (c.aggregated) {
    const lo = c.start?.year, hi = c.end === PRESENT ? Infinity : c.end?.year;
    const sY = li.start?.year, eY = li.end === PRESENT ? new Date().getFullYear() : li.end?.year;
    if (lo && hi && sY && eY && (sY < lo || eY > hi)) {
      const acc = isAccepted(c.org, "dates");
      findings.push({ level: acc ? "accepted" : "drift", org: c.org, msg: `dates — LinkedIn ${fmtPoint(li.start)}…${fmtPoint(li.end)} outside profile span ${c.when}` });
      if (!acc) factualDrift++;
    }
  } else {
    const months = !c.loose;
    if (!pointsMatch(c.start, li.start, { months }) || !pointsMatch(c.end, li.end, { months })) {
      const acc = isAccepted(c.org, "dates");
      findings.push({
        level: acc ? "accepted" : "drift", org: c.org,
        msg: `dates — profile ${fmtPoint(c.start)}…${fmtPoint(c.end)} vs LinkedIn ${fmtPoint(li.start)}…${fmtPoint(li.end)}${acc ? `  (accepted: ${acc.note})` : ""}`,
      });
      if (!acc) factualDrift++;
    }
  }
}

// LinkedIn positions with no canonical match — usually intentionally-omitted older roles
for (const li of positions) {
  if (!matchedLi.has(li)) findings.push({ level: "info", org: li.org, msg: `on LinkedIn ("${li.title}"), not in profile.json — intentionally omitted?` });
}

// skills coverage: canonical skills missing from the LinkedIn export
const liSkills = (resume.skills ?? []).flatMap((s) => [s.name, ...(s.keywords ?? [])]).filter(Boolean).map(squish);
if (liSkills.length) {
  const missing = (profile.skills ?? []).filter((s) => !liSkills.some((l) => l && (l.includes(squish(s)) || squish(s).includes(l))));
  if (missing.length) findings.push({ level: "warn", org: "(skills)", msg: `canonical skills not on LinkedIn: ${missing.join(", ")}` });
}

// ---- report --------------------------------------------------------------------
const ICON = { schema: "✗", drift: "✗", warn: "△", accepted: "✓", info: "·" };
const order = ["drift", "warn", "accepted", "info"];

const lines = [];
lines.push(`# LinkedIn ↔ profile.json drift\n`);
lines.push(`Canonical: \`data/profile.json\` · Export: \`data/linkedin/resume.json\` (JSON Resume)\n`);

if (schemaErrors.length) {
  lines.push(`\n## ✗ Schema — resume.json is not valid JSON Resume`);
  for (const e of schemaErrors) lines.push(`- ${e}`);
}

if (!schemaErrors.length && !findings.some((f) => f.level === "drift")) lines.push(`**Valid JSON Resume. No unaccepted drift.** ✓\n`);
for (const lvl of order) {
  const fs = findings.filter((f) => f.level === lvl);
  if (!fs.length) continue;
  const label = { drift: "Drift (fix on LinkedIn)", warn: "Review", accepted: "Accepted (intentional)", info: "On LinkedIn only" }[lvl];
  lines.push(`\n## ${ICON[lvl]} ${label}`);
  for (const f of fs) lines.push(`- **${f.org}** — ${f.msg}`);
}
lines.push(`\n---\nNote: headline and About text aren't auto-diffed — verify those by hand against profile.json's \`headline\` / \`summary\`.`);
const report = lines.join("\n");
console.log(report);

if (process.env.GITHUB_STEP_SUMMARY) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(process.env.GITHUB_STEP_SUMMARY, report + "\n", { flag: "a" });
}

const counts = Object.fromEntries(order.map((l) => [l, findings.filter((f) => f.level === l).length]));
console.error(`\n${schemaErrors.length} schema · ${counts.drift} drift · ${counts.warn} review · ${counts.accepted} accepted · ${counts.info} info`);
if (strict && (factualDrift > 0 || schemaErrors.length > 0)) process.exit(1);

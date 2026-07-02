#!/usr/bin/env node
// Ingest the GitHub corpus, run meta-analysis, curate, and emit data/site.json
// (the contract in contract/site.schema.json). Has network — runs in CI/locally,
// NOT inside the hermetic nix build. Needs GITHUB_TOKEN in the environment.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!TOKEN) { console.error("✗ set GITHUB_TOKEN"); process.exit(1); }

const OWNER = "bdelanghe";
const ORGS = ["bounded-systems"];
// Curated, hand-picked projects shown first (must be public). Edit to taste.
const PINS = [
  "bounded-systems/prx",
  "bounded-systems/guest-room",
  "bounded-systems/claude-box",
  "bounded-systems/door-kit",
  "bounded-systems/ocap-provenance",
  "bounded-systems/string-audit",
];
const MAX_HIGHLIGHTS = 12;
// Selected Work is an editorial set: exactly the pinned repos, in pin order.
// Tag-based auto-include was dropped — the strongest repos are under-tagged, so
// tags surfaced filler and missed gems. "Real" is the floor; "interesting and
// on-thesis" is the bar. Breadth still lives in the corpus stats.

async function ghAll(path) {
  const out = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`https://api.github.com${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`, {
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/vnd.github+json", "User-Agent": "robertdelanghe.dev-fetch" },
    });
    if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
    const batch = await res.json();
    out.push(...batch);
    if (batch.length < 100) return out;
  }
}

const raw = [
  ...(await ghAll("/user/repos?affiliation=owner")),
  ...(await Promise.all(ORGS.map((o) => ghAll(`/orgs/${o}/repos`)))).flat(),
];
// de-dupe by full_name
const byName = new Map(raw.map((r) => [r.full_name, r]));
const repos = [...byName.values()];

const sources = repos.filter((r) => !r.fork);
const publicSources = sources.filter((r) => !r.private);
const topicsOf = (r) => (Array.isArray(r.topics) ? r.topics : []);

const tally = (arr) =>
  Object.entries(arr.reduce((m, x) => ((m[x] = (m[x] || 0) + 1), m), {}))
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

const languages = tally(sources.map((r) => r.language || "other"));
const topics = tally(publicSources.flatMap(topicsOf));

const stats = {
  repos: repos.length,
  public: repos.filter((r) => !r.private).length,
  private: repos.filter((r) => r.private).length,
  sources: sources.length,
  forks: repos.filter((r) => r.fork).length,
  tagged: publicSources.filter((r) => topicsOf(r).length > 0).length,
  languages,
  topics,
};

// Curate: public, non-fork, non-archived, non-meta, with a description.
const isMeta = (r) => r.name === ".github" || r.full_name === "bdelanghe/bdelanghe";
const eligible = repos.filter((r) => !r.private && !r.fork && !r.archived && !isMeta(r) && r.description);
const pinRank = new Map(PINS.map((n, i) => [n, i]));
const curated = eligible
  .filter((r) => pinRank.has(r.full_name))
  .sort((a, b) => {
    const pa = pinRank.has(a.full_name), pb = pinRank.has(b.full_name);
    if (pa && pb) return pinRank.get(a.full_name) - pinRank.get(b.full_name);
    if (pa !== pb) return pa ? -1 : 1;
    if (b.stargazers_count !== a.stargazers_count) return b.stargazers_count - a.stargazers_count;
    return new Date(b.pushed_at) - new Date(a.pushed_at);
  })
  .slice(0, MAX_HIGHLIGHTS)
  .map((r) => ({
    name: r.name,
    fullName: r.full_name,
    url: r.html_url,
    description: r.description,
    language: r.language || null,
    stars: r.stargazers_count,
    pinned: pinRank.has(r.full_name),
    topics: topicsOf(r),
  }));

const site = {
  generatedAt: new Date().toISOString(),
  owner: { login: OWNER, name: "Robert DeLanghe" },
  stats,
  highlights: curated,
};

// Lightweight contract check (the schema is the spec; this guards the essentials).
for (const k of ["generatedAt", "owner", "stats", "highlights"]) if (!(k in site)) throw new Error(`contract: missing ${k}`);
if (!site.highlights.length) throw new Error("contract: no highlights");

await mkdir(join(here, "data"), { recursive: true });
await writeFile(join(here, "data", "site.json"), JSON.stringify(site, null, 2) + "\n");
console.log(`✓ data/site.json — ${stats.repos} repos (${stats.public} public), ${curated.length} highlights, ${languages.length} languages`);

// Maintenance signal: public, non-fork, non-archived, non-meta repos still missing
// topics or a description. Drift made visible so it can be fixed, not silently rot.
const hygiene = publicSources.filter((r) => !r.archived && !isMeta(r));
const noTopics = hygiene.filter((r) => topicsOf(r).length === 0).map((r) => r.full_name);
const noDesc = hygiene.filter((r) => !r.description).map((r) => r.full_name);
if (noTopics.length) console.warn(`⚠ untagged (${noTopics.length}): ${noTopics.join(", ")}`);
if (noDesc.length) console.warn(`⚠ no description (${noDesc.length}): ${noDesc.join(", ")}`);

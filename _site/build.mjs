#!/usr/bin/env node
// Render the site from data/site.json (the contract) into dist/. Pure: no network,
// no GitHub — a deterministic function of site.json + the brand. Safe in `nix build`.
import { rm, mkdir, cp, access, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { validateSchema } from "./schema-validate.mjs";
import { loadPosts } from "./posts.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");
const brand = join(root, "brand");
const exists = async (p) => { try { await access(p); return true; } catch { return false; } };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

if (!(await exists(join(brand, "tokens", "tokens.css")))) {
  console.error("✗ brand/ is empty. Run: git submodule update --init --recursive");
  process.exit(1);
}
// Static analysis: validate both contracts against their JSON Schemas (not just
// key-presence). Invalid content can't produce a build — invalid states made
// unrepresentable at the boundary.
const loadJson = async (p) => JSON.parse(await readFile(p, "utf8"));
const validateContract = async (name) => {
  const data = await loadJson(join(root, "data", `${name}.json`));
  const schema = await loadJson(join(root, "contract", `${name}.schema.json`));
  const errors = validateSchema(schema, data);
  if (errors.length) {
    console.error(`✗ ${name}.json violates contract/${name}.schema.json:`);
    for (const e of errors) console.error(`    ${e}`);
    process.exit(1);
  }
  return data;
};
const site = await validateContract("site");
const profile = await validateContract("profile");

// Canonical token bag: brand content strings + profile slugs. Posts transclude
// facts from this ({{thesis}}, {{proof.prx}}, {{email}}) instead of re-typing them;
// an unknown token fails the build, so a claim can't cite a fact that isn't here.
const sval = (x) => (x && typeof x === "object" && "$value" in x ? x.$value : x);
const strings = (await exists(join(brand, "content", "strings.json"))) ? await loadJson(join(brand, "content", "strings.json")) : {};
const tokens = {
  org: sval(strings.name), tagline: sval(strings.tagline), thesis: sval(strings.thesis), brandDesc: sval(strings.description),
  name: profile.name, role: profile.role, place: profile.place, headline: profile.headline,
  email: (profile.links.find((l) => /^mailto:/i.test(l.href))?.href || "").replace(/^mailto:/i, ""),
  proof: Object.fromEntries((profile.proof || []).map((p) => [p.label, p.href])),
  repo: Object.fromEntries((site.highlights || []).map((h) => [h.name, h.url])),
};
const postSchema = await loadJson(join(root, "contract", "posts.schema.json"));
const allPosts = await loadPosts(join(root, "posts"), tokens);
for (const p of allPosts) {
  const errs = validateSchema(postSchema, p.meta);
  if (errs.length) {
    console.error(`✗ posts/${p.slug}.md frontmatter violates contract/posts.schema.json:`);
    for (const e of errs) console.error(`    ${e}`);
    process.exit(1);
  }
}
// Route by target: this site is robertdelanghe.dev — render only 'dev' posts (or
// untargeted). A 'bounded-tools' draft that lands here is validated but not published.
const posts = allPosts.filter((p) => (p.meta.target ?? "dev") === "dev");
for (const p of allPosts) if ((p.meta.target ?? "dev") !== "dev") console.log(`· skipping ${p.slug} (target=${p.meta.target})`);

const linksHtml = profile.links
  .map((l) => `<a href="${esc(l.href)}">${esc(l.label)}${l.href.startsWith("http") ? "&nbsp;&#8599;" : ""}</a>`)
  .join("\n        ");

const proofHtml = profile.proof?.length
  ? `<p class="proof">Proof — ${profile.proof.map((p) => `<a href="${esc(p.href)}">${esc(p.label)}</a>`).join(" · ")}</p>`
  : "";

// ---- complete <head> meta (SEO + social + agent), one source -------------------
const SITE = "https://robertdelanghe.dev";
const OG_IMAGE = `${SITE}/brand/lockup/lockup-forest-1200.png`;
// Build provenance: the commit this artifact was built from (Cloudflare/GitHub CI env).
// The footer SHA links to /provenance — the report of what produced + validated this build.
const COMMIT = process.env.CF_PAGES_COMMIT_SHA || process.env.WORKERS_CI_COMMIT_SHA || process.env.GITHUB_SHA || "";
const commitHtml = COMMIT
  ? ` &middot; <a href="/provenance" title="build provenance report">${COMMIT.slice(0, 7)}</a>`
  : ` &middot; <a href="/provenance">provenance</a>`;
const head = ({ title, description, path = "/", appCss = true, ogTitle, ogType = "website", ogImage = OG_IMAGE }) => {
  const url = SITE + path, t = esc(title), d = esc(description), ot = esc(ogTitle ?? title), img = ogImage.startsWith("http") ? ogImage : SITE + ogImage;
  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${t}</title>
  <meta name="description" content="${d}">
  <link rel="canonical" href="${url}">
  <meta name="theme-color" content="#0C5A42">
  <link rel="icon" type="image/png" href="/brand/favicon-32.png">
  <link rel="icon" type="image/svg+xml" href="/brand/mark/mark-forest.svg">
  <meta property="og:type" content="${ogType}">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${ot}">
  <meta property="og:description" content="${d}">
  <meta property="og:image" content="${img}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${ot}">
  <meta name="twitter:description" content="${d}">
  <meta name="twitter:image" content="${img}">
  <link rel="alternate" type="application/atom+xml" title="Robert DeLanghe — Writing" href="/feed.xml">
  <link rel="alternate" type="application/feed+json" title="Robert DeLanghe — Writing" href="/feed.json">${(profile.social ?? []).map((s) => `
  <link rel="me" href="${esc(s.href)}">`).join("")}
  <link rel="stylesheet" href="/brand/css/fonts.css">
  <link rel="stylesheet" href="/brand/tokens/tokens.css">${appCss ? `
  <link rel="stylesheet" href="/brand/css/base.css">
  <link rel="stylesheet" href="/styles.css">` : ""}`;
};
// One source for identity: profile.social → sameAs (JSON-LD), rel=me (head), footer.
const socialHtml = (profile.social ?? []).map((s) => `<a rel="me" href="${esc(s.href)}">${esc(s.label)}</a>`).join(" &middot; ");
const jsonLd = `<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org", "@type": "Person",
  name: profile.name, url: SITE, jobTitle: profile.role, description: profile.headline,
  knowsAbout: profile.skills?.length ? profile.skills : undefined,
  alumniOf: (profile.education ?? []).map((e) => ({ "@type": "Organization", name: e.org })),
  // claim → evidence: each hero claim points at the repo that backs it.
  subjectOf: (profile.proof ?? []).map((p) => ({ "@type": "CreativeWork", name: p.label, url: p.href })),
  sameAs: (profile.social ?? []).map((s) => s.href),
}).replace(/</g, "\\u003c")}</script>`;

const orgLink = (e) => (e.url ? `<a href="${esc(e.url)}">${esc(e.org)}</a>` : esc(e.org));
const entry = (e) =>
  `<li class="entry"><span class="entry__when">${esc(e.when)}</span><span class="entry__body">` +
  `<span class="entry__org">${orgLink(e)}${e.role ? ` · <span class="entry__role">${esc(e.role)}</span>` : ""}</span>` +
  `<span class="entry__what">${esc(e.what)}</span></span></li>`;
const exp = profile.experience ?? [];
const edu = profile.education ?? [];
const backgroundHtml =
  exp.length || edu.length
    ? `<section class="bg">
      <h2 class="bs-text-label eyebrow">Background</h2>
      ${exp.length ? `<ul class="entries">\n        ${exp.map(entry).join("\n        ")}\n      </ul>` : ""}
      ${edu.length ? `<p class="bg__sub bs-text-label">Education</p>\n      <ul class="entries">\n        ${edu.map(entry).join("\n        ")}\n      </ul>` : ""}
    </section>`
    : "";

const s = profile.seeking;
const seekingHtml = s
  ? `<section class="seeking">
      ${s.label ? `<p class="bs-text-label seeking__label">${esc(s.label)}</p>` : ""}
      <p class="seeking__focus">${esc(s.focus)}</p>
      ${s.detail ? `<p class="seeking__detail">${esc(s.detail)}</p>` : ""}
      ${s.href ? `<a class="seeking__cta" href="${esc(s.href)}">${esc(s.cta || "Get in touch")} &rarr;</a>` : ""}
    </section>`
  : "";

const { stats, highlights } = site;
// Editorial copy layer: the site controls its own Selected Work descriptions,
// overriding the upstream GitHub repo description by repo name. Keeps the copy
// in this repo (the contract) instead of scattered across the source repos —
// so a description fix here, not a round-trip to another repo.
const highlightCopy = (await exists(join(root, "data", "highlight-copy.json"))) ? await loadJson(join(root, "data", "highlight-copy.json")) : {};
for (const h of highlights) {
  if (highlightCopy[h.name]) h.description = highlightCopy[h.name];
}
const langTotal = stats.languages.reduce((n, l) => n + l.count, 0) || 1;
const date = new Date(site.generatedAt).toISOString().slice(0, 10);

// in-toto materials: the build inputs, content-addressed where computable
// (pure — file hashes + the brand version, no git/network).
const sha256File = async (p) => "sha256:" + createHash("sha256").update(await readFile(p)).digest("hex");
const brandPkg = (await exists(join(brand, "package.json"))) ? await loadJson(join(brand, "package.json")) : {};
const materials = [
  { name: "git+github.com/bdelanghe/site", id: COMMIT ? COMMIT.slice(0, 7) : "(local)" },
  { name: "@bounded-systems/brand", id: brandPkg.version ? `v${brandPkg.version}` : "(submodule)" },
  { name: "data/profile.json", id: (await sha256File(join(root, "data", "profile.json"))).slice(0, 18) + "…" },
  { name: "data/site.json", id: (await sha256File(join(root, "data", "site.json"))).slice(0, 18) + "…" },
];

// short digests for the chain copy — each process step names what it ran, by sha
const dg = async (p) => (await exists(join(root, p))) ? (await sha256File(join(root, p))).slice(0, 18) + "…" : "(absent)";
const dgProfile = await dg("data/profile.json");
const dgProfileSchema = await dg("contract/profile.schema.json");
const dgPostsSchema = await dg("contract/posts.schema.json");
const dgCopyReview = await dg("copy-review.mjs");
const dgLinkedin = await dg("linkedin-check.mjs");
const dgBuild = await dg("build.mjs");
// the design system — content-addressed, not just a version string. The tokens
// (visual) + content strings (verbal) are real build inputs; attest them by digest.
for (const f of ["brand/tokens/tokens.json", "brand/tokens/tokens.css", "brand/content/strings.json", "brand/css/base.css", "brand/css/fonts.css"]) {
  if (await exists(join(root, f))) materials.push({ name: f, id: (await sha256File(join(root, f))).slice(0, 18) + "…" });
}

const langBars = stats.languages.slice(0, 6).map((l) =>
  `<div class="bar"><span class="bar__k">${esc(l.name)}</span>` +
  `<span class="bar__track"><span class="bar__fill" style="width:${Math.round((l.count / langTotal) * 100)}%"></span></span>` +
  `<span class="bar__n">${l.count}</span></div>`).join("\n        ");

const topicChips = stats.topics.length
  ? stats.topics.slice(0, 16).map((t) => `<span class="chip">${esc(t.name)} <em>${t.count}</em></span>`).join("\n        ")
  : `<span class="chip chip--muted">topics: ${stats.tagged}/${stats.public} tagged — self-labeling in progress</span>`;

// Selected work, broken out by tag — thesis tags first, the rest after.
const TAG_ORDER = ["capability-security", "agent-infra", "ai", "developer-tools", "cli", "infrastructure", "library", "nix", "web", "design-tokens"];
const tagLabel = (t) => t.replace(/-/g, " ");
const card = (h) => {
  const topics = (h.topics || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
  return `<li class="proj">
          <a href="${esc(h.url)}">
            <div class="proj__top"><span class="proj__name">${esc(h.name)}</span>${h.pinned ? '<span class="proj__pin">pinned</span>' : ""}</div>
            <p class="proj__desc">${esc(h.description)}</p>
            <div class="proj__meta"><span class="proj__full">${esc(h.fullName)}</span>${h.language ? `<span class="proj__lang">${esc(h.language)}</span>` : ""}${topics}</div>
          </a>
        </li>`;
};
const primaryTag = (h) => TAG_ORDER.find((t) => (h.topics || []).includes(t)) ?? (h.topics?.[0] ?? "other");
const workByTag = new Map();
for (const h of highlights) {
  const k = primaryTag(h);
  (workByTag.get(k) ?? workByTag.set(k, []).get(k)).push(h);
}
const rank = (t) => { const i = TAG_ORDER.indexOf(t); return i < 0 ? 99 : i; };
const workGroups = [...workByTag.keys()].sort((a, b) => rank(a) - rank(b)).map((k) => `
      <div class="work-group">
        <h3 class="work-group__tag">${esc(tagLabel(k))} <em>${workByTag.get(k).length}</em></h3>
        <ul class="projects">
        ${workByTag.get(k).map(card).join("\n        ")}
        </ul>
      </div>`).join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
  ${head({ title: `${profile.name} — ${profile.role}`, description: `${profile.role} — ${profile.headline}`, path: "/" })}
  ${jsonLd}
</head>
<body>
  <main class="wrap">
    <header class="intro">
      <p class="bs-text-label eyebrow">${esc(profile.name)}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${esc(profile.role)}</p>
      <h1>${esc(profile.headline)}</h1>
      ${profile.intro ? `<p class="lead lead--intro">${esc(profile.intro)}</p>` : ""}
      <p class="lead">${esc(profile.summary)}</p>
      ${proofHtml}
      ${profile.place ? `<p class="place">${esc(profile.place)}</p>` : ""}
      <nav class="links">
        ${linksHtml}
      </nav>
    </header>

    ${seekingHtml}

    ${backgroundHtml}

    <section class="corpus">
      <h2 class="bs-text-label eyebrow">The corpus</h2>
      <div class="figures">
        <div class="fig"><span class="fig__n">${stats.repos}</span><span class="fig__k">repositories</span></div>
        <div class="fig"><span class="fig__n">${stats.public}</span><span class="fig__k">public</span></div>
        <div class="fig"><span class="fig__n">${stats.sources}</span><span class="fig__k">sources</span></div>
        <div class="fig"><span class="fig__n">${stats.languages.length}</span><span class="fig__k">languages</span></div>
      </div>
      <div class="bars">
        ${langBars}
      </div>
      <div class="chips">
        ${topicChips}
      </div>
    </section>

    <section class="work">
      <h2 class="bs-text-label eyebrow">Selected work — by tag</h2>
      ${workGroups}
    </section>

    <footer class="foot">
      <span>Robert DeLanghe &middot; Bounded Systems</span>
      ${socialHtml ? `<span class="foot__social">${socialHtml}</span>` : ""}
      <span class="foot__meta">github.com/bdelanghe &middot; generated ${date}${commitHtml}</span>
    </footer>
  </main>
</body>
</html>
`;

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await writeFile(join(dist, "index.html"), html);

// ---- résumé: print-optimized static artifact from the same contract ----------
const rLinks = profile.links.filter((l) => l.href !== "/resume").map((l) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join(" · ");
const rExp = (profile.experience ?? []).map((e) => `
      <div class="r-job">
        <div class="r-job__head"><span class="r-job__org">${orgLink(e)}</span><span class="r-job__when">${esc(e.when)}</span></div>
        <div class="r-job__role">${esc([e.role, e.where].filter(Boolean).join(" · "))}</div>
        <ul>${(e.bullets ?? (e.what ? [e.what] : [])).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
      </div>`).join("");
const rEdu = (profile.education ?? []).map((e) => `
      <div class="r-job"><div class="r-job__head"><span class="r-job__org">${orgLink(e)}</span><span class="r-job__when">${esc(e.when)}</span></div>${e.degree ? `<div class="r-job__role">${esc(e.degree)}</div>` : ""}<div class="r-edu">${esc(e.what)}</div></div>`).join("");
const rSkills = (profile.skills ?? []).map(esc).join(" · ");

// ---- JSON Résumé (machine-readable, for parsers / ATS) -------------------------
// Generated from the same contract (profile.json), schema-validated against the
// vendored JSON Resume schema, and exposed at /resume.json — a standard structured
// artifact a résumé parser consumes cleanly, alongside the human page.
const MON = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
const SEASON = { spring: "03", summer: "06", fall: "09", autumn: "09", winter: "12" };
const isoPoint = (s) => {
  const t = String(s ?? "").trim().toLowerCase();
  if (!t || t === "present") return undefined;
  const year = t.match(/\b(?:19|20)\d{2}\b/);
  if (!year) return undefined;
  const word = t.match(/[a-z]+/);
  const mm = word ? (MON[word[0].slice(0, 3)] ?? SEASON[word[0]]) : null;
  return mm ? `${year[0]}-${mm}` : year[0];
};
const isoRange = (when) => {
  const parts = String(when ?? "").split(/\s*(?:—|–|-|\bto\b)\s*/i).filter(Boolean);
  return { start: isoPoint(parts[0]), end: parts.length > 1 ? isoPoint(parts[1]) : undefined };
};
const emailAddr = (profile.links.find((l) => /^mailto:/i.test(l.href))?.href || "").replace(/^mailto:/i, "");
const jsonResume = {
  basics: {
    name: profile.name,
    label: profile.role,
    email: emailAddr,
    url: SITE,
    summary: profile.summary,
    location: { city: "Brooklyn", region: "NY", countryCode: "US" },
    profiles: (profile.social ?? []).map((s) => ({ network: s.label, url: s.href, username: (s.href.match(/([^/]+)\/?$/) || [])[1] || s.label })),
  },
  work: (profile.experience ?? []).map((e) => {
    const { start, end } = isoRange(e.when);
    const w = { name: e.org, position: e.role, summary: e.what, highlights: e.bullets ?? [] };
    if (e.url) w.url = e.url;
    if (e.where) w.location = e.where;
    if (start) w.startDate = start;
    if (end) w.endDate = end;
    return w;
  }),
  education: (profile.education ?? []).map((e) => {
    const { start, end } = isoRange(e.when);
    const ed = { institution: e.org };
    if (e.degree) {
      const [st, ...rest] = String(e.degree).split(",");
      ed.studyType = st.trim();
      ed.area = rest.length ? rest.join(",").trim() : String(e.what ?? "").split(/[—–:.]/)[0].trim();
    } else {
      ed.area = String(e.what ?? "").split(/[—–:.]/)[0].trim();
    }
    if (e.url) ed.url = e.url;
    if (start) ed.startDate = start;
    if (end) ed.endDate = end;
    return ed;
  }),
  skills: (profile.skills ?? []).flatMap((s) => String(s).split(/\s*·\s*/)).map((name) => ({ name })),
};
const jsonResumeSchema = await loadJson(join(root, "contract", "jsonresume.schema.json"));
const jrErrors = validateSchema(jsonResumeSchema, jsonResume);
if (jrErrors.length) {
  console.error("✗ generated resume.json violates contract/jsonresume.schema.json:");
  for (const e of jrErrors) console.error(`    ${e}`);
  process.exit(1);
}

const resumeHtml = `<!doctype html>
<html lang="en">
<head>
${head({ title: `${profile.name} — Résumé`, description: `Résumé — ${profile.name}, ${profile.role}.`, path: "/resume", appCss: false })}
<link rel="alternate" type="application/json" href="/resume.json" title="JSON Résumé (machine-readable)">
${jsonLd}
<style>
  @page { margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: var(--bs-font-display); color: var(--bs-color-ink); max-width: 760px; margin: 28px auto; padding: 0 24px; font-size: 13px; line-height: 1.5; }
  a { color: var(--bs-color-forest); text-decoration: none; }
  h1 { font-size: 26px; letter-spacing: -0.02em; margin: 0; }
  .r-title { font-size: 14px; color: var(--bs-color-forest); font-weight: 600; margin: 4px 0 6px; }
  .r-contact { font-family: var(--bs-font-mono); font-size: 11px; color: var(--bs-color-ink-soft); margin: 0 0 14px; }
  .r-summary { margin: 0 0 16px; }
  h2 { font-family: var(--bs-font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--bs-color-forest); border-bottom: 1px solid var(--bs-color-line); padding-bottom: 4px; margin: 18px 0 10px; }
  .r-skills { font-size: 12px; color: var(--bs-color-ink-soft); }
  .r-job { margin: 0 0 12px; break-inside: avoid; }
  .r-job__head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  .r-job__org { font-weight: 600; font-size: 14px; }
  .r-job__when { font-family: var(--bs-font-mono); font-size: 11px; color: var(--bs-color-ink-mono); white-space: nowrap; }
  .r-job__role { font-size: 12px; color: var(--bs-color-forest); margin-bottom: 4px; }
  .r-job ul { margin: 4px 0 0; padding-left: 16px; }
  .r-job li { margin: 0 0 3px; }
  .r-edu { font-size: 12px; color: var(--bs-color-ink-soft); }
  .r-print { display: inline-block; font-family: var(--bs-font-mono); font-size: 11px; color: var(--bs-color-forest); text-decoration: none; border: 1px solid var(--bs-color-line); border-radius: 6px; padding: 5px 10px; margin: 2px 0 16px; cursor: pointer; }
  .r-print:hover { border-color: var(--bs-color-forest); }
  @media print { body { margin: 0; } a { color: var(--bs-color-ink); } .r-print { display: none !important; } }
</style>
</head>
<body>
  <main>
  <header>
    <h1>${esc(profile.name)}</h1>
    <p class="r-title">${esc(profile.role)}${profile.headline ? ` — ${esc(profile.headline.replace(/\\.$/, ""))}` : ""}</p>
    <p class="r-contact">${profile.place ? esc(profile.place) + " · " : ""}${rLinks}</p>
    <a class="r-print" href="#" onclick="window.print();return false;">Download PDF&nbsp;&darr;</a>
  </header>
  <p class="r-summary">${esc(profile.summary)}</p>
  ${rSkills ? `<h2>Skills</h2><p class="r-skills">${rSkills}</p>` : ""}
  <h2>Experience</h2>${rExp}
  <h2>Education</h2>${rEdu}
  </main>
</body>
</html>
`;
await writeFile(join(dist, "resume.html"), resumeHtml);
await writeFile(join(dist, "resume.json"), JSON.stringify(jsonResume, null, 2) + "\n");

// ---- /provenance: what produced and validated this artifact -------------------
const provHtml = `<!doctype html>
<html lang="en">
<head>
${head({ title: `Provenance — ${profile.name}`, description: `How robertdelanghe.dev is built and validated — contracts, gates, and claim-to-evidence.`, path: "/provenance" })}
</head>
<body>
  <main class="wrap">
    <header class="intro">
      <p class="bs-text-label eyebrow"><a href="/">&larr;&nbsp;Home</a></p>
      <h1>Provenance</h1>
      <p class="lead">This site is built deterministically from versioned sources and validated at every boundary — the same discipline the work itself argues for. Here's what produced and checked this artifact.</p>
    </header>
    <section class="bg">
      <h2 class="bs-text-label eyebrow">Provenance chain</h2>
      <p class="lead">The build reads as an <strong>in-toto / SLSA-style</strong> provenance: declared <em>materials</em>, a checked build <em>process</em>, and a signed <em>subject</em>. Each link is verified; the last is the artifact itself.</p>
      <ol class="prov-chain">
        <li class="prov-link"><span class="prov-link__name">Materials</span><span class="prov-link__body"><ul class="prov-materials">${materials.map((m) => `<li><code>${m.name}</code><span class="prov-dg">${m.id}</span></li>`).join("")}</ul><span class="prov-materials__note">${stats.repos} repos &middot; ${stats.public} public &middot; ${stats.sources} sources &middot; ${stats.languages.length} languages — these corpus figures are computed over this corpus, not asserted; the r&eacute;sum&eacute;'s outcome metrics are asserted, each grounding-checked in CI.</span></span></li>
        <li class="prov-link"><span class="prov-link__name">Process &middot; contracts</span><span class="prov-link__body">Two contracts gate content before a byte renders: <code>data/profile.json</code> (<span class="prov-dg">${dgProfile}</span>) and every post's frontmatter validate against <code>contract/profile.schema.json</code> (<span class="prov-dg">${dgProfileSchema}</span>) and <code>contract/posts.schema.json</code> (<span class="prov-dg">${dgPostsSchema}</span>) — a non-conforming change can't build, so invalid states are unrepresentable at the boundary. Facts then transclude from canonical tokens (<code>{{thesis}}</code>, <code>{{proof.*}}</code>, <code>{{email}}</code>); an unknown token fails the build, so no claim is unsourced.</span></li>
        <li class="prov-link"><span class="prov-link__name">Process &middot; gates</span><span class="prov-link__body">Gates run on every build, each error-severity finding blocking it: <code>lone</code> blesses each rendered post's DOM (semantic HTML + a11y); <code>copy-review.mjs</code> (<span class="prov-dg">${dgCopyReview}</span>) flags overclaims via Claude; <code>linkedin-check.mjs</code> (<span class="prov-dg">${dgLinkedin}</span>) verifies r&eacute;sum&eacute; claims against the saved source; <code>string-audit</code> runs the deterministic copy-hygiene suite; and <code>@bounded-systems/brand</code> tokens are drift-checked against the committed <code>tokens.css</code>.</span></li>
        <li class="prov-link"><span class="prov-link__name">Builder</span><span class="prov-link__body">Rendered by <code>build.mjs</code> (<span class="prov-dg">${dgBuild}</span>) under a toolchain pinned by <code>flake.lock</code> — Node&nbsp;22 + <code>@bounded-systems/brand</code>${brandPkg.version ? ` v${brandPkg.version}` : ""}. Hermetic: no network, no GitHub at build — the same materials always produce the same subject, a reproducible function of the inputs above.</span></li>
        <li class="prov-seal">
          <div class="prov-seal__card">
            <p class="prov-seal__title">Subject — signed</p>
            <p class="prov-seal__meta">commit ${COMMIT ? `<a href="https://github.com/bdelanghe/site/commit/${COMMIT}">${COMMIT.slice(0, 7)}</a>` : "(local)"} &middot; ${date} &middot; <a href="https://github.com/bdelanghe/site">bdelanghe/site</a></p>
            <p class="prov-seal__note" style="font-size:12px;margin:8px 0 0;color:var(--bs-color-ink-mono);">Real in-toto <code>Statement/v1</code> + SLSA provenance, DSSE ed25519-signed over this build's subjects + materials: <a href="/attestation.json">attestation.json</a> — verify against <a href="/attestation.pub">attestation.pub</a>.</p>
          </div>
        </li>
      </ol>
    </section>
    <section class="bg">
      <h2 class="bs-text-label eyebrow">Claims &rarr; evidence</h2>
      <p class="lead">Every hero claim points at the running code that backs it.</p>
      <ul class="prov-evidence">
        ${(profile.proof ?? []).map((p) => `<li><a href="${esc(p.href)}">${esc(p.label)}&nbsp;&#8599;</a></li>`).join("\n        ")}
      </ul>
    </section>
    <footer class="foot"><span>${esc(profile.name)} &middot; ${esc(tokens.org || "")}</span>${socialHtml ? `<span class="foot__social">${socialHtml}</span>` : ""}<span class="foot__meta">generated ${date}${commitHtml}</span></footer>
  </main>
</body>
</html>
`;
await writeFile(join(dist, "provenance.html"), provHtml);
await cp(join(root, "404.html"), join(dist, "404.html"));

// ---- /blog: index (h-feed) + per-post pages (h-entry) from posts/*.md ---------
// Public URL is extensionless (Cloudflare serves /blog/<slug> and 307s the .html
// form to it) — so canonical/links/feeds match the URL that actually 200s. The
// file on disk keeps its .html name.
const postUrl = (p) => `/blog/${p.slug}`;
const blogIndex = posts.length
  ? `<ul class="post-list h-feed">
        ${posts.map((p) => `<li class="h-entry"><a class="u-url" href="${postUrl(p)}">
          <span class="post-list__date dt-published">${esc(p.meta.date)}</span>
          <span class="post-list__title p-name">${esc(p.meta.title)}</span>
          <span class="post-list__desc p-summary">${esc(p.meta.description)}</span>
        </a></li>`).join("\n        ")}
      </ul>`
  : `<p class="lead">Notes are landing soon.</p>`;

const blogHtml = `<!doctype html>
<html lang="en">
<head>
${head({ title: `Writing — ${profile.name}`, description: `Writing by ${profile.name} on capability security for agentic systems.`, path: "/blog" })}
</head>
<body>
  <main class="wrap">
    <header class="intro">
      <p class="bs-text-label eyebrow">${esc(profile.name)} &nbsp;&middot;&nbsp; Writing</p>
      <h1>Writing</h1>
      <p class="lead">On capability security for agentic systems — the thesis, graded against the running code.</p>
      <nav class="links">
        <a href="/">&larr;&nbsp;Home</a>
        <a href="/feed.xml">RSS&nbsp;feed</a>
        <a href="https://github.com/bounded-systems">GitHub&nbsp;&#8599;</a>
      </nav>
    </header>
    <section class="posts">
      ${blogIndex}
    </section>
  </main>
</body>
</html>
`;
await writeFile(join(dist, "blog.html"), blogHtml);

await mkdir(join(dist, "blog"), { recursive: true });
for (const p of posts) {
  const url = SITE + postUrl(p);
  // Per-article social card (og:image) if one's been generated; else the brand default.
  const ogImage = (await exists(join(root, "assets", "cards", `${p.slug}.png`))) ? `/assets/cards/${p.slug}.png` : OG_IMAGE;
  const ld = {
    "@context": "https://schema.org", "@type": "BlogPosting",
    headline: p.meta.title, datePublished: p.meta.date, description: p.meta.description,
    url, mainEntityOfPage: url, inLanguage: "en",
    author: { "@type": "Person", name: profile.name, url: SITE },
    publisher: { "@type": "Organization", name: tokens.org || profile.name },
    keywords: (p.meta.tags || []).length ? (p.meta.tags || []).join(", ") : undefined,
    // claim → evidence, same as the homepage Person.subjectOf.
    citation: (profile.proof || []).map((pr) => ({ "@type": "CreativeWork", name: pr.label, url: pr.href })),
  };
  const tagsHtml = (p.meta.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
  const ph = `<!doctype html>
<html lang="en">
<head>
${head({ title: `${p.meta.title} — ${profile.name}`, ogTitle: p.meta.title, ogType: "article", description: p.meta.description, path: postUrl(p), ogImage })}
  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
</head>
<body>
  <main class="wrap">
    <article class="post h-entry">
      <header class="post__head">
        <p class="bs-text-label eyebrow"><a href="/blog">&larr;&nbsp;Writing</a></p>
        <h1 class="p-name">${esc(p.meta.title)}</h1>
        <p class="post__meta"><time class="dt-published" datetime="${esc(p.meta.date)}">${esc(p.meta.date)}</time> &nbsp;&middot;&nbsp; <a class="p-author h-card" href="${SITE}">${esc(profile.name)}</a>${tagsHtml ? ` &nbsp;&middot;&nbsp; ${tagsHtml}` : ""}</p>
      </header>
      <div class="post__body e-content">
      ${p.html}
      </div>
      ${(p.meta.syndication && p.meta.syndication.length) ? `<p class="post__synd">Also on: ${p.meta.syndication.map((u) => `<a class="u-syndication" href="${esc(u)}">${esc(new URL(u).hostname.replace(/^www\./, ""))}</a>`).join(" &middot; ")}</p>` : ""}
    </article>
    <footer class="foot"><span>${esc(profile.name)} &middot; ${esc(tokens.org || "")}</span>${socialHtml ? `<span class="foot__social">${socialHtml}</span>` : ""}<span class="foot__meta"><a href="/feed.xml">RSS</a> &middot; <a href="/blog">all writing</a>${commitHtml}</span></footer>
  </main>
</body>
</html>
`;
  await writeFile(join(dist, "blog", `${p.slug}.html`), ph);
}

// ---- feeds: Atom + JSON Feed, WebSub hub declared (rel=hub) for push -----------
const HUB = "https://pubsubhubbub.appspot.com/";
const iso = (d) => new Date(d).toISOString();
const feedUpdated = posts[0]?.meta.date ? iso(posts[0].meta.date) : iso(site.generatedAt);
const atom = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${esc(profile.name)} — Writing</title>
  <subtitle>${esc(tokens.brandDesc || profile.headline)}</subtitle>
  <link href="${SITE}/feed.xml" rel="self"/>
  <link href="${HUB}" rel="hub"/>
  <link href="${SITE}/blog"/>
  <id>${SITE}/blog</id>
  <updated>${feedUpdated}</updated>
  <author><name>${esc(profile.name)}</name></author>
${posts.map((p) => `  <entry>
    <title>${esc(p.meta.title)}</title>
    <link href="${SITE}${postUrl(p)}"/>
    <id>${SITE}${postUrl(p)}</id>
    <updated>${iso(p.meta.date)}</updated>
    <summary>${esc(p.meta.description)}</summary>
  </entry>`).join("\n")}
</feed>
`;
await writeFile(join(dist, "feed.xml"), atom);
const jsonFeed = {
  version: "https://jsonfeed.org/version/1.1",
  title: `${profile.name} — Writing`,
  home_page_url: `${SITE}/blog`, feed_url: `${SITE}/feed.json`,
  description: tokens.brandDesc || profile.headline,
  hubs: [{ type: "WebSub", url: HUB }],
  authors: [{ name: profile.name, url: SITE }],
  items: posts.map((p) => ({ id: SITE + postUrl(p), url: SITE + postUrl(p), title: p.meta.title, summary: p.meta.description, date_published: iso(p.meta.date), tags: p.meta.tags || [] })),
};
await writeFile(join(dist, "feed.json"), JSON.stringify(jsonFeed, null, 2) + "\n");

await cp(join(root, "styles.css"), join(dist, "styles.css"));
await cp(join(root, "assets/logo.svg"), join(dist, "assets/logo.svg"));
await cp(join(root, "assets/og.png"), join(dist, "assets/og.png"));
if (await exists(join(root, "assets", "cards"))) await cp(join(root, "assets", "cards"), join(dist, "assets", "cards"), { recursive: true });
await mkdir(join(dist, "brand"), { recursive: true });
for (const p of ["tokens/tokens.css", "css", "lockup", "mark", "favicon-32.png"]) {
  await cp(join(brand, p), join(dist, "brand", p), { recursive: true });
}

// ---- agent + crawler affordances, from the same contract ----------------------
const llms = `# ${profile.name}
> ${profile.headline}

${profile.summary}

${profile.role}${profile.place ? ` · ${profile.place}` : ""}

## Links
${profile.links.map((l) => `- [${l.label}](${l.href.startsWith("/") ? SITE + l.href : l.href})`).join("\n")}

## Selected work
${highlights.map((h) => `- [${h.name}](${h.url}): ${h.description}`).join("\n")}
${posts.length ? `\n## Writing\n${posts.map((p) => `- [${p.meta.title}](${SITE}${postUrl(p)}): ${p.meta.description}`).join("\n")}\n` : ""}`;
await writeFile(join(dist, "llms.txt"), llms);

// The typed-symbol catalog + grounding registry that the audit gate runs on are
// generated by audit-catalog.mjs into data/audit/ (not emitted here) — one canonical
// catalog generator, consumed by `npm run audit` (the vendored string-audit gate).

// Serve text assets as UTF-8 (Cloudflare otherwise sends text/plain with no charset,
// which some clients decode as Latin-1 → mojibake on em dashes / é).
await writeFile(join(dist, "_headers"), `/*.txt\n  Content-Type: text/plain; charset=utf-8\n/*.pub\n  Content-Type: text/plain; charset=utf-8\n`);
await writeFile(join(dist, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
await writeFile(join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  ["/", "/resume", "/blog", "/provenance", ...posts.map(postUrl)].map((p) => `  <url><loc>${SITE}${p}</loc><lastmod>${date}</lastmod></url>`).join("\n") +
  `\n</urlset>\n`);

console.log(`✓ built dist/  — ${highlights.length} highlights, ${stats.languages.length} languages, +meta/llms.txt/sitemap`);

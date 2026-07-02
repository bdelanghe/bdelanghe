// posts.mjs — load + render blog posts from posts/*.md. Pure, dependency-free,
// same ethos as build.mjs: a deterministic function of the source files. The body
// is a deliberately small, safe markdown subset (no raw-HTML passthrough); the
// frontmatter is validated against contract/posts.schema.json by build.mjs.
import { readdir, readFile } from "node:fs/promises";
import { join, basename } from "node:path";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// inline: `code`, [text](url), **bold**, *italic* — applied after HTML-escaping.
const inline = (t) =>
  esc(t)
    .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, x, h) => `<a href="${h}">${x}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, (_, b) => `<strong>${b}</strong>`)
    .replace(/\*([^*]+)\*/g, (_, i) => `<em>${i}</em>`);

// block: ## / ### headings, - lists, > quotes, --- rule, paragraphs. A stray
// leading "# h1" is demoted to h2 (the page template owns the title).
export const renderMarkdown = (md) => {
  const out = [];
  for (const b of md.trim().split(/\n{2,}/)) {
    const lines = b.split("\n");
    if (b === "---") out.push("<hr>");
    else if (/^### /.test(b)) out.push(`<h3>${inline(b.replace(/^###\s+/, ""))}</h3>`);
    else if (/^## /.test(b)) out.push(`<h2>${inline(b.replace(/^##\s+/, ""))}</h2>`);
    else if (/^# /.test(b)) out.push(`<h2>${inline(b.replace(/^#\s+/, ""))}</h2>`);
    else if (lines.every((l) => /^[-*] /.test(l))) out.push(`<ul>${lines.map((l) => `<li>${inline(l.replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`);
    else if (lines.every((l) => /^>\s?/.test(l))) out.push(`<blockquote>${inline(lines.map((l) => l.replace(/^>\s?/, "")).join(" "))}</blockquote>`);
    else out.push(`<p>${inline(lines.join(" "))}</p>`);
  }
  return out.join("\n      ");
};

// frontmatter: a tiny YAML subset — `key: value` and `key: [a, b]`. No nesting.
const parseFrontmatter = (raw) => {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split("\n")) {
    const mm = /^([\w-]+):\s*(.*)$/.exec(line);
    if (!mm) continue;
    let v = mm[2].trim();
    if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    else v = v.replace(/^["']|["']$/g, "");
    meta[mm[1]] = v;
  }
  return { meta, body: m[2] };
};

// Transclusion: {{a.b}} pulls a fact from the canonical token bag (brand content
// strings + profile slugs). A claim cites its source instead of re-typing it; an
// unknown or non-scalar token throws, so a post can't reference a fact that
// doesn't exist in the source — claims stay clear and drift-proof.
export const interpolate = (md, tokens, where = "post") =>
  md.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, path) => {
    const v = path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), tokens);
    if (v == null || typeof v === "object") throw new Error(`${where}: unknown or non-scalar token {{${path}}}`);
    return String(v);
  });

export const loadPosts = async (dir, tokens = {}) => {
  let files = [];
  try { files = (await readdir(dir)).filter((f) => f.endsWith(".md")); } catch { return []; }
  const posts = [];
  for (const f of files) {
    const { meta, body } = parseFrontmatter(await readFile(join(dir, f), "utf8"));
    const slug = meta.slug || basename(f, ".md");
    const resolved = interpolate(body, tokens, `posts/${f}`);
    posts.push({ meta, slug, html: renderMarkdown(resolved), text: resolved.trim() });
  }
  // newest first by ISO date
  return posts.sort((a, b) => (a.meta.date < b.meta.date ? 1 : a.meta.date > b.meta.date ? -1 : 0));
};

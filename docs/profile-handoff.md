# Profile hand-off — paste-ready copy

The durable home for finished profile copy across surfaces — GitHub and LinkedIn —
so the paste-ready text lives in the repo, not only in a chat thread.

Framing decision (current): **Bounded Systems is a project, not employment.** Aura
stays the current role; Bounded Systems is independent/self-employed work alongside it.

---

## 1. Profile README — ✅ LIVE

This is shipped: `README.md` is now the handcrafted profile below, and the daily
auto-regeneration has been retired (cron removed from `.github/workflows/readme.yml`,
legacy `update-readme.yml` deleted). To regenerate the old synoptic repo listing,
run `readme.yml` manually via **Run workflow** — note that doing so overwrites
`README.md`.

```markdown
### Robert DeLanghe

I build **[Bounded Systems](https://github.com/bounded-systems)** — infrastructure for
letting AI agents do real engineering work without handing them unbounded authority.
The bet: draw the boundary at the **door** — a scope-bounded set of capabilities an
agent acts through — not the process, not the container.

- 🚪 **[guest-room](https://github.com/bounded-systems/guest-room)** — the capability model in one library: rooms & doors, specs that run as tests.
- 🤖 **[prx](https://github.com/bounded-systems/prx)** — the agent-run work-unit CLI + the `@bounded-systems/*` capability libraries.
- 🌐 **[bounded.tools](http://bounded.tools)**

Recurse Center never-graduate, still happiest pairing on a hard problem. Earlier
threads: dev containers, state machines (xstate), design tokens. Brooklyn, NY.

*Let's build something bounded. 🤝*
```

---

## 2. GitHub sidebar bio (short profile field)

```
Building Bounded Systems — bounded authority for AI agents, at the door.
```

---

## 3. GitHub pins — follow-up (manual)

Re-pin `prx` and `guest-room` to the top so the profile's evidence matches its
claim (currently `sort-doku`, `first-pass`, …). They live under the
**bounded-systems** org, so in **Customize your pins** switch the source dropdown
to that org. Pins must be **public** repos.

---

## 4. LinkedIn — Headline

```
I build the security layer for agentic systems — software delivered by agents, governed like infrastructure
```

Shorter alternative:

```
Security layer for agentic systems · capability-based access control · building prx + @bounded-systems
```

> Drop the "Ruby/JS" from the headline — list languages under **Skills**, where
> LinkedIn actually indexes them.

---

## 5. LinkedIn — About

```
I build the security layer for agentic systems — the machinery that lets software be delivered by agents but governed like infrastructure. My work centers on capability-based security: every privileged effect an agent performs is verified against a signed owner, so nothing consequential happens without a traceable, enforceable source.

This is the throughline of my engineering: imposing structure on systems as they scale. At Aura I work at the integration boundary between systems; before that I led front-end and developer-experience work, including a rebuild that cut load times 45%. The current work, prx and the bounded-systems capability libraries, is where I'm working out the harder problem — keeping many agent-authored components honest against each other as they evolve.

Deepest in: capability security, access control, TypeScript, systems architecture. Working across the full stack (Node, Python, Postgres, Docker, AWS) when the problem needs it.

Building in the open at github.com/bounded-systems. Reach me at cv@robertdelanghe.com.
```

---

## 6. LinkedIn — Experience

### Current (keep / update in place)

- **Title:** Integration Engineer
- **Company:** Aura · Full-time
- **Dates:** `<your start date>` – Present · Brooklyn, NY
- **Description:**
  > Work at the integration boundary between systems — the connections, contracts,
  > and reliability where Aura's platform meets the services and data around it.

### Add (project)

- **Title:** Creator (Independent Project)  *(switch to "Founder" if/when it graduates from a project)*
- **Company:** Bounded Systems · Self-employed
- **Dates:** 2025 – Present · Brooklyn, NY
- **Link:** https://bounded.tools · https://github.com/bounded-systems
- **Description:**
  > Capability-based security for agentic systems — software delivered by agents,
  > governed like infrastructure. Every privileged effect an agent performs is
  > verified against a signed owner, so nothing consequential happens without a
  > traceable, enforceable source. Building **prx** and the `@bounded-systems`
  > capability libraries in the open.

### Optional (past) — only if you want it on the timeline

The "rebuild that cut load times 45%" front-end / developer-experience role. Needs
your real company + dates:

- **Title:** `<Front-End / Developer Experience Lead>`
- **Company:** `<company>`
- **Dates:** `<start>` – `<end>`
- **Description:**
  > Led front-end and developer-experience work; drove a rebuild that cut load
  > times 45%.

---

## 7. LinkedIn — Company Page (Bounded Systems)

A Page gives the project an official presence + logo the Experience entry can link
to; it does **not** make it your employer.

| Field | Value |
| --- | --- |
| **Name** | `Bounded Systems` |
| **Public URL** | `linkedin.com/company/bounded-systems` |
| **Website** | `https://bounded.tools` |
| **Industry** | `Software Development` |
| **Organization size** | `0-1 employees` |
| **Organization type** | `Self-employed` *(alt: `Privately held` if you want it to read more company-like)* |
| **Logo** | The Bounded Systems mark, 300×300 — from the [`bounded-systems/brand`](https://github.com/bounded-systems/brand) repo |

**Tagline** (≤120 chars):

```
The security layer for agentic systems — software delivered by agents, governed like infrastructure
```

Shorter tagline options:

```
Capability-based security for agentic systems.
```
```
Bounded authority for AI agents — at the door.
```

> Editing LinkedIn quietly: **Settings → Visibility → "Share profile updates with
> your network" → Off** before making personal-profile edits, so they don't
> broadcast.

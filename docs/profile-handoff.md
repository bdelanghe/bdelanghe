# Profile hand-off — paste-ready copy

This repo's `README.md` is **auto-regenerated daily** by the synoptic-github
action (`.github/workflows/update-readme.yml`), so handcrafted edits there get
overwritten on the next run. The finished copy below lives here instead, so the
paste-ready text survives in the repo rather than only in a chat thread.

To make any of this go live, paste it into the relevant surface (and, for the
profile `README.md`, see the note at the bottom about the auto-update action).

---

## Profile README (the `bdelanghe/bdelanghe` README)

Infra-serious but human: leads with Bounded Systems and the **door** thesis (the
audience is engineers sizing up the work), keeps the Recurse-Center / pairing
warmth so it doesn't read as a cold corporate pivot, and demotes the résumé
framing without erasing it.

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

## Sidebar bio (the short GitHub profile field, separate from the README)

```
Building Bounded Systems — bounded authority for AI agents, at the door.
```

---

## Manual follow-ups (genuinely-yours calls)

These need your decision, not a guess:

- **LinkedIn** still says "Integration Engineer · Ruby/JS." This README will send
  engineers there — either refresh it to match, or drop the link until you do.
- **Pins** — consider re-pinning `prx` and `guest-room` to the top so the
  profile's evidence matches its claim (currently `sort-doku`, `first-pass`, …).

---

## Note on the auto-update action

The profile README block above will **not** appear on the profile until the
synoptic-github auto-update is changed — otherwise the next scheduled run
regenerates `README.md` from the repo listing and discards the handcrafted copy.
Options when you're ready:

- Disable/remove the schedule in `.github/workflows/update-readme.yml` and commit
  the handcrafted README directly, or
- Inject this block as a static header/intro that the generator preserves on each
  run.

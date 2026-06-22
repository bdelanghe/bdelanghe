<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/header-dark.svg">
  <img alt="Robert DeLanghe — Capability security for agentic systems" src="assets/header-light.svg" width="100%">
</picture>

### Robert DeLanghe

I build **[Bounded Systems](https://github.com/bounded-systems)** — infrastructure for
letting AI agents do real engineering work without handing them unbounded authority.
The bet: draw the boundary at the **door** — a scope-bounded set of capabilities an
agent acts through — not the process, not the container.

- 🚪 **[guest-room](https://github.com/bounded-systems/guest-room)** — the capability model in one library: rooms & doors, specs that run as tests.
- 🤖 **[prx](https://github.com/bounded-systems/prx)** — the agent-run work-unit CLI + the `@bounded-systems/*` capability libraries.
- 🌐 **[bounded.tools](http://bounded.tools)**

Recurse Center alum in Brooklyn, NY — happiest pairing on a hard problem. Came up
through dev containers, state machines (xstate), and design tokens.

## More work

<!-- synoptic:start -->
<details>
<summary><b>All public repositories</b> — grouped by topic · auto-updated 2026-06-22</summary>

## capability-security

- [door-peercred](https://github.com/bounded-systems/door-peercred) — SO_PEERCRED helper for launcherd (Rust) — extracted from claude-box; a launcherd helper, not a door `Rust`
- [door-concierge](https://github.com/bounded-systems/door-concierge) — concierged — the capability-introducer door, as a pinned OCI image (extracted from claude-box) `TypeScript`
- [door-scout](https://github.com/bounded-systems/door-scout) — scoutd — the external-read capability door, as a pinned OCI image (extracted from claude-box) `TypeScript`
- [door-net](https://github.com/bounded-systems/door-net) — netd — the allowlist-egress capability door, as a pinned OCI image (extracted from claude-box) `TypeScript`
- [door-keeper](https://github.com/bounded-systems/door-keeper) — keeperd — the git-signing capability door, as a pinned OCI image (extracted from claude-box) `TypeScript`
- [door-kit](https://github.com/bounded-systems/door-kit) — In-box door-client SDK for claude-box's capability doors (keeper/scout/concierge/spawn), over the guest-room protocol `TypeScript`
- [ocap-provenance](https://github.com/bounded-systems/ocap-provenance) — Capability-use provenance — a schema + SLSA mapping binding each privileged effect to a signed owner and an auditable chain. `TypeScript`

## agent-infra

- [prx](https://github.com/bounded-systems/prx) — The agent-run work-unit CLI: capability-scoped agents whose every privileged effect is verified against its signed owner, driving a work unit through one signed pipeline to a merged PR. `TypeScript`
- [guest-room](https://github.com/bounded-systems/guest-room) — Guest-agnostic room+door capability runtime — the core library claude-box is built on. `TypeScript`
- [gh-project-room](https://github.com/bounded-systems/gh-project-room) — Front Desk projection + sync room for bounded-systems (org project #2) `TypeScript`
- [claude-box](https://github.com/bounded-systems/claude-box) — A capability-secured box for agent sessions — its authority is the door references it holds (keeper/scout/concierge/net), parent-agnostic. `TypeScript`

## ai

- [claude-token-tools](https://github.com/bounded-systems/claude-token-tools) — Claude Code token-saving toolkit — model-usage auditor + home-manager module `JavaScript`
- [bdelanghe-claude-skills](https://github.com/bdelanghe/bdelanghe-claude-skills) — Claude Code skills and plugins for AI-assisted engineering workflows
- [first-pass](https://github.com/bdelanghe/first-pass) — A CLI tool that enhances your resume creation, aligns skills with job descriptions, and guides in building evidence-backed points 🚀📝 `TypeScript`
- [mcp-conversations-sqlite](https://github.com/bdelanghe/mcp-conversations-sqlite)

## developer-tools

- [synoptic-github](https://github.com/bdelanghe/synoptic-github) —  A dynamic template that auto-updates your README to showcase all your GitHub projects, offering a concise overview of your coding journey 🌟✨ `TypeScript`
- [git-ast](https://github.com/bdelanghe/git-ast) — Language-aware Git: AST-based diffs and merges instead of line-based — cleaner history, fewer conflicts. `Rust`
- [dev-registry](https://github.com/bdelanghe/dev-registry) — Local-first, OCI-compatible container registry + devcontainer build system, with Git/MCP integration and build traceability. `Shell`
- [dev-contracts-spec](https://github.com/bdelanghe/dev-contracts-spec) — Zod schemas and types for dev-contracts `TypeScript`

## cli

- [ssh-doctor](https://github.com/bdelanghe/ssh-doctor) — A Bash script that diagnoses SSH setup issues and provides streamlined troubleshooting 🩺🔧 `Shell`
- [git-tidy](https://github.com/bdelanghe/git-tidy) — Flags local branches merged via PR but diverged from their merged state — keeps your repo tidy. `Go`

## infrastructure

- [facilities](https://github.com/bounded-systems/facilities) — Nix facilities for bounded-systems — shared flakes, devshells, and build substrate. `Nix`

## design-tokens

- [site](https://github.com/bounded-systems/site) — The bounded.tools website — static, built on @bounded-systems/brand `HTML`
- [brand](https://github.com/bounded-systems/brand) — Bounded Systems brand — W3C design tokens, self-hosted fonts, the mark, and ready-to-link CSS. `JavaScript`
- [site](https://github.com/bdelanghe/site) — robertdelanghe.dev — software-engineering portfolio (synoptic v2) `JavaScript`

## data-viz

- [imdb-kaggle](https://github.com/bdelanghe/imdb-kaggle) — TMDB keyword sentiment pipeline (SCL lexicon to per-movie valence), run monthly via GitHub Actions and published to Kaggle. `Jupyter Notebook`

## algorithms

- [warehouse-layout](https://github.com/bdelanghe/warehouse-layout) — A project using a JavaScript-based box-stacking algorithm to model efficient warehouse organization 📦🔧 `JavaScript`

## game

- [sort-doku](https://github.com/bdelanghe/sort-doku) — A unique take on the classic Sudoku puzzle game, introducing the concept of interchangeable elements and state reduction 🧩🌀  `TypeScript`
- [hookie](https://github.com/bdelanghe/hookie) — A word deconstruction game developed with boardgame.io and React, providing a strategic Scrabble Hooks variant 🎲🔤 `Jupyter Notebook`

## experiment

- [flask-mysql-ngrok](https://github.com/bdelanghe/flask-mysql-ngrok) — Bare-bones Flask + MySQL todo app with ngrok, set up with devenv. `HTML`
- [lone](https://github.com/bdelanghe/lone) — Semantic blessing engine for DOM subtrees — untrusted element trees become typed Blessed<T> / Finding[] across a stable contract boundary. `TypeScript`
- [fold-engine](https://github.com/bdelanghe/fold-engine) — Linked-data engine for an Obsidian vault — JSON-LD / schema.org structure over notes. `HTML`
- [unfold-obsidian-vault](https://github.com/bdelanghe/unfold-obsidian-vault) — An Obsidian vault published as structured, schema.org-annotated content.
- [lean-to](https://github.com/bdelanghe/lean-to) — tiny vite project `TypeScript`
- [frond](https://github.com/bdelanghe/frond) — JS/TS round-trip validation with Deno + SWC: parse to an AST and regenerate source to check fidelity. `TypeScript`
- [overengineering-a-slide](https://github.com/bdelanghe/overengineering-a-slide) — Automating a simple slide with overengineered code `TypeScript`

## other

- [anchored-chain-sqlite](https://github.com/bounded-systems/anchored-chain-sqlite) — SQLite/Drizzle-backed implementation of the anchored-chain stores `TypeScript`
- [surface-sync](https://github.com/bounded-systems/surface-sync) — Type ontology for work-unit change-detection across GH/branch/worktree/tmux/beads `TypeScript`
- [slack](https://github.com/bounded-systems/slack) — Policy-gated, provenance-tracked Slack read surface: bounded read ops behind a swappable transport port, with keymaker-minted scoped credentials `TypeScript`
- [scout](https://github.com/bounded-systems/scout) — Content-addressed surface reads (file/grep/files) with anchored-chain provenance `TypeScript`
- [repo-root](https://github.com/bounded-systems/repo-root) — Repo-root resolution capability: lazy git-based runtime root plus the eager .git-marker walk for build/codegen, the one sanctioned root-resolution point `TypeScript`
- [proc](https://github.com/bounded-systems/proc) — The one allowed subprocess spawn point, routing external-tool invocations through a capability `TypeScript`
- [host](https://github.com/bounded-systems/host) — The one sanctioned reader of host/OS ambient state (home dir, temp dir, hostname), routing ambient authority through capability imports `TypeScript`
- [github-budget](https://github.com/bounded-systems/github-budget) — Rate-limit-aware gh wrapper with bucket classification, pre-call gating, and audit trail `TypeScript`
- [git](https://github.com/bounded-systems/git) — Git CLI wrapper with policy enforcement and stale-lock recovery `TypeScript`
- [gh](https://github.com/bounded-systems/gh) — GitHub CLI wrapper with policy enforcement, rate-limit gating, and budget audit logging `TypeScript`
- [bd](https://github.com/bounded-systems/bd) — Typed interface to the beads CLI with policy enforcement and short-ID guards `TypeScript`
- [auth](https://github.com/bounded-systems/auth) — Service-credential resolver (GitHub, Notion) through a single sanctioned access point `TypeScript`
- [anchored-chain](https://github.com/bounded-systems/anchored-chain) — Derivation chain with contract validation, signing, lineage tracking, and invalidation `TypeScript`
- [policy](https://github.com/bounded-systems/policy) — Tool-policy engine enforcing subcommand allowlists by tool, state, and role `TypeScript`
- [machine-schema](https://github.com/bounded-systems/machine-schema) — Brands, handoff envelope, and state/phase/invariant primitives for work-unit machines `TypeScript`
- [fs](https://github.com/bounded-systems/fs) — Filesystem capability seam; the one allowed filesystem-access point with an injectable FileSystem `TypeScript`
- [env](https://github.com/bounded-systems/env) — The one sanctioned reader of process.env, routing ambient config through capability imports `TypeScript`
- [disposition](https://github.com/bounded-systems/disposition) — Pure classifier mapping work-unit surface state to a disposition (ok/prune/repair/review) `TypeScript`
- [audit-context](https://github.com/bounded-systems/audit-context) — Ambient runtime context for gh-call audit attribution (verb, actor, truth reason) `TypeScript`
- [cas](https://github.com/bounded-systems/cas) — Content-addressable storage substrate: bytes addressed by their SHA-256 digest, with a storage-agnostic blob-store port `TypeScript`
- [verbspec](https://github.com/bounded-systems/verbspec) — Spec-driven CLI core: author a verb once as a typed VerbSpec, project it to CLI, MCP, OpenAPI, and Anthropic tool surfaces `TypeScript`

</details>
<!-- synoptic:end -->

*Let's build something bounded. 🤝*

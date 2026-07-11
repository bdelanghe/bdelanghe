<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/header-dark.svg">
  <img alt="Robert DeLanghe — Bounded authority for AI agents" src="assets/header-light.svg" width="100%">
</picture>

### I make it safe to let AI agents write and ship real code.

I build **[Bounded Systems](https://github.com/bounded-systems)** — infrastructure for
letting AI agents do real engineering work without handing them unbounded authority.
The bet: draw the boundary at the **door** — a scope-bounded set of capabilities an
agent acts through — not the process, not the container.

**Start here → [robertdelanghe.dev](https://robertdelanghe.dev)** — the thesis, and how it's built.

- 🚪 **[guest-room](https://github.com/bounded-systems/guest-room)** — the capability model in one library: rooms & doors, specs that run as tests.
- 🤖 **[prx](https://github.com/bounded-systems/prx)** — the agent-run work-unit CLI + the `@bounded-systems/*` capability libraries.
- 🌐 **[bounded.tools](http://bounded.tools)** — what Bounded Systems is, in one page.

Recurse Center alum in Brooklyn, NY — happiest pairing on a hard problem. Came up
through dev containers, state machines (xstate), and design tokens.

## More work

<!-- synoptic:start -->
## Featured

- [ssh-doctor](https://github.com/bdelanghe/ssh-doctor) — A Bash script that diagnoses SSH setup issues and provides streamlined troubleshooting 🩺🔧 `Shell`
- [first-pass](https://github.com/bdelanghe/first-pass) — A CLI tool that enhances your resume creation, aligns skills with job descriptions, and guides in building evidence-backed points 🚀📝 `TypeScript`
- [git-tidy](https://github.com/bdelanghe/git-tidy) — Flags local branches merged via PR but diverged from their merged state — keeps your repo tidy. `Go`
- [synoptic-github](https://github.com/bdelanghe/synoptic-github) —  A dynamic template that auto-updates your README to showcase all your GitHub projects, offering a concise overview of your coding journey 🌟✨ `TypeScript`

<details>
<summary><b>All public repositories</b> — grouped by topic · auto-updated 2026-07-10</summary>

## capability-security

- [trust](https://github.com/bounded-systems/trust) — Bounded Systems Trust Center — a public, grep-verifiable claims ledger (verifiable, not attested). `HTML`
- [installer](https://github.com/bounded-systems/installer) — Spec-driven provisioning: install/doctor as VerbSpec verbs, effects delegated to capability seams `TypeScript`
- [cf-oidc-token-broker](https://github.com/bounded-systems/cf-oidc-token-broker) `JavaScript`
- [seam-check](https://github.com/bounded-systems/seam-check) — Declare and prove a package's seam claim — allowed imports + zero ambient authority — with a coverage meta-check. The extractability harness, productized. `TypeScript`
- [dev-registry](https://github.com/bounded-systems/dev-registry) — Local-first, OCI-compatible container registry + devcontainer build system, with Git/MCP integration and build traceability. `Shell`

## agent-infra

- [prx](https://github.com/bounded-systems/prx) — The agent-run work-unit CLI: capability-scoped agents whose every privileged effect is verified against its signed owner, driving a work unit through one signed pipeline to a merged PR. `TypeScript`
- [gh-project-room](https://github.com/bounded-systems/gh-project-room) — Front Desk projection + sync room for bounded-systems (org project #2) `TypeScript`
- [guest-room](https://github.com/bounded-systems/guest-room) — Guest-agnostic room+door capability runtime — the core library claude-box is built on. `TypeScript`
- [claude-box](https://github.com/bounded-systems/claude-box) — A capability-secured box for agent sessions — its authority is the door references it holds (keeper/scout/concierge/net), parent-agnostic. `TypeScript`

## ai

- [claude-token-tools](https://github.com/bounded-systems/claude-token-tools) — Claude Code token-saving toolkit — model-usage auditor + home-manager module `JavaScript`
- [mcp-conversations-sqlite](https://github.com/bdelanghe/mcp-conversations-sqlite) — SQLite store for MCP (Model Context Protocol) conversation history `TypeScript`
- [string-audit](https://github.com/bounded-systems/string-audit) — Cost-aware, grounded content auditor — typed string symbols, type-scoped audits, CAS-memoized LLM calls. `JavaScript`
- [bdelanghe-claude-skills](https://github.com/bdelanghe/bdelanghe-claude-skills) — Claude Code skills and plugins for AI-assisted engineering workflows

## developer-tools

- [dev-contracts](https://github.com/bounded-systems/dev-contracts) `TypeScript`
- [hooksmith](https://github.com/bounded-systems/hooksmith) — Build Rust binaries into Lefthook hooks with WASM components `Rust`
- [git-ast](https://github.com/bounded-systems/git-ast) — Language-aware Git: a clean/smudge design for AST-based diffs & merges. Design stage — spec + compiling skeleton, not yet a working tool. `Rust`
- [schema-bridge](https://github.com/bounded-systems/schema-bridge) — Schema bridge tool for transformations `TypeScript`
- [lima-devshell](https://github.com/bounded-systems/lima-devshell) — Bootstrap devshell for Lima VM environments + macOS Home Manager config (Nix flake). `Nix`
- [frond](https://github.com/bounded-systems/frond) — JS/TS round-trip validation with Deno + SWC: parse to an AST and regenerate source to check fidelity. `TypeScript`

## infrastructure

- [facilities](https://github.com/bounded-systems/facilities) — Nix facilities for bounded-systems — shared flakes, devshells, and build substrate. `Nix`

## design-tokens

- [site](https://github.com/bounded-systems/site) — The bounded.tools website — static, built on @bounded-systems/brand `JavaScript`
- [brand](https://github.com/bounded-systems/brand) — Bounded Systems brand — W3C design tokens, self-hosted fonts, the mark, and ready-to-link CSS. `JavaScript`
- [site](https://github.com/bdelanghe/site) — robertdelanghe.dev — software-engineering portfolio (synoptic v2) `JavaScript`

## experiment

- [fold-engine](https://github.com/bounded-systems/fold-engine) — Linked-data engine for an Obsidian vault — JSON-LD / schema.org structure over notes. `HTML`
- [flask-mysql-ngrok](https://github.com/bdelanghe/flask-mysql-ngrok) — Bare-bones Flask + MySQL todo app with ngrok, set up with devenv. `HTML`
- [lean-to](https://github.com/bdelanghe/lean-to) — tiny vite project `TypeScript`

## agents

- [ocap-provenance](https://github.com/bounded-systems/ocap-provenance) — Capability-use provenance — a schema + SLSA mapping binding each privileged effect to a signed owner and an auditable chain. `TypeScript`
- [door-scout](https://github.com/bounded-systems/door-scout) — scoutd — the external-read capability door, as a pinned OCI image (extracted from claude-box) `TypeScript`
- [door-peercred](https://github.com/bounded-systems/door-peercred) — SO_PEERCRED helper for launcherd (Rust) — extracted from claude-box; a launcherd helper, not a door `Rust`
- [door-net](https://github.com/bounded-systems/door-net) — netd — the allowlist-egress capability door, as a pinned OCI image (extracted from claude-box) `TypeScript`
- [door-kit](https://github.com/bounded-systems/door-kit) — In-box door-client SDK for claude-box's capability doors (keeper/scout/concierge/spawn), over the guest-room protocol `TypeScript`
- [door-keeper](https://github.com/bounded-systems/door-keeper) — keeperd — the git-signing capability door, as a pinned OCI image (extracted from claude-box) `TypeScript`
- [door-concierge](https://github.com/bounded-systems/door-concierge) — concierged — the capability-introducer door, as a pinned OCI image (extracted from claude-box) `TypeScript`
- [lone](https://github.com/bounded-systems/lone) — Semantic blessing engine for DOM subtrees — untrusted element trees become typed Blessed<T> / Finding[] across a stable contract boundary. `TypeScript`

## other

- [repo-health](https://github.com/bounded-systems/repo-health) — Code-structure health signals (import cycles, god-files, hubs) as a verbspec CLI + CI gate — the internal-structure complement to drift-gate `TypeScript`
- [conformance](https://github.com/bounded-systems/conformance) — Org/repo conformance as code — the default-branch standard (rulesets-as-JSON) + an audit that scores every repo. Complements conformance-kit (site content) and fleet (live status). `TypeScript`
- [synoptic](https://github.com/bounded-systems/synoptic) — Site-build engine: layered validation both sites consume `TypeScript`
- [trellis](https://github.com/bounded-systems/trellis) — The bounded-systems contract map (semantic tree) + the aggregating flake check that CI runs `TypeScript`
- [static-mcp](https://github.com/bounded-systems/static-mcp) — @bounded-systems/static-mcp — serve VerbSpec verbs as a Sigstore-verified static-response MCP server. `TypeScript`
- [verbspec-mcp](https://github.com/bounded-systems/verbspec-mcp) — Turn any @bounded-systems/verbspec verb Registry into an MCP server (official @modelcontextprotocol/sdk). `TypeScript`
- [trellis-kit](https://github.com/bounded-systems/trellis-kit) `TypeScript`
- [drift-gate](https://github.com/bounded-systems/drift-gate) — Surface & descriptor drift gate for TS/JS repos — library, verbspec CLI, and standalone binary. `TypeScript`
- [verbspec](https://github.com/bounded-systems/verbspec) — Spec-driven CLI core: author a verb once as a typed VerbSpec, project it to CLI, MCP, OpenAPI, and Anthropic tool surfaces `TypeScript`
- [fleet](https://github.com/bounded-systems/fleet) — Auto-generated fleet status board for bounded-systems (synoptic Layer 2 — live CI/PR/issue board)
- [descriptor-kit](https://github.com/bounded-systems/descriptor-kit) `TypeScript`
- [conformance-kit](https://github.com/bounded-systems/conformance-kit) — Standalone web-conformance toolkit — integrity (provenance/manifest/verify) + conformance gates (SBOM, SHACL runner, SEO/readability/HTTP, lone semantic) + generators (static API/OpenAPI, did:web/VC, IPFS CID). Site-agnostic; vendored hash-pinned by consuming sites. `JavaScript`
- [keeper-wire](https://github.com/bounded-systems/keeper-wire) `TypeScript`
- [scout-wire](https://github.com/bounded-systems/scout-wire) `TypeScript`
- [concierge-wire](https://github.com/bounded-systems/concierge-wire) `TypeScript`
- [deploy](https://github.com/bounded-systems/deploy) — bounded.tools DNS-as-code (reviewer-gated, OIDC-brokered) `JavaScript`
- [mint](https://github.com/bounded-systems/mint) — Deterministic versioning — intent files in, signed release out. A seam over semver. `JavaScript`
- [brand](https://github.com/bdelanghe/brand) — Robert DeLanghe — personal brand. A pinning of bounded-systems/baobab: the token set (colors, type, space) the structure renders. `JavaScript`
- [baobab](https://github.com/bounded-systems/baobab) — Configurable design-system structure — no defaults. brand is its exact pinning (the token set); components are a11y-specced by lone. `TypeScript`
- [gh-action-brand-checks](https://github.com/bounded-systems/gh-action-brand-checks) — Brand token, meta, a11y, and content-token gate against the @bounded-systems/brand system
- [gh-action-node-uniqueness](https://github.com/bounded-systems/gh-action-node-uniqueness) — Node.js identity-key uniqueness gate — no identity key may repeat in any data cut
- [gh-action-contracts](https://github.com/bounded-systems/gh-action-contracts) — Deno pull-shape contract gate — validates page-data cuts against typed Zod contracts
- [cas](https://github.com/bounded-systems/cas) — Content-addressable storage substrate: bytes addressed by their SHA-256 digest, with a storage-agnostic blob-store port `TypeScript`
- [env](https://github.com/bounded-systems/env) — The one sanctioned reader of process.env, routing ambient config through capability imports `TypeScript`
- [anchored-chain-sqlite](https://github.com/bounded-systems/anchored-chain-sqlite) — SQLite/Drizzle-backed implementation of the anchored-chain stores `TypeScript`
- [anchored-chain](https://github.com/bounded-systems/anchored-chain) — Derivation chain with contract validation, signing, lineage tracking, and invalidation `TypeScript`
- [audit-context](https://github.com/bounded-systems/audit-context) — Ambient runtime context for gh-call audit attribution (verb, actor, truth reason) `TypeScript`
- [fs](https://github.com/bounded-systems/fs) — Filesystem capability seam; the one allowed filesystem-access point with an injectable FileSystem `TypeScript`
- [gh](https://github.com/bounded-systems/gh) — GitHub CLI wrapper with policy enforcement, rate-limit gating, and budget audit logging `TypeScript`
- [auth](https://github.com/bounded-systems/auth) — Service-credential resolver (GitHub, Notion) through a single sanctioned access point `TypeScript`
- [git](https://github.com/bounded-systems/git) — Git CLI wrapper with policy enforcement and stale-lock recovery `TypeScript`
- [bd](https://github.com/bounded-systems/bd) — Typed interface to the beads CLI with policy enforcement and short-ID guards `TypeScript`
- [github-budget](https://github.com/bounded-systems/github-budget) — Rate-limit-aware gh wrapper with bucket classification, pre-call gating, and audit trail `TypeScript`
- [machine-schema](https://github.com/bounded-systems/machine-schema) — Brands, handoff envelope, and state/phase/invariant primitives for work-unit machines `TypeScript`
- [policy](https://github.com/bounded-systems/policy) — Tool-policy engine enforcing subcommand allowlists by tool, state, and role `TypeScript`
- [proc](https://github.com/bounded-systems/proc) — The one allowed subprocess spawn point, routing external-tool invocations through a capability `TypeScript`
- [repo-root](https://github.com/bounded-systems/repo-root) — Repo-root resolution capability: lazy git-based runtime root plus the eager .git-marker walk for build/codegen, the one sanctioned root-resolution point `TypeScript`
- [disposition](https://github.com/bounded-systems/disposition) — Pure classifier mapping work-unit surface state to a disposition (ok/prune/repair/review) `TypeScript`
- [host](https://github.com/bounded-systems/host) — The one sanctioned reader of host/OS ambient state (home dir, temp dir, hostname), routing ambient authority through capability imports `TypeScript`
- [schema-gen](https://github.com/bounded-systems/schema-gen) — Project zod schemas to explicit, fast-types-clean TypeScript (zod → JSON Schema → .d.ts) `TypeScript`
- [scout](https://github.com/bounded-systems/scout) — Content-addressed surface reads (file/grep/files) with anchored-chain provenance `TypeScript`
- [slack](https://github.com/bounded-systems/slack) — Policy-gated, provenance-tracked Slack read surface: bounded read ops behind a swappable transport port, with keymaker-minted scoped credentials `TypeScript`
- [surface-sync](https://github.com/bounded-systems/surface-sync) — Type ontology for work-unit change-detection across GH/branch/worktree/tmux/beads `TypeScript`
- [site-mcp](https://github.com/bounded-systems/site-mcp) — MCP server over robertdelanghe.dev's signed static API — read-only, verifies responses against the site's content-addressed manifest. `TypeScript`
- [bounded-tools-mcp](https://github.com/bounded-systems/bounded-tools-mcp) — MCP server over bounded.tools' signed static API — a static-mcp implementation `TypeScript`
- [bounded.tools](https://github.com/bounded-systems/bounded.tools) — GitHub App receiver + setup endpoint for prx (bounded-systems-prx) `TypeScript`
- [verify](https://github.com/bounded-systems/verify) — @bounded-systems/verify — standalone zero-dep offline Sigstore-bundle verifier. Published to JSR keyless via OIDC. `JavaScript`
- [deploy](https://github.com/bdelanghe/deploy) — robertdelanghe.dev DNS-as-code (reviewer-gated, OIDC-brokered) `JavaScript`
- [less-software-flake](https://github.com/bdelanghe/less-software-flake) — Nix flakes for georgemandis' less.software suite — Zig CLIs over native macOS APIs (one mkZigMacTool helper) `Nix`
- [git-ai-flake](https://github.com/bdelanghe/git-ai-flake) — Nix flake packaging git-ai (local-first AI authorship tracking for git) `Nix`
- [tezcatl-flake](https://github.com/bdelanghe/tezcatl-flake) — Nix flake packaging tezcatl (headless macOS WebKit renderer CLI) `Nix`
- [content-catalog](https://github.com/bounded-systems/content-catalog) — Org-wide content token catalog — aggregated from opted-in repos, gated and attested by string-audit `JavaScript`
- [lobby](https://github.com/bounded-systems/lobby) — Offline Obsidian vault (Copilot+Ollama) — drafts become robertdelanghe.dev posts `JavaScript`

</details>
<!-- synoptic:end -->

*Let's build something bounded. 🤝*

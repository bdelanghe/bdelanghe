# Design-system preview layer

Self-referential preview cards for **Bounded Systems** — each one renders the
tokens *using* the tokens. The Foundations cards read `../tokens/tokens.css` at
runtime (custom properties + `.bs-text-*` rules) and display what they find, so
they can't drift from the source of truth; the Brand cards embed the SVG assets.

| File | Card | Group | Source |
| --- | --- | --- | --- |
| `colors.html` | Color | Foundations | live `--bs-color-*` |
| `type.html` | Type | Foundations | live `.bs-text-*` + computed spec |
| `radius.html` | Radius | Foundations | live `--bs-radius-*` |
| `mark.html` | Mark | Brand | `mark/*.svg` |
| `avatar.html` | Avatar | Brand | `avatar/*.svg` |
| `lockup.html` | Lockup | Brand | `lockup/*.svg` |

Each file's first line is a `@dsCard` marker that Claude Design indexes into a card.

## Preview locally

The Foundations cards read same-origin stylesheet rules, which `file://` blocks —
serve over http from the repo root:

```bash
python3 -m http.server 8080
# open http://localhost:8080/design/colors.html
```

## Push to Claude Design

Use the `/design-sync` skill (or the `DesignSync` tool) to sync these into a
claude.ai Design System project — incrementally, one component at a time.
Relative paths (`../tokens/tokens.css`, `../mark/…`) resolve because the synced
plan uploads those assets alongside the previews.

# robertdelanghe.dev

A focused software-engineering portfolio for **Robert DeLanghe**. Static HTML/CSS,
no runtime, built on the [`@bounded-systems/brand`][brand] design system (fonts +
tokens only — no product mark).

## How it consumes the brand

`brand/` is a git **submodule** pinned to a commit of [`bounded-systems/brand`][brand];
the page links its tokens + fonts and never hard-codes brand values:

```html
<link rel="stylesheet" href="brand/css/fonts.css">     <!-- self-hosted woff2 -->
<link rel="stylesheet" href="brand/tokens/tokens.css"> <!-- --bs-* vars + .bs-text-* -->
<link rel="stylesheet" href="brand/css/base.css">
```

## Build & preview

```bash
git clone --recurse-submodules https://github.com/bdelanghe/site.git
npm run dev      # serve at http://localhost:8080
npm run build    # assemble dist/  (prebuild runs the brand token-drift check)
nix build .#site # hermetic build → ./result (nodejs + brand pinned by flake.lock)
```

## Deploy

Hosted on **Cloudflare Workers** (static assets), deployed by **Cloudflare Workers
Builds** connected to this repo: on every push to `main` it runs `npm run build`
(which runs the brand token-drift check first) then `npx wrangler deploy`. No secret
to manage — Builds uses its own token. The worker is named **`site`**; `wrangler.jsonc`
must match it (a Worker can't be renamed — delete + recreate if you ever want a
different name). Add the custom domain `robertdelanghe.dev` in the Worker's
Settings → Domains & Routes; DNS is already in Cloudflare.

`.github/workflows/refresh.yml` refreshes `data/site.json` weekly (commit → Builds
redeploys), so the corpus stays current. `flake.nix` still gives a hermetic local
build (`nix build .#site`) for reproducible verification.

When bumping the brand, update both the submodule and `nix flake update brand`.

[brand]: https://github.com/bounded-systems/brand

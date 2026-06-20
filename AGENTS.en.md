# AGENTS.en.md — Working agreement for AI agents on g-lab

> If you're an AI agent working in this repo, read this first. Full guide: [`CONTRIBUTING.md`](CONTRIBUTING.md).
> Visual spec: [`DESIGN.md`](DESIGN.md) (English: [`DESIGN.en.md`](DESIGN.en.md)). 中文版：[`AGENTS.md`](AGENTS.md)。

## What this is
`g-lab` is an **umbrella monorepo**: the repo root is a static portal page, and each independent
mini-project lives under `projects/<name>/`.
- `projects/planner/` — Personal Growth Planner (multi-module single-page app)
- `projects/popcorn-ui/` — zero-dependency React creative-interaction component library
- `projects/swarm/` — multi-agent collaboration workspace prototype (requirement queue → role division → conclusion) + industry survey

## Must follow
1. **Code goes inside a sub-project dir** `projects/<name>/`. The repo root only holds the portal `index.html`, `README`, `DESIGN.md`, `AGENTS.md`, `CONTRIBUTING.md`, `assets/`, `.github/`. **Do not add app code to the root.**
2. **Follow `DESIGN.md`**: warm paper background `#F6F5F0` + clay/terracotta `#CC785C`, serif headings & key numbers, restrained whitespace, hairline borders, almost no shadows; **charts are hand-drawn SVG, no chart libraries**.
3. **Stack**: React 18 (function components + hooks) + esbuild prebundled into a **self-hosted single-file bundle** — no external CDN, no runtime transpile. Keep pure logic in `calc.js` (decoupled from UI) with `node --test` unit tests.
4. **No backend**: data lives in browser `localStorage`; **any API key/secret stays local only — never committed, never in backups or cloud sync.**
5. **Rebuild and commit artifacts after changes**:
   ```bash
   cd projects/planner && npm i --no-save esbuild react@18.3.1 react-dom@18.3.1 && node scripts/build.mjs
   # popcorn-ui: cd projects/popcorn-ui && npm i --no-save esbuild react react-dom && node build.mjs
   ```
6. **Only commit the bundles you actually changed**: `build.mjs` rebuilds every bundle, and different esbuild versions cause tiny diffs in unrelated bundles. `git add` only the `dist/*.js` you truly changed plus its `?v=` line in the matching `index.html`; revert the rest with `git checkout origin/main -- <files>`. Make sure each `?v=` hash matches its bundle.

## Module layout (inside planner)
A new feature module follows: `<Module>Planner.jsx` (UI, self-contained `<style>`, prefixed class names) + `calc.js` (pure functions) + `calc.test.js` + `bootstrap.jsx` (build entry) + `index.html` (standalone demo loading `../dist/<module>.js`) + `package.json` (`"type":"module"`) + `README.md`. Shared helpers live in `projects/planner/core/` (`store.js`/`date.js`/`ui.jsx`).

## Adding a sub-project
Create a self-contained project under `projects/<name>/` (source + index.html + build + artifacts), then add a card to the root portal `index.html` with `href="./projects/<name>/"`.

## Git
- `main` is changed by multiple agents in parallel: **`git fetch origin main` and rebase/align to latest before you start**; keep changes small and focused.
- Develop on a feature branch, merge to `main` via PR; run the relevant modules' `node --test` before merging.
- Deploy: `.github/workflows/static.yml` uploads the whole repo — portal at `/`, sub-projects at `/projects/<name>/`. No extra config.

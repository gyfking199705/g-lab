# AGENTS.en.md — Working agreement for AI agents on g-lab

> If you're an AI agent working in this repo, read this first. Full guide: [`CONTRIBUTING.md`](CONTRIBUTING.md).
> Visual spec: [`DESIGN.md`](DESIGN.md) (English: [`DESIGN.en.md`](DESIGN.en.md)). 中文版：[`AGENTS.md`](AGENTS.md)。

## What this is
`g-lab` is an **umbrella monorepo**: the repo root is a static portal page, and each independent
mini-project lives under `projects/<name>/`.
- `projects/planner/` — Personal Growth Planner (multi-module single-page app)
- `projects/muse-ui/` — zero-dependency React creative-interaction component library
- `projects/swarm/` — multi-agent collaboration workspace prototype (requirement queue → role division → conclusion) + industry survey

## Must follow
1. **Code goes inside a sub-project dir** `projects/<name>/`. The repo root only holds the portal `index.html`, `README`, `DESIGN.md`, `AGENTS.md`, `CONTRIBUTING.md`, `assets/`, `.github/`. **Do not add app code to the root.**
2. **Follow `DESIGN.md`**: warm paper background `#F6F5F0` + clay/terracotta `#CC785C`, serif headings & key numbers, restrained whitespace, hairline borders, almost no shadows; **charts are hand-drawn SVG, no chart libraries**.
3. **Stack**: React 18 (function components + hooks) + esbuild prebundled into a **self-hosted single-file bundle** — no external CDN, no runtime transpile. Keep pure logic in `calc.js` (decoupled from UI) with `node --test` unit tests.
4. **No backend**: data lives in browser `localStorage`; **any API key/secret stays local only — never committed, never in backups or cloud sync.**
5. **Rebuild and commit artifacts after changes**:
   ```bash
   cd projects/planner && npm i --no-save esbuild react@18.3.1 react-dom@18.3.1 && node scripts/build.mjs
   # muse-ui: cd projects/muse-ui && npm i --no-save esbuild react react-dom && node build.mjs
   ```
6. **Only commit the bundles you actually changed**: `build.mjs` rebuilds every bundle, and different esbuild versions cause tiny diffs in unrelated bundles. `git add` only the `dist/*.js` you truly changed plus its `?v=` line in the matching `index.html`; revert the rest with `git checkout origin/main -- <files>`. Make sure each `?v=` hash matches its bundle.

## Module layout (inside planner)
A new feature module follows: `<Module>Planner.jsx` (UI, self-contained `<style>`, prefixed class names) + `calc.js` (pure functions) + `calc.test.js` + `bootstrap.jsx` (build entry) + `index.html` (standalone demo loading `../dist/<module>.js`) + `package.json` (`"type":"module"`) + `README.md`. Shared helpers live in `projects/planner/core/` (`store.js`/`date.js`/`ui.jsx`).

## Adding a sub-project
Create a self-contained project under `projects/<name>/` (source + index.html + build + artifacts), then add a card to the root portal `index.html` with `href="./projects/<name>/"`.

## 💤 dreaming mechanism (cross-project, must follow)
To give collaboration memory and let it self-evolve, keep a loop: **commit → material → brainstorm → plan → commit**. This is a lab-wide meta-mechanism shared by all sub-projects; the three stores live at the repo root under [`dreaming/`](dreaming/README.md):

- **materials** `dreaming/materials.md` — after each commit, record what you did / which problem it solved.
- **dreams** `dreaming/dreams.md` — brainstorm next steps from materials (wild ideas allowed).
- **plans** `dreaming/plans.md` — the genuinely feasible ones, with steps, acceptance and a status.

Write via the zero-dependency helper (consistent format, auto-incrementing ids); full spec in [`dreaming/README.md`](dreaming/README.md):

```bash
node scripts/dream.mjs capture --by claude --scope <project> \
  --title "<title>" --focus "<what you did>" --problem "<problem solved>"  # after every commit
node scripts/dream.mjs status                                              # before starting new work
node scripts/dream.mjs dream --by claude --title "<topic>" --idea "<idea>" ...
node scripts/dream.mjs plan  --by claude --title "<title>" --why "<feasibility>" --step "<step>" ...
node scripts/dream.mjs plan --update P-n --status active                    # proposed→active→done/dropped
```

Rules: brainstorming is divergent and may be unrealistic — only entries in `plans.md` mean "actually intend to do". The three md files are append-only (never rewrite history); change plan status via `--update`. Claude can also use the `/dream-capture`, `/dream-brainstorm`, `/dream-plan` skills (same script underneath).

**Enforced, not just convention**: two git hooks make this fire automatically — post-commit reminds you to capture after each commit, and pre-commit **blocks** the next code commit if the previous one has no material yet. Enable with `node scripts/dream.mjs enable-hooks` (**auto-enabled for Claude via `.claude/settings.json`**; Codex/local run it once). Bypass: `DREAM_SKIP=1 git commit ...` or `--no-verify`.

## Git
- `main` is changed by multiple agents in parallel: **`git fetch origin main` and rebase/align to latest before you start**; keep changes small and focused.
- Develop on a feature branch, merge to `main` via PR; run the relevant modules' `node --test` before merging.
- Deploy: `.github/workflows/static.yml` uploads the whole repo — portal at `/`, sub-projects at `/projects/<name>/`. No extra config.

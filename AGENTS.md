# AGENTS.md — g-lab 的 AI agent 工作约定

> 在本仓库工作的 AI agent 请先读本文件。完整规范见 [`CONTRIBUTING.md`](CONTRIBUTING.md)，
> 视觉规范见 [`DESIGN.md`](DESIGN.md)。English version: [`AGENTS.en.md`](AGENTS.en.md)。

## 这是什么
`g-lab` 是**伞形 monorepo**：根目录是一个静态门户首页，每个独立小项目放在 `projects/<name>/` 下。
- `projects/planner/` — 个人成长规划系统（多模块单页应用）
- `projects/popcorn-ui/` — 零依赖 React 创意交互组件库

## 必须遵守
1. **代码进子项目目录**：所有应用代码放 `projects/<name>/` 内；根目录只放门户 `index.html`、`README`、`DESIGN.md`、`CONTRIBUTING.md`、`assets/`、`.github/`。**不要往根目录加应用代码。**
2. **跟随 `DESIGN.md`**：暖纸色背景 `#F6F5F0` + 陶土橙 `#CC785C`、衬线标题与关键数字、克制留白、发丝级边框、几乎无阴影；**图表手写 SVG，不引图表库**。
3. **技术栈**：React 18（函数式 + hooks）+ esbuild 预打包成**自托管单文件**，无外部 CDN、无运行时转译。逻辑（纯函数 `calc.js`）与 UI（`*.jsx`）解耦，纯逻辑要有 `node --test` 单测。
4. **无后端**：数据存浏览器 `localStorage`；**AI Key/密钥只存本地、绝不入库、不进备份与云同步**。
5. **改完必须重新打包并提交产物**：
   ```bash
   cd projects/planner && npm i --no-save esbuild react@18.3.1 react-dom@18.3.1 && node scripts/build.mjs
   # popcorn-ui: cd projects/popcorn-ui && npm i --no-save esbuild react react-dom && node build.mjs
   ```
6. **只提交真正改到的 bundle**：`build.mjs` 会重建所有 bundle，不同 esbuild 版本会让无关 bundle 产生细微 diff。只 `git add` 本次实际改动的 `dist/*.js` 及其对应 `index.html` 的 `?v=` 行；其余 `git checkout origin/main -- <文件>` 还原。确认 `?v=` 哈希与 bundle 内容一致。

## 模块结构（planner 内）
新功能模块按此约定：`<Module>Planner.jsx`（UI，自带 `<style>`、类名前缀化）+ `calc.js`（纯函数）+ `calc.test.js` + `bootstrap.jsx`（打包入口）+ `index.html`（独立演示页，加载 `../dist/<module>.js`）+ `package.json`（`"type":"module"`）+ `README.md`。共享能力用 `projects/planner/core/`（`store.js`/`date.js`/`ui.jsx`）。

## 新增子项目
在 `projects/<name>/` 建自包含项目（源码 + index.html + 构建 + 产物），并在根 `index.html` 门户加一张卡片 `href="./projects/<name>/"`。

## 💤 dreaming 机制（跨项目，必须遵守）
为了让协作有记忆、能自我演化，维护一个闭环：**提交 → 素材 → 脑爆 → 计划 → 提交**。
这是 g-lab 整体实验室的元机制，所有子项目共用；三个存放地都在根目录 [`dreaming/`](dreaming/README.md)：

- **素材** `dreaming/materials.md`：每次提交写「做了什么 / 解决什么问题」。
- **脑爆** `dreaming/dreams.md`：基于素材发散「下一步可以做什么」（允许不靠谱）。
- **计划** `dreaming/plans.md`：从脑爆里筛出「真实可行」的，带步骤、验收与可推进状态。

统一用零依赖脚本写入（格式一致、id 自增），完整说明见 [`dreaming/README.md`](dreaming/README.md)：

```bash
# 每次提交后，记一条素材（必做，哪怕一两句）
node scripts/dream.mjs capture --by codex --scope <子项目> \
  --title "<标题>" --focus "<做了什么>" --problem "<解决什么问题>"

# 开新活之前，先看有没有该接着干的计划（优先推进已有 active/proposed，别重复发明）
node scripts/dream.mjs status

# 攒了一批素材后做梦；评估可行后立计划
node scripts/dream.mjs dream --by codex --title "<主题>" --idea "<想法>" ...
node scripts/dream.mjs plan --by codex --title "<标题>" --why "<可行性>" --step "<步骤>" ...
node scripts/dream.mjs plan --update P-n --status active   # 推进状态
```

规则：脑爆是发散、可不靠谱，只有进 `plans.md` 才代表真打算做；三个 md 只追加、不改写历史，计划状态变化用 `--update`。
Claude 还可用 `/dream-capture`、`/dream-brainstorm`、`/dream-plan` 三个 skill（同样调用上面的脚本）。

**强制触发**：两道 git 钩子保证机制不靠自觉——post-commit 提交后提醒记素材，pre-commit 在上一个代码提交没记素材时**挡住**下一次提交。启用 `node scripts/dream.mjs enable-hooks`（**Claude 会话由 `.claude/settings.json` 自动启用**；Codex/本地手动跑一次）。绕过：`DREAM_SKIP=1 git commit ...` 或 `--no-verify`。

## Git
- `main` 被多个 agent 并行改动：**动手前先 `git fetch origin main` 并 rebase/对齐到最新**；改动小而聚焦。
- 在功能分支开发，PR 合入 `main`；提交前跑相关模块 `node --test`。
- 部署：`.github/workflows/static.yml` 整仓库上传，门户在 `/`、子项目在 `/projects/<name>/`，无需额外配置。

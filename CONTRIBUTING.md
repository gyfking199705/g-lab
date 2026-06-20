# 贡献指南 · g-lab

`g-lab` 是一个**伞形 monorepo**：仓库根是一个静态门户首页，每个独立小项目放在
`projects/<name>/` 下，自成一体、按目录区分。纯前端、无后端，统一部署在 GitHub Pages。

> 视觉风格统一遵循 [`DESIGN.md`](DESIGN.md)。给 AI agent 的精简工作约定见 [`AGENTS.md`](AGENTS.md)。

## 仓库结构

```
g-lab/
├── index.html              # 门户首页（列出子项目；新增子项目要在这里加卡片）
├── favicon.svg
├── DESIGN.md / DESIGN.en.md   # 共享设计规范
├── assets/                 # 共享资源
├── .github/workflows/      # GitHub Pages 部署（static：整仓库原样上传）
└── projects/
    ├── planner/            # 子项目：个人成长规划系统
    └── muse-ui/         # 子项目：React 创意交互组件库
```

## 黄金规则

1. **所有代码进子项目目录**：`projects/<name>/` 之内。根目录只放门户、共享规范与配置，**不要往根目录加应用代码**。
2. **改完要重新打包**：源码（`.jsx` / `.js`）改动后必须重新生成该子项目的 `dist/`，并提交产物。
3. **只提交真正变化的产物**：见下方「打包注意」。
4. **跟随 `DESIGN.md`**：暖纸色 + 陶土橙、衬线标题、克制留白、手写 SVG、无图表库。
5. **无后端 / 不提交密钥**：数据存浏览器 localStorage；AI Key 等只存本地、绝不入库、不进备份/同步。

## 子项目（planner）的模块约定

planner 内每个功能模块是一个目录，标准构成：

```
<module>/
├── <Module>Planner.jsx   # React 组件（函数式 + hooks），自带 <style>，类名前缀化
├── calc.js               # 纯函数计算逻辑（不依赖 React / DOM，可单测）
├── calc.test.js          # 单元测试（node --test）
├── bootstrap.jsx         # 独立页打包入口（挂载 React）
├── index.html            # 可独立运行的演示页（加载 ../dist/<module>.js）
├── package.json          # { "type": "module" }，便于 Node 测试
└── README.md             # 模块说明与函数 I/O
```

- **逻辑与 UI 解耦**：能进 `calc.js` 的纯逻辑就别写进组件，方便测试与复用。
- **图表手写 SVG**，不引图表库；**React 18 + esbuild 自托管单文件**，无外部 CDN、无运行时转译。
- 共享能力在 `projects/planner/core/`（`store.js` 存储 + 迁移、`date.js`、`ui.jsx` 设计令牌/基元）。

## 打包

```bash
# planner
cd projects/planner
npm install --no-save esbuild react@18.3.1 react-dom@18.3.1
node scripts/build.mjs          # 产出 dist/*.js，并给各 index.html 写入 ?v=hash 缓存号

# muse-ui（库 + 画廊演示）
cd projects/muse-ui
npm install --no-save esbuild react@18.3.1 react-dom@18.3.1
node build.mjs                  # 库产物 dist/（gitignore）+ 演示 demo.js（入库）
```

### ⚠️ 打包注意（重要）
`node scripts/build.mjs` 会重建**所有** bundle；不同机器的 esbuild 版本会让**无关 bundle** 也产生
细微 diff。**只 `git add` 你这次真正改到的 bundle**（及其对应 `index.html` 的 `?v=` 行），其余用
`git checkout origin/main -- <那些文件>` 还原，避免无谓 diff 与冲突。提交前确认 `index.html` 里的
`?v=` 哈希与对应 `dist/*.js` 内容一致。

## 测试

```bash
cd projects/planner/<module> && node --test     # 各模块纯函数测试
cd projects/muse-ui && node --test
```
提交前确保涉及到的模块测试全绿。

## 新增一个子项目

1. 建 `projects/<name>/`，放它自己的源码、`index.html`、构建脚本与产物，**自包含**。
2. 在根 `index.html` 门户里加一张卡片，`href="./projects/<name>/"`。
3. 沿用 `DESIGN.md` 的设计语言。
4. 若需要构建产物，确保产物入库（GitHub Pages 直接发布静态文件）。

## 部署

`.github/workflows/static.yml` 把整仓库原样上传到 GitHub Pages：门户在站点根 `/`，
子项目在 `/projects/<name>/`。无需额外配置。

## Git

- 在自己的功能分支开发，通过 PR 合入 `main`。
- `main` 常被多个会话/agent 并行改动：**动手前先 `git fetch && rebase/reset 到最新 origin/main`**，
  改动尽量小而聚焦，减少冲突。

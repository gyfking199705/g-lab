# 🧪 g-lab

一个承载多个**独立小项目**的实验室仓库（monorepo / umbrella）。`g-lab` 本身是一个静态门户首页，
每个子项目自成一体、放在 `projects/<名字>/` 下，按目录区分、互不干扰。

> 纯前端、无后端，统一部署在 GitHub Pages。门户在站点根，子项目在各自子路径。

> 🤝 贡献规范见 [`CONTRIBUTING.md`](CONTRIBUTING.md)；AI agent 工作约定见 [`AGENTS.md`](AGENTS.md)。

## 🗂️ 仓库结构

```
g-lab/
├── index.html              # 🏠 g-lab 门户首页（列出各子项目）
├── favicon.svg
├── DESIGN.md / DESIGN.en.md   # 共享设计规范（所有子项目共用）
├── assets/                 # 共享资源（favicon 候选等）
├── .github/workflows/      # GitHub Pages 部署（整仓库原样上传）
└── projects/
    ├── planner/            # 🎯 个人成长规划系统（详见 projects/planner/README.md）
    ├── muse-ui/            # ✨ UI 组件脑爆 & research 实验室（零依赖 React 创意交互组件，可发 npm）
    ├── prompt-lab/         # 🧠 Prompt 研究室：收集 / 展示 / 复用优秀 Prompt
    ├── swarm/              # 🐝 多智能体协作工作区原型 + 业界调研
    └── agent-cli/          # 🖥️ Agent CLI 交互研究（复刻 + 对比业界命令行 agent）
```

## 📦 子项目

| 子项目 | 说明 | 在线路径 | 本地构建 |
| --- | --- | --- | --- |
| **planner** | 个人成长规划系统：个人/学习/健身/财富/股市/日程/习惯/目标/减脂/论文… 一体化应用 | `…/g-lab/projects/planner/` | `cd projects/planner && npm i --no-save esbuild react@18.3.1 react-dom@18.3.1 && node scripts/build.mjs` |
| **muse-ui** | UI 组件脑爆 & research 实验室：零依赖 React 创意交互组件 + 画廊演示（可被 planner 复用、也可发 npm） | `…/g-lab/projects/muse-ui/` | `cd projects/muse-ui && npm i --no-save esbuild react react-dom && node build.mjs` |
| **prompt-lab** | Prompt 研究室：收集 / 整理 / 展示 / 复用优秀 Prompt（分类、技巧标签、变量模板、导入导出，本地存储） | `…/g-lab/projects/prompt-lab/` | `cd projects/prompt-lab && npm i --no-save esbuild react@18.3.1 react-dom@18.3.1 && node build.mjs` |
| **swarm** | 多智能体协作工作区：需求进队列 → 多角色分工 → 给出结论（集群模式原型 + 业界调研） | `…/g-lab/projects/swarm/` | `cd projects/swarm && npm i --no-save esbuild react@18.3.1 react-dom@18.3.1 && node build.mjs` |
| **agent-cli** | Agent CLI 交互研究：复刻并对比业界命令行 agent（Claude Code / Codex / Gemini CLI / Aider）的交互方式——可上手把玩的终端控制台 + 玩法调研 | `…/g-lab/projects/agent-cli/` | `cd projects/agent-cli && npm i --no-save esbuild react@18.3.1 react-dom@18.3.1 && node build.mjs` |

## 🚀 本地预览

各子项目用 `fetch` + ES Module 加载，需经 **HTTP** 访问（不能 `file://` 双击）：

```bash
python3 -m http.server 8000
# 门户：    http://localhost:8000/
# planner： http://localhost:8000/projects/planner/
# muse-ui：  http://localhost:8000/projects/muse-ui/
# prompt-lab：http://localhost:8000/projects/prompt-lab/
# swarm：    http://localhost:8000/projects/swarm/
# agent-cli：http://localhost:8000/projects/agent-cli/
```

## ➕ 新增一个子项目

1. 在 `projects/` 下建目录 `projects/<name>/`，放它自己的源码、`index.html`、构建脚本与产物。
2. 在根 `index.html` 门户里加一张卡片，链接到 `./projects/<name>/`。
3. 共用 `DESIGN.md` 的设计语言，保持视觉一致。

## 🎨 设计风格

所有子项目共用一套设计语言（Claude.ai 式暖色编辑风），见 [`DESIGN.md`](DESIGN.md) / [`DESIGN.en.md`](DESIGN.en.md)。

## 🛠️ 技术说明

- 纯前端、React 18 + esbuild 预打包成自托管单文件 bundle，**无外部 CDN、无运行时转译**。
- 图表为手写 SVG，不依赖图表库；计算逻辑与 UI 解耦，纯函数可单测。
- GitHub Pages 用 `.github/workflows/static.yml` 把整仓库原样发布（门户在根、子项目在子目录）。

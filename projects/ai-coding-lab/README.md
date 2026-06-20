# 🤖 AI Coding 研究室 (ai-coding-lab)

> 收集、提炼并**展示**业界正在用的 **AI 编程范式**与**提效方式**。
> g-lab 伞形 monorepo 下的一个自包含子项目，纯前端、无后端，部署于 GitHub Pages。

在线路径：`…/g-lab/projects/ai-coding-lab/`

> 🤖 **AI agent 请先读 [`AGENTS.md`](AGENTS.md)**：那里有数据结构、字段口径、新增条目的步骤模板与提交前自检清单。

## 它解决什么

AI Coding 领域演进极快、信息碎片化。本研究室把散落各处的厂商/社区工程实践，
按统一结构沉淀成一份**可检索、可对比、带出处**的中文知识库：

- **五大类**：范式 🧭 · 工作流 🔁 · 提效技巧 ⚡ · 工具与生态 🧰 · 质量与护栏 🛡️
- **每条都结构化**：为什么有效 / 怎么落地 / 何时用 / 常见坑 / 成熟度 / 影响力 / 落地成本 / 权威出处
- **两种展示**：卡片网格 + 「影响力 × 落地成本」四象限散点图（手写 SVG）
- **筛选与排序**：关键词搜索（空格分词）、分类 / 成熟度 / 标签多选、按性价比/影响力/成熟度排序

## 目录结构

```
ai-coding-lab/
├── index.html          # 独立演示页（加载 ./dist/app.js）
├── favicon.svg
├── build.mjs           # esbuild 打包脚本（产出自托管单文件 dist/app.js）
├── package.json        # { "type": "module" }
├── data/
│   └── practices.js    # 知识库数据（纯数据，无依赖，可被 Node 单测引用）
├── src/
│   ├── bootstrap.jsx   # 打包入口（挂载 React）
│   ├── App.jsx         # 主界面
│   ├── MatrixChart.jsx # 四象限散点图（手写 SVG）
│   ├── style.js        # 内联样式（遵循共享 DESIGN.md）
│   ├── filter.js       # 纯逻辑：筛选 / 搜索 / 排序 / 统计
│   └── filter.test.js  # node --test 单测
└── dist/
    └── app.js          # 打包产物（入库，GitHub Pages 自托管）
```

逻辑（`filter.js` 纯函数）与 UI（`*.jsx`）解耦，便于测试与复用；图表手写 SVG，不引图表库。

## 本地预览

```bash
# 在仓库根
python3 -m http.server 8000
# 打开 http://localhost:8000/projects/ai-coding-lab/
```

> 需经 HTTP 访问（ES Module），不能 `file://` 双击。

## 开发与构建

```bash
cd projects/ai-coding-lab
node --test                                  # 跑纯逻辑 + 数据健全性单测
npm i --no-save esbuild react@18.3.1 react-dom@18.3.1
node build.mjs                               # 重建 dist/app.js 并写入 index.html 的 ?v= 缓存号
```

改完源码（`data/` 或 `src/`）务必重新 `node build.mjs` 并提交 `dist/app.js` 与 `index.html`。

## 新增 / 修改一条实践

编辑 `data/practices.js` 的 `ITEMS` 数组，按既有字段补全：

```js
{
  id: 'unique-id',
  title: '名称 (English Name)',
  category: 'paradigm' | 'workflow' | 'technique' | 'tooling' | 'guardrail',
  summary: '一句话概括',
  why: '为什么有效',
  how: ['步骤1', '步骤2', ...],   // 至少 2 步
  whenToUse: '何时使用',
  pitfalls: ['坑1', ...],
  tags: ['tag1', 'tag2'],
  maturity: 'emerging' | 'growing' | 'established',
  impact: 'low' | 'medium' | 'high',
  effort: 'low' | 'medium' | 'high',
  refs: [{ label: '出处', url: 'https://…' }],   // 至少 1 条
}
```

`filter.test.js` 含数据健全性检查（必填字段、枚举合法、id 唯一、refs 为合法 URL 等），
`node --test` 全绿后再 `node build.mjs` 提交。

## 内容口径

- 评级（成熟度 / 影响力 / 落地成本）保持克制、可横向比较，便于按**性价比**取舍。
- 每条尽量附**权威出处**（厂商工程博客、开放标准、官方文档）。
- 内容仅供参考，领域演进快，请以最新实践为准。

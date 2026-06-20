# 🧠 Prompt 研究室 · prompt-lab

g-lab 的子项目：一个**收集、整理、展示与复用优秀 Prompt** 的纯前端工具。

> 纯静态、无后端，数据存浏览器 `localStorage`；可一键导入/导出 JSON，便于备份与分享。
> 在线路径：`…/g-lab/projects/prompt-lab/`。

## ✨ 功能

- **收集**：表单录入一条 prompt，字段对齐业界 prompt 工程的通用元数据。
- **展示**：卡片画廊 + 详情抽屉；左侧按分类 / 技巧 / 标签 / 收藏过滤，顶部全文搜索、排序与平均质量概览。
- **快捷键**：`/` 聚焦搜索、`n` 新增、`Esc` 关闭当前层。
- **复用**：详情里填入 `{{变量}}` 即时预览，一键复制「正文」或「System+User 完整」prompt。
- **变量批量对照**：为同一条 prompt 填多组变量值，并排预览渲染结果，便于横向比较措辞、择优复制（纯前端模板渲染，不调用 LLM）。
- **版本历史 + 对比**：每次编辑正文/角色自动留快照（上限 20），可行级 diff 对比当前与历史版本（+增/−删着色），并一键恢复。
- **质量体检**：按业界最佳实践对 prompt 打分（角色 / 任务清晰 / 输出格式 / 抗幻觉 / 示例 / 变量 / 可检索 7 项），详情看清单与改进建议，编辑器底部实时显示得分。
- **管理**：新增 / 编辑 / 删除 / 收藏 / 克隆（副本）；复制为 Markdown；网格与列表两种视图。
- **可移植**：导出带 `format: prompt-lab/v1` 的 JSON；导入支持本工具导出对象或裸 prompt 数组（按 id 去重）。
- 首次打开内置 14 条精选示例（代码评审、结构化摘要、CoT、Few-shot 抽取、ReAct、苏格拉底教学、RAG 受限问答、JSON Schema、Text-to-SQL、PR 描述、Prompt 优化器、本地化翻译等范式）。

## 🗃️ 数据模型（业界标准字段）

| 字段 | 说明 |
| --- | --- |
| `title` / `summary` | 标题 / 一句话简介 |
| `category` | 分类（写作 / 编程 / 分析 / 抽取 / Agent / 教学 …） |
| `tags[]` | 自由标签 |
| `models[]` | 适用模型族（Claude / GPT / Gemini / Any …） |
| `techniques[]` | 技巧标签（Few-shot / CoT / 角色 / 结构化输出 / ReAct …） |
| `system` | System / 角色设定（可选） |
| `content` | Prompt 正文，`{{var}}` 表示模板变量 |
| `variables[]` | 由正文自动派生 |
| `exampleInput` / `exampleOutput` | 示例输入 / 输出 |
| `notes` | 笔记 / 为什么有效 |
| `source` / `license` / `version` | 出处 / 许可 / 版本 |
| `history[]` | 历史版本快照（正文 / 角色 / 版本 / 时间，最多 20 条） |
| `favorite` / `createdAt` / `updatedAt` | 收藏 / 时间戳 |

## 🛠️ 技术

- React 18（函数式 + hooks）+ esbuild 预打包成**自托管单文件** `dist/app.js`，无外部 CDN、无运行时转译。
- 纯逻辑（`src/schema.js` 数据模型/搜索/导入导出、`src/store.js` 持久化）与 UI（`src/*.jsx`）解耦，纯函数有 `node --test` 单测。
- 图标为手写 SVG，不引图标库；视觉遵循 g-lab `DESIGN.md`（暖纸色 + 陶土橙）。

## 📁 结构

```
prompt-lab/
├── index.html              # 入口（加载 dist/app.js）
├── build.mjs               # esbuild 打包脚本（写入 ?v= 缓存破坏哈希）
├── dist/app.js             # 打包产物（入库、自托管）
└── src/
    ├── schema.js / .test.js   # 数据模型、过滤、版本快照(commitEdit)、Markdown 导出、导入导出（纯函数）
    ├── diff.js / .test.js     # 行级 LCS diff（版本对比，纯函数）
    ├── lint.js / .test.js     # prompt 质量体检评分（业界最佳实践启发式，纯函数）
    ├── store.js / .test.js    # localStorage 持久化 + 版本迁移
    ├── seeds.js               # 内置精选 prompt
    ├── styles.js              # 全局样式（pl- 前缀）
    ├── icons.jsx              # 手写 SVG 图标
    ├── App.jsx                # 顶层状态与布局
    ├── bootstrap.jsx          # 打包入口
    └── components/            # Sidebar / PromptCard / PromptDetail / PromptEditor / HistoryPanel / BatchPanel / LintPanel
```

## 🚀 本地预览 & 构建

```bash
# 预览（需经 HTTP，不能 file://）
python3 -m http.server 8000   # 然后访问 http://localhost:8000/projects/prompt-lab/

# 跑纯逻辑单测
cd projects/prompt-lab && node --test

# 改完源码后重新打包并提交 dist/app.js
npm i --no-save esbuild react@18.3.1 react-dom@18.3.1 && node build.mjs
```

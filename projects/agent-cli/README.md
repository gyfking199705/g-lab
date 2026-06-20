# 🖥️ Agent CLI 交互研究

g-lab 的一个子项目：把 **Claude Code / OpenAI Codex CLI / Google Gemini CLI** 这类「命令行 agent」的
**交互方式**拆开来研究，并做一个**可上手把玩的复刻**。

> 纯前端、零后端。**默认离线即可体验全部交互**；配置自己的 API Key 后即真实作答。

## 页面两部分

### ① 终端式 agent 控制台（可玩）
复刻业界 coding-agent CLI 的交互手感：

- **命令行 composer**：底部 `›` 提示符，`Enter` 发送 / `Shift+Enter` 换行，聚焦发光
- **斜杠命令 + 自动补全浮层**：输入 `/` 弹候选，`↑↓` 选择、`Tab` 补全、`Enter` 执行
- **历史调取**：输入框为空时 `↑/↓` 翻阅敲过的内容（像真实 shell）
- **可中断**：任务运行时 `Esc` 立即打断（模拟播放与真实请求都支持）
- **流式呈现**：思考行 `✻`、工具调用卡（`● Tool(arg) ⎿ 结果`）、行级 **diff**（绿增红删）、打字机式回答
- **分级放权（审批模式）**：底部可切 `suggest`（每步批准）/ `auto-edit`（改文件自动·命令批准）/ `full-auto`（全自动），或 `/approval` 循环——亲手体验业界的「分级放权」
- **两种模式**：
  - **离线模拟**（默认）：内置 agent 按意图操作一个虚拟 Node 项目（纯内存）
  - **真实 AI**（`/login` 后）：走 **function-calling 工具循环**——模型自行 `read_file / edit_file / write_file / grep / run_bash`，在内存 FS 上执行并回填，真实模式也出工具卡 + diff（BYOK，Key 仅存本地）

先试 **`/demo`** 看完整流程；把审批切到 `suggest` 再跑，体验每步批准。

### ② 玩法调研（对比 + 共性）
- **六家对比卡**：Claude Code / Codex CLI / Gemini CLI / Aider / Cline / Continue 的交互模型、放权·审批·沙箱、斜杠命令、项目记忆、可扩展性。
- **速查矩阵**：维度 ×（六家）一屏横扫——放权/审批、沙箱、上下文/记忆、计划模式、Git 集成、扩展、开源。
- **ReAct 循环手写 SVG 示意**：推理 → 调工具 → 观察 → 再推理，标注审批/沙箱门。
- **共性设计模式**：REPL 工具循环、流式呈现、工具调用卡、斜杠命令、分级放权、计划模式、项目记忆、仓库地图/检索、可回滚、MCP 扩展。
- 每条结论附**来源链接**（官方文档为主），写于 2026-06。

## 代码结构

| 文件 | 作用 |
| --- | --- |
| `engine.js` | **纯逻辑**（已单测）：输入解析、斜杠补全、token 估算、行级 LCS diff、离线模拟 agent、虚拟文件系统 |
| `notes.js` | 调研对比**数据**（已单测：结构与来源完整性） |
| `ai.js` | 自包含 **BYOK** AI 客户端（Anthropic / OpenAI 兼容 / 自部署代理；Key 仅存本地） |
| `AgentCli.jsx` | React 组件：终端交互 + 流式播放 + 设置弹窗 + 调研面板；自带 `<style>` |
| `bootstrap.jsx` / `index.html` | 独立页入口 |
| `build.mjs` | esbuild 打包为自托管单文件 `app.js` |

## 🧩 给后续 agent 的接入/扩展指南

想继续加强这个项目？常见改动只动一两个文件，**改完跑 `node --test` + `node build.mjs` 即可**：

| 想做的事 | 改哪里 | 说明 |
| --- | --- | --- |
| 调研多一家 CLI | `notes.js` → `CLIS`（+ `SOURCES`、`MATRIX`） | 加一张对比卡：填 `rows` 与 `sources` 下标；矩阵里同步加一列单元。`notes.test.js` 会校验结构/来源/对齐 |
| 加一条共性模式 | `notes.js` → `PATTERNS` | `[标题, 说明]` 二元组 |
| 加一个斜杠命令 | `engine.js` → `SLASH_COMMANDS` + `AgentCli.jsx` → `runSlash()` | 前者管补全与 /help 展示，后者写命令行为 |
| 加一种模拟场景 | `engine.js` → `classifyIntent()` + `planAgentRun()` | 前者把诉求归类，后者产出「思考/工具/diff/回答」事件流（纯函数，`engine.test.js` 覆盖） |
| 换虚拟项目 | `engine.js` → `seedFiles()` | 离线 demo 操作的内存文件 |
| 接新模型/厂商 | `ai.js` → `PROVIDERS` / `callChat()` | BYOK 客户端，Key 存本地键 `agent-cli-ai` |

> 约定：纯逻辑进 `engine.js` / 数据进 `notes.js`（都要可单测）；UI 只在 `AgentCli.jsx`。改完务必重新 `node build.mjs` 并**只提交 `app.js` 这一个产物**（连同 `index.html` 的 `?v=` 行）。

## 开发

```bash
cd projects/agent-cli
node --test                                              # 单测（engine + notes，共 18 项）
npm install --no-save esbuild react@18.3.1 react-dom@18.3.1
node build.mjs                                           # 生成 app.js 并刷新 index.html 的 ?v=
```

视觉遵循 [`../../DESIGN.md`](../../DESIGN.md) 暖纸色 + 陶土橙；研究面板用编辑式卡片，终端区为暖色终端质感（`/theme` 可切深/浅）。

> ⚠️ 纯前端调用大模型意味着 Key 暴露在浏览器端，仅建议个人使用；不要把含 Key 的内容分享给他人。

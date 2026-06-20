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
- **两种模式**：默认**离线模拟**（内置 agent 按意图操作一个虚拟 Node 项目，纯内存）；`/login` 填自己的 Key 后即**真实 AI**（BYOK，直连 Anthropic / OpenAI 兼容接口，Key 仅存本地浏览器）

先试 **`/demo`** 看完整流程。

### ② 玩法调研（对比 + 共性）
- **三家对比**：Claude Code / Codex CLI / Gemini CLI 的交互模型、放权/审批/沙箱、斜杠命令、项目记忆、可扩展性。
- **共性设计模式**：REPL 工具循环、流式呈现、工具调用卡、斜杠命令、分级放权、计划模式、项目记忆、MCP 扩展。
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

## 开发

```bash
cd projects/agent-cli
node --test                                              # 单测（engine + notes）
npm install --no-save esbuild react@18.3.1 react-dom@18.3.1
node build.mjs                                           # 生成 app.js 并刷新 index.html 的 ?v=
```

视觉遵循 [`../../DESIGN.md`](../../DESIGN.md) 暖纸色 + 陶土橙；研究面板用编辑式卡片，终端区为暖色终端质感（`/theme` 可切深/浅）。

> ⚠️ 纯前端调用大模型意味着 Key 暴露在浏览器端，仅建议个人使用；不要把含 Key 的内容分享给他人。

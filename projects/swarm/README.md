# 🐝 swarm · 多智能体协作工作区

> g-lab 的子项目。一个**集群式多智能体协作工作区**原型：
> **用户提需求 → 进队列 → 协调者拆解 → 多角色并行/串行处理 → 评审 → 给出结论**。
> 配套一份[业界调研报告](./RESEARCH.md)（业界都怎么玩 + 我们如何对齐与超越）。

纯前端、无后端，部署在 GitHub Pages。无 API Key 也能**离线模拟**跑通完整流程；填入自己的 Key（BYOK）后用真实大模型分工协作。

## 它在做什么

模拟业界主流的 **orchestrator-worker（协调者—工作者）** 范式：

1. **入队**：把一句话需求提进队列，形成一个 Job。
2. **拆解**：协调者按需求类型把 Job 拆成带依赖的子任务（Task），指派角色。
3. **集群波次**：无依赖的子任务**并行**（同一波次），有依赖的**串行**，逐波推进。
4. **角色分工**：🔎 调研员 / 🗺️ 规划师 / 🛠️ 执行者 / 🧪 评审员 各司其职。
5. **验证—返工闭环**：评审不通过 → 执行者按意见返工 → 复评，最多 2 轮（generator-critic 迭代）。
6. **汇总**：📝 汇总者整合全部产出，给出「结论 + 关键要点 + 下一步 + 遗留风险」。

## 目录结构

```
swarm/
├── index.html            # 演示页（加载 ./dist/swarm.js）
├── RESEARCH.md           # 业界调研报告（核心调研产出）
├── build.mjs             # esbuild 打包脚本
├── core/                 # 纯逻辑（无 React / 无网络，可 node --test）
│   ├── roles.js          #   分工角色注册表
│   ├── queue.js          #   任务队列与依赖调度（状态机 + 拓扑分层）
│   ├── orchestrator.js   #   拆解 / 模拟执行 / 汇总 / LLM 提示词
│   ├── ai.js             #   BYOK 客户端（Anthropic / OpenAI）
│   ├── engine.js         #   执行引擎（串起调度+编排+模型，有副作用）
│   └── *.test.js         #   单测
└── app/                  # React UI
    ├── App.jsx           #   工作区（队列 / 集群看板 / 结论 / AI 设置）
    ├── markdown.js       #   极简 markdown 渲染
    └── bootstrap.jsx     #   打包入口
```

逻辑（纯函数）与 UI 解耦：`core/` 全部可单测，`app/` 只管渲染与交互。

## 本地预览

需经 HTTP 访问（不能 `file://` 双击）：

```bash
# 在仓库根
python3 -m http.server 8000
# 打开 http://localhost:8000/projects/swarm/
```

## 开发 / 构建

```bash
cd projects/swarm
npm i --no-save esbuild react@18.3.1 react-dom@18.3.1
node build.mjs          # 产出 dist/swarm.js，并把内容哈希写进 index.html 的 ?v=
node --test             # 跑 core/ 单测
```

## 接真实大模型（BYOK）

点右上「AI 设置」→ 勾选启用 → 选厂商（Anthropic/OpenAI）→ 填模型与 API Key。
**Key 只存浏览器 localStorage，不上传任何服务器、不入库。** 纯前端直连会把 Key 暴露在浏览器端，仅建议个人/演示使用；多用户/生产场景请改「后端代理 + 服务端密钥」。

## 已知边界

教学/研究原型：纯前端、无持久化检查点、无并发与预算治理、未对接 A2A/MCP。生产化方向见 [RESEARCH.md](./RESEARCH.md) 第 6–7 节。

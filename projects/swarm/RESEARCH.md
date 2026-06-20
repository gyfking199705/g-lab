# 多智能体协作工作区 · 业界调研报告

> 调研目标：搞清楚「用户提需求 → 进队列 → 多智能体分工角色处理 → 给用户结论」这类**集群式多智能体协作工作区**，业界都怎么玩；在此基础上提出我们**对齐与超越**的设计主张。
>
> 调研时间：2026-06。资料来源以各家工程博客、官方文档、arXiv 论文为主，关键结论在文末「参考」列出链接。部分数字来自二手综述，已在行文中标注。

---

## 0. 一句话结论

业界已经从 2023 年「单智能体自循环」（AutoGPT / BabyAGI）演进到 2025 年成熟的 **orchestrator-worker（协调者—工作者）+ 并行子智能体 + 独立上下文 + 单独引用/校验 pass** 范式（以 Anthropic 多智能体研究系统为标杆）。**真正的护城河不在「多智能体」本身，而在编排（orchestration）、上下文工程、验证闭环与成本控制**——近 50% 的厂商把「编排」列为首要差异点（Gartner 2025）。我们要超越的不是「再加几个角色」，而是把**调度透明化、上下文可治理、验证内建、成本可预测**做到位。

---

## 1. 这类产品要解决的问题模型

把它拆成四段，几乎所有产品都落在这条主线上：

```
用户需求 ──▶ 队列/任务池 ──▶ 协调者拆解 ──▶ 多角色并行/串行处理 ──▶ 验证/汇总 ──▶ 结论
            (queue)         (decompose)     (cluster / waves)        (synthesis)
```

- **需求入队**：把一句话需求变成一个 Job。
- **拆解与分工**：协调者把 Job 拆成带依赖的子任务（Task），每个子任务指派一个**角色**（调研 / 规划 / 执行 / 评审…）。
- **集群处理**：无依赖的子任务**并行**（一个「波次 / superstep」），有依赖的**串行**。
- **汇总结论**：把各角色产出**收敛**成一份面向用户的结论。

本子项目（`projects/swarm/`）正是这条主线的一个**可运行原型**：离线即可演示完整流程，填入 API Key 后用真实大模型分工协作。

---

## 2. 业界全景：编排拓扑（orchestration topologies）

学术与工程界已收敛出一组**命名拓扑**，是理解所有框架的「坐标系」（综述见 arXiv:2501.06322 / 2502.14321 / 2406.07155）：

| 拓扑 | 形态 | 代表 | 适用 | 风险 |
| --- | --- | --- | --- | --- |
| **协调者—工作者 / Supervisor** | 星型，中枢路由 | Anthropic 研究系统、Bedrock、LangGraph supervisor、CrewAI hierarchical | 可拆解、需可审计 | 中枢瓶颈/单点 |
| **层级 / Hierarchical** | 树，「团队的团队」 | MetaGPT、LangGraph 层级团队 | 大规模、可分域 | 层级延迟、级联错误 |
| **顺序管线 / Pipeline (Chain)** | 线性 | ChatDev 的 chat chain、MetaGPT 瀑布 SOP | 流程固定 | **误差级联** |
| **群聊 / 轮询 / 辩论** | 共享消息池 | AutoGen GroupChat、Multi-Agent Debate | 需多视角/自纠 | token 成本高、可能收敛到多数错误 |
| **黑板 / Blackboard** | 共享全局状态 | MetaGPT 消息池+订阅、bMAS（2507.01701） | 不定序、增量求解 | 黑板争用、上下文膨胀 |
| **市场 / 拍卖 / Contract-Net** | 招标—投标—授标 | 经典 CNP(1980)、AucArena、COALESCE | 异构动态分配 | 协商开销 |
| **对等 / 群集 / Handoff (Swarm)** | 任意图，去中心直接交接 | OpenAI Swarm、langgraph-swarm、Manus Wide Research | 开放动态、抗单点 | 难追踪、协调难 |

**关键判断**：2025 年的事实标准是 **Supervisor（协调者—工作者）+ 并行 fan-out/fan-in**。去中心 swarm 看起来酷，但工程上更难调试、协调成本更高；纯顺序管线最易实现，但误差级联是硬伤。

---

## 3. 主流框架/产品横评

### 3.1 速查表

| 框架/产品 | 时间 | 核心范式 | 分工方式 | 并行 | 状态/记忆 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| **AutoGPT** | 2023.03 | 单智能体自循环 | 自我拆解 | 否 | JSON 文件 | 历史起点，常陷死循环 |
| **BabyAGI** | 2023.04 | 任务队列循环 | 执行/造任务/排序 3 提示词 | 否 | Pinecone 向量 | ~140 行，决定→排序→执行循环的鼻祖 |
| **ChatDev** | 2023.07 | 顺序 chat chain | CEO/CTO/程序员/测试… 双人对话 | 否 | 两级记忆 | 沟通去幻觉；ChatDev 2.0(2026.01) 转零代码平台 |
| **MetaGPT** | 2023(ICLR'24) | SOP 瀑布 | PM/架构/PjM/工程/QA | 主要串行 | 共享消息池+订阅 | 标准化产物降错；HumanEval≈85.9%；衍生 MGX 无代码 |
| **AutoGen** | v0.4 2025.01 | 事件驱动 actor | Team：轮询/Selector/Swarm | 是(actor) | v0.4 有状态 | Magentic-One 双账本编排；并入 Microsoft Agent Framework(2026.04 GA) |
| **CrewAI** | 活跃 | 角色制 | Agent(role/goal/backstory)+Task | 选配(async/Flows) | Crew/Flow 状态 | 心智模型最易懂；脱离 LangChain 自研内核 |
| **LangGraph** | 1.0 2025.10 GA | 图/状态机 | supervisor/swarm/层级/custom | **原生**(Send/superstep/reducer) | 持久 checkpoint | 控制最细；A2A/HITL/时间旅行齐备 |
| **OpenAI Swarm→Agents SDK** | 2024.10→2025.03 | handoff + agents-as-tools | transfer_to_X / Agent.as_tool() | 是(asyncio.gather) | Sessions | Swarm 仅教学；SDK 加 guardrails/tracing |
| **Anthropic 研究系统** | 2025.06 | **orchestrator-worker** | Lead(Opus)+并行 subagent(Sonnet)+CitationAgent | **是(两级并行)** | 独立上下文+外部记忆 | **事实标杆**：比单体 +90.2%，~15× token |
| **Amazon Bedrock 多智能体** | GA 2025.03 | Supervisor / 路由两模式 | 监督者+协作者 | 是(可并行) | 托管 | payload 引用降本；演进到 AgentCore |
| **Google ADK + A2A** | 2025.04 | 确定性工作流+LLM 路由 | Sequential/Parallel/Loop Agent | 是(ParallelAgent) | 会话状态 | A2A 跨厂商协议(2025.06 捐 Linux 基金会) |
| **Devin / Cognition** | 2024.03 | 规划器+执行器 | 主 Devin 编排「托管 Devin」 | **并行 Devin** | 知识/Wiki/Playbook | Nubank 10万+迁移；PR 合入率 34%→67% |
| **OpenHands** | 2024(V1 2025.11) | 事件溯源+CodeAct | DelegateTool spawn/delegate | 线程级 fan-out | 事件流可重放 | 开源 SOTA，SWE-bench Verified 77.6% |
| **Manus** | 2025.03 | 沙箱+CodeAct 单循环 | 单上下文为主 | **Wide Research** ~100 子体 | 文件系统当记忆 | 「上下文工程」博客影响大；2025.12 被 Meta 收购 |

### 3.2 标杆细读：Anthropic 多智能体研究系统（必读范式）

- **架构**：Lead（Claude Opus 4）做规划，并行 spawn **3–5 个 subagent**（Claude Sonnet 4），每个 subagent **独立上下文窗口**、独立工具与探索轨迹；研究循环结束后交给独立的 **CitationAgent** 做引用归属。
- **两级并行**：Lead 并行起多个 subagent；每个 subagent 内再并行发 3+ 工具调用 → 复杂查询研究时间最多 **降 90%**。
- **独立上下文 = 压缩机制**：每个 subagent 可烧几万 token 探索，只回传 1–2k token 精华，避免 Lead 上下文被原始数据淹没。
- **效果与代价**：内部研究评测比单体 Opus 4 **高 90.2%**；但 **token ~15×**（普通 chat），且**token 用量解释了约 80% 的效果方差** → 只对**高价值、可并行**任务划算。
- **工程教训**：「像你的智能体一样思考」；给 subagent **明确的目标/输出格式/工具/边界**（含糊指令会重复劳动）；按查询复杂度缩放智能体数量（简单 1 个、对比 2–4、复杂 10+）；早期翻车包括「给简单查询起 50 个 subagent」「无限找不存在的源」「互相刷消息干扰」。
- **评测**：LLM-as-judge 单次打分 0.0–1.0 + 通过/否最稳；~20 条代表性查询就能看出效应量；人工评测仍不可替代。

### 3.3 其他家的「一招鲜」

- **MetaGPT — 标准化产物 + 订阅**：角色间传**结构化文档**（PRD/设计/任务/代码）而非自由聊天；**共享消息池 + 按类型订阅**（主动 pull，不必逐一问答），显著降低错误传播。工程师还有**可执行反馈自纠**循环（+4.2% HumanEval）。
- **ChatDev — 沟通去幻觉**：助手在动手前**主动反问指令者**要更具体的建议，再产出，使代码漏洞下降 ~13×；终止条件「连续两次代码不变」或「~10 轮」。
- **AutoGen/Magentic-One — 双账本**：Orchestrator 维护**任务账本**（事实/猜测/计划）+ **进度账本**（是否完成/是否在进展/下一个谁来/下一步指令）；停滞计数 ≤2 才继续，超阈值回外层**重规划**。终止条件是**可组合的一等对象**（`MaxMessageTermination(10) | TextMentionTermination("APPROVE")`）。
- **OpenAI — handoff vs agents-as-tools 二分**：handoff 是「把对话转交」（specialist 直接面向用户，`transfer_to_X`）；agents-as-tools 是「经理调用专家当工具」（经理保留最终答案与统一 guardrails）。两条编排哲学：**让 LLM 决策**（开放任务）vs **用代码编排**（确定、可预测）。
- **LangGraph — Send/superstep/reducer 三件套**：`Send(node, state)` 在条件边里**运行时动态 fan-out N 份**（map-reduce）；同 superstep 内并行；`Annotated[list, operator.add]` 做 fan-in 归并。`Command(goto, update, graph=PARENT)` 把「状态更新 + 控制流」合一，支持去中心 handoff 与跨子图回交。
- **Bedrock — 两种监督模式**：「Supervisor」永远全量拆解—委派—汇总；「Supervisor with routing」对单一清晰意图走**直达单协作者**的快路径，省延迟与成本，复杂/模糊再回退全量。
- **A2A 协议**：Agent Card（`/.well-known/...json` 发现）+ Task 生命周期（submitted/working/input-required/completed…），HTTP+JSON-RPC，与 **MCP 互补**（MCP 接「工具/资源」，A2A 接「agent 间协作」）。

---

## 4. 关键机制（跨框架的设计要素）

### 4.1 队列、调度与并行（本原型的核心）

- **fan-out/fan-in（map-reduce）** 是「并行」的本质：拆 N 份独立子任务并发跑，再等齐归并。实测跨框架 **1.8×–3.7× 墙钟加速、最多 6× 降本**。
- **波次 / superstep**：把任务按依赖**拓扑分层**，同层并行、层间串行——本原型用 `topoLayers()` 可视化「集群波次」。
- **何时必须串行**：B 依赖 A 的产出就只能串（检索→分析→写作）。**并行只适用于独立工作**。
- **可靠性前提**：长 fan-out 需要**检查点 + 幂等重放**，进程挂了能从已完成分支恢复。
- 学术调度：Justitia（2510.17015）按内存度量公平调度，平均完成时间较 VTC 降 57.5%；LLMCompiler 把工具调用计划当 DAG 调度。

### 4.2 记忆与共享上下文（最反直觉的权衡）

两条对立路线：

- **共享上下文 / 黑板**：所有 agent 读写同一份状态（MetaGPT 消息池、AutoGen 会话史、LangGraph 共享 state）。**优点**协调好、省去重复广播；**缺点**写争用、上下文膨胀、「context rot」（20–30 轮后明显退化）、「lost in the middle」。
- **隔离上下文**：每个子体独立窗口（Anthropic）。**优点**并行 + 压缩；**缺点**~15× token、强耦合任务（如多数编码）协调不了、易产生冲突决策。

记忆体系（CoALA 框架，2309.02427）：**工作记忆 / 情景记忆 / 语义记忆 / 程序记忆**。落地手段：Generative Agents 的「**近因×重要性×相关性**」检索 + 反思；MemGPT 的「主上下文/外部上下文 + 分页」（DMR 93.4%）；向量库做语义检索但**丢时序**，催生知识图谱式情景记忆（Zep）。Manus 的实践：**文件系统当无限记忆 + `todo.md` 复述**把全局计划顶到上下文近端，并「**把错误留在上下文里**」让模型自我纠偏；KV-cache 命中率是生产第一指标（缓存命中 ~10× 降本）。

### 4.3 验证 / 评审 / 共识（质量闭环）

- **反思 / 自纠**：Reflexion（2303.11366，HumanEval 91%）、Self-Refine（2303.17651）——但**当模型无法自我验证对错时收效甚微**（数学题）。
- **生成器—评审者对**：CriticGPT（2407.00215）让评审更受偏好（63%），辅助人审胜率 ~60%。本原型的「评审员」角色即此模式。
- **LLM-as-judge**（2306.05685）：GPT-4 与人类一致率 >80%，但有**位置/冗长/自偏好**偏差，需换位平均等缓解。
- **辩论 / 投票 / 集成**：Multi-Agent Debate（2305.14325，GSM8K 77→85%）、Self-Consistency（2203.11171，GSM8K +17.9%）、More Agents（2402.05120）。**重要警示**：多份严谨复现（2311.17371、2502.08788）表明**默认的多智能体辩论在等 token 预算下常打不过简单的 self-consistency**，性价比要算账。

### 4.4 终止与汇总

- **硬上限**：消息数 / 轮数 / token / 超时（防死循环，普遍推荐）。
- **语义信号**：出现 "APPROVE"/"TERMINATE"、handoff 到人。
- **协调者判完成**：自反思「需求是否被满足」+ 停滞计数（Magentic 默认 `max_round=10`/`max_stall=3`/`max_reset=2`）。
- **汇总 = fan-in/reduce**：并行产出写共享态，再由**单一组件**收敛（Semantic Kernel 默认列表聚合或自定义 aggregator/`summary_agent`；Anthropic 是 Lead 综合 + 独立 CitationAgent 校引用，避免「传话游戏」）。本原型由「汇总者」角色依赖全部上游产出，生成「结论 + 关键要点 + 下一步 + 风险」。

### 4.5 人在环（HITL）

业界三种审批位：**执行前审批 / 执行后复核 / 风险触发升级**。LangGraph：`interrupt()` 暂停并 checkpoint，`Command(resume=...)` 恢复，支持 approve/edit/reject；需 checkpointer + thread_id。Microsoft Agent Framework：`ApprovalRequiredAIFunction` + `RequestInfoExecutor/Event`，checkpoint 后挂起请求可在重启后重发。**只在不可逆、高影响动作上中断**，不是每步都问。

---

## 5. 成本与失败模式（反方观点，必须正视）

- **token 经济学**：agent ~4× chat；多智能体 ~15× chat；token 解释 ~80% 效果方差 → **只对高价值任务划算**。
- **级联误差数学**：每步 95% 可靠，10 步 ≈ 60%，20 步 ≈ 36%，~50 步≈抛硬币；且误差**会被下游当作 ground truth 放大**，实际比 p^n 更糟。
- **MAST 失败学**（2503.13657，NeurIPS'25）：14 种失败模式归 3 类——规范/系统设计 ~41.8%、智能体间错位/协调 ~36.9%、任务验证/终止 ~21.3%。即 **~79% 的失败是结构/协调问题，不是模型能力**。多智能体框架失败率 41%–86.7%。
- **Cognition「别造多智能体」**（2025.06）：子体看不到彼此工作 → 对变量名/架构/选库做**冲突决策**，对账成本超过并行收益；尤其编码「深且顺序」，建议**单线程连续上下文 + 上下文压缩**优先于 fan-out。

> **结论**：多智能体不是银弹。**调研/检索类「广度优先、可并行、弱耦合」任务**最适合多智能体；**编码类「深度、强耦合、顺序」任务**应谨慎，优先单线程 + 压缩或严格共享上下文。

---

## 6. 对齐与超越：我们的设计主张

**对齐（业界已验证、必须做到的基线）**

1. **协调者—工作者 + 波次并行**：星型拓扑、依赖 DAG、无依赖同层并行——本原型已实现（`queue.js`/`engine.js`）。
2. **明确的子任务契约**：每个子任务带角色 / 目标 / 输入 / 验收（学 Anthropic 的「objective + output format + boundary」）。
3. **内建验证闭环**：评审者 + 汇总者两道关（生成器—评审者 + fan-in 汇总）。
4. **可组合终止 + 死锁检测**：硬上限 + 语义信号 + `isDeadlocked()`。

**超越（业界普遍做得不好、是我们的发力点）**

1. **调度透明化**：把「波次 / 依赖 / 谁在跑 / 产出」**全程可视化**（多数框架是黑盒日志）。本原型的看板就是这个方向的雏形。
2. **上下文可治理**：默认隔离上下文 + 显式「黑板」共享面 + 自动压缩/复述（`todo.md` 式），并**把失败留在上下文**——直面 context rot 与冲突决策两大失败源。
3. **成本可预测**：在派单前**预估 token/步数与并发**，给用户「这单大概多贵」；对单一清晰意图走 Bedrock 式**路由快路径**省钱。
4. **任务自适应拓扑**：按 `classify()` 的需求类型动态选管线（调研→多路并行；编码→单线程+压缩；决策→框架打分）——而非一套拓扑硬套所有任务。
5. **可移植协作**：对齐 **A2A/MCP** 心智（agent 间协作 + 工具调用分层），为将来接外部 agent 留口。
6. **诚实的不确定性**：汇总结论里显式列「遗留风险 / 待确认假设」，而不是假装确定（本原型已在结论模板中体现）。

---

## 7. 本原型如何体现这些主张

| 主张 | 代码落点 |
| --- | --- |
| 需求入队 + Job/Task 状态机 | `core/queue.js`（`createJob`/`runnableTasks`/状态迁移） |
| 协调者拆解 + 角色分工 | `core/orchestrator.js`（`decompose`/`planToSpecs`）+ `core/roles.js` |
| 波次并行（集群模式） | `core/queue.js` `topoLayers()` + `core/engine.js` 并发调度 |
| 验证 + 汇总闭环 | 「评审员」「汇总者」角色 + `synthesize()` |
| 死锁/终止防护 | `isDeadlocked()` / `hasPending()` |
| BYOK 接真实大模型 | `core/ai.js`（Anthropic / OpenAI，Key 仅存本地） |
| 离线可演示 | `mockRun()` 确定性模拟，无 Key 也能跑通全流程 |
| 调度透明化 | `app/App.jsx` 集群看板（波次/角色/状态/产出实时可见） |

> 这是一个**教学/研究原型**：纯前端、无后端、Key 只存浏览器本地。生产化需要后端代理（服务端密钥）、真正的持久化检查点、并发与预算治理、以及对接 A2A/MCP。

---

## 8. 参考（精选）

**标杆与工程博客**
- Anthropic, *How we built our multi-agent research system* — https://www.anthropic.com/engineering/multi-agent-research-system
- Cognition, *Don't Build Multi-Agents* — https://cognition.ai/blog/dont-build-multi-agents ；Devin 2.0 — https://cognition.ai/blog/devin-2
- Manus, *Context Engineering for AI Agents* — https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus ；Wide Research — https://manus.im/docs/features/wide-research

**框架文档**
- LangGraph 多智能体概念 — https://langchain-ai.github.io/langgraph/concepts/multi_agent/ ；Command — https://www.langchain.com/blog/command-a-new-tool-for-multi-agent-architectures-in-langgraph
- AutoGen v0.4 — https://www.microsoft.com/en-us/research/articles/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/ ；Magentic-One — https://www.microsoft.com/en-us/research/articles/magentic-one-a-generalist-multi-agent-system-for-solving-complex-tasks/
- OpenAI Agents SDK 编排 — https://openai.github.io/openai-agents-python/multi_agent/ ；Swarm — https://github.com/openai/swarm ；Orchestrating Agents cookbook — https://cookbook.openai.com/examples/orchestrating_agents
- CrewAI Processes — https://docs.crewai.com/en/concepts/processes
- Bedrock 多智能体协作 GA — https://aws.amazon.com/blogs/machine-learning/amazon-bedrock-announces-general-availability-of-multi-agent-collaboration/
- Google ADK — https://developers.googleblog.com/en/agent-development-kit-easy-to-build-multi-agent-applications/ ；A2A — https://github.com/a2aproject/A2A
- OpenHands SDK — https://github.com/OpenHands/software-agent-sdk

**论文（arXiv）**
- 多智能体协作综述 2501.06322；通信中心综述 2502.14321；图增强综述 2507.21407
- MetaGPT 2308.00352；ChatDev 2307.07924；AutoGen 2308.08155；MacNet 2406.07155；GPTSwarm 2402.16823；DyLAN 2310.02170
- Reflexion 2303.11366；Self-Refine 2303.17651；CriticGPT 2407.00215；LLM-as-judge 2306.05685；Multi-Agent Debate 2305.14325；Self-Consistency 2203.11171；More Agents 2402.05120
- 「该不该上 MAD」2311.17371；「别高估辩论」2502.08788；预算感知评测 2406.06461
- 失败学 MAST 2503.13657；CoALA 记忆 2309.02427；记忆机制综述 2404.13501；MemGPT 2310.08560；Generative Agents 2304.03442；调度 Justitia 2510.17015；OpenHands 2407.16741 / 2511.03690

> 说明：本次调研环境对部分站点（arXiv、各厂官网）有抓取限制，多处数字来自二手综述对一手来源的转述，已尽量交叉印证；如需逐字引用，请回到上方一手链接核对。

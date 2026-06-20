# 素材 · materials

> 每次提交后写一条：**做了什么 / 为解决什么问题**。这是「做梦」的原料。
> 优先用 `node scripts/dream.mjs capture ...` 追加，格式见 [`README.md`](README.md)。

---

## M-1 · 2026-06-20 · 建立 dreaming 协作机制
- 作者: claude
- 提交: 本提交
- 子项目: （根目录 / 全局）
- 重点: 在 g-lab 根目录新增 `dreaming/`（素材 materials、脑爆 dreams、计划 plans 三个存放地）+ 统一工具 `scripts/dream.mjs` + 三个 Claude skill + 根目录 AGENTS.md/CLAUDE.md 协作约定
- 解决的问题: Claude 与 Codex 轮流协作缺乏「记忆」与「自我演化」路径——提交后没人沉淀重点，下一步靠临时拍脑袋。现在有了「提交→素材→脑爆→计划→提交」的闭环
- 遗留/副作用: 尚未接 git hook 自动提醒；初期靠 agent 自觉调用

## M-2 · 2026-06-20 · 给 dreaming 加强制 git 钩子（落地 P-1）
- 作者: claude
- 提交: 本提交
- 子项目: （根目录 / 全局）
- 重点: 新增 `scripts/hooks/{pre-commit,post-commit}`（pre 拦截未记素材的代码提交、post 提醒）+ `dream.mjs enable-hooks` 一键启用 + `.claude/settings.json` SessionStart 让 Claude 会话自动启用 + AGENTS/README 文档
- 解决的问题: 原机制纯靠自觉、不保证每次提交都触发。现在两道钩子把「记素材」从约定升级为强制（仍可 DREAM_SKIP/--no-verify 绕过）
- 遗留/副作用: git 钩子需每个 clone 启用一次（Codex/本地手动跑 enable-hooks）；Claude 已由 settings.json 自动化

## M-3 · 2026-06-20 · 一致性打磨：project 衬线全栈
- 作者: claude
- 提交: 606b72a
- 子项目: planner
- 重点: 把 project 模块 --serif 补齐 CJK 回退(Source Han Serif SC/Noto Serif CJK SC)，与其它模块/DESIGN 完全一致；重打包 project/app bundle
- 解决的问题: 旧模块字体栈漂移导致跨模块视觉不一致

## M-4 · 2026-06-20 · 新增多智能体协作工作区子项目 + 业界调研
- 作者: claude
- 提交: 0863b66
- 子项目: swarm
- 重点: 搭出集群式多智能体原型（需求队列→协调者拆解→多角色波次并行/串行→评审→汇总结论），core 纯逻辑 19 单测，离线可演示+BYOK 接真实大模型；并产出业界调研 RESEARCH.md（含通信协议与成本/失败模式）
- 解决的问题: 回答『业界多智能体协作工作区怎么玩、如何对齐与超越』，并给出可运行的集群模式参考实现

## M-5 · 2026-06-20 · muse-ui v0.2：+3 创意组件 + TS 类型 + research 账本
- 作者: claude
- 提交: 662a1f0
- 子项目: muse-ui
- 重点: 新增 GradientText/Typewriter/CommandPalette（逻辑/视图解耦、纯函数单测、自带样式 muse- 前缀、尊重 reduced-motion）；index.d.ts 随包发布完整 TS 类型；IDEAS.md 作脑爆/research 账本；画廊三新区块。
- 解决的问题: 把库从 6 组件扩到 9，补上类型与研究记录，确立 muse-ui 作为「UI 组件脑爆 + research 实验室」的定位。
- 遗留/副作用: 库 dist 不入库（发布前 build.mjs 生成）；CommandPalette 支持受控/非受控（非受控自带 ⌘K）。

## M-6 · 2026-06-20 · planner/project 复用 muse-ui（GradientText + CountUp）
- 作者: claude
- 提交: 3b7182e
- 子项目: planner
- 重点: 项目规划标题用 GradientText、数字 KPI 用 CountUp；monorepo 相对引入 ../../muse-ui/src/* 由 esbuild 打进 dist/project.js。
- 解决的问题: 验证「muse-ui 孵化 → planner 复用」链路是否可行可维护。
- 遗留/副作用: muse-/pp- 前缀无冲突；只增 project 一个 bundle；按规则只提交改动的 bundle。

## M-7 · 2026-06-20 · 跨模块打通：目标自动追踪
- 作者: claude
- 提交: c535976
- 子项目: planner
- 重点: 新增 app/links.js 跨模块链接来源；目标 metric 可选 link，经注入 resolveLink 自动取真实数据；表单加进度来源选择、链接目标显示自动徽章并隐藏手动输入
- 解决的问题: 目标数值进度此前手动维护，与各模块真实数据割裂

## M-8 · 2026-06-20 · 目标链接来源扩充
- 作者: claude
- 提交: 5f6cf44
- 子项目: planner
- 重点: app/links.js 增加 项目任务/日程完成/习惯连击/学习时长/净资产 5 个跨模块来源，目标可挂更多模块自动取数
- 解决的问题: 可自动追踪的目标来源太少，习惯/日程/项目/财务无法直接驱动目标进度

## M-9 · 2026-06-20 · 新建研发提效研究室 devx-lab：提效范式库 + 业界框架 + DORA 自评
- 作者: claude
- 提交: ada7c3c
- 子项目: devx-lab
- 重点: 新增子项目 devx-lab：24 条提效范式（带影响/成本/采用度、对齐框架、落地步骤与一手来源），DORA/SPACE/DevEx/DX Core 4/Team Topologies/Platform 六个业界框架速览，以及交互式 DORA 四指标自评（SVG 仪表盘）
- 解决的问题: 把'业界都在用的提效方式'从零散经验沉淀为可检索、可对标、可自评的统一知识库，并锚定权威出处以符合业界标准
- 遗留/副作用: 门户 index.html / README 为全子项目共用，是高频并发冲突点；登记新项目时需注意

## M-10 · 2026-06-20 · devx-lab 从只读图鉴升级为可落地工具：采纳追踪 + 自评导出
- 作者: claude
- 提交: ada7c3c
- 子项目: devx-lab
- 重点: 每条范式可标记 未开始/进行中/已落地（本地持久化）、hero 显示团队落地进度条、按状态筛选；DORA 自评新增一键复制 Markdown 结果；纯逻辑新增 statusOf/adoptionStats/doraMarkdown 并补单测（12 项全过）
- 解决的问题: 知识库只能看不能用——团队需要把范式变成可追踪的落地清单，并能把自评结果直接带进周报/文档
- 遗留/副作用: 采纳状态与自评都只存 localStorage，不上云

## M-11 · 2026-06-20 · swarm 加入验证—返工闭环（落地 P-3）
- 作者: claude
- 提交: 1c021c1
- 子项目: swarm
- 重点: engine 调度循环里动态注入「执行者返工+复评」：评审未通过且未超轮次即扩展任务 DAG，汇总者顺延依赖最新复评；orchestrator 加 parseVerdict/reworkSpecs/injectRework 纯函数与 mock 首轮不通过/复评通过；24 单测全绿
- 解决的问题: 原线性管线评审只给意见不返工——补上业界最被验证的 generator-critic 迭代质量闭环

## M-12 · 2026-06-20 · swarm 流式输出 + BYOK 实跑链路（落地 P-4）
- 作者: claude
- 提交: e69598b
- 子项目: swarm
- 重点: ai.js 加 callChatStream/extractDelta/streamSSE（SSE，Anthropic+OpenAI，纯函数可测）；engine 流式把分片实时写进 task.output 并 onUpdate；TaskCard running 态逐字显示+光标；30 单测全绿，含 mock fetch 全链路验证流式中间态
- 解决的问题: 原产出一次性返回、体验差且 BYOK 未验证——补上流式 + 端到端验证（mock fetch）

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

## M-12 · 2026-06-20 · 新增 Prompt 研究室子项目（含版本历史/批量对照/精选库）
- 作者: claude
- 提交: 8868fd5
- 子项目: prompt-lab
- 重点: 搭出 Prompt 收集与展示子项目：业界标准数据模型(角色/正文/{{变量}}/技巧/适用模型/示例/出处/许可/版本/history)，卡片画廊+详情抽屉+分类/技巧/收藏过滤+搜索，{{变量}}模板渲染与一键复制，变量批量对照，版本历史+行级diff对比+恢复，JSON导入导出(prompt-lab/v1)，localStorage持久化+迁移，内置14条精选示例；纯函数 schema/diff/store 共22单测，Puppeteer实测无报错
- 解决的问题: 回答『业界标准的 Prompt 研究室怎么做』——给出可运行的收集/整理/展示/复用一体的参考实现，沉淀优质 prompt 与其工程范式

## M-13 · 2026-06-20 · 目标按关联日程计数(scoped link)
- 作者: claude
- 提交: 9137447
- 子项目: planner
- 重点: links 增加目标上下文与 goal.scheduleDone scoped 来源，目标只统计挂到自己的已完成日程；不回写目标数据
- 解决的问题: ③日程挂到目标缺少合理机制：全局来源不能体现某个目标自身的关联进度

## M-14 · 2026-06-20 · prompt-lab 质量体检评分 + 克隆 + 复制为 Markdown
- 作者: claude
- 提交: 0aa4ebf
- 子项目: prompt-lab
- 重点: 纯函数 lint.js 按业界最佳实践给 prompt 打分（角色/任务清晰/输出格式/抗幻觉/示例/变量/可检索 7 项），详情用 SVG 评分环+逐项清单（未过项给建议）、编辑器底部实时显示得分；新增克隆副本、复制为 Markdown(promptToMarkdown)；node --test 增至 29 全过，Puppeteer 实测无报错
- 解决的问题: 光收集展示还不够——作者需要即时可量化的「是否符合业界标准」反馈与改进建议，并能快速派生变体/对外分享
- 遗留/副作用: 体检是启发式正则判断，偏宽松用于引导而非严格校验；评分与历史均只存 localStorage

## M-15 · 2026-06-20 · muse-ui v0.3：+3 playful 动效组件
- 作者: claude
- 提交: 0525044
- 子项目: muse-ui
- 重点: ScrambleText/Marquee/ConfettiButton，逻辑视图解耦+纯函数单测+reduced-motion。
- 解决的问题: 扩 playful 动效，验证粒子/解码/跑马灯也能零依赖+纯函数+可测。

## M-16 · 2026-06-20 · muse-ui v0.4：StickyCanvas 便利贴白板
- 作者: claude
- 提交: 5301727
- 子项目: muse-ui
- 重点: 便利贴白板（双击/拖拽/换色/编辑/删除），拖拽几何纯函数 board.js+5 单测。
- 解决的问题: 补脑爆实验室最核心交互组件，验证带拖拽复杂组件也能逻辑/视图解耦。
## M-15 · 2026-06-20 · devx-lab 框架覆盖度 + 数据导出/导入（补记，原 M-13 并发丢失）
- 作者: claude
- 提交: 51d774b
- 子项目: devx-lab
- 重点: 业界框架页新增覆盖度进度条（每个框架对齐范式数 + 已落地/进行中，按 DORA/SPACE/DevEx 维度聚合）；底部'我的数据'栏支持收藏/采纳状态/自评的 JSON 导出备份与导入；纯逻辑 frameworkCoverage/buildExport/parseImport
- 解决的问题: 采纳进度只能看总量看不出薄弱能力线；本地数据无法团队间共享/备份
- 遗留/副作用: 原 M-13 capture 在 materials.md 并发 additive 合并中丢失，这里补记

## M-16 · 2026-06-20 · devx-lab 范式库补充 11 条业界实践（23→34）
- 作者: claude
- 提交: 4dce7a4
- 子项目: devx-lab
- 重点: 新增 AI 智能体工作流/IaC/数据库变更管理/TDD/契约测试/混沌工程/SLO 与错误预算/无指责复盘/策略即代码/依赖自动升级/文档即代码，覆盖各能力线、均附权威出处
- 解决的问题: 范式库覆盖面不足，缺少 IaC、TDD、SLO、契约测试、混沌工程、生成式文化等业界主流能力

## M-17 · 2026-06-20 · agent-cli 落地 P-2 审批模式三档 + 真实工具循环 + 扩到六家
- 作者: claude
- 提交: 75cb88c
- 子项目: agent-cli
- 重点: 审批门 needsApproval/toolKind（纯函数+单测）离线与真实统一；状态栏可切 suggest/auto-edit/full-auto + /approval；ai.js runRealAgent（Anthropic/OpenAI function calling 循环，内存FS executeTool 执行→回填→续跑）真实模式出工具卡+diff；notes 扩到 Cline/Continue（卡片+矩阵列+来源）
- 解决的问题: 让分级放权可亲手体验、真实 AI 真正 agentic、调研覆盖更全

## M-18 · 2026-06-20 · swarm 流式输出 + BYOK 实跑链路（落地 P-4）
- 作者: claude
- 提交: a1858b0
- 子项目: swarm
- 重点: ai.js 加 callChatStream/extractDelta/streamSSE（SSE，Anthropic+OpenAI，纯函数可测）；engine 流式把分片实时写进 task.output 并 onUpdate；TaskCard running 态逐字显示+光标；30 单测全绿，含 mock fetch 全链路验证流式中间态
- 解决的问题: 原产出一次性返回、体验差且 BYOK 未验证——补上流式 + 端到端验证（mock fetch）

## M-19 · 2026-06-20 · 习惯关联目标(scoped)
- 作者: claude
- 提交: 60aaf10
- 子项目: planner
- 重点: habits 表单加关联目标选择；links 加 goal.habitsChecks 只统计本目标关联习惯累计打卡
- 解决的问题: ①习惯与目标未打通，习惯坚持无法驱动目标进度

## M-20 · 2026-06-20 · prompt-lab 标签筛选 + 平均质量概览 + 键盘快捷键
- 作者: claude
- 提交: 5baf632
- 子项目: prompt-lab
- 重点: 侧栏新增标签分区(top14 按频次)点击精确过滤、filterPrompts 加纯函数 tag 维度、活动标签可一键清除；概览行显示结果数与全库平均质量分(averageScore)；键盘快捷键 / 聚焦搜索、n 新增、Esc 关闭当前层；新增 tag/averageScore 单测，node --test 30 全过，Puppeteer 实测无报错
- 解决的问题: 库变大后只靠分类/技巧不够细，缺标签维度的快速收敛；缺少全局质量水位感知与高频操作的键盘加速
- 遗留/副作用: 平均质量分实时按全部 prompt 计算，量很大时为 O(n) 但成本可忽略

## M-21 · 2026-06-20 · agent-cli 体验增强：矩阵导出 Markdown + ReAct 自动演示
- 作者: claude
- 提交: 0607694
- 子项目: agent-cli
- 重点: engine 加 matrixToMarkdown（纯函数+单测）；研究面板加「复制为 Markdown」按钮；ReAct 手写SVG 示意图加「▶ 自动演示」逐步高亮+计时讲解（推进 D-2 两条）
- 解决的问题: 调研结论难外带、循环只静态——让六家矩阵可一键带走、agentic 循环能动起来讲清楚

## M-22 · 2026-06-20 · devx-lab 新增『落地路线』：DORA 处方式推荐 + 拓扑落地顺序（落地 P-4/P-5）
- 作者: claude
- 提交: 28e6f64
- 子项目: devx-lab
- 重点: 新增第四个标签页 Roadmap：①处方建议——读 DORA 自评，针对 Medium/Low 薄弱指标按 signals 映射出能提升它且未落地的范式（按性价比，点击跳范式库）；②建议落地顺序——给范式加 requires 前置边，Kahn 拓扑分批、波内按性价比、环检测兜底。纯逻辑 prescribe/topoOrder，单测 15→17 全过
- 解决的问题: 范式库+自评只能诊断'现状'，回答不了'下一步先做什么、什么顺序做'——把诊断变成有先后的行动计划
- 遗留/副作用: 并发协作下记得把 dreaming/plans.md 一并提交，否则未提交改动会卡住后续 rebase（这次踩到）

## M-23 · 2026-06-20 · 新增 Mock 研究室子项目（知识库 + 可植入配置工坊）
- 作者: claude
- 提交: 5f26c38
- 子项目: mock-lab
- 重点: 建 projects/mock-lab：28 条 mock 系统/提效方式知识库（卡片+四象限），配置工坊把路由定义一键生成 g-mock/responses/respx/WireMock/OpenAPI，含零依赖适配器 adapters/g_mock.py 支持本地/远端配置；filter/codegen 纯函数 26 单测全绿
- 解决的问题: mock 工具与玩法碎片、上手成本高；缺一个可快速接入、可植入（尤其 Python）、本地或远端灵活切换的统一出口

## M-24 · 2026-06-20 · swarm 成本可预测 + 路由快路径（落地 P-8）
- 作者: claude
- 提交: 1b0a233
- 子项目: swarm
- 重点: core/cost.js 价目+estimateTokens+estimateJobCost（步数/波次/in-out-token/$，纯函数）；orchestrator 加 isSimpleIntent/routeDecompose/buildPlan；engine 简单意图走 2 步快路径并标 job.route、规划后算 job.estimate（返工后上调）；App 输入框下实时预估+工作区头估算+快路径徽章；修了 P-4 引入的 callChat 漏 import；39 单测全绿
- 解决的问题: demo 缺『这单多贵/多少步』的派单前决策辅助，也缺单一意图省钱的快路径

## M-25 · 2026-06-20 · devx-lab 新增『团队画像』：SVG 雷达图 + 一键提效报告（落地 P-6）
- 作者: claude
- 提交: d9d6ff4
- 子项目: devx-lab
- 重点: 第五个标签页 Profile：手写 SVG 雷达按 8 类别画团队画像（已落地% 实心 + 含进行中% 浅色两序列）+ 侧栏各类落地率条形；一键 teamReportMarkdown 聚合 DORA评级/采纳总览/能力画像/框架覆盖度/优先处方，可复制或下载 .md。纯逻辑 categoryRadar/teamReportMarkdown，单测 17→19 全过
- 解决的问题: 团队缺少一眼看清强弱项的整体画像，也缺少能直接分享给管理层的汇总报告

## M-26 · 2026-06-20 · prompt-lab 整库导出为 Markdown 文档 + 导出菜单
- 作者: claude
- 提交: 64d8020
- 子项目: prompt-lab
- 重点: 纯函数 libraryToMarkdown 把全库渲染成带分组目录(按分类)、逐条正文(分隔线、组内按标题稳定排序)的 Markdown 文档；头部导出改为下拉菜单 JSON 备份/Markdown 文档；新增单测，node --test 31 全过，Puppeteer 实测菜单与 md 内容正常无报错
- 解决的问题: JSON 只能机器再导入，人看/分享/归档不便——补上可读的整库 Markdown 文档导出
- 遗留/副作用: TOC 为纯文本大纲(CJK 锚点不可靠故不做页内跳转链接)

## M-27 · 2026-06-20 · swarm 任务自适应拓扑（落地 P-9）
- 作者: claude
- 提交: a625ba7
- 子项目: swarm
- 重点: orchestrator decompose 按 kind 分派不同拓扑：build=单线程深链/research=3路并行/decide=决策框架/write=精简管线/general=默认；新增 topologyLabel；收紧 isSimpleIntent；App 显示拓扑名；41 单测全绿
- 解决的问题: 原 decompose 各类型只改措辞、结构相同；兑现调研最核心结论『按任务类型选拓扑』

## M-28 · 2026-06-20 · agent-cli 调研扩到八家 + 两家并排对比
- 作者: claude
- 提交: 9c83a72
- 子项目: agent-cli
- 重点: 新增 Cursor/Devin 对比卡+矩阵列（分 CLI 系/IDE 云端系）；UI 加任选两家并排对比（≠ 标差异）
- 解决的问题: 对照覆盖 IDE/云端自治形态并支持任意两家精确对比（D-2 收尾）
## M-28 · 2026-06-20 · mock-lab 工坊扩到 9 种产物（pytest fixture/requests-mock/VCR 磁带）
- 作者: claude
- 提交: 4a6f0a6
- 子项目: mock-lab
- 重点: codegen 新增 pytestFixture/pythonRequestsMock/vcrCassette 三个纯函数生成器并注册到工坊，+4 单测共 30 全绿，重建 bundle
- 解决的问题: 原 6 种产物偏 responses/respx；补齐 pytest 复用 fixture、requests-mock、离线可回放磁带，强化 Python 优先与可植入

## M-29 · 2026-06-20 · muse-ui v0.5：CommandPalette 与 Typewriter 打磨
- 作者: claude
- 提交: 496d13e
- 子项目: muse-ui
- 重点: CommandPalette 分组/最近/高亮；Typewriter 多句循环+退格（纯函数 typewriterState）。
- 解决的问题: 把两核心组件打磨到好用，逻辑保持纯函数可测。

## M-30 · 2026-06-20 · devx-lab 新增『反模式』库：效能杀手 + 解药链接（落地 P-9）
- 作者: claude
- 提交: 59404c8
- 子项目: devx-lab
- 重点: 新增 ANTIPATTERNS（10 个业界公认效能杀手：英雄主义/长期分支/手工发布/会议过载/单指标考核/雪花服务器/巨型PR/不稳定测试/评审瓶颈/重复手工劳动），每个给症状/危害/解药范式 id/出处；AntiPatterns 视图新标签页，解药 chip 点击跳范式库；数据自洽单测校验解药 id 合法，单测 19→20 全过
- 解决的问题: 范式库只讲'该做什么'，缺'别做什么'的一面；正反对照（反模式→解药）更易识别团队问题、更有说服力

## M-31 · 2026-06-20 · agent-cli 收口：一键导出整份调研报告 Markdown
- 作者: claude
- 提交: 4ac3b4e
- 子项目: agent-cli
- 重点: engine 加 researchReportMarkdown（八家要点+矩阵+共性+来源→一篇 Markdown，纯函数+单测）；研究面板加导出按钮
- 解决的问题: 研究做完要能整篇外带分享，不只是矩阵

## M-32 · 2026-06-20 · 提质三件套：重点条目模板 + 类别×成熟度总览图 + Markdown 导出
- 作者: claude
- 提交: 2b6d4ee
- 子项目: ai-coding-lab
- 重点: TEMPLATES 10 个可复制骨架(详情页一键复制)；手写 SVG 总览图(maturityMatrix 纯函数+单测)与「总览」视图；exportMd 纯函数+测试与「导出 Markdown」按钮；node --test 26 全绿
- 解决的问题: 知识库只能浏览、不便直接拿去用，也缺结构总览与带走能力——转向提质而非堆量

## M-33 · 2026-06-20 · devx-lab 进度趋势：快照存档 + 趋势折线（落地 P-10）
- 作者: claude
- 提交: 476670e
- 子项目: devx-lab
- 重点: 纯逻辑 buildSnapshot(落地率/各数/DORA评分/日期) + upsertSnapshot(同日覆盖/按时间升序/限长60)；团队画像页加进度趋势区：手写 SVG 双线（落地率实线+DORA评分虚线）+较上次变化+保存今日快照；快照随 export/import 迁移；单测 20→22 全过
- 解决的问题: 采纳与评分只能看当下，看不出改进趋势——补上时间维度让'持续改进'可视化

## M-34 · 2026-06-20 · agent-cli 会话导出 Markdown transcript（落地 P-10）
- 作者: claude
- 提交: 7d1c25f
- 子项目: agent-cli
- 重点: engine 加 transcriptToMarkdown（用户/回答/工具卡/diff/审批轨迹→Markdown，纯函数+单测）；标题栏「⤓ 导出会话」按钮
- 解决的问题: 一次 agent 会话无法复盘/分享——现在可一键导出整段交互

## M-35 · 2026-06-20 · prompt-lab 质量体检未达标项点击直达编辑器字段
- 作者: claude
- 提交: 628a353
- 子项目: prompt-lab
- 重点: lint.js 每项检查带 field(system/content/exampleInput/summary)；LintPanel 未通过项可点击→关闭详情、打开编辑器、滚动到该字段、聚焦并短暂高亮(pl-field-flash)；把『诊断→改进』合成一步；新增 field 映射单测，node --test 32 全过，Puppeteer 实测点击角色项跳转聚焦 System 字段无报错
- 解决的问题: 体检只给分与建议，用户仍要自己找字段改——补上一键定位，让符合业界标准的改进真正可执行
- 遗留/副作用: 一个检查只映射一个主字段(如 format/guardrails 都落到 content)，非全部相关字段

## M-36 · 2026-06-20 · devx-lab 范式关系网：详情互链前置/解锁/可对治反模式（落地 P-11）
- 作者: claude
- 提交: 436d560
- 子项目: devx-lab
- 重点: 纯逻辑 prerequisitesOf/unlocksOf/curesOf；Practices 卡片详情加『关系』块：前置(requires)与解锁(被依赖)范式 chip 点击就地搜索、对治反模式 chip 跳反模式页；DevxLab 传 onGotoAntipatterns；单测 22→23 全过
- 解决的问题: 范式卡片彼此孤立——依赖图与反模式数据已有却没在卡片层暴露，连成关系网才能顺着'前置→解锁→对治'探索

## M-37 · 2026-06-20 · swarm 结论可导出（落地 P-12）
- 作者: claude
- 提交: d25840f
- 子项目: swarm
- 重点: core/export.js jobToMarkdown（纯函数：标题/元信息/结论/逐角色过程/署名，结论自带标题则不重复外套）+exportFilename；App 结论区加 复制结论/复制Markdown/下载.md（剪贴板+Blob，含降级）；新增 export.test.js，46 单测全绿；重打包
- 解决的问题: 结论只能看不能带走——补上一键复制/下载 Markdown

# 脑爆 · dreams

> 一次「做梦」：基于 [`materials.md`](materials.md) 的素材自由发散——**下一步可以做什么**。
> 允许大胆、不保证可行。优先用 `node scripts/dream.mjs dream ...` 追加。

---

## D-1 · 2026-06-20 · dreaming 机制本身的下一步
- 作者: claude
- 来源素材: M-1
- 脑爆:
  - 加 git `post-commit` hook：提交后自动提醒「别忘了 capture 素材」，甚至预填 commit hash/标题
  - 定时「做梦」触发：攒够 N 条新素材或每周一次，自动跑一轮 dream，把发散结果丢进 dreams.md
  - `status` 升级成一页 dashboard（HTML），可视化素材→脑爆→计划的转化漏斗
  - 给计划加优先级/工作量标签，`status` 能按「性价比」排序推荐下一步做哪个
  - 让素材能反向链接到具体 commit/PR，点开就能看 diff
  - 跨子项目主题聚类：把素材按子项目/主题聚合，发现哪个方向最近最活跃、哪个停滞

## D-2 · 2026-06-20 · agent-cli 下一步可以怎么玩
- 作者: claude
- 来源素材: M-7, M-8
- 脑爆:
  - 在 demo 里加「审批模式」开关，模拟 suggest / auto-edit / full-auto 三档，让离线 demo 真正演示「分级放权」
  - 真实 AI 模式接入工具调用编排（function calling），让真实模式也能展示工具卡 + diff，而不只是聊天
  - 再扩几家做对照：Cline / Continue / Cursor agent / Devin，矩阵加列
  - 一键「自动播放」一条 ReAct 轨迹（带计时），把循环讲给人看
  - 把四家速查矩阵导出为 Markdown / 图片，便于分享

## D-3 · 2026-06-20 · devx-lab 下一步：从清单到诊断、路线与跨子项目联动
- 作者: claude
- 来源素材: M-9, M-10, M-15, M-16
- 脑爆:
  - 处方式路线图：做完 DORA 自评后，按最弱指标自动推荐'该先补哪些范式'（每条范式已标注对应 signals/框架，可反查），把诊断直接变成可勾选的行动清单
  - 团队效能雷达图：把 DORA/SPACE/DevEx 各维度的采纳度或自评分画成手写 SVG 雷达图，一眼看团队画像与短板，比进度条更立体
  - 范式依赖图与拓扑落地顺序：给范式加前置关系（如'主干开发'依赖'CI/CD'、'功能开关'利于'渐进发布'），拓扑排序生成有先后的落地路线，而非平铺清单
  - 成熟度模型分级（L1-L5）：每条范式标注所处阶段，团队据已落地项自动定位整体成熟度等级，对照业界 State of DevOps 给出'下一级该做什么'
  - 一键生成《团队提效报告》(Markdown/HTML)：聚合画像+覆盖度+路线图+DORA 评级，可直接分享给管理层，呼应已有的自评导出能力
  - 反模式库：收录效能杀手（英雄主义/长期分支/手工发布/会议过载/单指标考核）与对应解药范式，正反对照更有说服力
  - 跨子项目联动：AI 类范式直链 ai-coding-lab/prompt-lab 的对应条目；把 devx-lab 的'已落地'项作为 planner 的目标来源，让提效落地进度驱动个人目标
  - 进度快照与趋势：把采纳进度按时间存档（本地），画出团队提效的趋势线，让'持续改进'看得见

## D-4 · 2026-06-20 · agent-cli 之后还能怎么玩
- 作者: claude
- 来源素材: （自由脑爆）
- 脑爆:
  - 导出/分享一次控制台会话为 Markdown transcript（含工具卡/diff/审批轨迹）
  - 真实工具循环扩更多工具（apply_patch 多处改、多文件）并显示 token/步数/用时
  - 把 agent-cli 的 system prompt 与工具定义沉淀成 skill-lab 的一个技能
  - 英文版 i18n，便于对外分享调研
  - 把共性模式与「哪家最能体现」交叉链接，点模式高亮对应家

## D-5 · 2026-06-20 · muse-ui 之上：从「组件库」到「创意 UI 生产力」
- 作者: claude
- 来源素材: M-37
- 脑爆:
  - 命令系统化：CommandPalette 支持嵌套子命令/面包屑 + 一个 useCommands 注册中心，任意组件声明命令 → 全站 ⌘K 统一调度（planner 可直接接，按 ⌘K 跳模块/建任务）。
  - StickyCanvas 升级为白板：便利贴连线/箭头/分组框 + 导出 PNG/JSON + localStorage 持久化 → 直接做成 planner 里的「脑暴/看板」模块（muse-ui 孵化→planner 复用的范例）。
  - 发 npm + 文档站：把 muse-ui 正式发布，并用组件自身搭文档站——画廊升级为带「可调 props + 实时代码片段 + 一键复制」的 playground。
  - 主题系统：抽出 design tokens（色/圆角/动效时长），<MuseThemeProvider> 一处换肤，让 muse-ui 与 g-lab 的 DESIGN.md 暖色体系自动对齐。
  - Brainstorm Kit 子集：新增 MindNode（思维导图节点+自动布局）、IdeaShuffler（灵感抽签）、PromptCard（SCAMPER/六顶帽提示卡），凑成专门服务「脑爆」的一组件群。
  - 性能与无障碍基线：所有 raf 组件用 IntersectionObserver 离屏暂停；补键盘可达与 aria；给画廊加自动化 a11y 冒烟。
  - 跨子项目「创意感」统一：把 Sparkles/Sketchy/Marquee/GradientText 点缀进各 lab 的门户与卡片，形成 g-lab 一致的视觉签名。

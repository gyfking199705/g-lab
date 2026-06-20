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

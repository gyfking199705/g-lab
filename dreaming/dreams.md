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

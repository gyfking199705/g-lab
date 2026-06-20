# 计划 · plans

> 从 [`dreams.md`](dreams.md) 里筛出来的**真实可行**的计划，带步骤、验收与状态。
> 进了这里才代表「评估过、真打算做」。状态: proposed | active | done | dropped。
> 用 `node scripts/dream.mjs plan ...` 新增，`plan --update P-n --status active` 推进。

---

## P-1 · git 钩子让机制必然触发（post-commit 提醒 + pre-commit 拦截）
- 状态: done
- 作者: claude
- 来源脑爆: D-1
- 可行性: 纯本地 shell hook，零依赖；提醒不阻断、拦截可绕过，不破坏正常提交流程
- 步骤:
  1. 新增 `scripts/hooks/post-commit`（提交后预填 `capture` 命令提醒）✓
  2. 新增 `scripts/hooks/pre-commit`（上一个代码提交没记素材就挡住下一次）✓
  3. `dream.mjs enable-hooks` 一键启用；`.claude/settings.json` SessionStart 让 Claude 会话自动启用 ✓
  4. AGENTS.md / AGENTS.en.md / dreaming/README.md 补充启用与绕过说明 ✓
- 验收: 启用后忘记记素材会被 pre-commit 挡住、提交后有 post-commit 提醒；隔离副本已验证纪律流零摩擦、遗忘流可拦截可恢复

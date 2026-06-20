# 计划 · plans

> 从 [`dreams.md`](dreams.md) 里筛出来的**真实可行**的计划，带步骤、验收与状态。
> 进了这里才代表「评估过、真打算做」。状态: proposed | active | done | dropped。
> 用 `node scripts/dream.mjs plan ...` 新增，`plan --update P-n --status active` 推进。

---

## P-1 · git post-commit hook 自动提醒记素材
- 状态: proposed
- 作者: claude
- 来源脑爆: D-1
- 可行性: 纯本地 shell hook，零依赖；不强制（只打印提醒 + 预填命令），不影响现有提交流程
- 步骤:
  1. 新增 `scripts/hooks/post-commit`，提交后打印本次 commit 的 hash/标题，并给出预填好的 `dream.mjs capture` 命令模板
  2. 在 AGENTS.md/CLAUDE.md 说明：可选执行 `git config core.hooksPath scripts/hooks` 启用
  3. README 补一句启用方式
- 验收: 启用后每次 `git commit` 末尾出现「记得 capture」提醒及可直接补全的命令

# CLAUDE.md

g-lab 的协作约定对 Claude 与 Codex 通用，统一写在 [`AGENTS.md`](AGENTS.md)，请先读它。

要点速记：

- **风格**：改动遵守 [`DESIGN.md`](DESIGN.md) 与子项目 README。
- **dreaming 机制**：维护「提交 → 素材 → 脑爆 → 计划」闭环，三个存放地在 [`dreaming/`](dreaming/README.md)。
  - 每次提交后立刻记素材；开新活前先 `node scripts/dream.mjs status` 看待办计划。
  - Claude 可直接用 skill：`/dream-capture`（记素材）、`/dream-brainstorm`（脑爆）、`/dream-plan`（立计划/推进）。

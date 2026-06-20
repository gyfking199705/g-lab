---
name: dream-plan
description: 从 g-lab 的脑爆里筛出「真实可行」的计划，带步骤与验收写入 dreaming/plans.md；也用于推进计划状态(proposed/active/done/dropped)。当要把想法落成可执行计划、或盘点该做哪个时使用。Use to turn brainstormed ideas into actionable, feasible plans in dreaming/plans.md, or to update a plan's status.
---

# dream-plan · 立计划 / 推进

「做梦」机制的第三步：**把脑爆里靠谱的想法筛成可行计划**。机制全貌见 `dreaming/README.md`。

## 新增计划

1. 读 `dreaming/dreams.md`，挑出**真实可行**的想法（依赖具备、范围可控、风险已知）。不可行的就留在脑爆里，不必搬。
2. 评估可行性，拆成具体步骤与验收标准，写入：

   ```bash
   node scripts/dream.mjs plan --by claude \
     --title "<计划标题>" \
     --from "D-3" \
     --why "<为什么真实可行：依赖/范围/风险>" \
     --step "<步骤一>" \
     --step "<步骤二>" \
     --accept "<完成的判定标准>"
   ```
   默认状态 `proposed`；想直接开干加 `--status active`。

## 推进状态

```bash
node scripts/dream.mjs plan --update P-2 --status active   # proposed→active→done，或 dropped
```

## 盘点该做哪个

```bash
node scripts/dream.mjs status   # 最近素材 + 待办(proposed/active)计划一览
```

## 注意

- 计划是「承诺要做」的东西，宁缺毋滥；每条都要能落地、可验收。
- 动手做完某计划并提交后，记得 `--update ... --status done`，并用 `/dream-capture` 记新素材，闭环继续转。

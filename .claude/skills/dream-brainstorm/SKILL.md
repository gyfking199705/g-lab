---
name: dream-brainstorm
description: 做一轮「做梦/脑爆」——读 g-lab 的素材，基于它发散出下一步可以做什么，写入 dreaming/dreams.md。当想规划方向、攒了一批素材、或被问「接下来做什么」时使用。Use to brainstorm next steps for g-lab from accumulated materials into dreaming/dreams.md.
---

# dream-brainstorm · 做梦/脑爆

「做梦」机制的第二步：**读素材，自由发散下一步**。机制全貌见 `dreaming/README.md`。

## 步骤

1. 读原料：`dreaming/materials.md`（重点看最近、还没被脑爆消化的素材），必要时也看 `dreaming/plans.md` 避免重复已有计划。
2. **发散**：围绕「这些进展之上，下一步还能做什么」生成若干想法。此阶段**鼓励大胆、不必现实**——筛选是下一步（计划）的事。可跨子项目联想、找停滞方向、想体验/能力上的缺口。
3. 写入脑爆（`--idea` 可重复，`--from` 引用来源素材编号）：

   ```bash
   node scripts/dream.mjs dream --by claude \
     --title "<这轮脑爆的主题>" \
     --from "M-12, M-13" \
     --idea "<想法一>" \
     --idea "<想法二>" \
     --idea "<想法三>"
   ```

4. 简要向用户复述这轮脑爆，并提示：可用 `/dream-plan` 把其中可行的转成计划。

## 注意

- 脑爆是发散，进了 `dreams.md` 不代表要做；真打算做才进 `plans.md`。
- 一轮一个主题、3~8 条想法为宜，太杂就拆多轮。

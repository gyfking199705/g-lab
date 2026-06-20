---
name: dream-capture
description: 记录一条「素材」到 g-lab 的 dreaming 机制——本次提交做了什么、为解决什么问题。每次提交/完成一块改动后使用。Use right after committing in g-lab to capture what the commit did and which problem it solved into dreaming/materials.md.
---

# dream-capture · 记素材

g-lab 用「做梦」机制积累协作记忆，三个存放地见 `dreaming/README.md`。本 skill 负责第一步：**提交后把重点沉淀为素材**。

## 步骤

1. 确认在 g-lab 仓库根目录，且改动已提交（`git log -1 --oneline` 看最新提交）。
2. 用统一脚本追加素材（必填 `--by claude`、`--title`、`--focus`、`--problem`；`--commit` 默认 HEAD，`--scope` 填子项目，`--note` 可多条记遗留）：

   ```bash
   node scripts/dream.mjs capture --by claude --scope <子项目> \
     --title "<一句话标题>" \
     --focus "<本次提交做了什么>" \
     --problem "<为解决什么问题 / 痛点>" \
     --note "<可选：遗留或副作用>"
   ```

3. 脚本会回 `✓ 素材 M-n 已记入`。若不止一处要点，可分多条 capture。

## 注意

- 素材是后续所有「脑爆」的原料，**别跳过**——哪怕一两句。
- 不要手动重写历史素材；只追加。格式细节见 `dreaming/README.md`。

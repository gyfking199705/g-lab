# 💤 dreaming · g-lab 的「做梦」协作机制

> g-lab 是我的整体实验室，下面有许多子项目（学习站、健身、财富、论文…）。
> Claude 与 Codex 轮流在这里干活。为了让协作有**记忆**、能**自我演化**，
> 我们约定一套「做梦」机制：**沉淀素材 → 脑爆下一步 → 沉淀可行计划**。
>
> 三个「地儿」全部放在仓库根目录的 `dreaming/` 下，所有子项目共用这一套。

---

## 三个存放地

| 阶段 | 文件 | 放什么 | 谁来写 |
| --- | --- | --- | --- |
| **素材 materials** | [`materials.md`](materials.md) | 每次提交的重点：**做了什么 / 为解决什么问题**。这是原料。 | 每次提交后立刻写 |
| **脑爆 dreams** | [`dreams.md`](dreams.md) | 一次「做梦」：基于素材自由发散——**下一步可以做什么**（可以不靠谱）。 | 做梦时写 |
| **计划 plans** | [`plans.md`](plans.md) | 从脑爆里筛出来的**真实可行**的计划，带步骤与验收、可推进状态。 | 评估后写 |

数据流：`提交 → 素材` ⟶（攒够一批后做梦）`素材 → 脑爆` ⟶（评估可行性）`脑爆 → 计划` ⟶（动手）`计划 → 提交 → 新素材`。一个闭环，越转积累越多。

---

## 统一工具：`scripts/dream.mjs`

零依赖 Node 脚本，Claude 和 Codex 都用它写入，**保证格式一致、id 自增**。也可以手动编辑这三个 md，但优先用脚本。

```bash
# 1) 提交后，记一条素材（必填 --by/--title/--focus/--problem，--commit 默认 HEAD）
node scripts/dream.mjs capture --by claude --scope learning \
  --title "学习站拆二级分类" \
  --focus "把『全方位提升』拆成二级子分类，模板挂到二级下" \
  --problem "一级分类太粗，用户找不到对应方向的模板" \
  --note "移动端折叠交互待测"

# 2) 做梦：基于素材脑爆下一步（--idea 可重复）
node scripts/dream.mjs dream --by claude --title "学习站下一步" \
  --from "M-12, M-13" \
  --idea "二级分类加搜索/筛选" \
  --idea "模板支持用户自定义二级分类" \
  --idea "AI 根据目标自动推荐落到哪个二级分类"

# 3) 立计划：从脑爆里挑可行的（--step 可重复）
node scripts/dream.mjs plan --by codex --title "二级分类内搜索" \
  --from "D-3" --why "二级分类数据结构已就绪，纯前端可做，改动局部" \
  --step "在分类页头加搜索框" \
  --step "对二级分类名 + 模板标题做模糊匹配" \
  --step "无结果时给空态提示" \
  --accept "输入关键词能秒筛出对应二级分类与模板"

# 推进计划状态：proposed → active → done（或 dropped）
node scripts/dream.mjs plan --update P-2 --status active

# 速览：最近素材 + 待办计划
node scripts/dream.mjs status
```

---

## 三种条目的格式（脚本自动生成，手写时照此对齐）

**素材 `M-n`**
```
## M-12 · 2026-06-20 · 标题
- 作者: claude | codex
- 提交: <commit 短 hash 或 PR #>
- 子项目: learning（可选）
- 重点: 本次提交做了什么
- 解决的问题: 为什么做 / 痛点
- 遗留/副作用: 可选，可多条
```

**脑爆 `D-n`**
```
## D-3 · 2026-06-20 · 主题
- 作者: claude | codex
- 来源素材: M-12, M-13（或「自由脑爆」）
- 脑爆:
  - 想法一（允许大胆、不保证可行）
  - 想法二
```

**计划 `P-n`**
```
## P-2 · 标题
- 状态: proposed | active | done | dropped
- 作者: claude | codex
- 来源脑爆: D-3
- 可行性: 为什么这是真实可行的（依赖、范围、风险已可控）
- 步骤:
  1. …
  2. …
- 验收: 完成的判定标准
```

---

## 给协作者（Claude / Codex）的纪律

1. **每次提交后**，立刻 `capture` 一条素材——哪怕一两句。素材是后续所有做梦的原料，断了就失忆。
2. **开新活之前**，先 `node scripts/dream.mjs status` 看看有没有 `active`/`proposed` 计划该接着干；优先推进已有计划，别重复发明。
3. **做梦（dream）** 是发散，**允许不靠谱**；只有进了 `plans.md` 才代表「评估过、真打算做」。
4. 改动遵守 g-lab 既有风格（见 [`../DESIGN.md`](../DESIGN.md)）与各子项目 README。
5. 三个 md 用**追加**，不要回头重写历史条目；计划状态变化用 `--update`。

> 详细的协作约定见根目录 [`../AGENTS.md`](../AGENTS.md)（Codex）与 [`../CLAUDE.md`](../CLAUDE.md)（Claude）。
> Claude 还可直接用 `/dream-capture`、`/dream-brainstorm`、`/dream-plan` 三个 skill。

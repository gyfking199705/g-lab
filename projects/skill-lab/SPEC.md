# SKILL.md 规范 · Skill Authoring Standard

> Skill 研究室收录的每个技能都遵循 **Agent Skills** 的业界标准格式：一个目录 + 一份
> `SKILL.md`。本文件定义本仓库采用的格式约定，供贡献者与构建脚本共同遵循。

## 什么是 Skill

一个 **Skill** 是一份可被 AI agent 按需加载的「专长说明书」：用自然语言告诉模型*什么时候*
该用它、*怎么*把一类任务做对做好。它**可移植**（同一份 `SKILL.md` 能用于 Claude 应用、
Claude Code、API）、**可组合**（多个技能按需叠加）、**渐进披露**（先读简短描述，命中后才读正文，
正文再按需引用附带文件）。

## 目录结构

```
skills/
└── <skill-name>/
    ├── SKILL.md          # 必需：frontmatter + 正文说明
    ├── scripts/          # 可选：可执行脚本（确定性步骤交给代码而非模型）
    ├── references/       # 可选：按需加载的长文档 / 速查表
    └── assets/           # 可选：模板、样例文件等
```

- `<skill-name>` 用 **kebab-case**（小写 + 短横线），与 frontmatter 的 `name` 一致。
- 一个技能只解决**一类**清晰的任务；过宽的技能拆分成多个。

## SKILL.md 格式

```markdown
---
name: conventional-commits
description: Write clear, structured Git commit messages … Use when committing changes …
license: MIT
allowed-tools: Bash(git*), Read
metadata:
  category: Git & Version Control
  version: 1.0.0
  author: your-name
  tags: [git, commits]
---

# 正文：用 Markdown 写清楚「何时用、怎么做、示例、反例」
```

### Frontmatter 字段

| 字段 | 必需 | 说明 |
| --- | --- | --- |
| `name` | ✅ | kebab-case，≤ 64 字符，全局唯一，与目录名一致。 |
| `description` | ✅ | **最关键字段**。一句话说清「**做什么** + **何时用**」。模型靠它决定是否加载本技能，务必具体、含触发线索。建议 ≥ 16 字符。 |
| `license` | 选 | SPDX 许可证标识，如 `MIT`。 |
| `allowed-tools` | 选 | 限定该技能可用的工具（逗号分隔或列表），如 `Bash(git*), Read`。 |
| `metadata` | 选 | 本仓库扩展，供画廊展示：`category` / `version` / `author` / `tags`。 |

### 正文建议结构

1. **一句话定位** —— 这个技能让 agent 把什么事做对。
2. **When to use** —— 触发场景，帮助模型与读者判断适用性。
3. **Workflow / Rules** —— 分步骤或分要点的可执行指引（祈使句、可检查）。
4. **Examples** —— 至少一个正例；尽量给一两个反例（anti-patterns）。

## 写好 `description` 的要点（最重要）

- 同时回答 **what** 和 **when**：`"Draft a PR description from a branch's diff. Use when opening a PR …"`。
- 用任务自然出现的词，让它在相关请求下更易被命中。
- 避免空泛词（"helps with code"）；具体到产物与场景。

## 质量基线（本仓库构建期校验）

构建脚本 `build.mjs` 会扫描 `skills/` 并对每个技能做最小校验（见 `app/registry.js`
的 `validateSkill`）：

- `name` 存在且为 kebab-case，≤ 64 字符；
- `description` 存在，长度 16–1024；
- 不满足者会在构建日志里以 ⚠️ 标出（不阻断构建，但应修复）。

## 安装与使用（最终用户）

把技能目录放到 agent 读取的技能目录即可，例如：

```bash
# 用户级（对所有项目生效）
~/.claude/skills/<skill-name>/SKILL.md
# 或项目级（随仓库共享）
<repo>/.claude/skills/<skill-name>/SKILL.md
```

在画廊里点开任意技能可一键**复制 / 下载** `SKILL.md`，并附带安装路径提示。

## 贡献新技能

1. 在 `skills/<name>/` 新建 `SKILL.md`，按上面格式填写。
2. `cd projects/skill-lab && node build.mjs` —— 自动收录进 `skills/index.json` 并校验。
3. 在画廊里自查：描述是否具体、正文是否可执行、校验是否通过。

> 参考：Anthropic「Agent Skills」与社区 `SKILL.md` 实践。本规范是其在 g-lab 内的精简落地版。

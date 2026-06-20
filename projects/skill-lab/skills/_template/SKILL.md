---
name: your-skill-name
description: 一句话写清「做什么 + 何时用」。例如：Draft X from Y. Use when the user asks to … or when …。这是最关键字段——agent 靠它决定是否加载本技能，务必具体、含触发线索。
license: MIT
allowed-tools: Read, Grep
metadata:
  category: Your Category
  version: 0.1.0
  author: your-name
  tags: [tag-a, tag-b]
---

# 技能标题

一句话定位：这个技能让 agent 把什么事做对做好。

## When to use

- 触发场景一（与 description 呼应）。
- 触发场景二。

## Workflow

1. 第一步：可执行、可检查的祈使句。
2. 第二步。
3. 第三步。

## Guidelines

- 要点一。
- 要点二。

## Example

```
给一个真实、可运行/可照抄的正例。
```

## Anti-patterns

- 常见错误一。
- 常见错误二。

<!--
  写完后自检：
    cd projects/skill-lab
    node validate.mjs            # 看 issue 与质量分
    node build.mjs               # 收录进 skills/index.json
  目标：无 issue、质量分 ≥ 75（B 及以上）。把目录名改成与 name 一致的 kebab-case。
-->

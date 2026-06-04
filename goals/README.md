# goals · 目标进度

管理中长期目标：拆子任务、可选**数值指标**、进度条、截止日提醒、归档。进度优先看数值 metric，否则按子任务完成比。

## 数据（localStorage 键 `goals-planner`）

```js
{
  v: 1,
  goals: [
    { id, title, note, category, deadline?('YYYY-MM-DD'), createdAt, archived,
      subtasks: [{ id, title, done, doneAt }],
      metric?: { current, target, unit }   // 数值型目标（如「跑量 100km」）
    }
  ]
}
```

被「日程安排」与「习惯打卡」引用（`goalId`），完成情况汇总到首页看板。

## 纯函数（`calc.js`，已单测）

| 函数 | 作用 |
| --- | --- |
| `goalProgress` / `goalPercent` | 进度（0–1 / 0–100） |
| `isAchieved` / `goalHasMeasure` | 是否达成 / 是否可度量 |
| `daysLeft` / `deadlineStatus` | 距截止天数 / 截止状态（overdue / due-soon / ok） |
| `subtaskStats` | 子任务完成数 |
| `overallStats` | 全部目标汇总（总数 / 已达成 / 平均进度） |
| `sortGoalsForBoard` | 看板排序（未达成在前、截止近在前） |

## 运行 / 测试

```bash
node --test goals/calc.test.js
# 集成于主应用；独立演示页 /goals/（先 node scripts/build.mjs）
```

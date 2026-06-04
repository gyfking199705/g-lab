# schedule · 日程安排

管理日常事项，按**日 / 周**查看。日视图含「逾期」提醒、待办/已完成分组；周视图为 7 天概览，可点某天下钻到日视图。事项可选关联一个目标（`goalId`）。

> 与「项目规划」的区别：项目规划面向**项目任务**（甘特 / 番茄 / 负责人）；本模块面向**个人日常事项**，更轻量，并直接喂给首页看板。

## 数据（localStorage 键 `schedule-planner`）

```js
{
  v: 1,
  items: [
    { id, title, date('YYYY-MM-DD'), time?('HH:MM'), note?,
      done, doneAt?, goalId?, createdAt }
  ]
}
```

## 纯函数（`calc.js`，已单测）

| 函数 | 作用 |
| --- | --- |
| `itemsOnDate(items, date)` | 某天事项，按时间排序（无时间靠后） |
| `weekGroups(items, date)` | date 所在周一起 7 天分组 |
| `todayView(items)` | 今日分桶：逾期 / 待办 / 已完成（供看板） |
| `dayStats` / `weekStats` | 某日 / 某周完成统计 |
| `overdueCount(items)` | 逾期未完成数（侧栏红点提醒） |

## 运行 / 测试

```bash
node --test schedule/calc.test.js
# 集成于主应用；独立演示页 /schedule/（先 node scripts/build.mjs）
```

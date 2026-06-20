# habits · 习惯打卡

追踪日常正向习惯，支持**勾选型**与**计数型**（如喝水 8 杯），提供连续打卡 streak、历史最长、近 30 天完成率与最近 70 天热力图回顾。

## 与健身模块的联动

`source: 'fitness'` 的习惯（预置「训练完成」）会读取 `fitness-planner` 的训练记录：**当天有训练记录即自动点亮**（也允许手动补打卡）。联动通过把「训练日期集合」作为 `externalDoneDates` 注入纯函数实现，`calc.js` 本身不依赖任何模块。

## 数据（localStorage 键 `habits-planner`）

```js
{
  v: 1,
  habits: [
    { id, name, icon, color, type:'check'|'count', target?, unit?,
      source?:'manual'|'fitness', goalId?, createdAt, archived }
  ],
  checkins: { [habitId]: { [date]: number } }  // check 型存 1，count 型存累计值
}
```

## 纯函数（`calc.js`，已单测）

| 函数 | 作用 |
| --- | --- |
| `isDoneOn(habit, date, checkins, extDates?)` | 某天是否达成（count 看是否达 target；fitness 看外部点亮） |
| `currentStreak` / `bestStreak` | 当前连续 / 历史最长连续天数（今天未打卡不立刻断） |
| `completionRate(habit, checkins, n)` | 最近 n 天完成率 |
| `heatmap(habit, checkins, n)` | 热力图数据（含 count 型深浅 `ratio`） |
| `todayBoard(habits, checkins)` | 今日汇总，供看板/徽章 |
| `fitnessWorkoutDates(fitnessData)` | 从健身数据提取训练日期集合 |
| `toggleCheck` / `bumpCount` | 不可变更新打卡记录 |

## 运行 / 测试

```bash
node --test habits/calc.test.js          # 单测
# 集成于主应用；独立演示页 /habits/（先 node scripts/build.mjs）
```

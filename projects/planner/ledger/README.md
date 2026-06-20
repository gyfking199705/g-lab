# ledger · 记账

日常收支流水。与「财富规划」互补：**这里记现金流（每天花/赚多少），财富规划记存量（净资产快照）**。

## 功能

- 快速记一笔：支出/收入、金额、分类（带图标预设）、日期、备注。
- 月度汇总：支出 / 收入 / 结余 + **月度预算进度**；可按月翻看。
- **近 14 天支出趋势**（手写 SVG sparkline）+ 支出分类占比。
- 流水列表（编辑/删除）。数据回流首页看板「本月记账」卡（含支出趋势图）。

## 数据（localStorage 键 `ledger-planner`）

```js
{ v:1, budget:<月度预算,0=未设>, entries:[ { id, date, type:'expense'|'income', amount, category, note? } ] }
```

## 纯函数（`calc.js`，已单测 10 例）

`monthKey` · `entriesInMonth` · `monthTotals` · `byCategory` · `dailyExpense`(趋势) ·
`budgetStatus` · `balance` · `todayExpense` · `summary`（看板用）。

## 运行 / 测试

```bash
node --test ledger/calc.test.js
# 集成于主应用（侧栏「记账」）；独立演示页 /ledger/（先 node scripts/build.mjs）
```

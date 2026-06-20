# cut · 减脂计划

数据驱动的体态/减脂追踪器。融合市面应用（MacroFactor / Happy Scale / MyFitnessPal）的核心做法，给出激励性仪表盘。

## 核心机制

| 概念 | 做法 | 效仿 |
| --- | --- | --- |
| **趋势体重** | 对每日体重做指数移动平均（EMA, α=0.1），抹平水分噪声，只看真实趋势 | Happy Scale / MacroFactor |
| **自适应 TDEE** | 用「趋势体重变化 + 平均摄入」反推真实总消耗（`平均摄入 − 体重变化kg×7700/天`），比公式准 | MacroFactor |
| **公式 TDEE** | 数据不足时用 Mifflin-St Jeor（BMR×活动系数）作初始估计，攒够数据自动切换自适应 | 通用 |
| **能量缺口** | `(TDEE + 额外运动) − 摄入`，连续达标 streak 激励 | MyFitnessPal / Lose It! |
| **进度投影** | 按当前每周趋势速度推算预计达成日 | MacroFactor |
| **身体成分** | 体脂% → 脂肪量/瘦体重；按当前瘦体重推算达目标体脂所需体重 | InBody / 通用 |

> 每天只需记 ① 体重 ② 摄入总热量（可选 ③ 额外运动 ④ 体脂%）。静态站无在线食物库，摄入为手动总量。

## 数据（localStorage 键 `cut-planner`）

```js
{
  v: 1,
  profile: { sex, height(cm), age, activity, startDate, startWeight, goalWeight, goalBodyFat?, startBodyFat? },
  logs: [ { id, date, weight?, intake?(kcal), exercise?(kcal), bodyFat?(%), note? } ]
}
```

## 纯函数（`calc.js`，已单测 16 例）

`mifflinBMR` · `formulaTDEE` · `trendSeries`(EMA) · `weeklyRate` · `adaptiveTDEE` · `estimateTDEE` ·
`progress` / `lostKg` / `remainingKg` · `projection` · `bodyComposition` · `goalWeightAtBodyFat` ·
`calorieTargetForRate` · `deficitOf` / `deficitSeries` / `deficitStreak` · `summary`（仪表盘一次算好）。

`summary` 也被首页看板复用，渲染「减脂进度」卡。

## 运行 / 测试

```bash
node --test cut/calc.test.js
# 集成于主应用（侧栏「减脂计划」）；独立演示页 /cut/（先 node scripts/build.mjs）
```

## 免责声明

体重与热量为长期趋势估算，个体差异大、并非医疗或营养建议。健康减重通常每周 0.5–1% 体重，极端节食有害，如有需要请咨询专业人士。

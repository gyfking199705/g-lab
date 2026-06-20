# 💪 健身训练规划模块

一个正经的训练追踪器：定计划、记录每一组（次数 × 重量）、看见力量（估算 1RM）与训练容量的增长。
可作为独立组件单独运行，也可集成进主应用（个人成长规划系统）。

```
fitness/
├── calc.js             # ① 纯函数（1RM 估算 / 容量 / 按肌群 / 最佳与走势 / 频率 / 活跃度）— 不依赖 React
├── calc.test.js        # 单元测试（node --test）
├── exercises.js        # 内置动作库 + 训练计划模板（推/拉/腿、全身、上下肢）
├── FitnessPlanner.jsx  # ② React 组件（实时记录器 + 手写 SVG 1RM 折线 / 热力图），自带样式
├── bootstrap.jsx       # 独立页打包入口
├── index.html          # ③ 可独立运行的演示页（加载 ../dist/fitness.js）
└── package.json        # 标记 ESM，便于 Node 测试
```

## ✨ 功能

- **今日**：本周训练 / 连续训练周 / 累计容量 / 上次训练概览；**实时记录器**——加动作、逐组填「次数 × 重量」、加组/删组，一键保存。
- **训练计划**：从模板（推/拉/腿、全身训练、上下肢分化）或空白创建；编辑每个动作的目标组数与次数；「▶ 开练」按计划自动带出动作。
- **记录**：历史训练流水（容量 / 组数 / 肌群），可展开看每一组、删除。
- **统计**：各肌群最近 4 周容量、所选动作的**估算 1RM 走势**（手写 SVG 折线）、训练**热力图**；可切换重量单位（kg/lb）与 1RM 估算公式（Epley/Brzycki）。

## 🚀 独立运行 / 测试

```bash
python3 -m http.server 8000          # 浏览器打开 http://localhost:8000/fitness/
cd fitness && node --test            # 1RM/容量/肌群/最佳走势/频率/格式化
```
改动源码后在根目录 `node scripts/build.mjs` 重新生成 `dist/fitness.js`。

## 🔌 集成进主应用

```jsx
import FitnessPlanner from './fitness/FitnessPlanner.jsx';
<FitnessPlanner storageKey="fitness-planner" onChange={(data) => {}} />
```
- 数据结构：`{ routines, workouts, customExercises, settings:{unit, formula} }`
- 样式自带（类名前缀 `fp-`），图表为手写 SVG，无外部依赖。

## 📐 计算函数（`calc.js`）

| 函数 | 说明 |
| --- | --- |
| `estimate1RM(weight, reps, formula)` | 由「重量×次数」估算 1RM（Epley/Brzycki）|
| `setVolume / entryVolume / workoutVolume / totalVolume` | 训练容量 = Σ 次数×重量 |
| `volumeByMuscle(workouts, since?)` | 各肌群容量（可限定起始日期）|
| `best1RM / oneRMSeries / bestSet` | 某动作的最佳估算 1RM 与走势 |
| `workoutsThisWeek / weekStreak / startOfWeek` | 训练频率与连续训练周 |
| `activitySeries(workouts, today, days)` | 热力图用的活跃度序列 |
| `formatVolume / formatWeight / fmtDate / relDay` | 中文展示格式化 |

> ⚠️ 1RM 为公式估算值，仅供训练参考；实际请量力而行、循序渐进，注意热身与动作质量。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mifflinBMR,
  formulaTDEE,
  trendSeries,
  latestWeight,
  latestTrend,
  weeklyRate,
  adaptiveTDEE,
  estimateTDEE,
  progress,
  lostKg,
  remainingKg,
  projection,
  bodyComposition,
  goalWeightAtBodyFat,
  calorieTargetForRate,
  deficitOf,
  deficitSeries,
  deficitStreak,
  summary,
} from './calc.js';

const profile = { sex: 'male', height: 178, age: 30, activity: 'light', startDate: '2026-01-01', startWeight: 85, goalWeight: 70, goalBodyFat: 10 };

// 生成连续日期的体重+摄入序列
function buildLogs(startDate, arr) {
  // arr: [{w, intake?}], 每天递增
  const out = [];
  let d = startDate;
  const add = (s, n) => { const dt = new Date(s); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10); };
  arr.forEach((x, i) => out.push({ date: add(startDate, i), weight: x.w, intake: x.intake }));
  return out;
}

test('mifflinBMR 男/女', () => {
  // 男 85kg 178cm 30岁: 10*85+6.25*178-5*30+5 = 850+1112.5-150+5 = 1817.5 → 1818
  assert.equal(mifflinBMR({ sex: 'male', weight: 85, height: 178, age: 30 }), 1818);
  assert.equal(mifflinBMR({ sex: 'female', weight: 85, height: 178, age: 30 }), 1652);
});

test('formulaTDEE 用活动系数', () => {
  // light=1.375, BMR 1818 → 2500
  assert.equal(formulaTDEE(profile, 85), Math.round(1818 * 1.375));
});

test('trendSeries EMA 平滑', () => {
  const logs = [{ date: '2026-01-01', weight: 85 }, { date: '2026-01-02', weight: 84 }, { date: '2026-01-03', weight: 86 }];
  const s = trendSeries(logs, 0.1);
  assert.equal(s.length, 3);
  assert.equal(s[0].trend, 85); // 首点=自身
  // 第二点 0.1*84 + 0.9*85 = 84.9
  assert.equal(s[1].trend, 84.9);
  // 趋势比实测更平滑：第三点实测86但趋势<86
  assert.ok(s[2].trend < 86 && s[2].trend > 84.9);
});

test('latestWeight / latestTrend', () => {
  const logs = [{ date: '2026-01-01', weight: 85 }, { date: '2026-01-02', weight: 84 }];
  assert.equal(latestWeight(logs), 84);
  assert.ok(latestTrend(logs) > 84 && latestTrend(logs) <= 85); // 趋势滞后
});

test('weeklyRate 负值表示下降', () => {
  // 14 天，每天 -0.1kg
  const arr = Array.from({ length: 15 }, (_, i) => ({ w: 85 - i * 0.1 }));
  const logs = buildLogs('2026-01-01', arr);
  const rate = weeklyRate(logs, 14);
  assert.ok(rate < 0, '应为负（下降）');
  // 趋势体重(EMA)滞后于实测，斜率偏保守，约 -0.35/周
  assert.ok(rate > -1.2 && rate < -0.2, `每周下降，实际 ${rate}`);
});

test('adaptiveTDEE 反推消耗', () => {
  // 21 天，每天摄入 2000，体重从 85 线性降到 83（21天降2kg）
  const n = 22;
  const arr = Array.from({ length: n }, (_, i) => ({ w: round(85 - (2 * i) / (n - 1)), intake: 2000 }));
  const logs = buildLogs('2026-01-01', arr);
  const tdee = adaptiveTDEE(logs);
  // 趋势体重变化略小于实测 2kg（EMA 滞后），消耗 ≈ 2000 + 约2kg*7700/21 ≈ 2000+733
  assert.ok(tdee > 2400 && tdee < 2800, `自适应 TDEE 约 2600±，实际 ${tdee}`);
});

test('adaptiveTDEE 数据不足返回 null', () => {
  const logs = buildLogs('2026-01-01', [{ w: 85, intake: 2000 }, { w: 84.8, intake: 2000 }]);
  assert.equal(adaptiveTDEE(logs), null);
});

test('estimateTDEE 回退公式', () => {
  const r = estimateTDEE(profile, [{ date: '2026-01-01', weight: 85 }]);
  assert.equal(r.mode, 'formula');
  assert.ok(r.tdee > 2000);
});

test('progress / lost / remaining', () => {
  assert.equal(progress(profile, 85), 0);
  assert.equal(progress(profile, 70), 1);
  assert.equal(Math.round(progress(profile, 77.5) * 100), 50);
  assert.equal(lostKg(profile, 80), 5);
  assert.equal(remainingKg(profile, 80), 10);
});

test('projection 朝目标推进才有结果', () => {
  const p = projection(profile, 80, -0.7, '2026-06-04');
  assert.ok(p && p.days > 0);
  // 还剩 10kg，每周 0.7 → 约 100 天
  assert.ok(p.days > 80 && p.days < 120, `约100天，实际 ${p.days}`);
  // 体重在涨（rate>0）→ 减重目标无法达成
  assert.equal(projection(profile, 80, 0.3, '2026-06-04'), null);
  // 速度为 null
  assert.equal(projection(profile, 80, null), null);
});

test('bodyComposition / goalWeightAtBodyFat', () => {
  const c = bodyComposition(85, 20);
  assert.deepEqual(c, { fat: 17, lean: 68 });
  // 瘦体重 68，10% 体脂 → 68/0.9 ≈ 75.6
  assert.equal(goalWeightAtBodyFat(68, 10), 75.6);
});

test('calorieTargetForRate', () => {
  // TDEE 2600，目标每周减 0.5kg → 2600 - 0.5*7700/7 ≈ 2600-550=2050
  assert.equal(calorieTargetForRate(2600, 0.5), 2050);
});

test('deficitOf 含额外运动', () => {
  assert.equal(deficitOf({ intake: 1800 }, 2500), 700);
  assert.equal(deficitOf({ intake: 1800, exercise: 300 }, 2500), 1000);
  assert.equal(deficitOf({ }, 2500), null);
});

test('deficitSeries 长度与缺口', () => {
  const logs = [{ date: '2026-06-04', intake: 1800 }, { date: '2026-06-03', intake: 2000 }];
  const s = deficitSeries(logs, 2500, 3, '2026-06-04');
  assert.equal(s.length, 3);
  assert.equal(s[2].deficit, 700); // 今天
  assert.equal(s[0].deficit, null); // 6/2 无记录
});

test('deficitStreak 连续达标', () => {
  const logs = [
    { date: '2026-06-04', intake: 1800 }, // 缺口+
    { date: '2026-06-03', intake: 1900 }, // +
    { date: '2026-06-02', intake: 2600 }, // 超标，断
    { date: '2026-06-01', intake: 1800 },
  ];
  assert.equal(deficitStreak(logs, 2500, '2026-06-04'), 2);
});

test('summary 综合', () => {
  const arr = Array.from({ length: 22 }, (_, i) => ({ w: round(85 - (2 * i) / 21), intake: 2000 }));
  const logs = buildLogs('2026-05-14', arr); // 截止 2026-06-04
  const s = summary(profile, logs, '2026-06-04');
  assert.ok(s.currentTrend < 85 && s.currentTrend > 82);
  assert.ok(s.lost > 0);
  assert.equal(s.startWeight, 85);
  assert.equal(s.goalWeight, 70);
  assert.ok(s.tdee > 2000);
  assert.ok(s.progressPct >= 0 && s.progressPct <= 100);
});

function round(x) { return Math.round(x * 10) / 10; }

import { weightForecast } from './calc.js';

test('weightForecast 减重带：方向与收敛', () => {
  const f = weightForecast(84, -0.7, 70, 28);
  assert.ok(f);
  assert.equal(f.mid.length, 28);
  // 末值都比当前低（在减）
  assert.ok(f.mid[27] < 84);
  // 乐观掉得更快 → 末值更低；保守更高
  assert.ok(f.optimistic[27] <= f.mid[27]);
  assert.ok(f.conservative[27] >= f.mid[27]);
  // upper=conservative(更高), lower=optimistic(更低)
  assert.ok(f.upper[27] >= f.lower[27]);
});

test('weightForecast 不收敛过冲目标', () => {
  const f = weightForecast(70.5, -1.4, 70, 28); // 很快到 70
  assert.ok(f.optimistic.every((v) => v >= 70));
});

test('weightForecast 非减重返回 null', () => {
  assert.equal(weightForecast(84, 0.2, 70), null);
  assert.equal(weightForecast(84, null, 70), null);
});

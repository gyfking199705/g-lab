import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  estimate1RM,
  setVolume,
  entryVolume,
  workoutVolume,
  workoutSetCount,
  totalVolume,
  volumeByMuscle,
  best1RM,
  oneRMSeries,
  bestSet,
  loggedExercises,
  startOfWeek,
  workoutsThisWeek,
  weekStreak,
  activitySeries,
  suggestNextWeight,
  formatVolume,
  formatWeight,
  fmtDate,
  relDay,
} from './calc.js';
import { EXERCISES, findExercise, ROUTINE_TEMPLATES, getRoutineTemplate } from './exercises.js';

const approx = (a, b, eps = 1e-3) => assert.ok(Math.abs(a - b) <= eps, `expected ${a} ≈ ${b}`);
const T = '2026-06-03'; // 周三

/* --------------------------- 1RM --------------------------- */
test('estimate1RM：Epley / Brzycki / 边界', () => {
  assert.equal(estimate1RM(100, 1), 100);
  approx(estimate1RM(100, 10, 'epley'), 100 * (1 + 10 / 30)); // 133.33
  approx(estimate1RM(100, 5, 'brzycki'), (100 * 36) / 32); // 112.5
  assert.equal(estimate1RM(0, 10), 0); // 无重量
  assert.equal(estimate1RM(80, 0), 80); // reps<1 视为 1
});

/* --------------------------- 容量 --------------------------- */
test('容量：set / entry / workout / total', () => {
  assert.equal(setVolume({ reps: 10, weight: 60 }), 600);
  const entry = { exId: 'bench', muscle: '胸', sets: [{ reps: 10, weight: 60 }, { reps: 8, weight: 60 }] };
  assert.equal(entryVolume(entry), 600 + 480);
  const w = { date: T, entries: [entry, { exId: 'squat', muscle: '腿', sets: [{ reps: 5, weight: 100 }] }] };
  assert.equal(workoutVolume(w), 1080 + 500);
  assert.equal(workoutSetCount(w), 3);
  assert.equal(totalVolume([w, w]), (1580) * 2);
});

test('volumeByMuscle：按肌群汇总，支持 since 过滤', () => {
  const workouts = [
    { date: addDays(T, -40), entries: [{ muscle: '胸', sets: [{ reps: 10, weight: 50 }] }] },
    { date: T, entries: [{ muscle: '胸', sets: [{ reps: 10, weight: 60 }] }, { muscle: '腿', sets: [{ reps: 10, weight: 100 }] }] },
  ];
  const all = volumeByMuscle(workouts);
  assert.equal(all['胸'], 500 + 600);
  assert.equal(all['腿'], 1000);
  const recent = volumeByMuscle(workouts, addDays(T, -27));
  assert.equal(recent['胸'], 600); // 40 天前那次被排除
});

/* --------------------------- 最佳 / 走势 --------------------------- */
const liftWorkouts = () => [
  { date: addDays(T, -14), entries: [{ exId: 'squat', name: '深蹲', muscle: '腿', sets: [{ reps: 5, weight: 80 }, { reps: 5, weight: 85 }] }] },
  { date: addDays(T, -7), entries: [{ exId: 'squat', name: '深蹲', muscle: '腿', sets: [{ reps: 5, weight: 90 }] }] },
  { date: T, entries: [{ exId: 'squat', name: '深蹲', muscle: '腿', sets: [{ reps: 3, weight: 100 }] }, { exId: 'bench', name: '卧推', muscle: '胸', sets: [{ reps: 8, weight: 60 }] }] },
];

test('best1RM / oneRMSeries / bestSet / loggedExercises', () => {
  const ws = liftWorkouts();
  approx(best1RM(ws, 'squat', 'epley'), 100 * (1 + 3 / 30)); // 最新最大
  const series = oneRMSeries(ws, 'squat', 'epley');
  assert.equal(series.length, 3);
  assert.deepEqual(series.map((d) => d.date), [addDays(T, -14), addDays(T, -7), T]); // 升序
  assert.ok(series[2].value > series[0].value);
  const bs = bestSet(ws, 'squat');
  assert.equal(bs.weight, 100);
  const exs = loggedExercises(ws);
  assert.equal(exs.length, 2);
});

/* --------------------------- 频率 --------------------------- */
test('startOfWeek：周一为起点', () => {
  assert.equal(startOfWeek('2026-06-03'), '2026-06-01'); // 周三 → 周一
  assert.equal(startOfWeek('2026-06-01'), '2026-06-01'); // 周一
  assert.equal(startOfWeek('2026-06-07'), '2026-06-01'); // 周日
});

test('workoutsThisWeek：本周去重天数', () => {
  const workouts = [
    { date: '2026-06-02', entries: [] },
    { date: '2026-06-02', entries: [] }, // 同一天两次只算一天
    { date: '2026-06-03', entries: [] },
    { date: '2026-05-30', entries: [] }, // 上周
  ];
  assert.equal(workoutsThisWeek(workouts, T), 2);
});

test('weekStreak：连续训练周（本周没练不立即断）', () => {
  const thisAndLast = [{ date: '2026-06-02', entries: [] }, { date: '2026-05-26', entries: [] }];
  assert.equal(weekStreak(thisAndLast, T), 2);
  const onlyLast = [{ date: '2026-05-26', entries: [] }];
  assert.equal(weekStreak(onlyLast, T), 1);
  assert.equal(weekStreak([], T), 0);
});

test('activitySeries：长度与末位为今天', () => {
  const s = activitySeries([{ date: T, entries: [{ muscle: '胸', sets: [{ reps: 10, weight: 50 }] }] }], T, 7);
  assert.equal(s.length, 7);
  assert.equal(s[6].date, T);
  assert.equal(s[6].volume, 500);
  assert.equal(s[6].count, 1);
});

/* --------------------------- 建议 / 格式化 --------------------------- */
test('suggestNextWeight：达标线性增重', () => {
  assert.equal(suggestNextWeight(60, { step: 2.5, reachedTarget: true }), 62.5);
  assert.equal(suggestNextWeight(60, { reachedTarget: false }), 60);
  assert.equal(suggestNextWeight(0), 0);
});

test('格式化：容量 / 重量 / 日期', () => {
  assert.equal(formatVolume(800, 'kg'), '800 kg');
  assert.equal(formatVolume(1500, 'kg'), '1.5 吨');
  assert.equal(formatWeight(62.5, 'kg'), '62.5 kg');
  assert.equal(formatWeight(60, 'kg'), '60 kg');
  assert.equal(fmtDate('2026-06-03'), '6月3日');
  assert.equal(relDay(T, T), '今天');
  assert.equal(relDay(addDays(T, -1), T), '昨天');
});

/* --------------------------- 动作库 / 模板 --------------------------- */
test('动作库与模板结构合法', () => {
  assert.ok(EXERCISES.length >= 15);
  assert.ok(findExercise('bench'));
  assert.equal(findExercise('not-exist'), null);
  const custom = [{ id: 'cx1', name: '自定义', muscle: '胸' }];
  assert.equal(findExercise('cx1', custom).name, '自定义');
  assert.ok(ROUTINE_TEMPLATES.length >= 3);
  const ppl = getRoutineTemplate('ppl');
  assert.equal(ppl.routines.length, 3);
  assert.ok(ppl.routines[0].items.every((it) => findExercise(it.exId)));
});

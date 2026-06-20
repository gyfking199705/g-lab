import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  goalProgress,
  goalPercent,
  isAchieved,
  daysLeft,
  deadlineStatus,
  subtaskStats,
  overallStats,
  sortGoalsForBoard,
} from './calc.js';

const subGoal = (done, total) => ({
  id: 'g',
  subtasks: Array.from({ length: total }, (_, i) => ({ id: i, title: 't', done: i < done })),
});

test('goalProgress 子任务比例', () => {
  assert.equal(goalProgress(subGoal(0, 4)), 0);
  assert.equal(goalProgress(subGoal(1, 4)), 0.25);
  assert.equal(goalProgress(subGoal(4, 4)), 1);
});

test('goalProgress 数值型 metric 优先', () => {
  const g = { metric: { current: 30, target: 100, unit: 'km' }, subtasks: [{ done: true }] };
  assert.equal(goalProgress(g), 0.3);
});

test('goalProgress 无度量为 0', () => {
  assert.equal(goalProgress({}), 0);
  assert.equal(goalProgress({ subtasks: [] }), 0);
});

test('goalProgress metric 超额封顶 100%', () => {
  assert.equal(goalProgress({ metric: { current: 150, target: 100 } }), 1);
});

test('goalPercent 取整', () => {
  assert.equal(goalPercent(subGoal(1, 3)), 33);
});

test('isAchieved 需有度量且满进度', () => {
  assert.equal(isAchieved(subGoal(4, 4)), true);
  assert.equal(isAchieved(subGoal(3, 4)), false);
  assert.equal(isAchieved({}), false); // 无度量不算达成
});

test('daysLeft / deadlineStatus', () => {
  const t = '2026-06-04';
  assert.equal(daysLeft({ deadline: '2026-06-11' }, t), 7);
  assert.equal(daysLeft({}, t), null);
  assert.equal(deadlineStatus({ deadline: '2026-06-01', subtasks: [{ done: false }] }, t), 'overdue');
  assert.equal(deadlineStatus({ deadline: '2026-06-07', subtasks: [{ done: false }] }, t), 'due-soon');
  assert.equal(deadlineStatus({ deadline: '2026-07-01', subtasks: [{ done: false }] }, t), 'ok');
  assert.equal(deadlineStatus({}, t), 'none');
  // 已达成即便逾期也算 ok
  assert.equal(deadlineStatus({ deadline: '2026-06-01', ...subGoal(2, 2) }, t), 'ok');
});

test('subtaskStats', () => {
  assert.deepEqual(subtaskStats(subGoal(2, 5)), { done: 2, total: 5 });
});

test('overallStats 忽略归档、算平均', () => {
  const goals = [subGoal(2, 4), subGoal(4, 4), { archived: true, ...subGoal(0, 4) }];
  const s = overallStats(goals);
  assert.equal(s.total, 2);
  assert.equal(s.achieved, 1);
  assert.equal(s.avgPercent, 75); // (50 + 100) / 2
});

test('sortGoalsForBoard 未达成在前、截止近在前', () => {
  const t = '2026-06-04';
  const a = { ...subGoal(0, 2), id: 'a', deadline: '2026-06-20' };
  const b = { ...subGoal(0, 2), id: 'b', deadline: '2026-06-06' };
  const done = { ...subGoal(2, 2), id: 'c' };
  const out = sortGoalsForBoard([done, a, b], t).map((g) => g.id);
  assert.deepEqual(out, ['b', 'a', 'c']);
});

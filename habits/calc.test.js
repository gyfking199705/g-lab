import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  valueOn,
  isDoneOn,
  currentStreak,
  bestStreak,
  completionRate,
  heatmap,
  todayBoard,
  fitnessWorkoutDates,
  toggleCheck,
  bumpCount,
} from './calc.js';

const check = { id: 'h1', type: 'check' };
const water = { id: 'h2', type: 'count', target: 8 };
const train = { id: 'h3', type: 'check', source: 'fitness' };

test('valueOn', () => {
  const ci = { h1: { '2026-06-04': 1 }, h2: { '2026-06-04': 5 } };
  assert.equal(valueOn(check, '2026-06-04', ci), 1);
  assert.equal(valueOn(water, '2026-06-04', ci), 5);
  assert.equal(valueOn(check, '2026-06-03', ci), 0);
});

test('isDoneOn check / count', () => {
  const ci = { h1: { '2026-06-04': 1 }, h2: { '2026-06-04': 5, '2026-06-03': 8 } };
  assert.equal(isDoneOn(check, '2026-06-04', ci), true);
  assert.equal(isDoneOn(water, '2026-06-04', ci), false); // 5 < 8
  assert.equal(isDoneOn(water, '2026-06-03', ci), true); // 8 >= 8
});

test('isDoneOn fitness 由外部点亮', () => {
  const ext = new Set(['2026-06-04']);
  assert.equal(isDoneOn(train, '2026-06-04', {}, ext), true);
  assert.equal(isDoneOn(train, '2026-06-03', {}, ext), false);
});

test('currentStreak 今天完成', () => {
  const ci = { h1: { '2026-06-04': 1, '2026-06-03': 1, '2026-06-02': 1 } };
  assert.equal(currentStreak(check, ci, '2026-06-04'), 3);
});

test('currentStreak 今天未完成但昨天连续（不立刻断）', () => {
  const ci = { h1: { '2026-06-03': 1, '2026-06-02': 1 } };
  assert.equal(currentStreak(check, ci, '2026-06-04'), 2);
});

test('currentStreak 断档', () => {
  const ci = { h1: { '2026-06-04': 1, '2026-06-02': 1 } };
  assert.equal(currentStreak(check, ci, '2026-06-04'), 1);
});

test('currentStreak fitness 联动', () => {
  const ext = new Set(['2026-06-04', '2026-06-03']);
  assert.equal(currentStreak(train, {}, '2026-06-04', ext), 2);
});

test('bestStreak', () => {
  const ci = { h1: { '2026-06-01': 1, '2026-06-02': 1, '2026-06-03': 1, '2026-06-06': 1 } };
  assert.equal(bestStreak(check, ci, '2026-06-06'), 3);
});

test('completionRate', () => {
  const ci = { h1: { '2026-06-04': 1, '2026-06-03': 1 } };
  // 最近 4 天里 2 天完成
  assert.equal(completionRate(check, ci, 4, '2026-06-04'), 0.5);
});

test('heatmap 长度与 count 深浅', () => {
  const ci = { h2: { '2026-06-04': 4 } };
  const hm = heatmap(water, ci, 3, '2026-06-04');
  assert.equal(hm.length, 3);
  const today = hm[hm.length - 1];
  assert.equal(today.value, 4);
  assert.equal(today.done, false); // 4 < 8
  assert.equal(today.ratio, 0.5);
});

test('todayBoard 汇总', () => {
  const habits = [check, water, { id: 'arch', type: 'check', archived: true }];
  const ci = { h1: { '2026-06-04': 1 }, h2: { '2026-06-04': 8 } };
  const b = todayBoard(habits, ci, '2026-06-04');
  assert.equal(b.total, 2);
  assert.equal(b.doneCount, 2);
});

test('fitnessWorkoutDates 提取训练日期', () => {
  const set = fitnessWorkoutDates({ workouts: [{ date: '2026-06-04' }, { date: '2026-06-01' }, {}] });
  assert.equal(set.size, 2);
  assert.equal(set.has('2026-06-04'), true);
});

test('toggleCheck 不可变切换', () => {
  const ci = {};
  const a = toggleCheck(ci, 'h1', '2026-06-04');
  assert.equal(a.h1['2026-06-04'], 1);
  const b = toggleCheck(a, 'h1', '2026-06-04');
  assert.equal(b.h1['2026-06-04'], undefined);
  assert.deepEqual(ci, {}); // 原对象不变
});

test('bumpCount 增减不为负', () => {
  let ci = bumpCount({}, 'h2', '2026-06-04', 1);
  assert.equal(ci.h2['2026-06-04'], 1);
  ci = bumpCount(ci, 'h2', '2026-06-04', 3);
  assert.equal(ci.h2['2026-06-04'], 4);
  ci = bumpCount(ci, 'h2', '2026-06-04', -10);
  assert.equal(ci.h2['2026-06-04'], undefined); // 归零即删除
});

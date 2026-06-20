import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  itemsOnDate,
  weekGroups,
  todayView,
  dayStats,
  weekStats,
  overdueCount,
} from './calc.js';

const items = [
  { id: 1, title: '晨练', date: '2026-06-04', time: '07:00', done: false },
  { id: 2, title: '会议', date: '2026-06-04', time: '14:00', done: true },
  { id: 3, title: '随手记', date: '2026-06-04', done: false }, // 无时间
  { id: 4, title: '逾期事项', date: '2026-06-02', done: false },
  { id: 5, title: '已完成旧事', date: '2026-06-01', done: true },
  { id: 6, title: '下周', date: '2026-06-09', done: false },
];

test('itemsOnDate 按时间排序、无时间靠后', () => {
  const r = itemsOnDate(items, '2026-06-04').map((i) => i.id);
  assert.deepEqual(r, [1, 2, 3]);
});

test('weekGroups 7 天分组', () => {
  const g = weekGroups(items, '2026-06-04');
  assert.equal(g.length, 7);
  assert.equal(g[0].date, '2026-06-01');
  assert.equal(g[3].items.length, 3); // 周四 6/4 有 3 项
});

test('todayView 分桶', () => {
  const v = todayView(items, '2026-06-04');
  assert.deepEqual(v.pending.map((i) => i.id), [1, 3]);
  assert.deepEqual(v.done.map((i) => i.id), [2]);
  assert.deepEqual(v.overdue.map((i) => i.id), [4]); // 已完成的旧事不算逾期
});

test('dayStats / weekStats', () => {
  assert.deepEqual(dayStats(items, '2026-06-04'), { done: 1, total: 3 });
  // 本周(6/1–6/7)：6/4 三项(1完成) + 6/2 一项 + 6/1 一项(完成) = 5 项 2 完成
  assert.deepEqual(weekStats(items, '2026-06-04'), { done: 2, total: 5 });
});

test('overdueCount', () => {
  assert.equal(overdueCount(items, '2026-06-04'), 1);
});

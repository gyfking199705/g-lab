import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  statusCounts,
  readProgress,
  filterItems,
  isSaved,
  annotateSaved,
  readingStreak,
  doneInLastDays,
  byCategory,
  summary,
  buildSummaryMessages,
  estimateReadMinutes,
} from './calc.js';

const items = [
  { id: 'a', status: 'done', addedAt: '2026-06-01', doneAt: '2026-06-04', primary: 'cs.LG' },
  { id: 'b', status: 'done', addedAt: '2026-06-02', doneAt: '2026-06-03', primary: 'cs.LG' },
  { id: 'c', status: 'reading', addedAt: '2026-06-03' },
  { id: 'd', status: 'want', addedAt: '2026-06-04' },
];

test('statusCounts', () => {
  assert.deepEqual(statusCounts(items), { want: 1, reading: 1, done: 2, total: 4 });
});

test('readProgress', () => {
  assert.equal(readProgress(items), 0.5);
  assert.equal(readProgress([]), 0);
});

test('filterItems：按状态 + 排序', () => {
  assert.deepEqual(filterItems(items, 'done').map((x) => x.id), ['a', 'b']); // doneAt 倒序
  assert.deepEqual(filterItems(items, 'want').map((x) => x.id), ['d']);
  assert.equal(filterItems(items, 'all').length, 4);
});

test('isSaved / annotateSaved', () => {
  assert.equal(isSaved(items, 'a'), true);
  assert.equal(isSaved(items, 'z'), false);
  const ann = annotateSaved([{ id: 'a' }, { id: 'z' }], items);
  assert.equal(ann[0].saved, true);
  assert.equal(ann[1].saved, false);
});

test('readingStreak：今天读了', () => {
  // a 在 6/4 完成 → 今天=6/4 连续含今天；6/3 也有 → 2 天
  assert.equal(readingStreak(items, '2026-06-04'), 2);
});

test('readingStreak：今天没读不立刻断', () => {
  // today=6/5，没记录；从 6/4 往回：6/4(a),6/3(b) → 2
  assert.equal(readingStreak(items, '2026-06-05'), 2);
  // today=6/6，6/5无、6/4有 → 断 → 0
  assert.equal(readingStreak(items, '2026-06-06'), 0);
});

test('doneInLastDays', () => {
  assert.equal(doneInLastDays(items, 7, '2026-06-04'), 2);
  assert.equal(doneInLastDays(items, 1, '2026-06-04'), 1); // 仅 6/4
});

test('byCategory：仅已读、降序', () => {
  assert.deepEqual(byCategory(items), [{ category: 'cs.LG', count: 2 }]);
});

test('summary 综合', () => {
  const s = summary(items, '2026-06-04');
  assert.equal(s.total, 4);
  assert.equal(s.done, 2);
  assert.equal(s.progressPct, 50);
  assert.equal(s.streak, 2);
  assert.equal(s.thisWeek, 2);
});

test('buildSummaryMessages 含标题与摘要、结构化要求', () => {
  const m = buildSummaryMessages({ title: 'T', authors: ['A'], categories: ['cs.LG'], summary: 'S' });
  assert.match(m.system, /科研助理/);
  assert.match(m.user, /标题：T/);
  assert.match(m.user, /摘要：\nS/);
  assert.match(m.user, /核心方法/);
});

test('estimateReadMinutes 有下限', () => {
  assert.ok(estimateReadMinutes({ summary: '' }) >= 8);
  assert.ok(estimateReadMinutes({ summary: 'word '.repeat(200) }) > 8);
});

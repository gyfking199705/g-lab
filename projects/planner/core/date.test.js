import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  todayStr,
  parseDate,
  addDays,
  dayDiff,
  startOfWeek,
  weekDates,
  weekdayCN,
  fmtMD,
  fmtDate,
  relDay,
  lastNDays,
  isBefore,
} from './date.js';

test('todayStr 固定日期格式化', () => {
  assert.equal(todayStr(new Date(2026, 5, 4)), '2026-06-04');
  assert.equal(todayStr(new Date(2026, 0, 9)), '2026-01-09');
});

test('addDays 跨月跨年', () => {
  assert.equal(addDays('2026-01-31', 1), '2026-02-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(addDays('2026-06-04', 7), '2026-06-11');
});

test('dayDiff 天数差', () => {
  assert.equal(dayDiff('2026-06-04', '2026-06-04'), 0);
  assert.equal(dayDiff('2026-06-04', '2026-06-11'), 7);
  assert.equal(dayDiff('2026-06-11', '2026-06-04'), -7);
});

test('startOfWeek 周一为始', () => {
  // 2026-06-04 是周四
  assert.equal(startOfWeek('2026-06-04'), '2026-06-01');
  // 周一本身
  assert.equal(startOfWeek('2026-06-01'), '2026-06-01');
  // 周日归到上周一
  assert.equal(startOfWeek('2026-06-07'), '2026-06-01');
});

test('weekDates 返回 7 天', () => {
  const w = weekDates('2026-06-04');
  assert.equal(w.length, 7);
  assert.equal(w[0], '2026-06-01');
  assert.equal(w[6], '2026-06-07');
});

test('weekdayCN / fmtMD / fmtDate', () => {
  assert.equal(weekdayCN('2026-06-04'), '周四');
  assert.equal(fmtMD('2026-06-04'), '6/4');
  assert.equal(fmtDate('2026-06-04'), '6/4 周四');
});

test('relDay 相对人话', () => {
  const t = '2026-06-04';
  assert.equal(relDay('2026-06-04', t), '今天');
  assert.equal(relDay('2026-06-05', t), '明天');
  assert.equal(relDay('2026-06-03', t), '昨天');
  assert.equal(relDay('2026-06-09', t), '5 天后');
  assert.equal(relDay('2026-05-30', t), '5 天前');
});

test('lastNDays 含今天、从早到晚', () => {
  const d = lastNDays(3, '2026-06-04');
  assert.deepEqual(d, ['2026-06-02', '2026-06-03', '2026-06-04']);
});

test('isBefore 逾期判断', () => {
  assert.equal(isBefore('2026-06-03', '2026-06-04'), true);
  assert.equal(isBefore('2026-06-04', '2026-06-04'), false);
});

test('parseDate 回路', () => {
  assert.equal(todayStr(parseDate('2026-06-04')), '2026-06-04');
});

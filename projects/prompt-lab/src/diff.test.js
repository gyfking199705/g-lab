import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffLines, diffStat } from './diff.js';

test('diffLines 相同文本全部 eq', () => {
  const rows = diffLines('a\nb', 'a\nb');
  assert.deepEqual(rows.map((r) => r.type), ['eq', 'eq']);
});

test('diffLines 纯新增', () => {
  const rows = diffLines('a', 'a\nb');
  assert.deepEqual(rows, [
    { type: 'eq', text: 'a' },
    { type: 'add', text: 'b' },
  ]);
});

test('diffLines 纯删除', () => {
  const rows = diffLines('a\nb', 'a');
  assert.deepEqual(rows, [
    { type: 'eq', text: 'a' },
    { type: 'del', text: 'b' },
  ]);
});

test('diffLines 替换中间行', () => {
  const rows = diffLines('a\nX\nc', 'a\nY\nc');
  const types = rows.map((r) => r.type);
  assert.ok(types.includes('del'));
  assert.ok(types.includes('add'));
  // 首尾相等行保留
  assert.equal(rows[0].text, 'a');
  assert.equal(rows[rows.length - 1].text, 'c');
});

test('diffStat 统计增删', () => {
  const rows = diffLines('a\nb\nc', 'a\nx\nc\nd');
  const s = diffStat(rows);
  assert.equal(s.add, 2); // x, d
  assert.equal(s.del, 1); // b
});

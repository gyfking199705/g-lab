import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fuzzyScore, filterCommands } from './command.js';

test('fuzzyScore：子序列命中 / 不命中 / 空 query', () => {
  assert.ok(fuzzyScore('cmd', 'Command') > 0);
  assert.equal(fuzzyScore('xyz', 'Command'), 0); // 有字符匹配不全 → 0
  assert.equal(fuzzyScore('', 'anything'), 1); // 空 query 弱匹配
  assert.equal(fuzzyScore('z', 'Command'), 0);
});

test('fuzzyScore：连续/词首命中得分更高', () => {
  // 'com' 在 'Command' 是词首连续 → 应高于非连续的 'cmd'
  assert.ok(fuzzyScore('com', 'Command') > fuzzyScore('cmd', 'Command'));
  // 词首命中高于词中命中
  assert.ok(fuzzyScore('a', 'Add task') > fuzzyScore('a', 'Brand'));
});

test('filterCommands：过滤 + 按分数排序', () => {
  const cmds = [
    { id: 'new', label: '新建任务', keywords: 'add new task' },
    { id: 'open', label: '打开设置', keywords: 'settings open' },
    { id: 'sync', label: '同步到云', keywords: 'sync cloud' },
  ];
  const r = filterCommands(cmds, 'task');
  assert.equal(r[0].id, 'new'); // 命中 keywords task
  assert.ok(!r.find((c) => c.id === 'open')); // 不匹配被过滤
});

test('filterCommands：空 query 返回全部、保持原序', () => {
  const cmds = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
  assert.deepEqual(filterCommands(cmds, '').map((c) => c.id), ['a', 'b']);
  assert.deepEqual(filterCommands(cmds, '   ').map((c) => c.id), ['a', 'b']);
});

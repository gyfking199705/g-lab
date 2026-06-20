import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampNote, snap, reorderToFront, cascadeXY } from './board.js';

test('clampNote：夹到画板内、保证整张可见', () => {
  const b = { width: 300, height: 200 };
  assert.deepEqual(clampNote(-10, -10, 100, 80, b), { x: 0, y: 0 });
  assert.deepEqual(clampNote(999, 999, 100, 80, b), { x: 200, y: 120 }); // 300-100, 200-80
  assert.deepEqual(clampNote(50, 50, 100, 80, b), { x: 50, y: 50 });
});

test('clampNote：贴纸比画板大时不为负', () => {
  const r = clampNote(10, 10, 400, 400, { width: 300, height: 200 });
  assert.deepEqual(r, { x: 0, y: 0 });
});

test('snap：网格吸附 / 关闭', () => {
  assert.equal(snap(23, 10), 20);
  assert.equal(snap(26, 10), 30);
  assert.equal(snap(23, 0), 23); // 关闭
});

test('reorderToFront：移到末尾（最上层），不可变', () => {
  const notes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const r = reorderToFront(notes, 'a');
  assert.deepEqual(r.map((n) => n.id), ['b', 'c', 'a']);
  assert.deepEqual(notes.map((n) => n.id), ['a', 'b', 'c']); // 原数组不变
  assert.deepEqual(reorderToFront(notes, 'x').map((n) => n.id), ['a', 'b', 'c']); // 不存在 → 副本
});

test('cascadeXY：每张错开、每 8 张回到起点', () => {
  assert.deepEqual(cascadeXY(0, 26, 24), { x: 24, y: 24 });
  assert.deepEqual(cascadeXY(1, 26, 24), { x: 50, y: 50 });
  assert.deepEqual(cascadeXY(8, 26, 24), { x: 24, y: 24 });
});

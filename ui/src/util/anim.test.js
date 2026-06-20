import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp, lerp, mapRange, roundTo, easings, cx } from './anim.js';

test('clamp / lerp / roundTo', () => {
  assert.equal(clamp(5, 0, 3), 3);
  assert.equal(clamp(-1, 0, 3), 0);
  assert.equal(clamp(2, 0, 3), 2);
  assert.equal(lerp(0, 10, 0.5), 5);
  assert.equal(lerp(10, 20, 0), 10);
  assert.equal(roundTo(3.14159, 2), 3.14);
  assert.equal(roundTo(3.14159), 3);
});

test('mapRange：正常映射 + 退化区间', () => {
  assert.equal(mapRange(5, 0, 10, 0, 100), 50);
  assert.equal(mapRange(0, 0, 10, -12, 12), -12);
  assert.equal(mapRange(10, 0, 10, -12, 12), 12);
  assert.equal(mapRange(5, 4, 4, 7, 9), 7); // inMin==inMax → outMin
});

test('easings：端点 0→0、1→1', () => {
  for (const name of Object.keys(easings)) {
    assert.equal(roundTo(easings[name](0), 5), 0, `${name}(0)`);
    assert.equal(roundTo(easings[name](1), 5), 1, `${name}(1)`);
  }
  assert.ok(easings.easeOutCubic(0.5) > 0.5); // 先快后慢
});

test('cx：字符串/数组/对象/假值', () => {
  assert.equal(cx('a', 'b'), 'a b');
  assert.equal(cx('a', false && 'b', null, undefined, 'c'), 'a c');
  assert.equal(cx({ a: true, b: false, c: 1 }), 'a c');
  assert.equal(cx(['a', ['b', { c: true }]]), 'a b c');
  assert.equal(cx(), '');
});

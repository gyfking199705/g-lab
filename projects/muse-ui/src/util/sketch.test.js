import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, roughRectPath, makeSparkles } from './sketch.js';

test('mulberry32：同 seed 同序列、范围 [0,1)', () => {
  const a = mulberry32(7);
  const b = mulberry32(7);
  const s1 = [a(), a(), a()];
  const s2 = [b(), b(), b()];
  assert.deepEqual(s1, s2);
  for (const v of s1) assert.ok(v >= 0 && v < 1);
  const c = mulberry32(8);
  assert.notEqual(c(), s1[0]); // 不同 seed 不同
});

test('roughRectPath：确定性、含 M/L、不同 seed 不同', () => {
  const p1 = roughRectPath(100, 100, { seed: 1 });
  const p2 = roughRectPath(100, 100, { seed: 1 });
  assert.equal(p1, p2); // 同 seed 一致
  assert.ok(p1.startsWith('M'));
  assert.match(p1, /L/);
  assert.notEqual(roughRectPath(100, 100, { seed: 2 }), p1);
});

test('roughRectPath：passes 控制描边遍数（M 的数量 = passes×4 边）', () => {
  const oneP = roughRectPath(100, 100, { seed: 1, passes: 1 });
  const twoP = roughRectPath(100, 100, { seed: 1, passes: 2 });
  assert.equal((oneP.match(/M/g) || []).length, 4);
  assert.equal((twoP.match(/M/g) || []).length, 8);
});

test('makeSparkles：数量、范围、确定性（注入 rng）', () => {
  const sp = makeSparkles(5, mulberry32(3));
  assert.equal(sp.length, 5);
  for (const s of sp) {
    assert.ok(s.x >= 0 && s.x <= 100);
    assert.ok(s.y >= 0 && s.y <= 100);
    assert.ok(s.size > 0);
    assert.ok(s.dur >= 1);
  }
  assert.deepEqual(makeSparkles(5, mulberry32(3)), sp); // 同 seed 一致
});

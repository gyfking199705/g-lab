import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeParticles, stepParticle } from './particles.js';

test('makeParticles：数量、颜色取自色板、速度为数值', () => {
  const ps = makeParticles(10, { rand: () => 0.5, colors: ['#aaa', '#bbb'] });
  assert.equal(ps.length, 10);
  for (const p of ps) {
    assert.ok(['#aaa', '#bbb'].includes(p.color));
    assert.equal(typeof p.vx, 'number');
    assert.equal(typeof p.vy, 'number');
    assert.ok(p.size > 0);
  }
});

test('makeParticles：rand=0.5 朝上（vy<0, vx≈0），确定性', () => {
  const [p] = makeParticles(1, { rand: () => 0.5, speed: 100 });
  assert.ok(p.vy < 0); // 朝上
  assert.ok(Math.abs(p.vx) < 1e-6); // 正上方，水平分量≈0
});

test('stepParticle：位移积分 + 重力加速 + 不可变', () => {
  const p = { x: 0, y: 0, vx: 10, vy: 0, rot: 0, vr: 90 };
  const n = stepParticle(p, 1, 900);
  assert.equal(n.x, 10); // x += vx*dt
  assert.equal(n.y, 0); // y += vy*dt (vy=0)
  assert.equal(n.vy, 900); // vy += g*dt
  assert.equal(n.rot, 90); // rot += vr*dt
  assert.equal(p.vy, 0); // 原对象不变
});

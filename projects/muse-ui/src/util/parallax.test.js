import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parallaxOffset, pointerToNorm } from './parallax.js';

test('parallaxOffset：中心归一化坐标(0,0) → 无偏移', () => {
  const r = parallaxOffset(0, 0, 1, 24);
  assert.equal(r.x, 0);
  assert.equal(r.y, 0);
});

test('parallaxOffset：边缘(1,1) + depth=1 → maxPx', () => {
  const r = parallaxOffset(1, 1, 1, 24);
  assert.equal(r.x, 24);
  assert.equal(r.y, 24);
});

test('parallaxOffset：depth=0 → 始终无偏移', () => {
  const r = parallaxOffset(1, -1, 0, 24);
  assert.equal(r.x + 0, 0); // +0 消除 -0 差异
  assert.equal(r.y + 0, 0);
});

test('parallaxOffset：depth=0.5 → 偏移减半', () => {
  const r = parallaxOffset(1, 0, 0.5, 24);
  assert.equal(r.x, 12);
  assert.equal(r.y, 0);
});

test('parallaxOffset：负 depth → 反方向位移', () => {
  const r = parallaxOffset(1, 0, -1, 24);
  assert.equal(r.x, -24);
  assert.equal(r.y + 0, 0); // +0 消除 -0 差异
});

test('parallaxOffset：归一化坐标越界被夹紧', () => {
  const clamped = parallaxOffset(5, -5, 1, 24);
  const edge = parallaxOffset(1, -1, 1, 24);
  assert.equal(clamped.x, edge.x);
  assert.equal(clamped.y, edge.y);
});

test('pointerToNorm：容器中心映射到(0,0)', () => {
  const r = pointerToNorm(50, 50, 100, 100);
  assert.equal(r.nx, 0);
  assert.equal(r.ny, 0);
});

test('pointerToNorm：左上角映射到(-1,-1)', () => {
  const r = pointerToNorm(0, 0, 100, 100);
  assert.equal(r.nx, -1);
  assert.equal(r.ny, -1);
});

test('pointerToNorm：右下角映射到(1,1)', () => {
  const r = pointerToNorm(100, 100, 100, 100);
  assert.equal(r.nx, 1);
  assert.equal(r.ny, 1);
});

test('pointerToNorm：零宽高兜底返回(0,0)', () => {
  const r = pointerToNorm(50, 50, 0, 0);
  assert.equal(r.nx, 0);
  assert.equal(r.ny, 0);
});

test('pointerToNorm：越界指针被夹紧', () => {
  const over = pointerToNorm(200, 200, 100, 100);
  const edge = pointerToNorm(100, 100, 100, 100);
  assert.equal(over.nx, edge.nx);
  assert.equal(over.ny, edge.ny);
});

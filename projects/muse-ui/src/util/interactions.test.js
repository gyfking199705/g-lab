import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tiltTransform,
  magneticOffset,
  spotlightStyle,
  rippleGeometry,
  countAt,
  formatNumber,
  meshGradient,
  typedSlice,
  typeDone,
  linearGradient,
} from './interactions.js';
import { easings } from './anim.js';

test('typedSlice / typeDone：按时间推进切片', () => {
  assert.equal(typedSlice('hello', 0, 22), '');
  assert.equal(typedSlice('hello', 0.1, 20), 'he'); // floor(2)
  assert.equal(typedSlice('hello', 100, 20), 'hello'); // 不越界
  assert.equal(typedSlice('', 5, 20), '');
  assert.equal(typeDone('hi', 0, 20), false);
  assert.equal(typeDone('hi', 1, 20), true);
});

test('linearGradient：含每个颜色与角度、空兜底', () => {
  const g = linearGradient(['#111111', '#222222'], 45);
  assert.match(g, /linear-gradient\(45deg/);
  assert.match(g, /#111111/);
  assert.match(g, /#222222/);
  assert.match(linearGradient(null), /linear-gradient/);
});

test('tiltTransform：中心无倾斜、四角到极值、越界裁剪', () => {
  const c = tiltTransform(50, 50, 100, 100, 12);
  assert.equal(c.rx, 0);
  assert.equal(c.ry, 0);
  assert.equal(c.glareX, 50);
  assert.equal(c.glareY, 50);
  const tl = tiltTransform(0, 0, 100, 100, 12);
  assert.equal(tl.ry, -12); // 左 → 负 Y 轴旋转
  assert.equal(tl.rx, 12); // 上 → 正 X 轴旋转
  const over = tiltTransform(999, 999, 100, 100, 12);
  assert.equal(over.ry, 12); // 越界裁剪到右下角极值
  assert.equal(over.rx, -12);
});

test('magneticOffset：中心为 0、半径内被吸、半径外失效', () => {
  assert.deepEqual(magneticOffset(0, 0, 100, 0.4), { x: 0, y: 0, active: true });
  const m = magneticOffset(50, 0, 100, 0.4); // dist=50 → factor=0.4*0.5=0.2 → 10
  assert.equal(m.x, 10);
  assert.equal(m.y, 0);
  assert.equal(m.active, true);
  assert.deepEqual(magneticOffset(100, 0, 100, 0.4), { x: 0, y: 0, active: false }); // 在边界外
  assert.deepEqual(magneticOffset(80, 80, 100, 0.4), { x: 0, y: 0, active: false }); // dist>radius
});

test('spotlightStyle：渐变跟随坐标', () => {
  const s = spotlightStyle(10, 20, 300, 'white');
  assert.match(s.background, /circle at 10px 20px/);
  assert.match(s.background, /300px/);
  assert.match(s.background, /white/);
});

test('rippleGeometry：相对坐标 + 覆盖直径', () => {
  const g = rippleGeometry({ left: 0, top: 0, width: 100, height: 100 }, 0, 0);
  assert.equal(g.x, 0);
  assert.equal(g.y, 0);
  assert.equal(g.size, roundOf(Math.hypot(100, 100) * 2)); // 最远角 = 右下
  const mid = rippleGeometry({ left: 10, top: 10, width: 100, height: 100 }, 60, 60);
  assert.equal(mid.x, 50);
  assert.equal(mid.y, 50);
});
function roundOf(v) {
  return Math.round(v * 100) / 100;
}

test('countAt：进度+缓动、越界夹紧', () => {
  assert.equal(countAt(0, 100, 0.5, easings.linear), 50);
  assert.equal(countAt(0, 100, 0, easings.linear), 0);
  assert.equal(countAt(0, 100, 1, easings.linear), 100);
  assert.equal(countAt(0, 100, 2, easings.linear), 100); // progress 夹到 1
  assert.equal(countAt(10, 10, 0.3, easings.linear), 10);
});

test('formatNumber：千分位、负数、小数', () => {
  assert.equal(formatNumber(1234567), '1,234,567');
  assert.equal(formatNumber(1234.5, 2), '1,234.50');
  assert.equal(formatNumber(-1000), '-1,000');
  assert.equal(formatNumber(0), '0');
  assert.equal(formatNumber(999), '999');
});

test('meshGradient：含每个颜色、确定性、默认色兜底', () => {
  const g = meshGradient(['#111111', '#222222'], 0.3);
  assert.match(g, /radial-gradient/);
  assert.match(g, /#111111/);
  assert.match(g, /#222222/);
  assert.equal(meshGradient(['#abcdef'], 0.5), meshGradient(['#abcdef'], 0.5)); // 同输入同输出
  assert.match(meshGradient(null, 0), /radial-gradient/); // 兜底默认色
});

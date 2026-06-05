import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baseAmount, unitPriceBase, displayUnitPrice, compare, unitOf } from './calc.js';

test('baseAmount 规格×件数×单位系数', () => {
  assert.equal(baseAmount({ size: 1.5, unit: 'L', count: 1 }), 1500); // 1.5L → 1500ml
  assert.equal(baseAmount({ size: 500, unit: 'g', count: 6 }), 3000); // 6×500g
  assert.equal(baseAmount({ size: 1, unit: 'kg' }), 1000); // count 默认 1
  assert.ok(Number.isNaN(baseAmount({ size: 0, unit: 'g' })));
  assert.ok(Number.isNaN(baseAmount({ size: 1, unit: '??' })));
});

test('unitPriceBase / displayUnitPrice', () => {
  // 25 元 / 1500ml = 0.016667 元/ml → 元/L = 16.67
  const it = { price: 25, size: 1.5, unit: 'L', count: 1 };
  assert.ok(Math.abs(unitPriceBase(it) - 25 / 1500) < 1e-9);
  assert.ok(Math.abs(displayUnitPrice(it) - (25 / 1500) * 1000) < 1e-6);
  // 重量按 元/100g
  const w = { price: 30, size: 500, unit: 'g', count: 1 }; // 30/500=0.06/g → 6/100g
  assert.ok(Math.abs(displayUnitPrice(w) - 6) < 1e-9);
});

test('compare 找最划算 + 贵多少', () => {
  const items = [
    { id: 'a', name: '小瓶', price: 10, size: 500, unit: 'ml', count: 1 }, // 20 元/L
    { id: 'b', name: '大瓶', price: 25, size: 1.5, unit: 'L', count: 1 }, // 16.67 元/L  ← 最划算
    { id: 'c', name: '套装', price: 50, size: 500, unit: 'ml', count: 6 }, // 16.67 元/L 同
  ];
  const r = compare(items);
  assert.equal(r.group, 'volume');
  assert.equal(r.displayLabel, 'L');
  assert.equal(r.bestId, 'b');
  // 排序后第一项是最划算
  assert.equal(r.rows[0].isBest, true);
  // 小瓶比最划算贵 (20-16.67)/16.67 ≈ 20%
  const a = r.rows.find((x) => x.id === 'a');
  assert.ok(a.pctMore > 18 && a.pctMore < 22);
});

test('compare 跨量纲：主量纲外的项标记不可比', () => {
  const items = [
    { id: 'a', price: 10, size: 500, unit: 'ml', count: 1 },
    { id: 'b', price: 20, size: 1, unit: 'L', count: 1 },
    { id: 'x', price: 5, size: 100, unit: 'g', count: 1 }, // 不同量纲
  ];
  const r = compare(items);
  assert.equal(r.group, 'volume'); // volume 出现 2 次为主
  const x = r.rows.find((it) => it.id === 'x');
  assert.equal(x.comparable, false);
  assert.equal(x.pctMore, null);
});

test('compare 空 / 无效', () => {
  const r = compare([{ id: 'a', price: '', size: '', unit: 'g' }]);
  assert.equal(r.bestId, null);
  assert.equal(r.comparableCount, 0);
});

test('unitOf', () => {
  assert.equal(unitOf('kg').group, 'weight');
  assert.equal(unitOf('zzz'), null);
});

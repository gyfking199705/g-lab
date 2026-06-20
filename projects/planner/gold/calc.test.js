import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rmbPerGram, goldSummary, OZ_TO_GRAM, formatGram, goldValueOf } from './calc.js';

test('rmbPerGram：金价折算人民币/克', () => {
  // 2000 美元/盎司 × 7.2 ÷ 31.1035 ≈ 463.0 元/克
  const v = rmbPerGram(2000, 7.2);
  assert.ok(Math.abs(v - (2000 * 7.2 / OZ_TO_GRAM)) < 1e-9);
  assert.ok(v > 462 && v < 464);
});

test('rmbPerGram：非法输入返回 null', () => {
  assert.equal(rmbPerGram(0, 7.2), null);
  assert.equal(rmbPerGram(2000, 0), null);
  assert.equal(rmbPerGram(NaN, 7.2), null);
});

test('goldSummary：价/涨跌/走势换算齐全', () => {
  const gc = { price: 2010, prevClose: 2000, series: [1980, 1990, 2000, 2010] };
  const s = goldSummary(gc, 7.2);
  assert.ok(s.pricePerGram > 0);
  assert.ok(s.change > 0, '涨');
  assert.ok(Math.abs(s.changePct - ((2010 - 2000) / 2000) * 100) < 1e-6);
  assert.equal(s.series.length, 4);
  assert.equal(s.usdPerOz, 2010);
});

test('goldSummary：无 prevClose 用走势次新值兜底', () => {
  const s = goldSummary({ price: 2010, series: [1990, 2000, 2010] }, 7.2);
  assert.ok(s.change > 0);
  assert.equal(s.prevPerGram, null);
});

test('goldSummary：非法返回 null', () => {
  assert.equal(goldSummary(null, 7.2), null);
  assert.equal(goldSummary({ price: 2000 }, 0), null);
});

test('formatGram：两位小数 / 空值', () => {
  assert.equal(formatGram(null), '—');
  assert.ok(/\d/.test(formatGram(463.2)));
});

test('goldValueOf：克数 × 实时金价 = 计入净资产的金额', () => {
  const v = goldValueOf({ goldGrams: 38 }, { pricePerGram: 565.3, change: 2, changePct: 0.4 });
  assert.equal(v.grams, 38);
  assert.equal(v.price, 565.3);
  assert.equal(v.value, Math.round(38 * 565.3));
});

test('goldValueOf：无持仓或无价 → value 0', () => {
  assert.equal(goldValueOf({ goldGrams: 0 }, { pricePerGram: 565 }).value, 0);
  assert.equal(goldValueOf({ goldGrams: 38 }, null).value, 0);
  assert.equal(goldValueOf(null, null).value, 0);
});

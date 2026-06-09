import { test } from 'node:test';
import assert from 'node:assert/strict';
import { holdingValue, holdingsValue, buildPriceCtx, effectiveHoldings, kindMeta } from './calc.js';

const ctx = buildPriceCtx(
  { pricePerGram: 565.3 },
  { quotes: [{ symbol: 'NVDA', price: 120 }, { symbol: 'AAPL', price: 200 }] }
);

test('buildPriceCtx：金价 + 报价按 symbol 建索引', () => {
  assert.equal(ctx.goldPrice, 565.3);
  assert.equal(ctx.quotes.NVDA.price, 120);
});

test('holdingValue：各类资产估值', () => {
  assert.equal(holdingValue({ kind: 'cash', qty: 50000 }, ctx).value, 50000);
  assert.equal(holdingValue({ kind: 'gold', qty: 38 }, ctx).value, Math.round(38 * 565.3));
  assert.equal(holdingValue({ kind: 'stock', symbol: 'NVDA', qty: 10 }, ctx).value, 1200);
  assert.equal(holdingValue({ kind: 'fund', qty: 1000, nav: 1.85 }, ctx).value, 1850);
  assert.equal(holdingValue({ kind: 'other', qty: 12345 }, ctx).value, 12345);
});

test('holdingValue：缺价 priced=false 且 value 0', () => {
  assert.equal(holdingValue({ kind: 'stock', symbol: 'TSLA', qty: 5 }, ctx).priced, false);
  assert.equal(holdingValue({ kind: 'gold', qty: 10 }, {}).priced, false);
});

test('holdingsValue：汇总 + byKind 分类', () => {
  const r = holdingsValue([
    { kind: 'cash', qty: 50000 },
    { kind: 'gold', qty: 38 },
    { kind: 'stock', symbol: 'NVDA', qty: 10 },
  ], ctx);
  assert.equal(r.total, 50000 + Math.round(38 * 565.3) + 1200);
  assert.equal(r.byKind.cash, 50000);
  assert.equal(r.items.length, 3);
});

test('effectiveHoldings：旧版 goldGrams 自动补成黄金持仓', () => {
  const list = effectiveHoldings({ goldGrams: 38, holdings: [{ kind: 'cash', qty: 1 }] });
  assert.ok(list.some((h) => h.kind === 'gold' && h.qty === 38));
  // 已有黄金持仓时不重复补
  const list2 = effectiveHoldings({ goldGrams: 38, holdings: [{ kind: 'gold', qty: 10 }] });
  assert.equal(list2.filter((h) => h.kind === 'gold').length, 1);
});

test('kindMeta：取类型元信息', () => {
  assert.equal(kindMeta('gold').unit, '克');
  assert.equal(kindMeta('stock').needs, 'symbol');
});

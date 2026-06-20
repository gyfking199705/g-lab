import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buyGrams, dcaStats, dcaProgress, addDaysStr } from './goldDca.js';

test('buyGrams：金额 ÷ 单价', () => {
  assert.ok(Math.abs(buyGrams({ amount: 1000, pricePerGram: 500 }) - 2) < 1e-9);
  assert.equal(buyGrams({ amount: 1000, pricePerGram: 0 }), 0);
});

test('dcaStats：累计克数/均价/浮盈亏', () => {
  const recs = [
    { amount: 1000, pricePerGram: 500 }, // 2g
    { amount: 1000, pricePerGram: 400 }, // 2.5g
  ];
  const s = dcaStats(recs, 480);
  assert.ok(Math.abs(s.totalGrams - 4.5) < 1e-9);
  assert.equal(s.totalCost, 2000);
  assert.ok(Math.abs(s.avgCost - 2000 / 4.5) < 1e-6); // ≈444.4
  assert.ok(Math.abs(s.marketValue - 4.5 * 480) < 1e-6); // 2160
  assert.ok(s.pnl > 0); // 现价480 > 均价444 → 浮盈
  assert.equal(s.belowAvg, false);
});

test('dcaStats：现价低于均价 belowAvg=true，浮亏', () => {
  const s = dcaStats([{ amount: 1000, pricePerGram: 500 }], 450);
  assert.equal(s.belowAvg, true);
  assert.ok(s.pnl < 0);
});

test('dcaStats：空记录安全', () => {
  const s = dcaStats([], 500);
  assert.equal(s.totalGrams, 0);
  assert.equal(s.avgCost, 0);
  assert.equal(s.pnl, 0);
});

test('addDaysStr：跨月加天', () => {
  assert.equal(addDaysStr('2026-06-28', 7), '2026-07-05');
  assert.equal(addDaysStr('', 7), '');
});

test('dcaProgress：进度与下一期', () => {
  const plan = { perAmount: 1000, cadence: 'weekly', count: 10, startDate: '2026-06-01' };
  const recs = [
    { date: '2026-06-01', amount: 1000, pricePerGram: 500 },
    { date: '2026-06-08', amount: 1000, pricePerGram: 490 },
  ];
  const pr = dcaProgress(plan, recs, '2026-06-12');
  assert.equal(pr.done, 2);
  assert.equal(pr.total, 10);
  assert.equal(pr.invested, 2000);
  assert.equal(pr.plannedTotal, 10000);
  assert.equal(pr.investedPct, 20);
  assert.equal(pr.nextDate, '2026-06-15'); // 6-08 + 7
  assert.equal(pr.due, false); // 6-15 > 6-12
});

test('dcaProgress：到期判定 + 无记录用起始日', () => {
  const plan = { perAmount: 500, cadence: 'monthly', count: 0, startDate: '2026-06-01' };
  const pr = dcaProgress(plan, [], '2026-06-10');
  assert.equal(pr.done, 0);
  assert.equal(pr.nextDate, '2026-06-01');
  assert.equal(pr.due, true); // 起始日已过 → 该买
  // count=0 表示不限期数，投资进度为 0
  assert.equal(pr.investedPct, 0);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seriesChangePct, portfolioStats, buildStockAnalysisMessages } from './analysis.js';

test('seriesChangePct 首末涨跌', () => {
  assert.equal(seriesChangePct([100, 110]), 10);
  assert.equal(Math.round(seriesChangePct([100, 90])), -10);
  assert.equal(seriesChangePct([100]), null);
  assert.equal(seriesChangePct(null), null);
});

test('portfolioStats 统计', () => {
  const q = [
    { symbol: 'A', price: 10, changePct: 3 },
    { symbol: 'B', price: 20, changePct: -1 },
    { symbol: 'C', price: 30, changePct: 5 },
    { symbol: 'D', error: '失败' },
  ];
  const s = portfolioStats(q);
  assert.equal(s.count, 3);
  assert.equal(s.gainers, 2);
  assert.equal(s.losers, 1);
  assert.equal(s.top.symbol, 'C');
  assert.equal(s.bottom.symbol, 'B');
  assert.ok(Math.abs(s.avgChangePct - (3 - 1 + 5) / 3) < 0.01);
});

test('portfolioStats 空', () => {
  assert.equal(portfolioStats([]).count, 0);
  assert.equal(portfolioStats([{ error: 'x' }]).count, 0);
});

test('buildStockAnalysisMessages 含个股 + 非投资建议约束', () => {
  const m = buildStockAnalysisMessages([
    { symbol: 'NVDA', price: 120.5, changePct: 2.1, series: [100, 120.5] },
    { symbol: 'BAD', error: 'x' },
  ]);
  assert.match(m.user, /NVDA/);
  assert.match(m.user, /\+2\.10%/);
  assert.match(m.user, /近期走势/);
  assert.doesNotMatch(m.user, /BAD/); // 错误项不计入
  assert.match(m.system, /非投资建议|不要臆造|严禁/);
});

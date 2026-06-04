import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ledgerMonthly, ledgerProjMonthEnd, habitsCompletionSeries, papersDailyDone,
  buildAnalytics, hasBoard,
} from './analytics.js';

test('ledgerMonthly 近 n 月收支', () => {
  const E = [
    { date: '2026-06-04', type: 'expense', amount: 100 },
    { date: '2026-05-10', type: 'expense', amount: 50 },
    { date: '2026-05-12', type: 'income', amount: 9000 },
  ];
  const m = ledgerMonthly(E, 3, '2026-06-15');
  assert.equal(m.length, 3);
  assert.equal(m[2].month, '2026-06');
  assert.equal(m[2].expense, 100);
  assert.equal(m[1].month, '2026-05');
  assert.equal(m[1].expense, 50);
  assert.equal(m[1].income, 9000);
});

test('ledgerProjMonthEnd 按速度外推', () => {
  // 6/10，已花 1000 → 当月 30 天预计 3000
  const E = [{ date: '2026-06-05', type: 'expense', amount: 600 }, { date: '2026-06-10', type: 'expense', amount: 400 }];
  const p = ledgerProjMonthEnd(E, '2026-06-10');
  assert.equal(p, 3000);
});

test('habitsCompletionSeries 每日完成率', () => {
  const habits = [{ id: 'h1', type: 'check' }, { id: 'h2', type: 'check' }];
  const ci = { h1: { '2026-06-04': 1 }, h2: { '2026-06-04': 1, '2026-06-03': 1 } };
  const s = habitsCompletionSeries(habits, ci, 2, '2026-06-04');
  assert.equal(s.length, 2);
  assert.equal(s[0].ratio, 0.5); // 6/3：只有 h2
  assert.equal(s[1].ratio, 1);   // 6/4：两个都完成
});

test('papersDailyDone 累计', () => {
  const items = [
    { status: 'done', doneAt: '2026-06-02T0' },
    { status: 'done', doneAt: '2026-06-04T0' },
    { status: 'reading' },
  ];
  const s = papersDailyDone(items, 3, '2026-06-04'); // 6/2,6/3,6/4
  assert.equal(s[0].cum, 1); // 6/2
  assert.equal(s[1].cum, 1); // 6/3
  assert.equal(s[2].cum, 2); // 6/4
});

test('buildAnalytics finance：注入 get', () => {
  const map = {
    'savings-planner': { forecast: { target: 1000000 }, netWorth: { accounts: [{ id: 'a', type: 'asset', category: '流动' }], snapshots: [
      { date: '2026-04-01', values: { a: 200000 } }, { date: '2026-05-01', values: { a: 300000 } }, { date: '2026-06-01', values: { a: 420000 } },
    ] } },
  };
  const a = buildAnalytics('wealth', (k) => map[k] || null, '2026-06-10');
  assert.ok(a);
  assert.equal(a.title, '财富大盘');
  assert.ok(a.kpis.length >= 4);
  assert.ok(a.charts[0].values.length === 3);
  // 三情景预测带
  assert.equal(a.charts[0].kind, 'fan');
  assert.ok(a.charts[0].band.mid.length > 0);
  assert.ok(a.charts[0].band.upper.length === a.charts[0].band.lower.length);
  assert.match(a.forecast.text, /达成|预测|增长|情景/);
});

test('buildAnalytics 无数据返回 null；hasBoard', () => {
  assert.equal(buildAnalytics('wealth', () => null), null);
  assert.equal(buildAnalytics('stocks', () => ({})), null); // 无专属
  assert.equal(hasBoard('cut'), true);
  assert.equal(hasBoard('stocks'), false);
});

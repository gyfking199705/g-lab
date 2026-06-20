import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ledgerMonthly, ledgerProjMonthEnd, habitsCompletionSeries, papersDailyDone,
  buildAnalytics, hasBoard, todayDigest, weeklyReview,
} from './analytics.js';

test('weeklyReview 最近7天跨模块快照', () => {
  const T = '2026-06-20';
  const data = {
    'habits-planner': { habits: [{ id: 'h1', type: 'check' }], checkins: { h1: { '2026-06-20': 1, '2026-06-19': 1, '2026-06-10': 1 } } }, // 周内 2
    'fitness-planner': { workouts: [{ date: '2026-06-18', entries: [{ sets: [{ reps: 10, weight: 100 }] }] }] }, // 1 次, 容量 1000
    'learning-planner': { sessions: [{ date: '2026-06-20', minutes: 30 }, { date: '2026-06-01', minutes: 99 }] }, // 周内 30
    'schedule-planner': { items: [{ done: true, doneAt: '2026-06-19T08:00' }, { done: true, doneAt: '2026-05-01T08:00' }] }, // 周内 1
    'ledger-planner': { entries: [{ date: '2026-06-18', type: 'income', amount: 1000 }, { date: '2026-06-18', type: 'expense', amount: 300 }, { date: '2026-01-01', type: 'income', amount: 9999 }] }, // 净 700
  };
  const get = (k) => (k in data ? data[k] : null);
  const r = weeklyReview(get, T);
  assert.equal(r.from, '2026-06-14');
  assert.equal(r.to, '2026-06-20');
  assert.equal(r.rows.find((x) => x.id === 'habits').value, 2);
  assert.equal(r.rows.find((x) => x.id === 'fitness').value, 1);
  assert.equal(r.rows.find((x) => x.id === 'learning').value, '30 分钟');
  assert.equal(r.rows.find((x) => x.id === 'schedule').value, 1);
  assert.ok(String(r.rows.find((x) => x.id === 'ledger').value).includes('700'));
});

test('weeklyReview 空数据 → 无行', () => {
  const r = weeklyReview(() => null, '2026-06-20');
  assert.equal(r.rows.length, 0);
});

test('todayDigest 跨模块今日聚合', () => {
  const T = '2026-06-20';
  const data = {
    'habits-planner': { habits: [{ id: 'h1', type: 'check' }], checkins: { h1: { '2026-06-20': 1 } } }, // 1/1
    'schedule-planner': {
      items: [
        { id: 's1', date: '2026-06-20', done: true },
        { id: 's2', date: '2026-06-20', done: false },
        { id: 's3', date: '2026-01-01', done: false }, // 逾期
      ],
    },
  };
  const get = (k) => (k in data ? data[k] : null);
  const d = todayDigest(get, T);
  assert.equal(d.rows.length, 2);
  assert.equal(d.done, 2); // 习惯1 + 日程1
  assert.equal(d.due, 4); // 习惯1 + 日程(2+逾期1)
  assert.equal(d.remaining, 2);
  assert.equal(d.pct, 50);
  assert.equal(d.rows.find((r) => r.id === 'schedule').overdue, 1);
});

test('todayDigest 空数据', () => {
  assert.deepEqual(todayDigest(() => null, '2026-06-20'), { rows: [], due: 0, done: 0, remaining: 0, pct: 0 });
});

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

test('buildAnalytics gold：读 gold-cache 产出金价大盘', () => {
  const map = { 'gold-cache': { pricePerGram: 565.3, change: 2.1, changePct: 0.37, series: [560, 562, 563, 565.3], usdPerOz: 2450, usdCny: 7.18, fxFallback: false } };
  const a = buildAnalytics('gold', (k) => map[k] || null);
  assert.ok(a);
  assert.equal(a.title, '金价大盘');
  assert.ok(a.kpis.length >= 4);
  assert.equal(a.charts[0].kind, 'line');
  assert.ok(a.charts[0].values.length === 4);
  assert.equal(hasBoard('gold'), true);
});

test('gold 无缓存返回 null', () => {
  assert.equal(buildAnalytics('gold', () => null), null);
});

test('财富大盘把持仓（含金价折算）作为子项纳入净资产', () => {
  const map = {
    'savings-planner': { forecast: { target: 1000000 }, goldGrams: 38, netWorth: { accounts: [{ id: 'a', type: 'asset', category: '流动' }], snapshots: [
      { date: '2026-05-01', values: { a: 300000 } }, { date: '2026-06-01', values: { a: 420000 } },
    ] } },
    'gold-cache': { pricePerGram: 565.3, change: 2.1, changePct: 0.37, series: [560, 565.3], usdPerOz: 2450, usdCny: 7.18 },
  };
  const a = buildAnalytics('wealth', (k) => map[k] || null, '2026-06-10');
  assert.ok(a.kpis.some((k) => /持仓/.test(k.label)), '财富大盘应含持仓 KPI');
  // 净资产 = 420000 + 38×565.3 ≈ 441481
  assert.ok(Math.abs(a.charts[0].values[a.charts[0].values.length - 1] - (420000 + Math.round(38 * 565.3))) < 2);
});

test('buildAnalytics 无数据返回 null；hasBoard', () => {
  assert.equal(buildAnalytics('wealth', () => null), null);
  assert.equal(buildAnalytics('stocks', () => null), null); // 无数据
  assert.equal(buildAnalytics('personal', () => ({})), null); // 无专属大盘
  assert.equal(hasBoard('cut'), true);
  assert.equal(hasBoard('stocks'), true);
  assert.equal(hasBoard('personal'), false);
});

import { boardToText, boardToSVG } from './analytics.js';

test('boardToText 摘要含标题/KPI/预测', () => {
  const a = { icon: '💰', title: '财富大盘', hero: { value: '¥42万', caption: '净资产' }, kpis: [{ label: '净资产', value: '¥42万' }], forecast: { text: '🔮 约 3 年达成' }, insights: ['保持储蓄'] };
  const t = boardToText(a, '2026-06-10');
  assert.match(t, /财富大盘/);
  assert.match(t, /净资产：¥42万/);
  assert.match(t, /约 3 年达成/);
  assert.match(t, /成长规划/);
});

test('boardToSVG 生成合法 svg 字符串', () => {
  const a = { icon: '📉', title: '减脂大盘', hero: { value: '82.9', unit: 'kg', caption: '85→70' }, kpis: [{ label: '趋势', value: '82.9kg', tone: 'good' }, { label: '本周', value: '-0.4kg' }], forecast: { text: '🔮 预计 9/30 达成' } };
  const svg = boardToSVG(a, '2026-06-10');
  assert.match(svg, /^<svg /);
  assert.match(svg, /<\/svg>$/);
  assert.match(svg, /减脂大盘/);
  assert.ok(svg.includes('82.9'));
});

import { scheduleDailyDone, goalsCumulativeDone } from './analytics.js';

test('scheduleDailyDone 每日完成数', () => {
  const items = [
    { done: true, doneAt: '2026-06-10T09:00' },
    { done: true, doneAt: '2026-06-10T10:00' },
    { done: true, doneAt: '2026-06-09T10:00' },
    { done: false },
  ];
  const s = scheduleDailyDone(items, 2, '2026-06-10');
  assert.equal(s.length, 2);
  assert.equal(s[0].done, 1); // 6/9
  assert.equal(s[1].done, 2); // 6/10
});

test('goalsCumulativeDone 累计完成子任务', () => {
  const goals = [{ subtasks: [
    { done: true, doneAt: '2026-06-08T0' },
    { done: true, doneAt: '2026-06-10T0' },
    { done: false },
  ] }];
  const c = goalsCumulativeDone(goals, 3, '2026-06-10'); // 6/8,6/9,6/10
  assert.equal(c[0].cum, 1); // 6/8
  assert.equal(c[2].cum, 2); // 6/10
});

test('buildAnalytics schedule / stocks 有数据出板', () => {
  const M = {
    'schedule-planner': { items: [{ id: 'a', date: '2026-06-10', done: true, doneAt: '2026-06-10T0' }] },
    'stocks-watch': { symbols: ['NVDA', 'AAPL'] },
    'stocks-watch-cache': { quotes: [{ symbol: 'NVDA', price: 120, changePct: 2, series: [110, 120] }, { symbol: 'AAPL', price: 200, changePct: -1, series: [205, 200] }] },
  };
  const sb = buildAnalytics('schedule', (k) => M[k] || null, '2026-06-10');
  assert.equal(sb.title, '日程大盘');
  assert.ok(sb.charts.length >= 1);
  const st = buildAnalytics('stocks', (k) => M[k] || null, '2026-06-10');
  assert.equal(st.title, '股市大盘');
  assert.ok(st.kpis.length >= 3);
  assert.equal(hasBoard('stocks'), true);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDemoData, seedMissing, hasModuleContent } from './seed.js';
import { summary as cutSummary } from '../cut/calc.js';
import { financeForecast } from '../savings/calc.js';
import { buildAnalytics } from './analytics.js';

const today = '2026-06-10';
const D = buildDemoData(today);
const get = (k) => D[k] || null;

test('示例数据含全部模块键', () => {
  for (const k of ['cut-planner', 'habits-planner', 'goals-planner', 'schedule-planner', 'ledger-planner', 'savings-planner', 'fitness-planner', 'learning-planner', 'project-planner', 'papers-planner', 'stocks-watch']) {
    assert.ok(D[k], `缺 ${k}`);
  }
});

test('减脂：从 85 起、趋势下降、有进度', () => {
  const c = D['cut-planner'];
  assert.equal(c.profile.startWeight, 85);
  assert.equal(c.logs[0].weight, 85);
  const s = cutSummary(c.profile, c.logs, today);
  assert.ok(s.currentTrend < 85 && s.currentTrend > 78);
  assert.ok(s.lost > 0);
  assert.ok(s.progressPct > 0);
});

test('财富：净资产快照可算趋势 + 目标', () => {
  const f = financeForecast(D['savings-planner']);
  assert.ok(f.hasHistory);
  assert.ok(f.latest > 0);
  assert.equal(f.target, 5000000);
});

test('大盘可由示例数据生成（财富/减脂/记账/股市）', () => {
  for (const id of ['wealth', 'cut', 'ledger', 'habits', 'goals', 'schedule', 'stocks', 'learning', 'fitness', 'project', 'papers']) {
    const a = buildAnalytics(id, get, today, { days: 30 });
    assert.ok(a, `${id} 大盘应有数据`);
    assert.ok(a.charts.length >= 1, `${id} 应有图表`);
  }
});

test('财富大盘出现被动>主动交叉图（有工资+净资产）', () => {
  const a = buildAnalytics('wealth', get, today);
  assert.ok(a.charts.some((c) => c.kind === 'cross'));
});

// 内存版 localStorage（供 seedMissing 注入）
function memStore(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), _m: m };
}

test('seedMissing：空 store → 填充全部模块', () => {
  const s = memStore();
  const filled = seedMissing(s);
  assert.ok(filled.includes('cut-planner') && filled.includes('ledger-planner'));
  assert.ok(s._m.has('stocks-watch-cache'), '填了 stocks-watch 应附带行情缓存');
});

test('seedMissing：已有数据的模块不被覆盖，只补空白', () => {
  const myLedger = JSON.stringify({ v: 1, budget: 999, entries: [{ id: 'mine', date: today, type: 'expense', amount: 42, category: '我的' }] });
  const s = memStore({ 'ledger-planner': myLedger });
  const filled = seedMissing(s);
  assert.ok(!filled.includes('ledger-planner'), '已有记账数据不应被填充');
  assert.equal(s._m.get('ledger-planner'), myLedger, '已有数据原样保留');
  assert.ok(filled.includes('habits-planner'), '空白模块仍被填充');
});

test('seedMissing：全部已有数据 → 不动任何内容', () => {
  const init = {};
  const D2 = buildDemoData(today);
  for (const k of Object.keys(D2)) init[k] = JSON.stringify(D2[k]);
  const s = memStore(init);
  const filled = seedMissing(s);
  assert.equal(filled.length, 0);
});

test('hasModuleContent：空结构判为无内容、有集合判为有内容', () => {
  assert.equal(hasModuleContent('goals-planner', { v: 1, goals: [] }), false);
  assert.equal(hasModuleContent('goals-planner', { v: 1, goals: [{ id: 'g' }] }), true);
  assert.equal(hasModuleContent('cut-planner', { profile: { startWeight: 80 }, logs: [] }), true);
  assert.equal(hasModuleContent('savings-planner', { netWorth: { snapshots: [], accounts: [] } }), false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDemoData } from './seed.js';
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

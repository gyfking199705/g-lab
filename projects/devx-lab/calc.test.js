/**
 * devx-lab 纯逻辑单测： node --test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterPractices,
  sortPractices,
  roi,
  categoryCounts,
  summaryStats,
  classifyDora,
} from './calc.js';
import { PRACTICES, CATEGORIES } from './data.js';

test('数据自洽：每条范式的类别都在 CATEGORIES 内，评分在 1..5', () => {
  const catIds = new Set(CATEGORIES.map((c) => c.id));
  assert.ok(PRACTICES.length >= 12, '范式数量应足够丰富');
  for (const p of PRACTICES) {
    assert.ok(catIds.has(p.category), `未知类别: ${p.category}`);
    assert.ok(Array.isArray(p.frameworks) && p.frameworks.length > 0, `${p.id} 缺框架`);
    for (const s of [p.impact, p.effort, p.adoption]) {
      assert.ok(s >= 1 && s <= 5, `${p.id} 评分越界`);
    }
    assert.ok(p.id && p.title && p.summary, `${p.id} 字段缺失`);
  }
  // id 唯一
  assert.equal(new Set(PRACTICES.map((p) => p.id)).size, PRACTICES.length);
});

test('filterPractices: 关键词 / 类别 / 框架', () => {
  const byCat = filterPractices(PRACTICES, { category: 'ai' });
  assert.ok(byCat.length > 0 && byCat.every((p) => p.category === 'ai'));

  const byFw = filterPractices(PRACTICES, { framework: 'dora' });
  assert.ok(byFw.every((p) => p.frameworks.includes('dora')));

  const byQ = filterPractices(PRACTICES, { q: 'CI/CD' });
  assert.ok(byQ.some((p) => p.id === 'cicd'));

  // 'all' 与空都表示不过滤
  assert.equal(filterPractices(PRACTICES, { category: 'all' }).length, PRACTICES.length);
  assert.equal(filterPractices(PRACTICES, {}).length, PRACTICES.length);

  // 组合筛选
  const combo = filterPractices(PRACTICES, { category: 'cd', framework: 'dora' });
  assert.ok(combo.every((p) => p.category === 'cd' && p.frameworks.includes('dora')));
});

test('filterPractices: 搜索大小写不敏感、空列表安全', () => {
  const lower = filterPractices(PRACTICES, { q: 'dora' });
  const upper = filterPractices(PRACTICES, { q: 'DORA' });
  assert.equal(lower.length, upper.length);
  assert.deepEqual(filterPractices(null, { q: 'x' }), []);
});

test('sortPractices: 各排序键单调正确', () => {
  const byImpact = sortPractices(PRACTICES, 'impact');
  for (let i = 1; i < byImpact.length; i++) {
    assert.ok(byImpact[i - 1].impact >= byImpact[i].impact);
  }
  const byRoi = sortPractices(PRACTICES, 'roi');
  for (let i = 1; i < byRoi.length; i++) {
    assert.ok(roi(byRoi[i - 1]) >= roi(byRoi[i]) - 1e-9);
  }
  // 不修改原数组
  const before = PRACTICES.map((p) => p.id);
  sortPractices(PRACTICES, 'title');
  assert.deepEqual(PRACTICES.map((p) => p.id), before);
});

test('roi: 影响/成本，effort 兜底避免除零', () => {
  assert.equal(roi({ impact: 4, effort: 2 }), 2);
  assert.equal(roi({ impact: 5, effort: 0 }), 5); // 兜底为 1
  assert.equal(roi({}), 0);
});

test('categoryCounts: 与 CATEGORIES 同序且总数守恒', () => {
  const counts = categoryCounts(PRACTICES);
  assert.equal(counts.length, CATEGORIES.length);
  assert.equal(
    counts.reduce((s, c) => s + c.count, 0),
    PRACTICES.length,
  );
  assert.equal(counts[0].id, CATEGORIES[0].id);
});

test('summaryStats: 计数与均值', () => {
  const s = summaryStats(PRACTICES);
  assert.equal(s.total, PRACTICES.length);
  assert.ok(s.avgImpact >= 1 && s.avgImpact <= 5);
  assert.ok(s.quickWins >= 0 && s.quickWins <= PRACTICES.length);
  assert.deepEqual(summaryStats([]), { total: 0, avgImpact: 0, avgAdoption: 0, quickWins: 0 });
});

test('classifyDora: 全 Elite / 全 Low / 缺项按最差档', () => {
  const elite = classifyDora({ deploy: 0, lead: 0, cfr: 0, mttr: 0 });
  assert.equal(elite.level.name, 'Elite');
  assert.equal(elite.score, 100);
  assert.equal(elite.index, 0);

  const low = classifyDora({ deploy: 3, lead: 3, cfr: 3, mttr: 3 });
  assert.equal(low.level.name, 'Low');
  assert.equal(low.score, 25);

  // 缺项 → 当作最差档 3
  const missing = classifyDora({ deploy: 0 });
  assert.ok(missing.index > 0, '缺项应拉低评级');
  assert.equal(missing.perMetric.length, 4);

  // 非法输入夹到最差档
  const bad = classifyDora({ deploy: -5, lead: 99, cfr: 'x', mttr: 1 });
  assert.equal(bad.perMetric.find((m) => m.key === 'deploy').index, 0);
  assert.equal(bad.perMetric.find((m) => m.key === 'lead').index, 3);
  assert.equal(bad.perMetric.find((m) => m.key === 'cfr').index, 3);
});

test('classifyDora: 混合档位取均值四舍五入', () => {
  // 均值 (0+1+1+2)/4 = 1 → High
  const r = classifyDora({ deploy: 0, lead: 1, cfr: 1, mttr: 2 });
  assert.equal(r.index, 1);
  assert.equal(r.level.name, 'High');
});

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
  statusOf,
  adoptionStats,
  doraMarkdown,
  frameworkCoverage,
  buildExport,
  parseImport,
  prescribe,
  topoOrder,
  categoryRadar,
  teamReportMarkdown,
} from './calc.js';
import { PRACTICES, CATEGORIES, FRAMEWORKS, ANTIPATTERNS } from './data.js';

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

test('ANTIPATTERNS 自洽：id 唯一、解药 id 均为合法范式、字段齐全', () => {
  const pIds = new Set(PRACTICES.map((p) => p.id));
  assert.ok(ANTIPATTERNS.length >= 6, '反模式应足够丰富');
  assert.equal(new Set(ANTIPATTERNS.map((a) => a.id)).size, ANTIPATTERNS.length);
  for (const a of ANTIPATTERNS) {
    assert.ok(a.id && a.name && a.symptom && a.why, `${a.id} 字段缺失`);
    assert.ok(Array.isArray(a.antidotes) && a.antidotes.length > 0, `${a.id} 缺解药`);
    for (const id of a.antidotes) assert.ok(pIds.has(id), `${a.id} 的解药 ${id} 不是合法范式`);
    assert.ok(a.source && a.source.url, `${a.id} 缺出处`);
  }
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

test('statusOf: 缺省与非法归为 todo', () => {
  assert.equal(statusOf({}, 'x'), 'todo');
  assert.equal(statusOf({ x: 'doing' }, 'x'), 'doing');
  assert.equal(statusOf({ x: 'bogus' }, 'x'), 'todo');
});

test('adoptionStats: 计数、总数守恒与 done 占比', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const s = adoptionStats(list, { a: 'done', b: 'doing', c: 'done' }); // d 缺省=todo
  assert.equal(s.total, 4);
  assert.equal(s.done, 2);
  assert.equal(s.doing, 1);
  assert.equal(s.todo, 1);
  assert.equal(s.todo + s.doing + s.done, s.total);
  assert.equal(s.percent, 50);
  assert.deepEqual(adoptionStats([], {}), { todo: 0, doing: 0, done: 0, total: 0, percent: 0 });
});

test('frameworkCoverage: 与 FRAMEWORKS 同序，统计对齐与落地数', () => {
  const cov = frameworkCoverage(PRACTICES, {});
  assert.equal(cov.length, FRAMEWORKS.length);
  assert.equal(cov[0].id, FRAMEWORKS[0].id);
  for (const c of cov) {
    assert.ok(c.total > 0, `框架 ${c.id} 应至少有一条范式对齐`);
    assert.equal(c.done, 0); // 无状态时已落地为 0
    assert.equal(c.percent, 0);
  }
  // 标记某条 dora 范式为 done → dora 覆盖度 done 增加
  const doraP = PRACTICES.find((p) => p.frameworks.includes('dora'));
  const cov2 = frameworkCoverage(PRACTICES, { [doraP.id]: 'done' });
  const dora = cov2.find((c) => c.id === 'dora');
  assert.equal(dora.done, 1);
  assert.ok(dora.percent > 0);
});

test('buildExport / parseImport: 往返一致', () => {
  const snap = buildExport({ favs: ['a', 'b'], statuses: { a: 'done' }, bands: { deploy: 0 } });
  assert.equal(snap.app, 'devx-lab');
  assert.equal(snap.version, 1);
  assert.ok(snap.exportedAt);
  const parsed = parseImport(JSON.stringify(snap));
  assert.deepEqual(parsed, { favs: ['a', 'b'], statuses: { a: 'done' }, bands: { deploy: 0 } });
});

test('parseImport: 拒绝非法/异源，字段降级', () => {
  assert.throws(() => parseImport('not json'), /JSON/);
  assert.throws(() => parseImport('{"app":"other"}'), /devx-lab/);
  // 字段类型不符 → 安全降级
  const p = parseImport('{"app":"devx-lab","favs":"x","statuses":[1],"bands":null}');
  assert.deepEqual(p, { favs: [], statuses: {}, bands: {} });
  // favs 内非字符串被过滤
  assert.deepEqual(parseImport('{"app":"devx-lab","favs":["ok",1,null]}').favs, ['ok']);
});

test('prescribe: 弱项出处方、已落地剔除、全 Elite 无处方', () => {
  // 全 Low → 四项都弱，每项都应有推荐
  const r = prescribe({ deploy: 3, lead: 3, cfr: 3, mttr: 3 }, PRACTICES, {});
  assert.equal(r.hasWeak, true);
  assert.equal(r.allElite, false);
  assert.equal(r.items.length, 4);
  const SIG = { deploy: '部署频率', lead: '变更前置时间', cfr: '变更失败率', mttr: '故障恢复时间' };
  for (const it of r.items) {
    assert.ok(it.practices.length > 0, `${it.name} 应有推荐范式`);
    // 每条推荐都应在 signals 里命中该指标
    assert.ok(it.practices.every((p) => p.signals.includes(SIG[it.key])));
  }
  // 全 Elite → 无处方
  const elite = prescribe({ deploy: 0, lead: 0, cfr: 0, mttr: 0 }, PRACTICES, {});
  assert.equal(elite.hasWeak, false);
  assert.equal(elite.allElite, true);
  assert.equal(elite.items.length, 0);

  // Medium 才出处方；High(1) 不出
  const onlyCfr = prescribe({ deploy: 0, lead: 0, cfr: 2, mttr: 1 }, PRACTICES, {});
  assert.equal(onlyCfr.items.length, 1);
  assert.equal(onlyCfr.items[0].key, 'cfr');

  // 已落地的范式从推荐中剔除
  const weak = prescribe({ deploy: 3, lead: 3, cfr: 3, mttr: 3 }, PRACTICES, {});
  const someRec = weak.items[0].practices[0].id;
  const after = prescribe({ deploy: 3, lead: 3, cfr: 3, mttr: 3 }, PRACTICES, { [someRec]: 'done' });
  assert.ok(!after.items[0].practices.some((p) => p.id === someRec));
});

test('topoOrder: 前置先于依赖、无环、波内按性价比、缺依赖容错', () => {
  const { waves, hasCycle } = topoOrder(PRACTICES);
  assert.equal(hasCycle, false);
  // 所有节点都被排入
  assert.equal(waves.flat().length, PRACTICES.length);
  // 计算每个 id 所在波次，验证 requires 都排在更早或同前的波之前
  const waveOf = new Map();
  waves.forEach((w, i) => w.forEach((p) => waveOf.set(p.id, i)));
  for (const p of PRACTICES) {
    for (const r of p.requires || []) {
      if (waveOf.has(r)) assert.ok(waveOf.get(r) < waveOf.get(p.id), `${r} 应早于 ${p.id}`);
    }
  }
  // cicd 是多者前置，应在第 0 波
  assert.equal(waveOf.get('cicd'), 0);
  // tbd 依赖 cicd，应晚于 cicd
  assert.ok(waveOf.get('tbd') > waveOf.get('cicd'));

  // 自定义小图：a←b←c 链 + 缺失依赖容错
  const mini = [
    { id: 'a', impact: 5, effort: 1, requires: [] },
    { id: 'b', impact: 4, effort: 1, requires: ['a'] },
    { id: 'c', impact: 3, effort: 1, requires: ['b', 'ghost'] }, // ghost 不在集合，忽略
  ];
  const r2 = topoOrder(mini);
  assert.deepEqual(r2.waves.map((w) => w.map((p) => p.id)), [['a'], ['b'], ['c']]);
  assert.equal(r2.hasCycle, false);

  // 环检测兜底
  const cyc = topoOrder([
    { id: 'x', impact: 1, effort: 1, requires: ['y'] },
    { id: 'y', impact: 1, effort: 1, requires: ['x'] },
  ]);
  assert.equal(cyc.hasCycle, true);
  assert.equal(cyc.waves.flat().length, 2);
});

test('categoryRadar: 与 CATEGORIES 同序、占比正确、总数守恒', () => {
  const r = categoryRadar(PRACTICES, {});
  assert.equal(r.length, CATEGORIES.length);
  assert.equal(r[0].id, CATEGORIES[0].id);
  assert.equal(r.reduce((s, c) => s + c.total, 0), PRACTICES.length);
  for (const c of r) {
    assert.equal(c.donePct, 0); // 无状态
    assert.ok(c.activePct >= 0 && c.activePct <= 100);
    assert.ok(c.icon && c.name);
  }
  // 把某 ai 范式标 done → ai 类 donePct>0 且 >= 其它为 0 的类
  const aiP = PRACTICES.find((p) => p.category === 'ai');
  const r2 = categoryRadar(PRACTICES, { [aiP.id]: 'done' });
  const ai = r2.find((c) => c.id === 'ai');
  assert.ok(ai.done === 1 && ai.donePct > 0);
  // 进行中计入 activePct 但不计 donePct
  const r3 = categoryRadar(PRACTICES, { [aiP.id]: 'doing' });
  const ai3 = r3.find((c) => c.id === 'ai');
  assert.equal(ai3.done, 0);
  assert.ok(ai3.activePct > 0);
});

test('teamReportMarkdown: 含五节标题与评级', () => {
  const md = teamReportMarkdown({ bands: { deploy: 0, lead: 0, cfr: 3, mttr: 2 }, statuses: { cicd: 'done' } });
  assert.match(md, /# 团队研发提效报告/);
  assert.match(md, /## 一、DORA 自评/);
  assert.match(md, /## 二、范式采纳总览/);
  assert.match(md, /## 三、能力画像/);
  assert.match(md, /## 四、框架覆盖度/);
  assert.match(md, /## 五、优先处方/); // 有弱项
  // 全 Elite 无第五节
  const elite = teamReportMarkdown({ bands: { deploy: 0, lead: 0, cfr: 0, mttr: 0 } });
  assert.doesNotMatch(elite, /## 五、优先处方/);
});

test('doraMarkdown: 含评级、四指标行与口径说明', () => {
  const md = doraMarkdown({ deploy: 0, lead: 0, cfr: 0, mttr: 0 });
  assert.match(md, /Elite/);
  assert.match(md, /100\/100/);
  // 四个指标各一行 + 表头
  assert.equal((md.match(/\n\| /g) || []).length >= 4, true);
  // 未评项标注按最弱档计入
  assert.match(doraMarkdown({ deploy: 0 }), /未评（按最弱档计入）/);
});

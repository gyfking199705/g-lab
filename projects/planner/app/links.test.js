import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LINK_SOURCES, LINK_OPTIONS, getLinkSource, computeLink, resolveGoalsLinks } from './links.js';

// 用 Map 注入各模块数据（与 analytics 测试同款）
function makeGet(map) {
  return (k) => (k in map ? map[k] : null);
}

const TODAY = '2026-06-20';

const DATA = {
  'fitness-planner': {
    workouts: [
      { date: '2026-06-18', entries: [{ sets: [{ reps: 10, weight: 100 }, { reps: 10, weight: 100 }] }] }, // vol 2000
      { date: '2026-06-19', entries: [{ sets: [{ reps: 5, weight: 60 }] }] }, // vol 300
    ],
  },
  'learning-planner': {
    plans: [
      { modules: [{ lessons: [{ status: 'mastered' }, { status: 'learning' }, { status: 'mastered' }] }] },
    ],
  },
  'papers-planner': {
    items: [{ status: 'done' }, { status: 'reading' }, { status: 'done' }, { status: 'toread' }],
  },
  'aimap-planner': { /* 由 overallCounts 解析；见下方单独断言用真实结构 */ },
  'ledger-planner': {
    entries: [
      { type: 'income', amount: 10000, date: '2026-06-01' },
      { type: 'expense', amount: 3000, date: '2026-06-05' },
    ],
  },
  'cut-planner': {
    logs: [
      { date: '2026-06-15', weight: 80 },
      { date: '2026-06-16', weight: 79.5 },
      { date: '2026-06-17', weight: 79.6 },
    ],
  },
};

test('目录与查找', () => {
  assert.ok(LINK_SOURCES.length >= 6);
  assert.equal(LINK_OPTIONS.length, LINK_SOURCES.length);
  assert.ok(LINK_OPTIONS.every((o) => o.id && o.label && !('compute' in o)));
  assert.equal(getLinkSource('fitness.workouts').unit, '次');
  assert.equal(getLinkSource('不存在'), null);
});

test('fitness：次数 / 容量 / 连续周', () => {
  const get = makeGet(DATA);
  assert.equal(computeLink('fitness.workouts', get, TODAY), 2);
  assert.equal(computeLink('fitness.volume', get, TODAY), 2300);
  assert.equal(typeof computeLink('fitness.weekStreak', get, TODAY), 'number');
});

test('learning：已掌握知识点', () => {
  assert.equal(computeLink('learning.mastered', makeGet(DATA), TODAY), 2);
});

test('papers：已读篇数', () => {
  assert.equal(computeLink('papers.read', makeGet(DATA), TODAY), 2);
});

test('ledger：累计结余', () => {
  assert.equal(computeLink('ledger.balance', makeGet(DATA), TODAY), 7000);
});

test('cut：当前趋势体重为数值', () => {
  const v = computeLink('cut.weight', makeGet(DATA), TODAY);
  assert.ok(typeof v === 'number' && v > 78 && v < 81);
});

test('无数据 / 无效 id / 无 get → null', () => {
  const empty = makeGet({});
  assert.equal(computeLink('fitness.workouts', empty, TODAY), null);
  assert.equal(computeLink('learning.mastered', empty, TODAY), null);
  assert.equal(computeLink('papers.read', empty, TODAY), null);
  assert.equal(computeLink('ledger.balance', empty, TODAY), null);
  assert.equal(computeLink('不存在', makeGet(DATA), TODAY), null);
  assert.equal(computeLink('fitness.workouts', null, TODAY), null);
});

test('resolveGoalsLinks：填充 current + 默认单位，不改未链接目标', () => {
  const get = makeGet(DATA);
  const goals = [
    { id: 'g1', title: '本月读论文', metric: { current: 0, target: 10, unit: '', link: 'papers.read' } },
    { id: 'g2', title: '手动目标', metric: { current: 3, target: 5, unit: '本' } },
    { id: 'g3', title: '无 metric' },
    { id: 'g4', title: '链接但无数据', metric: { current: 0, target: 9, unit: '', link: 'cut.weight' } },
  ];
  const out = resolveGoalsLinks(goals, get, TODAY);
  assert.equal(out[0].metric.current, 2); // papers.read
  assert.equal(out[0].metric.unit, '篇'); // 默认单位回填
  assert.deepEqual(out[1], goals[1]); // 手动目标原样
  assert.equal(out[2], goals[2]); // 无 metric 原样
  assert.equal(typeof out[3].metric.current, 'number'); // cut 有数据
  // 原对象不被修改
  assert.equal(goals[0].metric.current, 0);
});

test('resolveGoalsLinks：链接无数据时保留原 current', () => {
  const out = resolveGoalsLinks(
    [{ id: 'x', metric: { current: 42, target: 100, unit: '次', link: 'fitness.workouts' } }],
    makeGet({}),
    TODAY
  );
  assert.equal(out[0].metric.current, 42);
});

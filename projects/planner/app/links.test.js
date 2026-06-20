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
    sessions: [{ minutes: 30 }, { minutes: 45 }], // 75
  },
  'project-planner': { tasks: [{ status: 'done' }, { status: 'doing' }, { status: 'done' }] }, // done 2
  'schedule-planner': {
    items: [
      { done: true, date: '2026-06-10', goalId: 'G1' }, // 关联 G1，已完成
      { done: false, date: '2026-06-20', goalId: 'G1' }, // 关联 G1，未完成
      { done: true, date: '2026-06-19' }, // 无关联
    ],
  }, // 全局 done=2；G1 关联完成=1
  'habits-planner': {
    habits: [
      { id: 'h1', type: 'check', goalId: 'G1' }, // 关联 G1，2 个打卡日
      { id: 'h2', type: 'check', goalId: 'G1' }, // 关联 G1，1 个打卡日
    ],
    checkins: { h1: { '2026-06-20': 1, '2026-06-19': 1 }, h2: { '2026-06-18': 1 } },
  }, // 全局最长连击=2（h1）；G1 关联习惯累计打卡=3
  'savings-planner': {
    netWorth: {
      accounts: [{ id: 'cash', type: 'asset' }, { id: 'debt', type: 'liability' }],
      snapshots: [
        { date: '2026-05', values: { cash: 1000, debt: 500 } },
        { date: '2026-06', values: { cash: 1500, debt: 400 } }, // net 1100
      ],
    },
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

test('project：已完成任务数', () => {
  assert.equal(computeLink('project.tasksDone', makeGet(DATA), TODAY), 2);
});

test('schedule：累计完成日程', () => {
  assert.equal(computeLink('schedule.done', makeGet(DATA), TODAY), 2);
});

test('habits：最长连续打卡', () => {
  assert.equal(computeLink('habits.bestStreak', makeGet(DATA), TODAY), 2);
});

test('learning：累计学习时长', () => {
  assert.equal(computeLink('learning.studyMin', makeGet(DATA), TODAY), 75);
});

test('savings：净资产', () => {
  assert.equal(computeLink('savings.networth', makeGet(DATA), TODAY), 1100);
});

test('goal.scheduleDone（scoped）：只统计挂到该目标的已完成日程', () => {
  const get = makeGet(DATA);
  assert.equal(computeLink('goal.scheduleDone', get, TODAY, { goalId: 'G1' }), 1);
  assert.equal(computeLink('goal.scheduleDone', get, TODAY, { goalId: '不存在' }), null); // 没关联项
  assert.equal(computeLink('goal.scheduleDone', get, TODAY), null); // 无 ctx
  assert.equal(LINK_OPTIONS.find((o) => o.id === 'goal.scheduleDone').scoped, true);
});

test('goal.habitsChecks（scoped）：只统计关联该目标习惯的累计打卡', () => {
  const get = makeGet(DATA);
  assert.equal(computeLink('goal.habitsChecks', get, TODAY, { goalId: 'G1' }), 3);
  assert.equal(computeLink('goal.habitsChecks', get, TODAY, { goalId: '无' }), null);
  assert.equal(computeLink('goal.habitsChecks', get, TODAY), null);
});

test('resolveGoalsLinks 对 scoped 来源按各目标自身 id 取数', () => {
  const out = resolveGoalsLinks(
    [{ id: 'G1', metric: { current: 0, target: 5, unit: '', link: 'goal.scheduleDone' } }],
    makeGet(DATA),
    TODAY
  );
  assert.equal(out[0].metric.current, 1);
  assert.equal(out[0].metric.unit, '项');
});

test('新来源无数据 → null', () => {
  const e = makeGet({});
  for (const id of ['project.tasksDone', 'schedule.done', 'habits.bestStreak', 'learning.studyMin', 'savings.networth']) {
    assert.equal(computeLink(id, e, TODAY), null, id);
  }
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

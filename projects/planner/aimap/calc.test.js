import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cycleStatus, trackStats, overallCounts, donePct, fogItems, normalize, groupByDomain, STATUS_CYCLE } from './calc.js';

const state = normalize({
  mission: '吃透推理引擎',
  tracks: [
    { name: '主线', tag: 'TRACK 1', clusters: [
      { name: '地基', topics: [
        { name: 'roofline', status: 'done' },
        { name: '成本建模', status: 'doing' },
        { name: 'NCCL 内部', status: 'fog', unlock: 'ring 每步谁发谁收？' },
        { name: 'nsys 实读', status: 'todo' },
      ] },
    ] },
    { name: '副线', clusters: [{ name: '', topics: [{ name: 'backward', status: 'doing' }] }] },
  ],
  parked: ['多模态'],
  queue: [{ title: '代入一次成本模型' }],
  log: [{ date: '2026-06-10', text: '并行大扫盲' }],
});

test('cycleStatus：四态轮换闭环', () => {
  assert.equal(cycleStatus('todo'), 'doing');
  assert.equal(cycleStatus('doing'), 'done');
  assert.equal(cycleStatus('done'), 'fog');
  assert.equal(cycleStatus('fog'), 'todo');
  // 非法输入回到循环起点附近（不抛错）
  assert.ok(STATUS_CYCLE.includes(cycleStatus('x')));
});

test('trackStats / overallCounts：分态计数', () => {
  const s = trackStats(state.tracks[0]);
  assert.deepEqual(s, { done: 1, doing: 1, fog: 1, todo: 1, total: 4 });
  const o = overallCounts(state);
  assert.equal(o.total, 5);
  assert.equal(o.doing, 2);
});

test('donePct：掌握度百分比，空图为 0', () => {
  assert.equal(donePct({ done: 1, total: 4 }), 25);
  assert.equal(donePct({ done: 0, total: 0 }), 0);
});

test('fogItems：抽出迷雾与解锁问题，含归属', () => {
  const f = fogItems(state);
  assert.equal(f.length, 1);
  assert.equal(f[0].name, 'NCCL 内部');
  assert.match(f[0].unlock, /谁发谁收/);
  assert.equal(f[0].trackName, '主线');
});

test('normalize：补 id、字符串 parked 升级为对象、非法状态归 todo', () => {
  assert.ok(state.tracks[0].clusters[0].topics[0].id);
  assert.equal(state.parked[0].name, '多模态');
  const n = normalize({ tracks: [{ clusters: [{ topics: [{ name: 'x', status: 'bad' }] }] }] });
  assert.equal(n.tracks[0].clusters[0].topics[0].status, 'todo');
  // 空输入安全
  assert.deepEqual(normalize(null).tracks, []);
});

test('normalize：字符串知识点展开为 todo 对象（地图库紧凑格式）', () => {
  const n = normalize({ tracks: [{ name: 't', clusters: [{ topics: ['卷积的平移等变性', { name: 'x', status: 'done' }] }] }] });
  const tp = n.tracks[0].clusters[0].topics;
  assert.equal(tp[0].name, '卷积的平移等变性');
  assert.equal(tp[0].status, 'todo');
  assert.ok(tp[0].id);
  assert.equal(tp[1].status, 'done');
});

test('groupByDomain：按领域分组，自建图（无 domain）排最前', () => {
  const g = groupByDomain([
    { name: 'a', domain: 'GPU', domainIcon: '🖥️' },
    { name: 'b', domain: '' },
    { name: 'c', domain: 'GPU' },
    { name: 'd', domain: '数学', domainIcon: '🧮' },
  ]);
  assert.equal(g[0].domain, '');
  assert.equal(g.length, 3);
  const gpu = g.find((x) => x.domain === 'GPU');
  assert.equal(gpu.tracks.length, 2);
  assert.equal(gpu.icon, '🖥️');
});

test('normalize：libImported 标记透传（防止自动并入复活已删领域）', () => {
  const n = normalize({ libImported: { 'a.json': true } });
  assert.equal(n.libImported['a.json'], true);
  assert.deepEqual(normalize(null).libImported, {});
});

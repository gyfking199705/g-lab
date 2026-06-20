import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hexPoints, layoutDomain, layoutWorld, HEX_R } from './layout.js';
import { normalize, groupByDomain } from './calc.js';

const mk = (domain, nTopics, nClusters = 2) => {
  const topics = Array.from({ length: nTopics }, (_, i) => `${domain}-t${i}`);
  const per = Math.ceil(nTopics / nClusters);
  const clusters = [];
  for (let i = 0; i < nClusters; i++) clusters.push({ name: 'c' + i, topics: topics.slice(i * per, (i + 1) * per) });
  return { name: domain + '轨道', domain, domainIcon: '🗺️', clusters };
};

test('hexPoints：6 个顶点', () => {
  assert.equal(hexPoints(0, 0, 10).split(' ').length, 6);
});

test('layoutDomain：所有知识点都有格子，无重叠，含引用 id', () => {
  const g = groupByDomain(normalize({ tracks: [mk('A', 30, 3)] }).tracks)[0];
  const d = layoutDomain(g);
  assert.equal(d.tiles.length, 30);
  const seen = new Set();
  for (const t of d.tiles) {
    const k = `${Math.round(t.x)},${Math.round(t.y)}`;
    assert.ok(!seen.has(k), '格子重叠 ' + k);
    seen.add(k);
    assert.ok(t.topicId && t.trackId && t.clusterId);
    assert.ok(t.x >= 0 && t.x <= d.w && t.y >= 0 && t.y <= d.h);
  }
});

test('layoutWorld：限宽换行打包，全部知识点入图', () => {
  const st = normalize({ tracks: [mk('A', 120), mk('B', 80), mk('C', 150), mk('D', 60)] });
  const w = layoutWorld(groupByDomain(st.tracks), HEX_R, 500);
  assert.equal(w.continents.length, 4);
  let n = 0;
  for (const c of w.continents) {
    n += c.tiles.length;
    assert.ok(c.x + c.w <= Math.max(500, c.w) + 1, '大陆超出世界宽度');
  }
  assert.equal(n, 410);
  assert.equal(Object.keys(w.tileById).length, 410);
  assert.ok(w.height > 0 && w.width > 0);
  // 至少发生了一次换行
  assert.ok(w.continents.some((c) => c.y > 30));
});

test('layoutWorld：大陆统计分态正确', () => {
  const st = normalize({ tracks: [{ name: 't', domain: 'X', clusters: [{ topics: [
    { name: 'a', status: 'done' }, { name: 'b', status: 'fog' }, 'c',
  ] }] }] });
  const w = layoutWorld(groupByDomain(st.tracks));
  assert.deepEqual(w.continents[0].stats, { done: 1, doing: 0, fog: 1, todo: 1, total: 3 });
});

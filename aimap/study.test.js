import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathFor, buildStudyPrompt, copyablePrompt, renderCardHtml, clusterOf, nextToLearn, parseQuiz } from './study.js';
import { normalize, groupByDomain } from './calc.js';

const st = normalize({ tracks: [{ name: '主线', domain: 'X', clusters: [
  { name: '地基', topics: ['a', 'b', 'c', 'd', 'e'] },
] }] });
const groups = groupByDomain(st.tracks);
const tr = groups[0].tracks[0];
const cl = tr.clusters[0];
const selOf = (i) => ({ topicId: cl.topics[i].id, trackId: tr.id, clusterId: cl.id, name: cl.topics[i].name, trackName: tr.name, clusterName: cl.name, domain: 'X', note: '', unlock: '' });

test('pathFor：同分组前置/后继，边界安全', () => {
  const p = pathFor(groups, selOf(2));
  assert.deepEqual(p.prev.map((t) => t.name), ['a', 'b']);
  assert.deepEqual(p.next.map((t) => t.name), ['d', 'e']);
  assert.equal(pathFor(groups, selOf(0)).prev.length, 0);
  assert.equal(pathFor(groups, { topicId: 'nope', trackId: tr.id, clusterId: cl.id }).prev.length, 0);
});

test('buildStudyPrompt：含脉络与结构要求；迷雾问题成为靶心', () => {
  const sel = { ...selOf(2), unlock: 'ring 每步谁发谁收？' };
  const { system, user } = buildStudyPrompt(sel, pathFor(groups, sel));
  assert.match(system, /导师/);
  assert.match(user, /X → 主线 → 地基/);
  assert.match(user, /ring 每步谁发谁收/);
  assert.match(user, /解你卡住的问题/);
  assert.match(user, /自检三问/);
  // 非迷雾点不带「解你卡住的问题」小节
  assert.ok(!buildStudyPrompt(selOf(1), { prev: [], next: [] }).user.includes('解你卡住的问题'));
});

test('copyablePrompt：合并为单段文本', () => {
  const p = copyablePrompt(selOf(1), { prev: [], next: [] });
  assert.match(p, /导师/);
  assert.match(p, /学习卡/);
});

test('renderCardHtml：## / - / ** 渲染，HTML 注入被转义', () => {
  const html = renderCardHtml('## 标题\n- 点 **加粗** 与 `code`\n\n正文 <script>alert(1)</script>');
  assert.match(html, /<h4>标题<\/h4>/);
  assert.match(html, /<ul><li>点 <b>加粗<\/b> 与 <code>code<\/code><\/li><\/ul>/);
  assert.match(html, /&lt;script&gt;/);
  assert.ok(!html.includes('<script>'));
});

test('clusterOf：按 ids 定位分组', () => {
  assert.equal(clusterOf(groups, selOf(0)).name, '地基');
  assert.equal(clusterOf(groups, { trackId: 'x', clusterId: 'y' }), null);
});

test('nextToLearn：doing 优先 → fog → todo', () => {
  const mkG = (statuses) => groupByDomain(normalize({ tracks: [{ name: 't', clusters: [{ topics: statuses.map((s, i) => ({ name: 'n' + i, status: s })) }] }] }).tracks);
  const g1 = mkG(['done', 'todo', 'fog', 'doing']);
  const pick = (g) => { const id = nextToLearn(g); for (const gr of g) for (const tr of gr.tracks) for (const cl of tr.clusters) for (const t of cl.topics) if (t.id === id) return t.name; return null; };
  assert.equal(pick(g1), 'n3'); // doing 优先
  assert.equal(pick(mkG(['done', 'todo', 'fog'])), 'n2'); // 无 doing → fog
  assert.equal(pick(mkG(['done', 'todo'])), 'n1'); // 无雾 → todo
  assert.equal(nextToLearn(mkG(['done'])), null);
});

test('parseQuiz：解析自检小节的列表/编号行，无小节为空', () => {
  const md = '## 核心拆解\n- 不是题\n## 自检三问（附答案）\n- Q1？（答：A1）\n2. Q2？\n* Q3？\n## 接缝\n- 也不是题';
  assert.deepEqual(parseQuiz(md), ['Q1？（答：A1）', 'Q2？', 'Q3？']);
  assert.deepEqual(parseQuiz('## 没有自检\n- x'), []);
});

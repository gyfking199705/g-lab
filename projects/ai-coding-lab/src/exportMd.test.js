import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMarkdown, toLlmsTxt } from './exportMd.js';
import { ITEMS, CATEGORIES } from '../data/practices.js';

const sample = [
  {
    id: 'a', title: 'Alpha', category: 'paradigm', summary: 'sum A',
    why: 'why A', how: ['s1', 's2'], whenToUse: 'when A', pitfalls: ['p1'],
    tags: ['x', 'y'], maturity: 'growing', impact: 'high', effort: 'low',
    refs: [{ label: 'Ref A', url: 'https://a.example' }],
  },
  {
    id: 'b', title: 'Beta', category: 'workflow', summary: 'sum B',
    why: 'why B', how: ['s1'], tags: ['z'], maturity: 'established', impact: 'medium', effort: 'medium',
    refs: [{ label: 'Ref B', url: 'https://b.example' }],
  },
];

test('toMarkdown: includes title and count header', () => {
  const md = toMarkdown(sample);
  assert.match(md, /^# AI Coding 研究室 · 速查表/);
  assert.match(md, /> 共 2 条/);
});

test('toMarkdown: custom title and note', () => {
  const md = toMarkdown(sample, { title: 'My Sheet', note: '已筛选' });
  assert.match(md, /^# My Sheet/);
  assert.match(md, /> 共 2 条 · 已筛选/);
});

test('toMarkdown: groups by category with counts', () => {
  const md = toMarkdown(sample);
  assert.match(md, /## 🧭 范式（1）/);
  assert.match(md, /## 🔁 工作流（1）/);
  // 范式应排在工作流之前（按 CATEGORIES 顺序）
  assert.ok(md.indexOf('范式') < md.indexOf('工作流'));
});

test('toMarkdown: renders fields and links', () => {
  const md = toMarkdown(sample);
  assert.match(md, /### Alpha/);
  assert.match(md, /为什么有效.*why A/);
  assert.match(md, /怎么落地.*s1；s2/);
  assert.match(md, /常见坑.*p1/);
  assert.match(md, /成熟度\/影响力\/落地成本.*成长 \/ 高 \/ 低/);
  assert.match(md, /#x #y/);
  assert.match(md, /\[Ref A\]\(https:\/\/a\.example\)/);
});

test('toMarkdown: omits optional fields when absent', () => {
  const md = toMarkdown([sample[1]]);
  assert.doesNotMatch(md, /何时使用/); // Beta has no whenToUse
  assert.doesNotMatch(md, /常见坑/);   // Beta has no pitfalls
});

test('toMarkdown: empty list still valid', () => {
  const md = toMarkdown([]);
  assert.match(md, /> 共 0 条/);
});

test('toLlmsTxt: follows llms.txt shape (H1, blockquote, sections)', () => {
  const txt = toLlmsTxt(sample, CATEGORIES);
  assert.match(txt, /^# AI Coding 研究室/);     // 必须以 H1 开头
  assert.match(txt, /\n> /);                     // 含 blockquote 摘要
  assert.match(txt, /## 知识库/);
  assert.match(txt, /\[全量知识库摘要 \(KNOWLEDGE\.md\)\]\(KNOWLEDGE\.md\)/);
  assert.match(txt, /## 分类/);
  assert.match(txt, /## Optional/);
});

test('toLlmsTxt: lists every category with a count', () => {
  const txt = toLlmsTxt(ITEMS, CATEGORIES);
  for (const c of CATEGORIES) {
    assert.ok(txt.includes(`${c.label} (${c.id})`), `lists ${c.id}`);
  }
});

test('toMarkdown: real dataset exports without throwing and ends with newline', () => {
  const md = toMarkdown(ITEMS);
  assert.ok(md.length > 1000);
  assert.ok(md.endsWith('\n'));
  // 不应有 3 个以上连续换行
  assert.doesNotMatch(md, /\n{3,}/);
});

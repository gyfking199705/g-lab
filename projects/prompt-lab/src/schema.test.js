import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractVariables,
  renderTemplate,
  normalizePrompt,
  filterPrompts,
  sortPrompts,
  tagCounts,
  buildExport,
  parseImport,
  categoryLabel,
  EXPORT_FORMAT,
} from './schema.js';

test('extractVariables 去重且保序', () => {
  assert.deepEqual(extractVariables('Hi {{name}}, {{topic}} and {{name}} again'), ['name', 'topic']);
  assert.deepEqual(extractVariables('no vars'), []);
  assert.deepEqual(extractVariables('{{ spaced }}'), ['spaced']);
});

test('renderTemplate 填充已知变量、保留未知占位', () => {
  assert.equal(renderTemplate('Hi {{name}}', { name: 'Ada' }), 'Hi Ada');
  assert.equal(renderTemplate('Hi {{name}}', {}), 'Hi {{name}}');
  assert.equal(renderTemplate('Hi {{name}}', { name: '' }), 'Hi {{name}}');
});

test('normalizePrompt 补默认并清洗非法字段', () => {
  const p = normalizePrompt({ title: '  T  ', category: 'bogus', techniques: ['few-shot', 'x'], tags: ['a', 'a', ' '] }, 100);
  assert.equal(p.title, 'T');
  assert.equal(p.category, 'other');
  assert.deepEqual(p.techniques, ['few-shot']);
  assert.deepEqual(p.tags, ['a']);
  assert.deepEqual(p.models, ['Any']);
  assert.equal(p.version, '1.0.0');
  assert.equal(p.createdAt, 100);
  assert.ok(p.id);
});

test('normalizePrompt 从正文派生 variables', () => {
  const p = normalizePrompt({ content: 'Summarize {{text}} for {{audience}}' });
  assert.deepEqual(p.variables, ['text', 'audience']);
});

test('filterPrompts 按查询/分类/技巧/收藏过滤', () => {
  const data = [
    normalizePrompt({ title: 'Code reviewer', category: 'coding', techniques: ['role'], content: 'review code', favorite: true }),
    normalizePrompt({ title: 'Poem', category: 'creative', tags: ['fun'], content: 'write a poem' }),
  ];
  assert.equal(filterPrompts(data, { query: 'code' }).length, 1);
  assert.equal(filterPrompts(data, { category: 'creative' }).length, 1);
  assert.equal(filterPrompts(data, { technique: 'role' }).length, 1);
  assert.equal(filterPrompts(data, { favorite: true }).length, 1);
  assert.equal(filterPrompts(data, { query: 'fun' }).length, 1); // 命中 tag
  assert.equal(filterPrompts(data, {}).length, 2);
});

test('sortPrompts 默认按更新时间倒序', () => {
  const a = normalizePrompt({ title: 'A' }, 1);
  const b = normalizePrompt({ title: 'B' }, 2);
  a.updatedAt = 1;
  b.updatedAt = 2;
  assert.deepEqual(sortPrompts([a, b]).map((p) => p.title), ['B', 'A']);
  assert.deepEqual(sortPrompts([a, b], 'title').map((p) => p.title), ['A', 'B']);
});

test('tagCounts 统计并降序', () => {
  const data = [normalizePrompt({ tags: ['x', 'y'] }), normalizePrompt({ tags: ['x'] })];
  assert.deepEqual(tagCounts(data), [
    { tag: 'x', count: 2 },
    { tag: 'y', count: 1 },
  ]);
});

test('buildExport / parseImport 往返一致', () => {
  const data = [normalizePrompt({ title: 'One', content: 'do {{x}}' })];
  const exp = buildExport(data);
  assert.equal(exp.format, EXPORT_FORMAT);
  assert.equal(exp.count, 1);
  const back = parseImport(exp);
  assert.equal(back.length, 1);
  assert.equal(back[0].title, 'One');
  assert.deepEqual(back[0].variables, ['x']);
});

test('parseImport 接受裸数组、拒绝垃圾', () => {
  assert.equal(parseImport([{ title: 'a' }]).length, 1);
  assert.equal(parseImport({ nope: 1 }).length, 0);
  assert.equal(parseImport(null).length, 0);
});

test('categoryLabel 已知/未知', () => {
  assert.equal(categoryLabel('coding'), '编程 / 工程');
  assert.equal(categoryLabel('???'), '???');
});

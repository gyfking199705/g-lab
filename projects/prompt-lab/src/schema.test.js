import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractVariables,
  renderTemplate,
  normalizePrompt,
  commitEdit,
  filterPrompts,
  sortPrompts,
  tagCounts,
  buildExport,
  parseImport,
  categoryLabel,
  promptToMarkdown,
  libraryToMarkdown,
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
  assert.equal(filterPrompts(data, { tag: 'fun' }).length, 1); // 按 tag 精确过滤
  assert.equal(filterPrompts(data, { tag: 'nope' }).length, 0);
  assert.equal(filterPrompts(data, { tag: 'all' }).length, 2);
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

test('commitEdit 正文变化时压入历史快照', () => {
  const v1 = normalizePrompt({ title: 'P', content: 'v1', version: '1.0.0' }, 100);
  const v2 = commitEdit(v1, { content: 'v2', version: '1.1.0' }, 200);
  assert.equal(v2.content, 'v2');
  assert.equal(v2.version, '1.1.0');
  assert.equal(v2.history.length, 1);
  assert.equal(v2.history[0].content, 'v1');
  assert.equal(v2.history[0].version, '1.0.0');
  assert.equal(v2.history[0].savedAt, 100);
});

test('commitEdit 仅改元数据不产生历史', () => {
  const v1 = normalizePrompt({ title: 'P', content: 'same' }, 100);
  const v2 = commitEdit(v1, { title: 'P2' }, 200);
  assert.equal(v2.title, 'P2');
  assert.equal(v2.history.length, 0);
});

test('commitEdit 历史最新在前且封顶 20', () => {
  let p = normalizePrompt({ title: 'P', content: 'c0' }, 0);
  for (let k = 1; k <= 25; k++) p = commitEdit(p, { content: 'c' + k }, k);
  assert.equal(p.history.length, 20);
  assert.equal(p.history[0].content, 'c24'); // 最近一次被替换的内容
});

test('normalizePrompt 保留并清洗 history', () => {
  const p = normalizePrompt({ content: 'x', history: [{ content: 'old', version: '0.9', savedAt: 5 }, 'junk'] });
  assert.equal(p.history.length, 1);
  assert.equal(p.history[0].content, 'old');
});

test('categoryLabel 已知/未知', () => {
  assert.equal(categoryLabel('coding'), '编程 / 工程');
  assert.equal(categoryLabel('???'), '???');
});

test('libraryToMarkdown 含目录与逐条正文', () => {
  const data = [
    normalizePrompt({ title: 'Zebra', category: 'coding', content: 'a' }),
    normalizePrompt({ title: 'Alpha', category: 'coding', content: 'b' }),
    normalizePrompt({ title: 'Solo', category: 'writing', content: 'c' }),
  ];
  const md = libraryToMarkdown(data);
  assert.match(md, /# Prompt 研究室 · 库导出/);
  assert.match(md, /共 3 条/);
  assert.match(md, /## 目录/);
  // 组内按标题排序：Alpha 在 Zebra 之前
  assert.ok(md.indexOf('- Alpha') < md.indexOf('- Zebra'));
  // 每条正文都在
  for (const t of ['Zebra', 'Alpha', 'Solo']) assert.ok(md.includes(`# ${t}`));
});

test('promptToMarkdown 含标题/正文/System 代码块', () => {
  const md = promptToMarkdown(
    normalizePrompt({ title: 'T', summary: 'S', system: 'sys', content: 'body {{x}}', category: 'coding' })
  );
  assert.match(md, /^# T/);
  assert.match(md, /> S/);
  assert.match(md, /## System/);
  assert.match(md, /## Prompt/);
  assert.match(md, /```text\nbody \{\{x\}\}\n```/);
});

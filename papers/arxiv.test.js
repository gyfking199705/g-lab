import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildQueryUrl, normalizeId, parseArxivAtom } from './arxiv.js';

test('normalizeId 去 URL / 版本号 / 后缀', () => {
  assert.equal(normalizeId('http://arxiv.org/abs/2401.01234v2'), '2401.01234');
  assert.equal(normalizeId('https://arxiv.org/pdf/2401.01234v1.pdf'), '2401.01234');
  assert.equal(normalizeId('2401.01234'), '2401.01234');
  assert.equal(normalizeId(''), '');
});

test('buildQueryUrl 分类 + 关键词', () => {
  const u = buildQueryUrl({ categories: ['cs.LG', 'cs.AI'], keywords: ['diffusion'], maxResults: 10 });
  assert.match(u, /search_query=/);
  assert.match(u, /cat:cs\.LG\+OR\+cat:cs\.AI/);
  assert.match(u, /all:/);
  assert.match(u, /max_results=10/);
  assert.match(u, /sortBy=submittedDate/);
});

test('buildQueryUrl 仅分类 / 默认兜底', () => {
  assert.match(buildQueryUrl({ categories: ['cs.CV'] }), /search_query=\(cat:cs\.CV\)/);
  assert.match(buildQueryUrl({}), /all:machine\+learning/);
});

test('buildQueryUrl id_list 模式', () => {
  const u = buildQueryUrl({ ids: ['2401.01234v1', 'http://arxiv.org/abs/2310.06825'] });
  assert.match(u, /id_list=2401\.01234,2310\.06825/);
  assert.doesNotMatch(u, /search_query/);
});

test('buildQueryUrl maxResults 上限 100、下限 1', () => {
  assert.match(buildQueryUrl({ maxResults: 999 }), /max_results=100/);
  assert.match(buildQueryUrl({ maxResults: 0 }), /max_results=1/);
});

const SAMPLE = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <entry>
    <id>http://arxiv.org/abs/2401.01234v1</id>
    <updated>2024-01-03T10:00:00Z</updated>
    <published>2024-01-02T10:00:00Z</published>
    <title>Attention Is All You Need Again &amp; Again</title>
    <summary>  We propose a method that improves
    transformers significantly.  </summary>
    <author><name>Alice Zhang</name></author>
    <author><name>Bob Li</name></author>
    <link title="pdf" href="http://arxiv.org/pdf/2401.01234v1"/>
    <arxiv:primary_category term="cs.LG"/>
    <category term="cs.LG"/>
    <category term="cs.CL"/>
  </entry>
</feed>`;

test('parseArxivAtom 解析条目', () => {
  const ps = parseArxivAtom(SAMPLE);
  assert.equal(ps.length, 1);
  const p = ps[0];
  assert.equal(p.id, '2401.01234');
  assert.equal(p.title, 'Attention Is All You Need Again & Again'); // 实体解码
  assert.equal(p.summary, 'We propose a method that improves transformers significantly.'); // 折叠空白
  assert.deepEqual(p.authors, ['Alice Zhang', 'Bob Li']);
  assert.deepEqual(p.categories, ['cs.LG', 'cs.CL']);
  assert.equal(p.primary, 'cs.LG');
  assert.equal(p.published, '2024-01-02');
  assert.equal(p.pdfUrl, 'http://arxiv.org/pdf/2401.01234v1');
});

test('parseArxivAtom 空/非法输入', () => {
  assert.deepEqual(parseArxivAtom(''), []);
  assert.deepEqual(parseArxivAtom('<feed></feed>'), []);
  assert.deepEqual(parseArxivAtom(null), []);
});

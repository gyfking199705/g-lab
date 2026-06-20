import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, CATEGORIES } from '../data/systems.js';
import {
  collectTags, matchesQuery, filterItems, sortItems, summarize, roi,
} from './filter.js';

const sample = [
  { id: 'a', title: 'Alpha', summary: 'record replay thing', why: '', how: ['cassette it'], tags: ['record-replay', 'http'], category: 'paradigm', maturity: 'growing', impact: 'high', effort: 'low' },
  { id: 'b', title: 'Beta', summary: 'wiremock server', why: '', how: [], tags: ['wiremock'], category: 'server', maturity: 'established', impact: 'medium', effort: 'low' },
  { id: 'c', title: 'Gamma', summary: 'http helper', why: '', how: [], tags: ['http'], category: 'python', maturity: 'emerging', impact: 'low', effort: 'high' },
];

test('collectTags counts and sorts by frequency', () => {
  const tags = collectTags(sample);
  assert.equal(tags[0].tag, 'http');
  assert.equal(tags[0].count, 2);
  // record-replay 与 wiremock 各 1 次，按字母序 record-replay 在 wiremock 前
  const names = tags.map((t) => t.tag);
  assert.deepEqual(names, ['http', 'record-replay', 'wiremock']);
});

test('matchesQuery: empty query matches all', () => {
  assert.equal(matchesQuery(sample[0], ''), true);
  assert.equal(matchesQuery(sample[0], '   '), true);
});

test('matchesQuery: matches across title/summary/tags/how', () => {
  assert.equal(matchesQuery(sample[0], 'alpha'), true); // title, case-insensitive
  assert.equal(matchesQuery(sample[0], 'record'), true); // summary + tag
  assert.equal(matchesQuery(sample[0], 'cassette'), true); // how step
  assert.equal(matchesQuery(sample[0], 'nonexistent'), false);
});

test('matchesQuery: multi-token is AND', () => {
  assert.equal(matchesQuery(sample[0], 'record http'), true);
  assert.equal(matchesQuery(sample[0], 'record wiremock'), false);
});

test('filterItems: category filter (OR within, AND across)', () => {
  assert.equal(filterItems(sample, { categories: ['paradigm'] }).length, 1);
  assert.equal(filterItems(sample, { categories: ['paradigm', 'server'] }).length, 2);
});

test('filterItems: tag filter is OR within dimension', () => {
  const r = filterItems(sample, { tags: ['http'] });
  assert.deepEqual(r.map((x) => x.id).sort(), ['a', 'c']);
});

test('filterItems: maturity + query combine with AND', () => {
  const r = filterItems(sample, { maturities: ['growing'], query: 'record' });
  assert.deepEqual(r.map((x) => x.id), ['a']);
  assert.equal(filterItems(sample, { maturities: ['emerging'], query: 'record' }).length, 0);
});

test('filterItems: empty filter returns all', () => {
  assert.equal(filterItems(sample, {}).length, 3);
  assert.equal(filterItems(sample).length, 3);
});

test('sortItems does not mutate input', () => {
  const before = sample.map((x) => x.id);
  sortItems(sample, 'title');
  assert.deepEqual(sample.map((x) => x.id), before);
});

test('sortItems by impact: high before low', () => {
  const r = sortItems(sample, 'impact').map((x) => x.id);
  assert.equal(r[0], 'a'); // high impact
  assert.equal(r[r.length - 1], 'c'); // low impact
});

test('sortItems by roi: high impact + low effort wins', () => {
  const r = sortItems(sample, 'roi').map((x) => x.id);
  assert.equal(r[0], 'a'); // impact 3 - effort 1 = 2 (best)
  assert.equal(r[r.length - 1], 'c'); // impact 1 - effort 3 = -2 (worst)
});

test('roi computes impact-minus-effort ordering', () => {
  assert.ok(roi(sample[0]) > roi(sample[2]));
});

test('summarize aggregates totals', () => {
  const s = summarize(sample);
  assert.equal(s.total, 3);
  assert.equal(s.byCategory.paradigm, 1);
  assert.equal(s.byMaturity.growing, 1);
  assert.equal(s.tagCount, 3);
});

// ── 真实数据集的健全性检查（保证内容质量基线）──
test('dataset: every item has required fields and valid enums', () => {
  const cats = new Set(CATEGORIES.map((c) => c.id));
  const lv = new Set(['low', 'medium', 'high']);
  const mat = new Set(['emerging', 'growing', 'established']);
  const ids = new Set();
  for (const it of ITEMS) {
    assert.ok(it.id && !ids.has(it.id), `unique id: ${it.id}`);
    ids.add(it.id);
    assert.ok(it.title && it.summary && it.why, `text fields: ${it.id}`);
    assert.ok(cats.has(it.category), `category: ${it.id}`);
    assert.ok(lv.has(it.impact) && lv.has(it.effort), `levels: ${it.id}`);
    assert.ok(mat.has(it.maturity), `maturity: ${it.id}`);
    assert.ok(Array.isArray(it.how) && it.how.length >= 2, `how steps: ${it.id}`);
    assert.ok(Array.isArray(it.refs) && it.refs.length >= 1, `refs: ${it.id}`);
    for (const r of it.refs) assert.ok(/^https?:\/\//.test(r.url), `ref url: ${it.id}`);
  }
});

test('dataset: covers all five categories', () => {
  const s = summarize(ITEMS);
  for (const c of CATEGORIES.map((x) => x.id)) {
    assert.ok(s.byCategory[c] >= 1, `has category ${c}`);
  }
});

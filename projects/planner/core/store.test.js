import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate, uid } from './store.js';

const DEFAULTS = { v: 2, items: [], settings: { a: 1 } };

test('migrate 空/损坏数据回退默认', () => {
  assert.deepEqual(migrate(null, DEFAULTS), DEFAULTS);
  assert.deepEqual(migrate('not json', DEFAULTS), DEFAULTS);
  assert.deepEqual(migrate('123', DEFAULTS), DEFAULTS);
});

test('migrate 合并默认字段', () => {
  const out = migrate(JSON.stringify({ v: 2, items: [{ id: 1 }] }), DEFAULTS);
  assert.equal(out.items.length, 1);
  assert.deepEqual(out.settings, { a: 1 });
  assert.equal(out.v, 2);
});

test('migrate 无版本号的历史数据按 v1 升级到 v2', () => {
  const migrations = {
    1: (d) => ({ ...d, upgraded: true }),
  };
  const out = migrate(JSON.stringify({ items: [{ id: 9 }] }), DEFAULTS, migrations);
  assert.equal(out.upgraded, true);
  assert.equal(out.v, 2);
  assert.equal(out.items[0].id, 9);
});

test('migrate 逐版本顺序迁移', () => {
  const defaults = { v: 3, steps: [] };
  const migrations = {
    1: (d) => ({ ...d, steps: [...(d.steps || []), 'to2'] }),
    2: (d) => ({ ...d, steps: [...d.steps, 'to3'] }),
  };
  const out = migrate(JSON.stringify({ v: 1, steps: [] }), defaults, migrations);
  assert.deepEqual(out.steps, ['to2', 'to3']);
  assert.equal(out.v, 3);
});

test('migrate 已是最新版本不动', () => {
  const migrations = { 1: () => { throw new Error('不应被调用'); } };
  const out = migrate(JSON.stringify({ v: 2, items: [] }), DEFAULTS, migrations);
  assert.equal(out.v, 2);
});

test('uid 唯一且带前缀', () => {
  const a = uid('h');
  const b = uid('h');
  assert.match(a, /^h_/);
  assert.notEqual(a, b);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseState, serializeState, DATA_VERSION } from './store.js';

test('parseState 空/坏数据回退 seeds 并规整', () => {
  const seeds = [{ title: 'Seed', content: 'hi {{x}}' }];
  const a = parseState(null, seeds);
  assert.equal(a.v, DATA_VERSION);
  assert.equal(a.prompts.length, 1);
  assert.equal(a.prompts[0].title, 'Seed');
  assert.deepEqual(a.prompts[0].variables, ['x']);

  const b = parseState('not json{', seeds);
  assert.equal(b.prompts.length, 1);

  const c = parseState(JSON.stringify({ v: 1, foo: 1 }), seeds); // 缺 prompts 数组
  assert.equal(c.prompts.length, 1);
});

test('parseState 读取既有数据并规整字段', () => {
  const raw = JSON.stringify({ v: 1, prompts: [{ title: 'Kept', category: 'coding', content: '' }] });
  const s = parseState(raw, []);
  assert.equal(s.prompts.length, 1);
  assert.equal(s.prompts[0].category, 'coding');
});

test('serializeState 往返一致', () => {
  const state = { v: DATA_VERSION, prompts: [{ title: 'X' }] };
  const round = parseState(serializeState(state), []);
  assert.equal(round.prompts[0].title, 'X');
});

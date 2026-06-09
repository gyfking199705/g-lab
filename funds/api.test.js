import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFundGz, navForValuation, demoFundNav, fetchFundNavs } from './api.js';

test('parseFundGz：解析天天基金 JSONP', () => {
  const text = 'jsonpgz({"fundcode":"161725","name":"招商中证白酒","jzrq":"2026-06-06","dwjz":"1.2340","gsz":"1.2450","gszzl":"0.89","gztime":"2026-06-09 15:00"});';
  const f = parseFundGz(text);
  assert.equal(f.code, '161725');
  assert.equal(f.name, '招商中证白酒');
  assert.equal(f.nav, 1.234);
  assert.equal(f.estNav, 1.245);
  assert.equal(f.estPct, 0.89);
  assert.equal(f.demo, false);
});

test('parseFundGz：无估值时 estNav 为 null，nav 仍可用', () => {
  const f = parseFundGz('jsonpgz({"fundcode":"000001","name":"x","dwjz":"2.5","gsz":"","gszzl":""});');
  assert.equal(f.nav, 2.5);
  assert.equal(f.estNav, null);
});

test('parseFundGz：非法格式抛错', () => {
  assert.throws(() => parseFundGz('not jsonp'));
  assert.throws(() => parseFundGz('jsonpgz({"dwjz":"","gsz":""})'));
});

test('navForValuation：估算优先，回落单位净值', () => {
  assert.equal(navForValuation({ nav: 1.2, estNav: 1.25 }), 1.25);
  assert.equal(navForValuation({ nav: 1.2, estNav: null }), 1.2);
  assert.equal(navForValuation(null), 0);
});

test('demoFundNav：确定性且字段完整', () => {
  const a = demoFundNav('161725');
  const b = demoFundNav('161725');
  assert.deepEqual(a, b);
  assert.ok(a.nav > 0 && a.demo === true);
});

test('fetchFundNavs(demo)：批量去重', async () => {
  const r = await fetchFundNavs(['161725', '161725', ' '], { provider: 'demo' });
  assert.equal(r.length, 1);
  assert.equal(r[0].code, '161725');
});

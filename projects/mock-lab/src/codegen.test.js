import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBody, normalizeRoute, gmockConfig, pythonGmock, pythonResponses,
  pythonRespx, pytestFixture, pythonRequestsMock, vcrCassette,
  wiremockMappings, openapiSpec, generateAll, GENERATORS,
} from './codegen.js';

const state = {
  baseUrl: 'https://api.example.com/',
  mode: 'remote',
  source: 'https://config.example.com/g-mock.json',
  routes: [
    { method: 'get', path: 'users/1', status: 200, delayMs: 150, body: '{"id":1,"name":"Ada"}' },
    { method: 'POST', path: '/login', status: 401, delayMs: 0, body: 'unauthorized' },
  ],
};

test('parseBody distinguishes json / text / empty', () => {
  assert.equal(parseBody('{"a":1}').kind, 'json');
  assert.equal(parseBody('[1,2]').kind, 'json');
  assert.equal(parseBody('hello').kind, 'text');
  assert.equal(parseBody('42').kind, 'text'); // 裸数字当文本，更直观
  assert.equal(parseBody('   ').kind, 'empty');
  assert.equal(parseBody('').kind, 'empty');
});

test('normalizeRoute fills defaults and normalizes', () => {
  const r = normalizeRoute({ method: 'get', path: 'foo', status: '201', delayMs: '5' });
  assert.equal(r.method, 'GET');
  assert.equal(r.path, '/foo');
  assert.equal(r.status, 201);
  assert.equal(r.delayMs, 5);
  assert.equal(normalizeRoute({}).path, '/');
  assert.equal(normalizeRoute({ delayMs: -3 }).delayMs, 0);
});

test('gmockConfig: valid JSON, v1 schema, trims baseUrl, parses bodies', () => {
  const cfg = JSON.parse(gmockConfig(state));
  assert.equal(cfg.version, 1);
  assert.equal(cfg.baseUrl, 'https://api.example.com'); // 去掉尾斜杠
  assert.equal(cfg.routes.length, 2);
  assert.equal(cfg.routes[0].method, 'GET');
  assert.equal(cfg.routes[0].path, '/users/1');
  assert.deepEqual(cfg.routes[0].body, { id: 1, name: 'Ada' }); // JSON 体被解析成对象
  assert.equal(cfg.routes[0].delayMs, 150);
  assert.equal(cfg.routes[1].body, 'unauthorized'); // 文本体保持字符串
  assert.equal(cfg.routes[1].headers['Content-Type'].startsWith('text/plain'), true);
});

test('pythonResponses: valid-looking python with json.loads for json body', () => {
  const py = pythonResponses(state);
  assert.match(py, /import responses/);
  assert.match(py, /@responses\.activate/);
  assert.match(py, /responses\.GET,/);
  assert.match(py, /responses\.POST,/);
  assert.match(py, /https:\/\/api\.example\.com\/users\/1/);
  assert.match(py, /json=json\.loads\(/); // JSON 体用 json.loads 还原
  assert.match(py, /body=/); // 文本体用 body=
  assert.match(py, /150ms/); // 延迟以注释提示
});

test('pythonResponses: empty routes still yields runnable stub', () => {
  const py = pythonResponses({ baseUrl: '', routes: [] });
  assert.match(py, /@responses\.activate/);
  assert.match(py, /\.\.\./);
});

test('pythonRespx: routes by method+url, httpx.Response', () => {
  const py = pythonRespx(state);
  assert.match(py, /import respx/);
  assert.match(py, /@respx\.mock/);
  assert.match(py, /respx\.route\(method="GET", url="https:\/\/api\.example\.com\/users\/1"\)/);
  assert.match(py, /httpx\.Response\(200, json=json\.loads\(/);
  assert.match(py, /httpx\.Response\(401, text=/);
});

test('pythonGmock: uses remote source from state and shows env switch', () => {
  const py = pythonGmock(state);
  assert.match(py, /import g_mock/);
  assert.match(py, /g_mock\.bind_responses\(MOCK_SOURCE\)/);
  assert.match(py, /https:\/\/config\.example\.com\/g-mock\.json/);
  assert.match(py, /MOCK_SOURCE/);
});

test('wiremockMappings: valid JSON with request/response + delay', () => {
  const wm = JSON.parse(wiremockMappings(state));
  assert.equal(wm.mappings.length, 2);
  assert.equal(wm.mappings[0].request.method, 'GET');
  assert.equal(wm.mappings[0].request.urlPath, '/users/1');
  assert.deepEqual(wm.mappings[0].response.jsonBody, { id: 1, name: 'Ada' });
  assert.equal(wm.mappings[0].response.fixedDelayMilliseconds, 150);
  assert.equal(wm.mappings[1].response.body, 'unauthorized');
});

test('openapiSpec: valid 3.1 with paths, methods, examples, server', () => {
  const spec = JSON.parse(openapiSpec(state));
  assert.equal(spec.openapi, '3.1.0');
  assert.equal(spec.servers[0].url, 'https://api.example.com');
  assert.ok(spec.paths['/users/1'].get);
  assert.ok(spec.paths['/login'].post);
  assert.deepEqual(
    spec.paths['/users/1'].get.responses['200'].content['application/json'].example,
    { id: 1, name: 'Ada' },
  );
  assert.equal(
    spec.paths['/login'].post.responses['401'].content['text/plain'].example,
    'unauthorized',
  );
});

test('pytestFixture: reusable g_mock fixture honoring source/mode', () => {
  const py = pytestFixture(state);
  assert.match(py, /import pytest/);
  assert.match(py, /import g_mock/);
  assert.match(py, /@pytest\.fixture/);
  assert.match(py, /def mocked_api\(\):/);
  assert.match(py, /g_mock\.bind_responses\(MOCK_SOURCE\)/);
  assert.match(py, /https:\/\/config\.example\.com\/g-mock\.json/); // remote source
});

test('pythonRequestsMock: register_uri per route, json/text + status_code', () => {
  const py = pythonRequestsMock(state);
  assert.match(py, /import requests_mock/);
  assert.match(py, /requests_mock\.Mocker\(\)/);
  assert.match(py, /m\.register_uri\(/);
  assert.match(py, /"GET",/);
  assert.match(py, /"POST",/);
  assert.match(py, /json=json\.loads\(/);
  assert.match(py, /text=/);
  assert.match(py, /status_code=401/);
});

test('pythonRequestsMock: empty routes still runnable', () => {
  const py = pythonRequestsMock({ baseUrl: '', routes: [] });
  assert.match(py, /requests_mock\.Mocker\(\)/);
  assert.match(py, /\.\.\./);
});

test('vcrCassette: valid JSON cassette with interactions + reason phrase', () => {
  const cas = JSON.parse(vcrCassette(state));
  assert.equal(cas.version, 1);
  assert.equal(cas.interactions.length, 2);
  const first = cas.interactions[0];
  assert.equal(first.request.method, 'GET');
  assert.equal(first.request.uri, 'https://api.example.com/users/1');
  assert.equal(first.response.status.code, 200);
  assert.equal(first.response.status.message, 'OK');
  assert.deepEqual(first.response.headers['Content-Type'], ['application/json']);
  // body 序列化成字符串（VCR body.string 约定）
  assert.equal(typeof first.response.body.string, 'string');
  assert.deepEqual(JSON.parse(first.response.body.string), { id: 1, name: 'Ada' });
  assert.equal(cas.interactions[1].response.status.message, 'Unauthorized'); // 401
  assert.equal(cas.interactions[1].response.body.string, 'unauthorized');
});

test('generateAll: produces a string for every generator id', () => {
  const all = generateAll(state);
  for (const g of GENERATORS) {
    assert.equal(typeof all[g.id], 'string', `output for ${g.id}`);
    assert.ok(all[g.id].length > 0, `non-empty ${g.id}`);
  }
});

test('JSON generators always emit parseable JSON even when empty', () => {
  const empty = { baseUrl: '', mode: 'local', source: '', routes: [] };
  assert.doesNotThrow(() => JSON.parse(gmockConfig(empty)));
  assert.doesNotThrow(() => JSON.parse(wiremockMappings(empty)));
  assert.doesNotThrow(() => JSON.parse(openapiSpec(empty)));
  assert.doesNotThrow(() => JSON.parse(vcrCassette(empty)));
});

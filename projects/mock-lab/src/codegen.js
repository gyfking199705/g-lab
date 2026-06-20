/**
 * Mock 配置工坊 · 纯代码生成逻辑（无 React / DOM 依赖，可 `node --test`）。
 *
 * 输入是用户在工坊里定义的一组「路由」与全局配置：
 *   state = {
 *     baseUrl: string,
 *     mode: 'local' | 'remote',
 *     source: string,                 // 本地路径或远端 URL
 *     routes: [{ method, path, status, delayMs, body }]   // body 是用户输入的文本
 *   }
 *
 * 输出多种「即取即用、符合业界标准」的产物，Python 优先：
 *   - gmockConfig    : 可植入的 g-mock 配置（JSON，本地/远端通用）
 *   - pythonGmock    : 用内置 g_mock.py 适配器从本地/远端加载并绑定
 *   - pythonResponses: requests 的 mock（responses 库）
 *   - pythonRespx    : httpx 的 mock（respx 库，支持 async）
 *   - wiremockMappings: WireMock stub 映射（独立 mock 服务，可远端下发）
 *   - openapiSpec    : OpenAPI 3.1（可喂给 Prism / Mockoon / Microcks）
 */

const DEFAULT_STATE = { baseUrl: '', mode: 'local', source: '', routes: [] };

/** 解析用户输入的 body 文本：能 JSON.parse 成对象/数组就当 JSON，否则当纯文本。 */
export function parseBody(text) {
  const s = text == null ? '' : String(text);
  if (s.trim() === '') return { kind: 'empty', json: undefined, text: '' };
  try {
    const json = JSON.parse(s);
    // 只有对象/数组才当结构化 JSON 体；裸数字/字符串当文本更直观
    if (json && typeof json === 'object') return { kind: 'json', json, text: s };
  } catch (_) { /* 落到文本分支 */ }
  return { kind: 'text', json: undefined, text: s };
}

/** 规整单条路由：补默认值、大写方法、去掉重复斜杠。 */
export function normalizeRoute(r = {}) {
  const method = String(r.method || 'GET').toUpperCase();
  let path = String(r.path || '/');
  if (!path.startsWith('/')) path = `/${path}`;
  const status = Number.isFinite(+r.status) ? Math.trunc(+r.status) : 200;
  const delayMs = Math.max(0, Math.trunc(+r.delayMs || 0));
  return { method, path, status, delayMs, body: r.body == null ? '' : String(r.body) };
}

function withState(state) {
  const s = { ...DEFAULT_STATE, ...(state || {}) };
  s.baseUrl = String(s.baseUrl || '').replace(/\/+$/, '');
  s.routes = (s.routes || []).map(normalizeRoute);
  return s;
}

function contentTypeFor(body) {
  return body.kind === 'json' ? 'application/json' : 'text/plain; charset=utf-8';
}

function fullUrl(baseUrl, path) {
  return `${baseUrl}${path}`;
}

/** 生成一个合法的 Python 字符串字面量（借助 JSON 转义，对中文输出 \uXXXX，Python 同样接受）。 */
function pyStr(s) {
  return JSON.stringify(String(s == null ? '' : s));
}

/** 把一段 JSON 文本嵌进 Python：用 json.loads(<字面量>) 还原成 dict/list。 */
function pyJsonLoads(jsonText) {
  return `json.loads(${pyStr(jsonText)})`;
}

// ───────────────────────── g-mock 可植入配置 ─────────────────────────

/** 可被本地文件 / 远端 URL 加载的统一 mock 配置（g-mock v1 schema）。 */
export function gmockConfig(state) {
  const s = withState(state);
  const routes = s.routes.map((r) => {
    const body = parseBody(r.body);
    const out = {
      method: r.method,
      path: r.path,
      status: r.status,
    };
    if (r.delayMs) out.delayMs = r.delayMs;
    out.headers = { 'Content-Type': contentTypeFor(body) };
    if (body.kind === 'json') out.body = body.json;
    else if (body.kind === 'text') out.body = body.text;
    else out.body = null;
    return out;
  });
  return JSON.stringify({ version: 1, baseUrl: s.baseUrl, routes }, null, 2);
}

/** 用内置 g_mock.py 适配器，从本地/远端配置加载并绑定到 responses。 */
export function pythonGmock(state) {
  const s = withState(state);
  const localSrc = s.mode === 'local' && s.source ? s.source : 'mocks/g-mock.json';
  const remoteSrc = s.mode === 'remote' && s.source ? s.source : 'https://config.example.com/g-mock.json';
  const primary = s.mode === 'remote' ? remoteSrc : localSrc;
  return [
    '# 把 adapters/g_mock.py 放进你的项目（零依赖加载，绑定时才用到 responses/respx）。',
    '# 同一份配置：本地文件或远端 URL 都行，靠环境变量切换，无需改代码。',
    'import os',
    'import g_mock',
    '',
    '# 推荐用环境变量决定 mock 来源：本地路径，或 http(s):// 远端配置。',
    `MOCK_SOURCE = os.getenv("MOCK_SOURCE", ${pyStr(primary)})`,
    '',
    '',
    'def test_calls_external_api():',
    '    # 进入上下文即按配置注册所有路由；退出自动还原。',
    '    with g_mock.bind_responses(MOCK_SOURCE):',
    '        # 在这里调用你的被测代码（内部用 requests 发起的请求会被拦截）',
    '        ...',
    '',
    '# 远端共享同一套场景：',
    `#   MOCK_SOURCE=${remoteSrc} pytest`,
    '# 本地离线：',
    `#   MOCK_SOURCE=${localSrc} pytest`,
  ].join('\n');
}

// ───────────────────────── Python: responses (requests) ─────────────────────────

export function pythonResponses(state) {
  const s = withState(state);
  const lines = [
    'import json',
    'import responses',
    '',
    '',
    '@responses.activate',
    'def test_with_mocked_requests():',
  ];
  if (!s.routes.length) {
    lines.push('    # 还没有定义路由，先在工坊里加几条。');
    lines.push('    ...');
    return lines.join('\n');
  }
  for (const r of s.routes) {
    const body = parseBody(r.body);
    const url = fullUrl(s.baseUrl, r.path);
    lines.push('    responses.add(');
    lines.push(`        responses.${r.method},`);
    lines.push(`        ${pyStr(url)},`);
    if (body.kind === 'json') lines.push(`        json=${pyJsonLoads(body.text)},`);
    else if (body.kind === 'text') lines.push(`        body=${pyStr(body.text)},`);
    lines.push(`        status=${r.status},`);
    lines.push(`        content_type=${pyStr(contentTypeFor(body))},`);
    lines.push('    )');
    if (r.delayMs) lines.push(`    # 注：responses 不模拟延迟（${r.delayMs}ms）；要测超时改用 mock 服务或 side_effect。`);
  }
  lines.push('');
  lines.push('    # 在这里调用你的被测代码（用 requests 发起的请求会被拦截、离线返回上面的响应）');
  lines.push('    ...');
  return lines.join('\n');
}

// ───────────────────────── Python: respx (httpx, async-friendly) ─────────────────────────

export function pythonRespx(state) {
  const s = withState(state);
  const lines = [
    'import json',
    'import httpx',
    'import respx',
    '',
    '',
    '@respx.mock',
    'def test_with_mocked_httpx():',
  ];
  if (!s.routes.length) {
    lines.push('    # 还没有定义路由，先在工坊里加几条。');
    lines.push('    ...');
    return lines.join('\n');
  }
  for (const r of s.routes) {
    const body = parseBody(r.body);
    const url = fullUrl(s.baseUrl, r.path);
    const respArgs = [`${r.status}`];
    if (body.kind === 'json') respArgs.push(`json=${pyJsonLoads(body.text)}`);
    else if (body.kind === 'text') respArgs.push(`text=${pyStr(body.text)}`);
    lines.push(
      `    respx.route(method=${pyStr(r.method)}, url=${pyStr(url)}).mock(`,
    );
    lines.push(`        return_value=httpx.Response(${respArgs.join(', ')})`);
    lines.push('    )');
  }
  lines.push('');
  lines.push('    # 调用你的被测代码（httpx 同步/异步客户端的请求都会被拦截）');
  lines.push('    ...');
  return lines.join('\n');
}

// ───────────────────────── Python: pytest fixture（复用 g_mock）─────────────────────────

/** 复用型 pytest fixture：放进 conftest.py，任意测试加 `mocked_api` 参数即可。 */
export function pytestFixture(state) {
  const s = withState(state);
  const localSrc = s.mode === 'local' && s.source ? s.source : 'mocks/g-mock.json';
  const remoteSrc = s.mode === 'remote' && s.source ? s.source : 'https://config.example.com/g-mock.json';
  const primary = s.mode === 'remote' ? remoteSrc : localSrc;
  return [
    '# conftest.py — 复用型 mock fixture（依赖项目内的 adapters/g_mock.py）。',
    '# 任意测试函数加上 `mocked_api` 参数即可自动按配置 mock，退出自动还原。',
    'import os',
    'import pytest',
    'import g_mock',
    '',
    `MOCK_SOURCE = os.getenv("MOCK_SOURCE", ${pyStr(primary)})`,
    '',
    '',
    '@pytest.fixture',
    'def mocked_api():',
    '    # 本地文件或 http(s):// 远端配置都行，靠 MOCK_SOURCE 切换，无需改测试代码。',
    '    with g_mock.bind_responses(MOCK_SOURCE) as rsps:',
    '        yield rsps',
    '',
    '',
    '# ── 用法（写在你的 test_*.py 里）──',
    '# def test_calls_external_api(mocked_api):',
    '#     ...  # 调用被测代码；requests 请求会被拦截、按配置离线返回',
    `#     assert mocked_api.call_count >= 0   # 也可对捕获的请求做断言`,
  ].join('\n');
}

// ───────────────────────── Python: requests-mock ─────────────────────────

export function pythonRequestsMock(state) {
  const s = withState(state);
  const lines = [
    'import json',
    'import requests_mock',
    '',
    '',
    'def test_with_requests_mock():',
    '    with requests_mock.Mocker() as m:',
  ];
  if (!s.routes.length) {
    lines.push('        # 还没有定义路由，先在工坊里加几条。');
    lines.push('        ...');
    lines.push('        return');
    return lines.join('\n');
  }
  for (const r of s.routes) {
    const body = parseBody(r.body);
    const url = fullUrl(s.baseUrl, r.path);
    lines.push('        m.register_uri(');
    lines.push(`            ${pyStr(r.method)},`);
    lines.push(`            ${pyStr(url)},`);
    if (body.kind === 'json') lines.push(`            json=${pyJsonLoads(body.text)},`);
    else if (body.kind === 'text') lines.push(`            text=${pyStr(body.text)},`);
    lines.push(`            status_code=${r.status},`);
    lines.push(`            headers={"Content-Type": ${pyStr(contentTypeFor(body))}},`);
    lines.push('        )');
  }
  lines.push('');
  lines.push('        # 调用你的被测代码（requests 请求会被拦截、离线返回上面的响应）');
  lines.push('        ...');
  return lines.join('\n');
}

// ───────────────────────── VCR.py 磁带（JSON cassette，离线回放）─────────────────────────

const HTTP_REASON = {
  200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content',
  301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified',
  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found',
  409: 'Conflict', 422: 'Unprocessable Entity', 429: 'Too Many Requests',
  500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable',
};

/** 手写一盘 VCR.py JSON 磁带，可用 record_mode='none' 直接离线回放（无需先联网录制）。 */
export function vcrCassette(state) {
  const s = withState(state);
  const interactions = s.routes.map((r) => {
    const body = parseBody(r.body);
    const text = body.kind === 'json' ? JSON.stringify(body.json) : (body.kind === 'text' ? body.text : '');
    return {
      request: {
        method: r.method,
        uri: fullUrl(s.baseUrl, r.path),
        body: null,
        headers: {},
      },
      response: {
        status: { code: r.status, message: HTTP_REASON[r.status] || 'OK' },
        headers: { 'Content-Type': [contentTypeFor(body)] },
        body: { string: text },
      },
    };
  });
  return JSON.stringify({ version: 1, interactions }, null, 2);
}

// ───────────────────────── WireMock stub mappings ─────────────────────────

export function wiremockMappings(state) {
  const s = withState(state);
  const mappings = s.routes.map((r) => {
    const body = parseBody(r.body);
    const response = {
      status: r.status,
      headers: { 'Content-Type': contentTypeFor(body) },
    };
    if (body.kind === 'json') response.jsonBody = body.json;
    else if (body.kind === 'text') response.body = body.text;
    if (r.delayMs) response.fixedDelayMilliseconds = r.delayMs;
    return {
      request: { method: r.method, urlPath: r.path },
      response,
    };
  });
  return JSON.stringify({ mappings }, null, 2);
}

// ───────────────────────── OpenAPI 3.1（喂给 Prism / Mockoon / Microcks）─────────────────────────

const HTTP_METHODS = new Set(['GET', 'PUT', 'POST', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE']);

export function openapiSpec(state) {
  const s = withState(state);
  const paths = {};
  for (const r of s.routes) {
    const method = r.method.toLowerCase();
    if (!HTTP_METHODS.has(r.method)) continue; // OpenAPI 只接受标准方法
    const body = parseBody(r.body);
    const ct = body.kind === 'json' ? 'application/json' : 'text/plain';
    const example = body.kind === 'json' ? body.json : (body.kind === 'text' ? body.text : '');
    const response = { description: 'mock response' };
    if (body.kind !== 'empty') {
      response.content = { [ct]: { example } };
    }
    paths[r.path] = paths[r.path] || {};
    paths[r.path][method] = {
      summary: `mock ${r.method} ${r.path}`,
      responses: { [String(r.status)]: response },
    };
  }
  const spec = {
    openapi: '3.1.0',
    info: { title: 'g-mock Mock API', version: '1.0.0', description: '由 mock 研究室 · 配置工坊生成' },
    servers: s.baseUrl ? [{ url: s.baseUrl }] : [],
    paths,
  };
  return JSON.stringify(spec, null, 2);
}

// ───────────────────────── 汇总：一次产出所有格式 ─────────────────────────

/** 工坊用的输出格式清单（id / 标题 / 语言高亮提示 / 生成函数）。 */
export const GENERATORS = [
  { id: 'gmock-config', label: 'g-mock 配置', lang: 'json', file: 'mocks/g-mock.json', gen: gmockConfig,
    hint: '可植入的统一配置：本地文件或远端 URL 都能加载，团队共享一份。' },
  { id: 'gmock-python', label: 'Python · g_mock', lang: 'python', file: 'test_with_gmock.py', gen: pythonGmock,
    hint: '用内置 g_mock.py 适配器，从本地/远端配置一键绑定到 responses。' },
  { id: 'responses', label: 'Python · responses', lang: 'python', file: 'test_responses.py', gen: pythonResponses,
    hint: 'mock requests 的 HTTP 调用，离线、确定、可断言。' },
  { id: 'respx', label: 'Python · respx', lang: 'python', file: 'test_respx.py', gen: pythonRespx,
    hint: 'mock httpx（含 async），FastAPI/异步栈首选。' },
  { id: 'pytest', label: 'Python · pytest fixture', lang: 'python', file: 'conftest.py', gen: pytestFixture,
    hint: '复用型 fixture：放进 conftest.py，测试加 mocked_api 参数即用，本地/远端配置切换。' },
  { id: 'requests-mock', label: 'Python · requests-mock', lang: 'python', file: 'test_requests_mock.py', gen: pythonRequestsMock,
    hint: 'requests 的另一主流 mock 库，Mocker 上下文注册路由。' },
  { id: 'vcr', label: 'VCR.py 磁带', lang: 'json', file: 'cassettes/g-mock.json', gen: vcrCassette,
    hint: '手写 JSON 磁带，record_mode=\'none\' 直接离线回放，无需先联网录制。' },
  { id: 'wiremock', label: 'WireMock 映射', lang: 'json', file: 'wiremock/mappings.json', gen: wiremockMappings,
    hint: '独立 mock 服务的 stub 映射，可经 admin API 远端下发。' },
  { id: 'openapi', label: 'OpenAPI 3.1', lang: 'json', file: 'openapi.json', gen: openapiSpec,
    hint: '业界标准规格，可直接喂给 Prism / Mockoon / Microcks 起 mock。' },
];

/** 给定 state，产出 { [id]: 文本 } 的全部结果。 */
export function generateAll(state) {
  const out = {};
  for (const g of GENERATORS) out[g.id] = g.gen(state);
  return out;
}

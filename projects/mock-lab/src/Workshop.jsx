/**
 * Mock 配置工坊 · 交互界面。
 * 用户定义一组路由（方法 / 路径 / 状态码 / 延迟 / 响应体）与全局配置（baseUrl、本地/远端来源），
 * 实时生成多种「即取即用、符合业界标准」的产物（Python 优先）：
 *   g-mock 配置 · Python(g_mock) · responses · respx · WireMock · OpenAPI。
 * 生成逻辑全在纯函数 codegen.js 里（可单测）；本组件只管交互与展示。
 */
import React, { useMemo, useState } from 'react';
import { GENERATORS, generateAll, parseBody } from './codegen.js';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const STARTER_ROUTES = [
  { method: 'GET', path: '/users/1', status: 200, delayMs: 0, body: '{\n  "id": 1,\n  "name": "Ada",\n  "email": "ada@example.com"\n}' },
  { method: 'POST', path: '/login', status: 401, delayMs: 200, body: '{\n  "error": "invalid_credentials"\n}' },
];

let RID = 0;
const withId = (r) => ({ ...r, _id: ++RID });

function CopyButton({ text }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      // 退化方案：选中 + execCommand
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) { /* ignore */ }
      document.body.removeChild(ta);
    }
    setDone(true);
    setTimeout(() => setDone(false), 1400);
  };
  return (
    <button type="button" className={`mkl-copy${done ? ' done' : ''}`} onClick={copy}>
      {done ? '已复制 ✓' : '复制'}
    </button>
  );
}

function RouteEditor({ route, onChange, onRemove }) {
  const body = parseBody(route.body);
  const kind = body.kind;
  const set = (k, v) => onChange({ ...route, [k]: v });
  return (
    <div className="mkl-route">
      <div className="mkl-route-head">
        <select className="mkl-select" value={route.method} onChange={(e) => set('method', e.target.value)} aria-label="方法">
          {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input className="mkl-path" value={route.path} onChange={(e) => set('path', e.target.value)}
          placeholder="/users/1" aria-label="路径" />
        <input className="mkl-status" type="number" value={route.status}
          onChange={(e) => set('status', e.target.value)} aria-label="状态码" title="HTTP 状态码" />
        <input className="mkl-delay" type="number" min="0" value={route.delayMs}
          onChange={(e) => set('delayMs', e.target.value)} aria-label="延迟毫秒" title="模拟延迟（毫秒）" placeholder="delay" />
        <button type="button" className="mkl-rmv" onClick={onRemove} aria-label="删除路由" title="删除">✕</button>
      </div>
      <textarea value={route.body} onChange={(e) => set('body', e.target.value)}
        placeholder='响应体：JSON（如 {"ok": true}）或纯文本' aria-label="响应体" />
      <div className={`mkl-mini ${kind}`}>
        {kind === 'json' ? '✓ 识别为 JSON 体（jsonBody / json=）'
          : kind === 'text' ? '› 文本体（body= / text=）'
            : '空响应体'}
      </div>
    </div>
  );
}

export default function Workshop() {
  const [baseUrl, setBaseUrl] = useState('https://api.example.com');
  const [mode, setMode] = useState('local'); // local | remote
  const [source, setSource] = useState('mocks/g-mock.json');
  const [routes, setRoutes] = useState(() => STARTER_ROUTES.map(withId));
  const [out, setOut] = useState(GENERATORS[0].id);

  const state = useMemo(() => ({
    baseUrl,
    mode,
    source,
    routes: routes.map(({ _id, ...r }) => r),
  }), [baseUrl, mode, source, routes]);

  const results = useMemo(() => generateAll(state), [state]);
  const activeGen = GENERATORS.find((g) => g.id === out) || GENERATORS[0];
  const code = results[activeGen.id] || '';

  const addRoute = () => setRoutes((rs) => [...rs, withId({ method: 'GET', path: '/new', status: 200, delayMs: 0, body: '{\n  "ok": true\n}' })]);
  const updateRoute = (id, next) => setRoutes((rs) => rs.map((r) => (r._id === id ? { ...next, _id: id } : r)));
  const removeRoute = (id) => setRoutes((rs) => rs.filter((r) => r._id !== id));
  const reset = () => setRoutes(STARTER_ROUTES.map(withId));

  const onModeChange = (m) => {
    setMode(m);
    // 切换时给个贴合的默认来源，用户可继续编辑
    setSource((cur) => {
      if (m === 'remote' && !/^https?:\/\//.test(cur)) return 'https://config.example.com/g-mock.json';
      if (m === 'local' && /^https?:\/\//.test(cur)) return 'mocks/g-mock.json';
      return cur;
    });
  };

  return (
    <div>
      <p className="mkl-out-hint" style={{ marginTop: 6 }}>
        在左边定义路由与来源，右边即时得到 <b>可植入</b> 的配置与代码。
        核心思路：把「mock 哪些、返回什么」抽成一份 <b>g-mock 配置</b>，
        既能从<b>本地文件</b>读、也能从<b>远端 URL</b> 拉，用一个环境变量切换 mock / 真实——尤其适合 Python。
      </p>

      <div className="mkl-ws">
        {/* 左：定义 */}
        <div className="mkl-panel">
          <h2>① 定义你的 Mock</h2>
          <p className="mkl-phint">基础地址 + 路由集合。响应体填 JSON 或纯文本，工坊会自动识别。</p>

          <div className="mkl-field">
            <label>BASE URL（被 mock 的服务根地址）</label>
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com" />
          </div>

          <div className="mkl-row2">
            <div className="mkl-field">
              <label>配置来源（g_mock 加载方式）</label>
              <div className="mkl-modetog" role="group" aria-label="配置来源">
                <button type="button" className={mode === 'local' ? 'on' : ''} onClick={() => onModeChange('local')}>本地文件</button>
                <button type="button" className={mode === 'remote' ? 'on' : ''} onClick={() => onModeChange('remote')}>远端 URL</button>
              </div>
            </div>
            <div className="mkl-field">
              <label>{mode === 'remote' ? '远端配置 URL' : '本地配置路径'}</label>
              <input value={source} onChange={(e) => setSource(e.target.value)}
                placeholder={mode === 'remote' ? 'https://config.example.com/g-mock.json' : 'mocks/g-mock.json'} />
            </div>
          </div>

          <div className="mkl-routes">
            {routes.map((r) => (
              <RouteEditor key={r._id} route={r}
                onChange={(next) => updateRoute(r._id, next)}
                onRemove={() => removeRoute(r._id)} />
            ))}
          </div>

          <div className="mkl-addrow">
            <button type="button" className="mkl-btn primary" onClick={addRoute}>+ 添加路由</button>
            <button type="button" className="mkl-btn ghost" onClick={reset}>重置为示例</button>
            <span style={{ flex: 1 }} />
            <span className="mkl-lbl" style={{ alignSelf: 'center' }}>{routes.length} 条路由</span>
          </div>
        </div>

        {/* 右：产出 */}
        <div className="mkl-panel">
          <h2>② 即取即用的产物</h2>
          <p className="mkl-phint">选一种格式，一键复制到你的项目。同一份定义，多端通用。</p>

          <div className="mkl-out-tabs">
            {GENERATORS.map((g) => (
              <button key={g.id} type="button" className={`mkl-otab${out === g.id ? ' on' : ''}`}
                onClick={() => setOut(g.id)}>{g.label}</button>
            ))}
          </div>

          <p className="mkl-out-hint">{activeGen.hint}</p>

          <div className="mkl-codewrap">
            <CopyButton text={code} />
            <pre><code>{code}</code></pre>
          </div>
          <p className="mkl-filename">建议文件名：{activeGen.file}</p>
        </div>
      </div>
    </div>
  );
}

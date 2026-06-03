/**
 * 股市观测 —— 数据层（数据源适配器）
 * ------------------------------------------------------------------
 * GitHub Pages 无后端，数据全部由浏览器直接向第三方 API 取。
 * 这里抽象出统一的「行情提供方」接口，便于切换 / 扩展：
 *   - demo    ：本地合成的演示数据（确定性、始终可用、含迷你走势）
 *   - finnhub ：finnhub.io 免费实时行情（CORS 友好，需用户自带免费 key）
 *
 * 统一返回的标准化行情对象 Quote：
 *   { symbol, price, change, changePct, prevClose, series:number[]|null, demo:boolean, error?:string }
 */

/* ----------------------------- 演示数据 ----------------------------- */
// 由字符串生成稳定种子，使同一标的每次刷新基本一致（带轻微波动）
function seedFrom(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function demoQuote(symbol) {
  const r = rng(seedFrom(symbol.toUpperCase()));
  const base = 15 + r() * 485; // 15 ~ 500
  const vol = 0.008 + r() * 0.02; // 每步波动率
  // 生成 30 点随机游走
  const n = 30;
  const series = [];
  let p = base;
  for (let i = 0; i < n; i++) {
    p = Math.max(1, p * (1 + (r() - 0.5) * 2 * vol));
    series.push(p);
  }
  // 叠加当日实时小漂移
  const drift = (r() - 0.5) * 2 * vol;
  const price = Math.max(1, series[n - 1] * (1 + drift));
  const prevClose = series[n - 2];
  return {
    symbol: symbol.toUpperCase(),
    price,
    change: price - prevClose,
    changePct: ((price - prevClose) / prevClose) * 100,
    prevClose,
    series,
    demo: true,
  };
}

/* ----------------------------- Finnhub ----------------------------- */
// 免费实时报价：/quote?symbol=AAPL&token=KEY  →  {c,d,dp,h,l,o,pc}
export async function finnhubQuote(symbol, apiKey) {
  const sym = symbol.toUpperCase();
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (res.status === 401 || res.status === 403) throw new Error('API key 无效或权限不足');
  if (res.status === 429) throw new Error('请求过于频繁（免费额度限制）');
  if (!res.ok) throw new Error('请求失败 ' + res.status);
  const d = await res.json();
  if (d.c == null || d.c === 0) throw new Error('无此标的或暂无报价');
  return {
    symbol: sym,
    price: d.c,
    change: d.d != null ? d.d : d.c - d.pc,
    changePct: d.dp != null ? d.dp : ((d.c - d.pc) / d.pc) * 100,
    prevClose: d.pc,
    series: null, // 免费版无历史K线权限，走势图留空
    demo: false,
  };
}

/* ----------------------------- 行情代理（Cloudflare Worker 等） ----------------------------- */
// 自建无状态代理转发 Yahoo Finance（覆盖美股 / A股 .SS·.SZ / 港股 .HK，含历史走势）。
// 代理实现见 stocks/proxy/worker.js；部署后把 URL 填进设置。
export async function proxyQuote(symbol, proxyUrl) {
  const sym = symbol.toUpperCase();
  const base = (proxyUrl || '').replace(/\/+$/, '');
  if (!base) throw new Error('未配置代理 URL');
  const res = await fetch(`${base}?symbol=${encodeURIComponent(sym)}`);
  if (!res.ok) throw new Error('代理请求失败 ' + res.status);
  const d = await res.json();
  if (d.error) throw new Error(d.error);
  if (d.price == null) throw new Error('无此标的或暂无报价');
  return {
    symbol: d.symbol || sym,
    price: d.price,
    change: d.change != null ? d.change : d.prevClose != null ? d.price - d.prevClose : 0,
    changePct: d.changePct != null ? d.changePct : d.prevClose ? ((d.price - d.prevClose) / d.prevClose) * 100 : 0,
    prevClose: d.prevClose,
    series: Array.isArray(d.series) && d.series.length >= 2 ? d.series : null,
    demo: false,
  };
}

/* --------------------------- 统一取数入口 --------------------------- */
/**
 * 批量取多只标的行情，逐只容错（单只失败不影响其他）。
 * @param {string[]} symbols
 * @param {{provider:'demo'|'finnhub'|'proxy', apiKey?:string, proxyUrl?:string}} opts
 * @returns {Promise<Quote[]>}
 */
export async function fetchQuotes(symbols, { provider = 'demo', apiKey = '', proxyUrl = '' } = {}) {
  const list = (symbols || []).map((s) => s.trim().toUpperCase()).filter(Boolean);

  if (provider === 'finnhub') {
    if (!apiKey) return list.map((s) => ({ symbol: s, error: '未配置 Finnhub API key', demo: false }));
    return Promise.all(
      list.map(async (s) => {
        try {
          return await finnhubQuote(s, apiKey);
        } catch (e) {
          return { symbol: s, error: e.message || '获取失败', demo: false };
        }
      })
    );
  }

  if (provider === 'proxy') {
    if (!proxyUrl) return list.map((s) => ({ symbol: s, error: '未配置代理 URL', demo: false }));
    return Promise.all(
      list.map(async (s) => {
        try {
          return await proxyQuote(s, proxyUrl);
        } catch (e) {
          return { symbol: s, error: e.message || '获取失败', demo: false };
        }
      })
    );
  }

  // demo
  return list.map((s) => demoQuote(s));
}

/* ----------------------------- 展示格式化 ----------------------------- */
export function formatPrice(v) {
  if (v == null || isNaN(v)) return '—';
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function formatChange(v, { sign = true } = {}) {
  if (v == null || isNaN(v)) return '—';
  const s = sign && v > 0 ? '+' : '';
  return s + v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function formatPct(v) {
  if (v == null || isNaN(v)) return '—';
  return (v > 0 ? '+' : '') + v.toFixed(2) + '%';
}

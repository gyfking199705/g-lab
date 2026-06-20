/**
 * 行情代理 —— Cloudflare Worker
 * ------------------------------------------------------------------
 * 作用：浏览器无法直连的行情源（缺 CORS、需特定 Header），由这个「无状态中转」
 *      在服务端代为请求，并补上 CORS 头返回给浏览器。它本身不存任何数据。
 *
 * 上游：Yahoo Finance chart API —— 一个源覆盖
 *   · 美股：AAPL、NVDA、MSFT …
 *   · A股：上证 600519.SS、深证 000001.SZ
 *   · 港股：00700.HK；指数：^GSPC、000001.SS 等
 *   且自带历史收盘价，可画走势图。
 *
 * 用法：GET https://<your-worker>.workers.dev/?symbol=AAPL[&range=1mo&interval=1d]
 * 返回：{ symbol, name, currency, price, prevClose, change, changePct, series:number[]|null }
 *
 * 部署见同目录 README.md。部署后把 Worker URL 填进 App「股市观测 → 设置 → 行情代理 URL」。
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=15',
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    const symbol = (url.searchParams.get('symbol') || '').trim();
    if (!symbol) return json({ error: 'missing symbol 参数' }, 400);

    // 仅允许合法标的字符，避免被当成开放代理滥用
    if (!/^[A-Za-z0-9.\-=^]{1,16}$/.test(symbol)) return json({ error: 'illegal symbol' }, 400);

    const range = url.searchParams.get('range') || '1mo';
    const interval = url.searchParams.get('interval') || '1d';
    const upstream =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
      `?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;

    try {
      const r = await fetch(upstream, {
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
        cf: { cacheTtl: 15, cacheEverything: true },
      });
      if (!r.ok) return json({ error: 'upstream ' + r.status, symbol }, 502);
      const d = await r.json();
      const res = d && d.chart && d.chart.result && d.chart.result[0];
      if (!res) {
        const msg = d && d.chart && d.chart.error && d.chart.error.description;
        return json({ error: msg || 'no data', symbol }, 404);
      }
      const meta = res.meta || {};
      const price = meta.regularMarketPrice != null ? meta.regularMarketPrice : null;
      const prevClose =
        meta.chartPreviousClose != null ? meta.chartPreviousClose
        : meta.previousClose != null ? meta.previousClose
        : null;
      const closes = ((res.indicators && res.indicators.quote && res.indicators.quote[0] && res.indicators.quote[0].close) || [])
        .filter((v) => v != null);
      const change = price != null && prevClose != null ? price - prevClose : null;
      const changePct = change != null && prevClose ? (change / prevClose) * 100 : null;

      return json({
        symbol: meta.symbol || symbol,
        name: meta.shortName || meta.longName || '',
        currency: meta.currency || '',
        price,
        prevClose,
        change,
        changePct,
        series: closes.length >= 2 ? closes : null,
      });
    } catch (e) {
      return json({ error: String(e && e.message ? e.message : e), symbol }, 500);
    }
  },
};

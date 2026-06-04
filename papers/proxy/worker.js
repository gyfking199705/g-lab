/**
 * arXiv 代理 —— Cloudflare Worker
 * ------------------------------------------------------------------
 * 作用：浏览器纯前端直连 arXiv API 常被 CORS 挡；这个「无状态中转」在服务端
 *      代为请求 arXiv，并补上 CORS 头返回。它本身不存任何数据、不需要 key。
 *
 * 契约（与 papers/arxiv.js 的 fetchArxiv 一致）：
 *   GET https://<your-worker>.workers.dev/?url=<对 export.arxiv.org/api/query 的完整 URL，需 encodeURIComponent>
 *   返回：原样的 Atom XML（带 CORS 头）
 *
 * 安全：只允许转发 export.arxiv.org 的请求，避免被当成开放代理滥用。
 * 部署见同目录 README.md；部署后把 Worker URL 填进 App「论文阅读 → 订阅设置 → 自建代理 URL」。
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=300',
};

const ALLOWED_HOSTS = ['export.arxiv.org', 'arxiv.org'];

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const reqUrl = new URL(request.url);
    const target = reqUrl.searchParams.get('url');
    if (!target) {
      return new Response('missing url 参数', { status: 400, headers: CORS });
    }

    let upstream;
    try {
      upstream = new URL(target);
    } catch (e) {
      return new Response('url 非法', { status: 400, headers: CORS });
    }
    if (!ALLOWED_HOSTS.includes(upstream.hostname)) {
      return new Response('只允许代理 arXiv', { status: 403, headers: CORS });
    }

    try {
      const res = await fetch(upstream.toString(), {
        headers: { Accept: 'application/atom+xml,application/xml,text/xml', 'User-Agent': 'g-lab-papers-proxy/1.0' },
      });
      const body = await res.text();
      return new Response(body, {
        status: res.status,
        headers: { 'Content-Type': 'application/atom+xml; charset=utf-8', ...CORS },
      });
    } catch (e) {
      return new Response('上游请求失败：' + (e && e.message || e), { status: 502, headers: CORS });
    }
  },
};

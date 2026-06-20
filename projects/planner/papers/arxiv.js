/**
 * arXiv 数据客户端
 * ------------------------------------------------------------------
 * 纯前端访问 arXiv 公开 API（export.arxiv.org/api/query，返回 Atom XML）。
 * 纯函数（buildQueryUrl / parseArxivAtom / normalizeId）便于单测；
 * fetchArxiv 负责网络：先直连，失败再经公共 CORS 代理兜底（同股市模块思路）。
 *
 * 可测试：node --test papers/arxiv.test.js
 */

const ARXIV_API = 'https://export.arxiv.org/api/query';

/** 常用 arXiv 分类（用于订阅推荐的选择器）。 */
export const ARXIV_CATEGORIES = [
  { id: 'cs.LG', label: '机器学习 (cs.LG)' },
  { id: 'cs.AI', label: '人工智能 (cs.AI)' },
  { id: 'cs.CL', label: '计算语言学/NLP (cs.CL)' },
  { id: 'cs.CV', label: '计算机视觉 (cs.CV)' },
  { id: 'cs.NE', label: '神经与进化计算 (cs.NE)' },
  { id: 'stat.ML', label: '统计机器学习 (stat.ML)' },
  { id: 'cs.RO', label: '机器人 (cs.RO)' },
  { id: 'cs.CR', label: '密码学与安全 (cs.CR)' },
  { id: 'cs.DC', label: '分布式计算 (cs.DC)' },
  { id: 'q-bio.NC', label: '神经科学 (q-bio.NC)' },
];

/**
 * 构造 arXiv 查询 URL（纯函数）。
 * @param {{categories?:string[], keywords?:string[], ids?:string[], start?:number, maxResults?:number,
 *          sortBy?:'submittedDate'|'relevance'|'lastUpdatedDate', sortOrder?:'ascending'|'descending'}} opts
 */
export function buildQueryUrl(opts = {}) {
  const { categories = [], keywords = [], ids = [], start = 0, maxResults = 30,
    sortBy = 'submittedDate', sortOrder = 'descending' } = opts;
  const params = [];

  if (ids.length) {
    params.push('id_list=' + ids.map((s) => normalizeId(s)).filter(Boolean).join(','));
  } else {
    const catExpr = categories.length ? '(' + categories.map((c) => `cat:${c}`).join('+OR+') + ')' : '';
    const kwExpr = keywords.length
      ? '(' + keywords.map((k) => `all:${encodeURIComponent('"' + k.trim() + '"')}`).join('+OR+') + ')'
      : '';
    const search = [catExpr, kwExpr].filter(Boolean).join('+AND+') || 'all:machine+learning';
    params.push('search_query=' + search);
    params.push(`sortBy=${sortBy}`, `sortOrder=${sortOrder}`);
  }
  params.push(`start=${Math.max(0, start)}`, `max_results=${Math.max(1, Math.min(100, maxResults))}`);
  return `${ARXIV_API}?${params.join('&')}`;
}

/** 把各种形态的 arXiv 标识规整成裸 id（去掉 URL / 版本号）。 */
export function normalizeId(raw) {
  if (!raw) return '';
  let s = String(raw).trim();
  s = s.replace(/^https?:\/\/arxiv\.org\/(abs|pdf)\//i, '');
  s = s.replace(/\.pdf$/i, '');
  s = s.replace(/v\d+$/i, ''); // 去版本号，便于去重
  return s;
}

/** 取标签内文本（第一个匹配）。 */
function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1].trim().replace(/\s+/g, ' ')) : '';
}
function decode(s) {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * 解析 arXiv Atom XML 为论文数组（纯函数，正则解析，node/浏览器通用）。
 * @returns {Array<{id,title,summary,authors:string[],categories:string[],primary:string,published,updated,absUrl,pdfUrl}>}
 */
export function parseArxivAtom(xml) {
  if (!xml || typeof xml !== 'string') return [];
  const entries = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  return entries.map((e) => {
    const idRaw = tag(e, 'id');
    const id = normalizeId(idRaw);
    const authors = (e.match(/<author>[\s\S]*?<\/author>/gi) || [])
      .map((a) => tag(a, 'name')).filter(Boolean);
    const categories = (e.match(/<category[^>]*term="([^"]+)"/gi) || [])
      .map((c) => (c.match(/term="([^"]+)"/i) || [])[1]).filter(Boolean);
    const primaryM = e.match(/<arxiv:primary_category[^>]*term="([^"]+)"/i);
    const pdfM = e.match(/<link[^>]*title="pdf"[^>]*href="([^"]+)"/i);
    return {
      id,
      title: tag(e, 'title'),
      summary: tag(e, 'summary'),
      authors,
      categories: [...new Set(categories)],
      primary: primaryM ? primaryM[1] : categories[0] || '',
      published: (tag(e, 'published') || '').slice(0, 10),
      updated: (tag(e, 'updated') || '').slice(0, 10),
      absUrl: idRaw || (id ? `https://arxiv.org/abs/${id}` : ''),
      pdfUrl: pdfM ? pdfM[1] : (id ? `https://arxiv.org/pdf/${id}` : ''),
    };
  }).filter((p) => p.id && p.title);
}

/**
 * 拉取并解析 arXiv（impure）。先直连，失败依次过公共代理；可传自建 proxyUrl 最优先。
 * 每个尝试都有超时，避免某个代理挂起导致一直转圈。
 * @param {object} opts buildQueryUrl 的参数
 * @param {{proxyUrl?:string, signal?:AbortSignal, timeoutMs?:number, onStatus?:(s:string)=>void}} [net]
 */
export async function fetchArxiv(opts = {}, { proxyUrl = '', signal, timeoutMs = 11000, onStatus } = {}) {
  if (typeof fetch !== 'function') throw new Error('当前环境不支持 fetch');
  const target = buildQueryUrl(opts);
  const steps = [];
  if (proxyUrl) steps.push({ name: '自建代理', wrap: (u) => proxyUrl.replace(/\/+$/, '') + '?url=' + encodeURIComponent(u) });
  steps.push({ name: '直连 arXiv', wrap: (u) => u });
  steps.push({ name: '公共代理 1', wrap: (u) => 'https://corsproxy.io/?url=' + encodeURIComponent(u) });
  steps.push({ name: '公共代理 2', wrap: (u) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u) });

  let lastErr = null;
  for (const step of steps) {
    if (signal && signal.aborted) throw new DOMException('aborted', 'AbortError');
    if (onStatus) onStatus(`正在尝试：${step.name}…`);
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    if (signal) signal.addEventListener('abort', onAbort);
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(step.wrap(target), { signal: ctrl.signal, headers: { Accept: 'application/atom+xml,application/xml,text/xml' } });
      if (!res.ok) { lastErr = new Error(`${step.name} 返回 HTTP ${res.status}`); continue; }
      const xml = await res.text();
      const papers = parseArxivAtom(xml);
      if (papers.length || /<feed/i.test(xml)) return papers; // 合法 feed（可能 0 结果）
      lastErr = new Error(`${step.name} 返回内容无法解析`);
    } catch (e) {
      if (signal && signal.aborted) throw new DOMException('aborted', 'AbortError');
      lastErr = new Error(`${step.name} ${e.name === 'AbortError' ? '超时' : '失败'}`);
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
    }
  }
  throw new Error((lastErr ? lastErr.message + '；' : '') + '都没成功，可在设置里填自建代理 URL');
}

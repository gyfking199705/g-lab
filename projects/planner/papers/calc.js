/**
 * 论文阅读器 —— 纯函数计算逻辑（不依赖 React / UI / 网络）
 * ------------------------------------------------------------------
 * 阅读清单项 item = {
 *   id, title, authors:[], summary, categories:[], primary, published, updated, absUrl, pdfUrl,
 *   status: 'want' | 'reading' | 'done',
 *   rating?(1-5), notes?, aiSummary?, addedAt, doneAt?
 * }
 * 数据：{ v, settings:{categories,keywords,maxResults,proxyUrl}, items:[...] }
 *
 * 可测试：node --test papers/calc.test.js
 */
import { todayStr, addDays } from '../core/date.js';

export const STATUSES = [
  { id: 'want', label: '想读', icon: '🔖' },
  { id: 'reading', label: '在读', icon: '📖' },
  { id: 'done', label: '已读', icon: '✅' },
];
export const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.id, s.label]));

/** 按状态计数 + 总数。 */
export function statusCounts(items = []) {
  const c = { want: 0, reading: 0, done: 0, total: items.length };
  for (const it of items) if (c[it.status] != null) c[it.status] += 1;
  return c;
}

/** 阅读进度（已读 / 总）。 */
export function readProgress(items = []) {
  if (!items.length) return 0;
  return statusCounts(items).done / items.length;
}

/** 过滤 + 排序：status 为 'all' 不过滤；已读按完成时间倒序，其余按加入时间倒序。 */
export function filterItems(items = [], status = 'all') {
  const list = status === 'all' ? items : items.filter((it) => it.status === status);
  return [...list].sort((a, b) => {
    const ka = a.status === 'done' ? (a.doneAt || a.addedAt || '') : (a.addedAt || '');
    const kb = b.status === 'done' ? (b.doneAt || b.addedAt || '') : (b.addedAt || '');
    return ka < kb ? 1 : ka > kb ? -1 : 0;
  });
}

/** 是否已在清单中（按 id）。 */
export function isSaved(items = [], id) {
  return items.some((it) => it.id === id);
}

/** 把推荐/搜索结果中已加入清单的标记出来。 */
export function annotateSaved(papers = [], items = []) {
  const set = new Set(items.map((it) => it.id));
  return papers.map((p) => ({ ...p, saved: set.has(p.id) }));
}

/** 已读论文的连续天数（按 doneAt 日期；今天没读不立刻断，从昨天数）。 */
export function readingStreak(items = [], today = todayStr()) {
  const days = new Set(items.filter((it) => it.status === 'done' && it.doneAt).map((it) => it.doneAt.slice(0, 10)));
  if (!days.size) return 0;
  let streak = 0;
  let cursor = days.has(today) ? today : addDays(today, -1);
  while (days.has(cursor)) { streak += 1; cursor = addDays(cursor, -1); }
  return streak;
}

/** 最近 n 天读完的篇数。 */
export function doneInLastDays(items = [], n = 7, today = todayStr()) {
  const from = addDays(today, -(n - 1));
  return items.filter((it) => it.status === 'done' && it.doneAt && it.doneAt.slice(0, 10) >= from).length;
}

/** 按主分类统计已读分布（降序）。 */
export function byCategory(items = []) {
  const map = {};
  for (const it of items) {
    if (it.status !== 'done') continue;
    const c = it.primary || (it.categories || [])[0] || '其它';
    map[c] = (map[c] || 0) + 1;
  }
  return Object.keys(map).map((c) => ({ category: c, count: map[c] })).sort((a, b) => b.count - a.count);
}

/** 阅读进度摘要（供首页看板 / 模块 KPI）。 */
export function summary(items = [], today = todayStr()) {
  const c = statusCounts(items);
  return {
    ...c,
    progressPct: Math.round(readProgress(items) * 100),
    streak: readingStreak(items, today),
    thisWeek: doneInLastDays(items, 7, today),
  };
}

/* ----------------------------- AI 总结 Prompt（纯构造，便于测试/复用） ----------------------------- */

/** 构造让 AI「读懂这篇论文摘要」的消息（中文输出，结构化）。 */
export function buildSummaryMessages(paper) {
  const system =
    '你是一位严谨的科研助理。基于用户提供的论文标题与摘要，用简体中文输出结构化解读，' +
    '帮助读者快速判断是否值得精读。不要编造摘要中没有的信息；信息不足处注明“摘要未提及”。';
  const user =
    `请解读这篇 arXiv 论文：\n\n` +
    `标题：${paper.title}\n` +
    `作者：${(paper.authors || []).join(', ') || '未知'}\n` +
    `分类：${(paper.categories || []).join(', ') || '未知'}\n` +
    `摘要：\n${paper.summary || '（无摘要）'}\n\n` +
    `请按以下小标题输出（简洁、要点式）：\n` +
    `1. 一句话概括\n2. 要解决的问题\n3. 核心方法/思路\n4. 主要结论或亮点\n5. 适合谁读 / 前置知识`;
  return { system, user };
}

/** 简单字符串哈希（确定性，用于「每日精选」按日期稳定选一篇）。 */
export function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * 每日精选：在候选列表里按「日期」确定性地选一篇（同一天稳定不变）。
 * @returns {object|null}
 */
export function dailyPick(papers = [], dateStr = todayStr()) {
  if (!papers || !papers.length) return null;
  return papers[hashStr(dateStr) % papers.length];
}

/** 估算阅读时长（基于摘要词数的粗略提示，纯展示用）。 */
export function estimateReadMinutes(paper) {
  const words = (paper.summary || '').split(/\s+/).filter(Boolean).length;
  // 摘要约占全文 1/30，按 200 词/分钟、全文估算
  const full = Math.max(words * 25, 1500);
  return Math.max(8, Math.round(full / 200));
}

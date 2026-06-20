/**
 * 纯逻辑：知识库的筛选、搜索、排序、统计。
 * 不依赖 React / DOM，便于 `node --test` 单测与复用。
 */

import { MATURITY, LEVEL } from '../data/systems.js';

/** 折叠大小写 + 去空白，便于搜索匹配。 */
function norm(s) {
  return String(s == null ? '' : s).toLowerCase();
}

/**
 * 收集所有标签及出现次数，按出现次数降序、同次数按字母序。
 * @returns {{tag:string,count:number}[]}
 */
export function collectTags(items) {
  const counts = new Map();
  for (const it of items) {
    for (const t of it.tags || []) counts.set(t, (counts.get(t) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** 单条目是否命中关键词（标题/摘要/标签/why/how 任一包含）。 */
export function matchesQuery(item, query) {
  const q = norm(query).trim();
  if (!q) return true;
  const hay = [
    item.title,
    item.summary,
    item.why,
    (item.tags || []).join(' '),
    (item.how || []).join(' '),
  ].map(norm).join('  ');
  // 支持空格分隔的多关键词「与」匹配
  return q.split(/\s+/).every((tok) => hay.includes(tok));
}

/**
 * 按条件筛选条目。所有条件之间是「与」关系；同一维度内的多选是「或」。
 * @param {Array} items
 * @param {{query?:string, categories?:string[], tags?:string[], maturities?:string[]}} f
 */
export function filterItems(items, f = {}) {
  const cats = new Set(f.categories || []);
  const tags = new Set(f.tags || []);
  const mats = new Set(f.maturities || []);
  return items.filter((it) => {
    if (cats.size && !cats.has(it.category)) return false;
    if (mats.size && !mats.has(it.maturity)) return false;
    if (tags.size && !(it.tags || []).some((t) => tags.has(t))) return false;
    if (!matchesQuery(it, f.query)) return false;
    return true;
  });
}

const SORTERS = {
  // 影响力高→低，其次落地成本低→高（高性价比靠前）
  impact: (a, b) => order(LEVEL, b.impact) - order(LEVEL, a.impact)
    || order(LEVEL, a.effort) - order(LEVEL, b.effort)
    || a.title.localeCompare(b.title),
  // 成熟度高→低
  maturity: (a, b) => order(MATURITY, b.maturity) - order(MATURITY, a.maturity)
    || a.title.localeCompare(b.title),
  // 性价比：impact 高且 effort 低优先（impact 分 - effort 分）
  roi: (a, b) => roi(b) - roi(a) || a.title.localeCompare(b.title),
  title: (a, b) => a.title.localeCompare(b.title),
};

function order(map, key) {
  return (map[key] && map[key].order) || 0;
}
function roi(it) {
  return order(LEVEL, it.impact) - order(LEVEL, it.effort);
}

/** 返回排序后的新数组（不修改入参）。未知键回退到 impact。 */
export function sortItems(items, key = 'impact') {
  const cmp = SORTERS[key] || SORTERS.impact;
  return [...items].sort(cmp);
}

/** 汇总统计：总数、各分类数、各成熟度数、标签数。 */
export function summarize(items) {
  const byCategory = {};
  const byMaturity = {};
  for (const it of items) {
    byCategory[it.category] = (byCategory[it.category] || 0) + 1;
    byMaturity[it.maturity] = (byMaturity[it.maturity] || 0) + 1;
  }
  return {
    total: items.length,
    byCategory,
    byMaturity,
    tagCount: collectTags(items).length,
  };
}

export { roi };

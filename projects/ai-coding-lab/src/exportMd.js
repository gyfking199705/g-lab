/**
 * 纯逻辑：把知识库条目导出为 Markdown 速查表。
 * 无 React/DOM 依赖，便于 node --test 单测；下载交互在 App 里完成。
 */
import { CATEGORIES, MATURITY, LEVEL } from '../data/practices.js';

const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));
const lv = (k) => (LEVEL[k] && LEVEL[k].label) || k;
const mt = (k) => (MATURITY[k] && MATURITY[k].label) || k;

/** 单条转 Markdown 片段（### 小节）。 */
function itemToMd(it) {
  const lines = [`### ${it.title}`, '', it.summary, ''];
  if (it.why) lines.push(`- **为什么有效**：${it.why}`);
  if (it.how && it.how.length) lines.push(`- **怎么落地**：${it.how.join('；')}`);
  if (it.whenToUse) lines.push(`- **何时使用**：${it.whenToUse}`);
  if (it.pitfalls && it.pitfalls.length) lines.push(`- **常见坑**：${it.pitfalls.join('；')}`);
  lines.push(`- **成熟度/影响力/落地成本**：${mt(it.maturity)} / ${lv(it.impact)} / ${lv(it.effort)}`);
  if (it.tags && it.tags.length) lines.push(`- **标签**：${it.tags.map((t) => `#${t}`).join(' ')}`);
  if (it.refs && it.refs.length) {
    lines.push(`- **出处**：${it.refs.map((r) => `[${r.label}](${r.url})`).join(' · ')}`);
  }
  return lines.join('\n');
}

/**
 * 把一组条目导出为完整 Markdown 文档（按分类分组）。
 * @param {Array} items 已筛选/排序的条目
 * @param {{title?:string, note?:string}} [opts]
 * @returns {string}
 */
export function toMarkdown(items, opts = {}) {
  const title = opts.title || 'AI Coding 研究室 · 速查表';
  const out = [`# ${title}`, ''];
  out.push(`> 共 ${items.length} 条${opts.note ? ` · ${opts.note}` : ''}`, '');

  // 按 CATEGORIES 既定顺序分组，保证输出稳定
  for (const cat of CATEGORIES) {
    const group = items.filter((it) => it.category === cat.id);
    if (!group.length) continue;
    out.push(`## ${cat.icon} ${cat.label}（${group.length}）`, '');
    for (const it of group) {
      out.push(itemToMd(it), '');
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

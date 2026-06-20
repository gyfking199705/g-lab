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

/**
 * 生成符合 llms.txt 规范（https://llmstxt.org）的索引文件内容。
 * 让 LLM/agent 用一份精简结构化索引快速理解本知识库并定位资源。
 * @param {Array} items
 * @param {Array} categories CATEGORIES（含 id/label/icon/desc）
 * @returns {string}
 */
export function toLlmsTxt(items, categories) {
  const byCat = {};
  for (const it of items) byCat[it.category] = (byCat[it.category] || 0) + 1;
  const out = [];
  out.push('# AI Coding 研究室 (ai-coding-lab)', '');
  out.push(
    `> 收集、提炼并展示业界正在用的 AI 编程范式与提效方式；共 ${items.length} 条结构化实践，`
    + '覆盖范式/工作流/提效技巧/工具生态/质量护栏，每条含「为什么有效 / 怎么落地 / 何时用 / 常见坑」'
    + '以及成熟度·影响力·落地成本评级与权威出处。',
    '',
  );
  out.push(
    '本文件供 LLM/agent 快速理解与取用本知识库。要直接吸收全部内容读 KNOWLEDGE.md；要扩展/修改读 AGENTS.md。',
    '',
  );

  out.push('## 知识库');
  out.push('- [全量知识库摘要 (KNOWLEDGE.md)](KNOWLEDGE.md): 所有实践的完整纯文本，可直接通读、吸收');
  out.push('- [结构化数据源 (data/practices.js)](data/practices.js): 导出 CATEGORIES / ITEMS / TEMPLATES，可被 Node 直接 import');
  out.push('- [扩展约定 (AGENTS.md)](AGENTS.md): 数据结构、字段口径、新增条目步骤与提交前自检', '');

  out.push('## 分类');
  for (const c of categories) {
    out.push(`- ${c.label} (${c.id})：${byCat[c.id] || 0} 条 — ${c.desc}`);
  }
  out.push('');

  out.push('## Optional');
  out.push('- [交互式应用](./): 在线浏览、搜索、按成熟度/标签筛选、四象限与总览图、导出 Markdown');
  return out.join('\n').trim() + '\n';
}

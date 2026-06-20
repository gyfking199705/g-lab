/**
 * 导出 —— 把一单协作（job）整理成可带走的 Markdown。纯函数，便于单测。
 * ------------------------------------------------------------------
 * 「最后给用户一个结论」就该能带走：包含标题、元信息、最终结论，以及逐角色的协作过程。
 */

import { getRole } from './roles.js';
import { classify, topologyLabel } from './orchestrator.js';
import { formatUSD, formatTokens } from './cost.js';

const STATUS_CN = {
  queued: '排队中', planning: '拆解中', running: '执行中',
  synthesizing: '汇总中', done: '已完成', failed: '失败',
};
const TASK_CN = { queued: '排队', running: '运行中', done: '完成', failed: '失败' };

function dateStr(ts) {
  const d = new Date(ts || 0);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

/** 把整单协作渲染成 Markdown 文档字符串。 */
export function jobToMarkdown(job) {
  if (!job) return '';
  const req = job.requirement || '（空需求）';
  const lines = [];

  lines.push(`# 多智能体协作结论：${req}`, '');

  // 元信息
  lines.push(`- 状态：${STATUS_CN[job.status] || job.status}`);
  if (job.route) lines.push(`- 路由：${job.route === 'fast' ? '⚡ 快路径' : '🧭 全量编排'}`);
  if (job.route !== 'fast') lines.push(`- 拓扑：${topologyLabel(classify(req))}`);
  if (job.estimate) {
    const e = job.estimate;
    lines.push(
      `- 预估：${e.steps} 步 / ${e.waves} 波 · ~${formatTokens(e.totalTokens)} tok · ~${formatUSD(e.usd)}（按 ${e.model} 计价）`,
    );
  }
  lines.push('');

  // 最终结论（最重要，放前面）。若结论本身已带 markdown 标题就不再外套一层。
  if (job.conclusion) {
    const c = job.conclusion.trim();
    if (/^#{1,6}\s/.test(c)) lines.push(c, '');
    else lines.push('## 结论', '', c, '');
  }

  // 协作过程（逐角色）
  const tasks = job.tasks || [];
  if (tasks.length) {
    lines.push('## 协作过程', '');
    tasks.forEach((t, i) => {
      const r = getRole(t.role);
      lines.push(`### ${i + 1}. ${r.icon} ${r.name} · ${t.title} _(${TASK_CN[t.status] || t.status})_`);
      if (t.output) lines.push('', t.output.trim());
      if (t.error) lines.push('', `> ⚠️ 失败：${t.error}`);
      lines.push('');
    });
  }

  const stamp = dateStr(job.createdAt || Date.now());
  lines.push('---', `_由 swarm 多智能体协作工作区生成${stamp ? ` · ${stamp}` : ''}_`);
  return lines.join('\n');
}

/** 给导出文件起个安全的文件名（去掉非法字符、限长）。 */
export function exportFilename(job) {
  const base = String(job?.requirement || 'swarm')
    .replace(/[\\/:*?"<>|\n\r\t]+/g, ' ')
    .trim()
    .slice(0, 30) || 'swarm';
  return `swarm-${base}.md`;
}

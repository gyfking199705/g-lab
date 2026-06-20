/**
 * devx-lab 纯逻辑层：范式筛选/排序/统计 + DORA 自评分级。
 * 全部为纯函数，可 `node --test` 单测，与 UI 解耦。
 */
import { PRACTICES, CATEGORIES, DORA_METRICS, DORA_LEVELS } from './data.js';

/** 标准化文本用于搜索（小写、去首尾空格）。 */
function norm(s) {
  return String(s == null ? '' : s).toLowerCase().trim();
}

/**
 * 按关键词 / 类别 / 框架筛选范式。
 * @param {Array} list 范式列表
 * @param {{q?:string, category?:string, framework?:string}} opts
 *   category/framework 传 'all' 或空表示不过滤。
 */
export function filterPractices(list, opts = {}) {
  const q = norm(opts.q);
  const category = opts.category && opts.category !== 'all' ? opts.category : null;
  const framework = opts.framework && opts.framework !== 'all' ? opts.framework : null;
  return (list || []).filter((p) => {
    if (category && p.category !== category) return false;
    if (framework && !(p.frameworks || []).includes(framework)) return false;
    if (q) {
      const hay = norm(
        [p.title, p.summary, (p.signals || []).join(' '), (p.how || []).join(' ')].join(' '),
      );
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/**
 * 排序。key ∈ impact|effort|adoption|roi|title。
 * 数值类降序（大在前），roi=impact/effort 降序，title 按本地化升序。
 */
export function sortPractices(list, key = 'impact') {
  const arr = [...(list || [])];
  if (key === 'title') {
    return arr.sort((a, b) => String(a.title).localeCompare(String(b.title), 'zh'));
  }
  if (key === 'roi') {
    return arr.sort((a, b) => roi(b) - roi(a));
  }
  const k = ['impact', 'effort', 'adoption'].includes(key) ? key : 'impact';
  return arr.sort((a, b) => (b[k] || 0) - (a[k] || 0));
}

/** 性价比：影响 / 成本（成本越低、影响越高越好）。effort 兜底为 1 避免除零。 */
export function roi(p) {
  const e = Math.max(1, Number(p && p.effort) || 1);
  return (Number(p && p.impact) || 0) / e;
}

/** 给定范式列表，按类别统计数量，返回与 CATEGORIES 同序的数组。 */
export function categoryCounts(list) {
  const counts = Object.create(null);
  for (const p of list || []) counts[p.category] = (counts[p.category] || 0) + 1;
  return CATEGORIES.map((c) => ({ ...c, count: counts[c.id] || 0 }));
}

/** 概览统计：总数、平均影响、平均采用度、高性价比（roi≥2）数量。 */
export function summaryStats(list) {
  const arr = list || [];
  const n = arr.length;
  if (!n) return { total: 0, avgImpact: 0, avgAdoption: 0, quickWins: 0 };
  const sum = (f) => arr.reduce((s, p) => s + (Number(f(p)) || 0), 0);
  return {
    total: n,
    avgImpact: round1(sum((p) => p.impact) / n),
    avgAdoption: round1(sum((p) => p.adoption) / n),
    quickWins: arr.filter((p) => roi(p) >= 2).length,
  };
}

function round1(x) {
  return Math.round(x * 10) / 10;
}

// ── DORA 自评 ───────────────────────────────────────────────────────

/**
 * 综合 DORA 评级。
 * @param {Object} bands { deploy, lead, cfr, mttr }，值为 0..3 的档位索引（0 最好）。
 *   未提供的指标按最差档（3）计入，保证「短板暴露」。
 * @returns {{ index:number, level:object, score:number, perMetric:Array }}
 *   index 为四指标档位均值取整（0..3），level 取自 DORA_LEVELS，
 *   score 为 0..100 的便于展示的分（Elite≈100，Low≈25）。
 */
export function classifyDora(bands = {}) {
  const perMetric = DORA_METRICS.map((m) => {
    const raw = bands[m.key];
    const idx = clampBand(raw);
    return { key: m.key, name: m.name, index: idx, level: DORA_LEVELS[idx] };
  });
  const avg = perMetric.reduce((s, x) => s + x.index, 0) / perMetric.length;
  const index = Math.round(avg);
  // 0→100, 1→~75, 2→~50, 3→25：用 (3-avg)/3 线性映射到 25..100。
  const score = Math.round(((3 - avg) / 3) * 75 + 25);
  return { index, level: DORA_LEVELS[index], score, perMetric };
}

/** 把任意输入夹到 0..3 的合法档位；非法值视为最差档 3。 */
function clampBand(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 3;
  return Math.min(3, Math.max(0, Math.round(n)));
}

/**
 * devx-lab 纯逻辑层：范式筛选/排序/统计 + DORA 自评分级。
 * 全部为纯函数，可 `node --test` 单测，与 UI 解耦。
 */
import { PRACTICES, CATEGORIES, FRAMEWORKS, DORA_METRICS, DORA_LEVELS, ADOPTION_STATUS } from './data.js';

const STATUS_IDS = ADOPTION_STATUS.map((s) => s.id);

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

// ── 采纳追踪 ────────────────────────────────────────────────────────

/** 取某条范式的采纳状态，缺省/非法都归为 'todo'。 */
export function statusOf(statuses, id) {
  const s = statuses && statuses[id];
  return STATUS_IDS.includes(s) ? s : 'todo';
}

/**
 * 采纳进度统计。
 * @param {Array} list 范式列表
 * @param {Object} statuses { [practiceId]: 'todo'|'doing'|'done' }
 * @returns {{ todo:number, doing:number, done:number, total:number, percent:number }}
 *   percent 为「已落地」占比（0..100，四舍五入）。
 */
export function adoptionStats(list, statuses = {}) {
  const counts = { todo: 0, doing: 0, done: 0 };
  for (const p of list || []) counts[statusOf(statuses, p.id)]++;
  const total = (list || []).length;
  const percent = total ? Math.round((counts.done / total) * 100) : 0;
  return { ...counts, total, percent };
}

/**
 * 按业界框架聚合覆盖度：每个框架有多少条范式对齐、其中已落地/进行中各几条。
 * @returns {Array<{id,name,total,done,doing,percent}>}（与 FRAMEWORKS 同序）
 */
export function frameworkCoverage(practices, statuses = {}) {
  return FRAMEWORKS.map((f) => {
    const items = (practices || []).filter((p) => (p.frameworks || []).includes(f.id));
    const done = items.filter((p) => statusOf(statuses, p.id) === 'done').length;
    const doing = items.filter((p) => statusOf(statuses, p.id) === 'doing').length;
    return {
      id: f.id,
      name: f.name,
      total: items.length,
      done,
      doing,
      percent: items.length ? Math.round((done / items.length) * 100) : 0,
    };
  });
}

/**
 * 能力画像：按类别统计落地率，供雷达图使用（与 CATEGORIES 同序）。
 * @returns {Array<{id,name,icon,total,done,doing,donePct,activePct}>}
 *   donePct = 已落地占比；activePct = (已落地+进行中) 占比，均 0..100。
 */
export function categoryRadar(practices = PRACTICES, statuses = {}) {
  return CATEGORIES.map((c) => {
    const items = (practices || []).filter((p) => p.category === c.id);
    const total = items.length;
    const done = items.filter((p) => statusOf(statuses, p.id) === 'done').length;
    const doing = items.filter((p) => statusOf(statuses, p.id) === 'doing').length;
    return {
      id: c.id,
      name: c.name,
      icon: c.icon,
      total,
      done,
      doing,
      donePct: total ? Math.round((done / total) * 100) : 0,
      activePct: total ? Math.round(((done + doing) / total) * 100) : 0,
    };
  });
}

/**
 * 一键《团队研发提效报告》：聚合 DORA 评级 + 采纳总览 + 能力画像 + 框架覆盖度 + 优先处方，
 * 输出可粘贴/存档的 Markdown（贴文档、分享给管理层）。
 */
export function teamReportMarkdown({ bands = {}, statuses = {}, practices = PRACTICES } = {}) {
  const dora = classifyDora(bands);
  const adopt = adoptionStats(practices, statuses);
  const radar = categoryRadar(practices, statuses);
  const cov = frameworkCoverage(practices, statuses);
  const rx = prescribe(bands, practices, statuses);
  const L = [];
  L.push('# 团队研发提效报告', '', `_生成于 ${new Date().toISOString().slice(0, 10)} · 数据来自本地 devx-lab_`, '');

  L.push('## 一、DORA 自评', '', `综合评级：**${dora.level.name} · ${dora.level.cn}**（${dora.score}/100）`, '');
  L.push('| 指标 | 等级 |', '| --- | --- |');
  for (const pm of dora.perMetric) L.push(`| ${pm.name} | ${pm.level.name} |`);

  L.push('', '## 二、范式采纳总览', '', `共 ${adopt.total} 条 · 已落地 ${adopt.done} · 进行中 ${adopt.doing} · 落地率 ${adopt.percent}%`, '');

  L.push('## 三、能力画像（按类别落地率）', '', '| 类别 | 已落地/总数 | 落地率 |', '| --- | --- | --- |');
  for (const r of radar) L.push(`| ${r.icon} ${r.name} | ${r.done}/${r.total} | ${r.donePct}% |`);

  L.push('', '## 四、框架覆盖度', '', '| 框架 | 对齐范式 | 已落地 |', '| --- | --- | --- |');
  for (const c of cov) L.push(`| ${c.name} | ${c.total} | ${c.done} |`);

  if (rx.hasWeak) {
    L.push('', '## 五、优先处方（针对薄弱指标）', '');
    for (const it of rx.items) {
      const names = it.practices.slice(0, 3).map((p) => p.title).join('、') || '（相关范式已全部落地）';
      L.push(`- **${it.name}**（${it.level.name}）：${names}`);
    }
  }

  L.push('', '> 口径：DORA State of DevOps；本报告仅用于团队自我对标与改进规划，非个人考核。');
  return L.join('\n');
}

// ── 进度趋势快照（本地存档，看持续改进） ───────────────────────────

/**
 * 生成一份进度快照：当下的采纳落地率与 DORA 评分。
 * @param {Date} now 注入时钟，便于测试。
 */
export function buildSnapshot(practices = PRACTICES, statuses = {}, bands = {}, now = new Date()) {
  const a = adoptionStats(practices, statuses);
  const d = classifyDora(bands);
  return {
    t: now.toISOString(),
    date: now.toISOString().slice(0, 10),
    percent: a.percent,
    done: a.done,
    doing: a.doing,
    total: a.total,
    score: d.score,
    level: d.level.name,
  };
}

/**
 * 把新快照并入历史：同一天的覆盖（只留当天最新），按时间升序，限长 cap。
 */
export function upsertSnapshot(list, snap, cap = 60) {
  const rest = (list || []).filter((s) => s.date !== snap.date);
  const next = [...rest, snap].sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
  return next.slice(-cap);
}

// ── 数据导出 / 导入（团队备份与共享，仅本地） ────────────────────────

export const EXPORT_VERSION = 1;

/** 组装可导出的快照对象（收藏 + 采纳状态 + DORA 自评 + 进度趋势）。 */
export function buildExport({ favs = [], statuses = {}, bands = {}, snaps = [] } = {}) {
  return {
    app: 'devx-lab',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    favs,
    statuses,
    bands,
    snaps,
  };
}

/**
 * 解析并校验导入文本，返回干净的 { favs, statuses, bands }。
 * 非 devx-lab 导出或非法 JSON 抛错；字段缺失/类型不符时安全降级为空。
 */
export function parseImport(text) {
  let o;
  try {
    o = JSON.parse(text);
  } catch {
    throw new Error('不是有效的 JSON 文件');
  }
  if (!o || typeof o !== 'object' || o.app !== 'devx-lab') {
    throw new Error('不是 devx-lab 的导出文件');
  }
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  return {
    favs: Array.isArray(o.favs) ? o.favs.filter((x) => typeof x === 'string') : [],
    statuses: isObj(o.statuses) ? o.statuses : {},
    bands: isObj(o.bands) ? o.bands : {},
    snaps: Array.isArray(o.snaps) ? o.snaps.filter((s) => s && typeof s === 'object') : [],
  };
}

// ── 落地路线：处方式推荐 + 拓扑排序 ─────────────────────────────────

// DORA 指标 key → 范式 signals 里对应的中文标签（用于把弱项映射到能提升它的范式）
const METRIC_SIGNAL = {
  deploy: '部署频率',
  lead: '变更前置时间',
  cfr: '变更失败率',
  mttr: '故障恢复时间',
};

/**
 * 处方式推荐：针对 DORA 自评里的薄弱指标（档位 Medium/Low，或未评＝按最弱档），
 * 列出能提升该指标、且尚未落地的范式（signals 命中该指标），按性价比排序。
 * @returns {{ items: Array<{key,name,level,practices}>, hasWeak:boolean, allElite:boolean }}
 *   allElite：四项都 Elite，无需补；hasWeak：存在可处方的弱项。
 */
export function prescribe(bands = {}, practices = PRACTICES, statuses = {}) {
  const result = classifyDora(bands);
  const items = [];
  for (const pm of result.perMetric) {
    if (pm.index < 2) continue; // 只对 Medium(2)/Low(3) 出处方
    const signal = METRIC_SIGNAL[pm.key];
    const recs = (practices || [])
      .filter((p) => (p.signals || []).includes(signal))
      .filter((p) => statusOf(statuses, p.id) !== 'done')
      .sort((a, b) => roi(b) - roi(a));
    items.push({ key: pm.key, name: pm.name, level: pm.level, practices: recs });
  }
  const allElite = result.perMetric.every((pm) => pm.index === 0);
  return { items, hasWeak: items.length > 0, allElite };
}

/**
 * 拓扑排序成「落地波次」：尊重 requires 前置边（集合外的依赖忽略），
 * 同一波内按性价比降序。用 Kahn 算法；若存在环，剩余节点并入最后一波并置 hasCycle。
 * @returns {{ waves: Array<Array>, hasCycle: boolean }}
 */
export function topoOrder(practices = PRACTICES) {
  const list = practices || [];
  const ids = new Set(list.map((p) => p.id));
  const byId = new Map(list.map((p) => [p.id, p]));
  // 仅保留指向集合内节点的依赖边
  const deps = new Map(
    list.map((p) => [p.id, (p.requires || []).filter((r) => ids.has(r) && r !== p.id)]),
  );
  const remaining = new Set(ids);
  const waves = [];
  let hasCycle = false;

  while (remaining.size) {
    const ready = [...remaining].filter((id) =>
      deps.get(id).every((r) => !remaining.has(r)),
    );
    if (!ready.length) {
      // 有环：把剩余节点作为最后一波兜底，避免死循环
      hasCycle = true;
      waves.push(
        [...remaining].map((id) => byId.get(id)).sort((a, b) => roi(b) - roi(a)),
      );
      break;
    }
    ready.sort((a, b) => roi(byId.get(b)) - roi(byId.get(a)));
    waves.push(ready.map((id) => byId.get(id)));
    for (const id of ready) remaining.delete(id);
  }
  return { waves, hasCycle };
}

// ── DORA 自评导出 ───────────────────────────────────────────────────

/** 把自评结果渲染成可粘贴的 Markdown（贴周报/文档用）。 */
export function doraMarkdown(bands = {}) {
  const r = classifyDora(bands);
  const lines = [
    '## DORA 自评结果',
    '',
    `**综合评级：${r.level.name} · ${r.level.cn}**（评分 ${r.score}/100）`,
    '',
    '| 指标 | 等级 | 现状 |',
    '| --- | --- | --- |',
  ];
  for (const m of DORA_METRICS) {
    const idx = bands[m.key];
    const lvl = (idx == null ? DORA_LEVELS[3] : DORA_LEVELS[idx]).name;
    const picked = idx == null ? '未评（按最弱档计入）' : m.levels[idx];
    lines.push(`| ${m.name} | ${lvl} | ${picked} |`);
  }
  lines.push('', '> 口径来自业界 State of DevOps（DORA）通用分级，仅用于团队自我对标，非个人考核。');
  return lines.join('\n');
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

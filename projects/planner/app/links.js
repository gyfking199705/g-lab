/**
 * 跨模块目标链接 —— 纯函数（不依赖 React）
 * ------------------------------------------------------------------
 * 让「目标」的数值进度自动从其它模块的真实数据取，而不必手动维护。
 * 例：目标「跑量/容量」←健身、「已读论文」←papers、「已掌握知识点」←learning、
 *     「当前体重」←cut、「累计结余」←ledger、「地图掌握节点」←aimap。
 *
 * 设计：app/ 是集成层，独占「跨模块」知识；各功能模块保持解耦。
 * goals 只持有一个 link id（存在 goal.metric.link），并通过注入的 resolveLink(id) 取当前值。
 *
 * 每个来源的 compute(get, today) 为纯函数：get(key) 注入读取（浏览器传 readModule，测试传 map.get）。
 * 可测试：node --test app/links.test.js
 */
import { todayStr } from '../core/date.js';
import { overallStats as learningStats, studyMinutes } from '../learning/calc.js';
import { overallCounts as aimapCounts } from '../aimap/calc.js';
import { totalVolume, weekStreak } from '../fitness/calc.js';
import { balance } from '../ledger/calc.js';
import { trendSeries as cutTrend } from '../cut/calc.js';
import { taskStats } from '../project/calc.js';
import { currentStreak, fitnessWorkoutDates } from '../habits/calc.js';
import { netWorthSeries } from '../savings/calc.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);

/** 跨模块链接来源目录。current = compute(get, today)；无数据返回 null。 */
export const LINK_SOURCES = [
  {
    id: 'fitness.workouts', label: '累计训练次数', unit: '次', module: 'fitness-planner',
    compute: (get) => arr((get('fitness-planner') || {}).workouts).length || null,
  },
  {
    id: 'fitness.volume', label: '累计训练容量', unit: 'kg', module: 'fitness-planner',
    compute: (get) => {
      const w = arr((get('fitness-planner') || {}).workouts);
      return w.length ? Math.round(totalVolume(w)) : null;
    },
  },
  {
    id: 'fitness.weekStreak', label: '连续训练周', unit: '周', module: 'fitness-planner',
    compute: (get, today) => {
      const w = arr((get('fitness-planner') || {}).workouts);
      return w.length ? weekStreak(w, today) : null;
    },
  },
  {
    id: 'learning.mastered', label: '已掌握知识点', unit: '个', module: 'learning-planner',
    compute: (get) => {
      const plans = arr((get('learning-planner') || {}).plans);
      if (!plans.length) return null;
      return num(learningStats(plans).mastered);
    },
  },
  {
    id: 'papers.read', label: '已读论文', unit: '篇', module: 'papers-planner',
    compute: (get) => {
      const items = arr((get('papers-planner') || {}).items);
      if (!items.length) return null;
      return items.filter((i) => i && i.status === 'done').length;
    },
  },
  {
    id: 'aimap.done', label: '已掌握节点(地图)', unit: '个', module: 'aimap-planner',
    compute: (get) => {
      const s = get('aimap-planner');
      if (!s) return null;
      const c = aimapCounts(s);
      return c && c.total ? num(c.done) : null;
    },
  },
  {
    id: 'ledger.balance', label: '累计结余', unit: '元', module: 'ledger-planner',
    compute: (get) => {
      const e = arr((get('ledger-planner') || {}).entries);
      return e.length ? Math.round(balance(e)) : null;
    },
  },
  {
    id: 'cut.weight', label: '当前体重(趋势)', unit: 'kg', module: 'cut-planner',
    compute: (get) => {
      const logs = arr((get('cut-planner') || {}).logs);
      const t = cutTrend(logs);
      return t.length ? t[t.length - 1].trend : null;
    },
  },
  {
    id: 'project.tasksDone', label: '已完成任务', unit: '个', module: 'project-planner',
    compute: (get) => {
      const tasks = arr((get('project-planner') || {}).tasks);
      return tasks.length ? num(taskStats(tasks).done) : null;
    },
  },
  {
    id: 'schedule.done', label: '累计完成日程', unit: '项', module: 'schedule-planner',
    compute: (get) => {
      const items = arr((get('schedule-planner') || {}).items);
      if (!items.length) return null;
      return items.filter((i) => i && i.done).length;
    },
  },
  {
    id: 'habits.bestStreak', label: '最长连续打卡', unit: '天', module: 'habits-planner',
    compute: (get, today) => {
      const d = get('habits-planner') || {};
      const habits = arr(d.habits).filter((h) => h && !h.archived);
      if (!habits.length) return null;
      const ext = fitnessWorkoutDates(get('fitness-planner'));
      const ci = d.checkins || {};
      return habits.reduce((mx, h) => Math.max(mx, currentStreak(h, ci, today, ext)), 0);
    },
  },
  {
    id: 'learning.studyMin', label: '累计学习时长', unit: '分钟', module: 'learning-planner',
    compute: (get) => {
      const sessions = arr((get('learning-planner') || {}).sessions);
      return sessions.length ? num(studyMinutes(sessions)) : null;
    },
  },
  {
    id: 'savings.networth', label: '净资产', unit: '元', module: 'savings-planner',
    compute: (get) => {
      const nw = (get('savings-planner') || {}).netWorth || {};
      const series = netWorthSeries(arr(nw.snapshots), nw.accounts || []);
      return series.length ? Math.round(series[series.length - 1].net) : null;
    },
  },
  // —— 目标上下文相关（scoped）：只统计「挂到当前目标」的数据，需要 ctx.goalId ——
  {
    id: 'goal.scheduleDone', label: '本目标·关联日程完成', unit: '项', module: 'schedule-planner', scoped: true,
    compute: (get, today, ctx) => {
      if (!ctx || !ctx.goalId) return null;
      const items = arr((get('schedule-planner') || {}).items).filter((i) => i && i.goalId === ctx.goalId);
      return items.length ? items.filter((i) => i.done).length : null;
    },
  },
];

const BY_ID = Object.fromEntries(LINK_SOURCES.map((s) => [s.id, s]));

/** 取某个链接来源定义。 */
export function getLinkSource(id) {
  return BY_ID[id] || null;
}

/** 给 UI 用的轻量选项（不含 compute）。scoped=true 的来源只统计挂到该目标的数据。 */
export const LINK_OPTIONS = LINK_SOURCES.map(({ id, label, unit, module, scoped }) => ({ id, label, unit, module, scoped: !!scoped }));

/**
 * 计算某个链接来源的当前值。无效 id 或无数据返回 null。
 * @param {object} [ctx] 目标上下文（scoped 来源需要 ctx.goalId）
 * @returns {number|null}
 */
export function computeLink(id, get, today = todayStr(), ctx = {}) {
  const s = BY_ID[id];
  if (!s || typeof get !== 'function') return null;
  try {
    const v = s.compute(get, today, ctx);
    return typeof v === 'number' && isFinite(v) ? v : null;
  } catch (e) {
    return null;
  }
}

/**
 * 把一组目标里「链接型 metric」的 current 用真实数据填充。
 * 不改原对象：返回浅拷贝；未链接或取数失败的目标原样返回。
 * scoped 来源按各目标自身 id 作为上下文。
 */
export function resolveGoalsLinks(goals = [], get, today = todayStr()) {
  return arr(goals).map((g) => {
    const link = g && g.metric && g.metric.link;
    if (!link) return g;
    const cur = computeLink(link, get, today, { goalId: g.id });
    if (cur == null) return g;
    const src = BY_ID[link];
    return { ...g, metric: { ...g.metric, current: cur, unit: g.metric.unit || (src ? src.unit : '') } };
  });
}

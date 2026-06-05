/**
 * 大盘分析引擎 —— 纯函数（不依赖 React）
 * ------------------------------------------------------------------
 * 为每个模块产出统一的「大盘」数据结构，交给 app/BigBoard.jsx 渲染：
 *   { icon, title, stroke, hero, kpis[], charts[], forecast, insights[] }
 * 复用各模块已有的纯函数计算，并补充少量「时间序列 / 预测」辅助（本文件内，已单测）。
 *
 * buildAnalytics(id, get, today)：get(key) 注入读取（浏览器传 readModule，测试传 map.get）。
 * 可测试：node --test app/analytics.test.js
 */
import { todayStr, addDays, dayDiff, lastNDays, fmtMD } from '../core/date.js';
import { financeForecast, financeScenarios, formatMoney } from '../savings/calc.js';
import { summary as cutSummary, trendSeries as cutTrend, deficitSeries, estimateTDEE, weightForecast } from '../cut/calc.js';
import { monthTotals, byCategory, dailyExpense, balance } from '../ledger/calc.js';
import { todayBoard, currentStreak, bestStreak, isDoneOn, fitnessWorkoutDates } from '../habits/calc.js';
import { summary as papersSummary } from '../papers/calc.js';
import { overallStats as goalsOverall, sortGoalsForBoard, goalPercent, daysLeft, isAchieved } from '../goals/calc.js';
import { overallStats as learningStats, computeStreak as learnStreak, studyMinutes, activitySeries as learnActivity } from '../learning/calc.js';
import { workoutsThisWeek, weekStreak, totalVolume, activitySeries as fitActivity, formatVolume } from '../fitness/calc.js';
import { taskStats, totalFocusMinutes, focusStreak, lastNDays as projLastDays } from '../project/calc.js';

/* ----------------------------- 时间序列 / 预测辅助（纯，已测） ----------------------------- */

/** 最近 n 个月的收支序列（升序）。 */
export function ledgerMonthly(entries = [], n = 6, today = todayStr()) {
  const out = [];
  const base = new Date(today.slice(0, 7) + '-01');
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const mk = d.toISOString().slice(0, 7);
    const t = monthTotals(entries, mk);
    out.push({ month: mk, expense: t.expense, income: t.income, net: t.net });
  }
  return out;
}

/** 本月按已花速度外推到月末的预计支出。 */
export function ledgerProjMonthEnd(entries = [], today = todayStr()) {
  const mk = today.slice(0, 7);
  const spent = monthTotals(entries, mk).expense;
  const day = Number(today.slice(8, 10));
  const daysInMonth = new Date(Number(mk.slice(0, 4)), Number(mk.slice(5, 7)), 0).getDate();
  if (day <= 0) return spent;
  return Math.round((spent / day) * daysInMonth);
}

/** 最近 n 天习惯整体完成率序列 [{date, ratio}]。 */
export function habitsCompletionSeries(habits = [], checkins = {}, n = 30, today = todayStr(), ext = null) {
  const active = habits.filter((h) => !h.archived);
  return lastNDays(n, today).map((date) => {
    if (!active.length) return { date, ratio: 0 };
    const done = active.filter((h) => isDoneOn(h, date, checkins, ext)).length;
    return { date, ratio: done / active.length };
  });
}

/** 最近 n 天每日读完篇数 + 累计 [{date, done, cum}]。 */
export function papersDailyDone(items = [], n = 30, today = todayStr()) {
  const doneByDate = {};
  for (const it of items) if (it.status === 'done' && it.doneAt) {
    const d = it.doneAt.slice(0, 10);
    doneByDate[d] = (doneByDate[d] || 0) + 1;
  }
  let cum = 0;
  // 起点累计 = 窗口前已读
  const from = addDays(today, -(n - 1));
  for (const it of items) if (it.status === 'done' && it.doneAt && it.doneAt.slice(0, 10) < from) cum += 1;
  return lastNDays(n, today).map((date) => { cum += doneByDate[date] || 0; return { date, done: doneByDate[date] || 0, cum }; });
}

/* ----------------------------- 通用小工具 ----------------------------- */
const kpi = (label, value, sub, tone) => ({ label, value, sub, tone });
const num = (v) => (v == null || !isFinite(v) ? '—' : v);

/* ----------------------------- 各模块大盘 ----------------------------- */

function financeBoard(get) {
  const s = get('savings-planner');
  const f = financeForecast(s);
  if (!f || (!f.target && !f.latest)) return null;
  const sc = financeScenarios(s, { horizon: 24 });
  const pct = f.target > 0 ? Math.round((f.latest / f.target) * 100) : 0;
  const charts = [];
  if (sc) {
    charts.push({ title: '净资产趋势 + 三情景预测（24 个月）', kind: 'fan', values: sc.history,
      band: { upper: sc.optimistic, mid: sc.neutral, lower: sc.conservative }, goal: f.target || undefined,
      stroke: 'var(--accent)', captionLeft: '实线=历史 · 阴影带=保守～乐观 · 虚线=中性', captionRight: f.target ? `目标 ${formatMoney(f.target)}` : '' });
  } else {
    charts.push({ title: '净资产趋势 + 预测', kind: 'line', values: f.historyVals, projection: f.projection, goal: f.target || undefined, stroke: 'var(--accent)', captionLeft: '实线=历史 · 虚线=预测', captionRight: f.target ? `目标 ${formatMoney(f.target)}` : '' });
  }
  return {
    icon: '💰', title: '财富大盘', stroke: 'var(--accent)',
    hero: { value: formatMoney(f.latest), caption: f.target ? `目标 ${formatMoney(f.target)} · ${pct}% 达成` : '净资产', delta: f.monthlyRate != null ? `${f.monthlyRate >= 0 ? '↑' : '↓'} ${formatMoney(Math.abs(Math.round(f.monthlyRate)))}/月` : '', deltaTone: f.monthlyRate >= 0 ? 'good' : 'bad' },
    kpis: [
      kpi('净资产', formatMoney(f.latest), '最新快照', 'accent'),
      kpi('月均增速', f.monthlyRate != null ? formatMoney(Math.round(f.monthlyRate)) : '—', '近期'),
      kpi('距目标', f.target ? formatMoney(Math.max(0, f.target - f.latest)) : '—', `${pct}% 已达成`),
      kpi('综合年化', sc ? `${(sc.baseReturn * 100).toFixed(1)}%` : '—', '按资产配置'),
      kpi('中性预计', sc && sc.etaNeutralMonths ? `${(sc.etaNeutralMonths / 12).toFixed(1)} 年` : (f.etaMonths ? `${(f.etaMonths / 12).toFixed(1)} 年` : '—'), '达成目标', 'good'),
      kpi('月均储蓄', sc ? formatMoney(Math.round(sc.contribution)) : '—', '近似'),
    ],
    charts,
    forecast: { text: `🔮 ${sc ? sc.etaText : f.etaText}` },
    insights: buildFinanceInsights(f, sc),
    disclaimer: '预测以近期储蓄速度 + 资产配置年化（±2% 不确定性带）复利估算，仅供参考、实际会波动，非投资建议。',
  };
}
function buildFinanceInsights(f, sc) {
  const out = [];
  if (!f.hasHistory) out.push('多记几期净资产快照，预测会更准。');
  else if (f.monthlyRate > 0) out.push(`保持每月约 ${formatMoney(Math.round(f.monthlyRate))} 的增长，离目标越来越近。`);
  else out.push('近期净资产未增长，留意支出或投资波动。');
  if (sc && sc.target && f.latest < sc.target) {
    const lo = sc.etaNeutralMonths;
    out.push(`乐观 / 保守情景下达成时间会前后浮动，关键变量是储蓄率与投资年化（当前约 ${(sc.baseReturn * 100).toFixed(1)}%）。`);
  }
  return out;
}

function cutBoard(get, today, opts = {}) {
  const d = get('cut-planner');
  if (!d || !d.profile) return null;
  const days = opts.days || 30;
  const s = cutSummary(d.profile, d.logs || [], todayStr());
  const trend = cutTrend(d.logs || []).slice(-days).map((p) => p.trend);
  const { tdee } = estimateTDEE(d.profile, d.logs || []);
  const defs = deficitSeries(d.logs || [], tdee, Math.min(days, 21)).map((x) => (x.deficit == null ? 0 : x.deficit));
  const wf = weightForecast(s.currentTrend, s.weeklyRate, s.goalWeight, 28);
  const weightChart = wf
    ? { title: '体重趋势 + 预测带（28 天）', kind: 'fan', values: trend, band: { upper: wf.upper, mid: wf.mid, lower: wf.lower }, goal: s.goalWeight, stroke: 'var(--accent)', captionLeft: '实线=趋势 · 阴影带=慢~快 · 虚线=中性预测', captionRight: `目标 ${s.goalWeight}kg` }
    : { title: '体重趋势 + 目标', kind: 'line', values: trend, goal: s.goalWeight, stroke: 'var(--accent)', captionLeft: '趋势体重(EMA)', captionRight: `目标 ${s.goalWeight}kg` };
  return {
    icon: '📉', title: '减脂大盘', stroke: 'var(--accent)',
    hero: { value: s.currentTrend, unit: 'kg', caption: `${s.startWeight}→${s.goalWeight}kg · ${s.progressPct}% 完成`, delta: `已减 ${s.lost}kg`, deltaTone: 'good' },
    kpis: [
      kpi('趋势体重', s.currentTrend + 'kg', s.currentWeight != null ? `今测 ${s.currentWeight}kg` : '', 'accent'),
      kpi('本周速度', s.weeklyRate != null ? `${s.weeklyRate > 0 ? '+' : ''}${s.weeklyRate}kg` : '—', '趋势'),
      kpi('日均消耗', s.tdee + '', s.tdeeMode === 'adaptive' ? '自适应' : '公式'),
      kpi('连续缺口', s.deficitStreak + ' 天', '达标', 'good'),
      kpi('已减/还剩', `${s.lost}/${s.remaining}kg`, ''),
      kpi('预计达成', s.projectedDate ? fmtMD(s.projectedDate) : '—', s.projectedDate ? '按当前速度' : '需保持缺口', 'good'),
    ],
    charts: [
      weightChart,
      { title: '能量缺口', kind: 'bars', values: defs, captionLeft: '正=缺口 · 负=盈余' },
    ],
    forecast: { text: s.projectedDate ? `🔮 保持当前速度，预计 ${s.projectedDate} 达成 ${s.goalWeight}kg` : '🔮 保持热量缺口才能预测达成日' },
    insights: s.bodyFat != null ? [`体脂 ${s.bodyFat}%：脂肪量 ${s.fatMass}kg / 瘦体重 ${s.leanMass}kg。`] : ['记录体脂%可看脂肪量/瘦体重拆分。'],
    disclaimer: '体重/热量为趋势估算，预测带为不同速度的外推，非医疗或营养建议。',
  };
}

function ledgerBoard(get, _today, opts = {}) {
  const d = get('ledger-planner');
  if (!d || !(d.entries || []).length) return null;
  const today = todayStr();
  const t = monthTotals(d.entries, today.slice(0, 7));
  const cats = byCategory(d.entries, today.slice(0, 7), 'expense').slice(0, 5);
  const daily = dailyExpense(d.entries, Math.min(opts.days || 14, 60), today).map((x) => x.expense);
  const months = ledgerMonthly(d.entries, 6, today);
  const proj = ledgerProjMonthEnd(d.entries, today);
  const prevExp = months.length >= 2 ? months[months.length - 2].expense : null;
  return {
    icon: '🧾', title: '记账大盘', stroke: 'var(--danger)',
    hero: { value: formatMoney(t.expense), caption: `本月支出 · 结余 ${t.net >= 0 ? '+' : ''}${formatMoney(t.net)}`, delta: prevExp != null ? `上月 ${formatMoney(prevExp)}` : '', deltaTone: prevExp != null && t.expense > prevExp ? 'bad' : 'good' },
    kpis: [
      kpi('本月支出', formatMoney(t.expense), '', 'bad'),
      kpi('本月收入', formatMoney(t.income), '', 'good'),
      kpi('结余', `${t.net >= 0 ? '+' : ''}${formatMoney(t.net)}`, '', t.net >= 0 ? 'good' : 'bad'),
      kpi('累计结余', formatMoney(balance(d.entries)), '全部'),
      kpi('预计月末', formatMoney(proj), '按当前速度'),
      kpi('日均支出', formatMoney(Math.round(t.expense / Math.max(1, Number(today.slice(8, 10))))), ''),
    ],
    charts: [
      { title: `近 ${daily.length} 天支出`, kind: 'bars', values: daily, single: 'var(--danger)', captionLeft: '每日支出' },
      { title: '近 6 月支出', kind: 'bars', values: months.map((m) => m.expense), single: 'var(--accent)', captionLeft: months.map((m) => m.month.slice(5)).join(' · ') },
    ],
    forecast: { text: `🔮 按当前节奏，本月预计支出约 ${formatMoney(proj)}` },
    insights: cats.length ? [`支出最多：${cats[0].category} ${formatMoney(cats[0].amount)}（${Math.round(cats[0].share * 100)}%）。`] : [],
  };
}

function habitsBoard(get, _today, opts = {}) {
  const d = get('habits-planner');
  if (!d || !(d.habits || []).filter((h) => !h.archived).length) return null;
  const today = todayStr();
  const days = opts.days || 30;
  const ext = fitnessWorkoutDates(get('fitness-planner'));
  const ci = d.checkins || {};
  const b = todayBoard(d.habits, ci, today, ext);
  const comp = habitsCompletionSeries(d.habits, ci, days, today, ext);
  const ratios = comp.map((c) => c.ratio * 100);
  const avg = ratios.length ? Math.round(ratios.reduce((s, x) => s + x, 0) / ratios.length) : 0;
  const best = Math.max(0, ...d.habits.map((h) => bestStreak(h, ci, today, ext)), 0);
  const cur = Math.max(0, ...d.habits.map((h) => currentStreak(h, ci, today, ext)), 0);
  const recent7 = Math.round(ratios.slice(-7).reduce((s, x) => s + x, 0) / 7);
  const trend = recent7 - avg;
  return {
    icon: '🔥', title: '习惯大盘', stroke: 'var(--accent)',
    hero: { value: `${b.doneCount}/${b.total}`, caption: '今日完成', delta: `近7天 ${recent7}%`, deltaTone: trend >= 0 ? 'good' : 'bad' },
    kpis: [
      kpi('今日完成', `${b.doneCount}/${b.total}`, '', 'accent'),
      kpi(`${days}天完成率`, avg + '%', ''),
      kpi('当前最长连续', cur + ' 天', '', 'good'),
      kpi('历史最长', best + ' 天', ''),
    ],
    charts: [{ title: `近 ${days} 天整体完成率`, kind: 'line', values: ratios, goal: 100, stroke: 'var(--accent)', captionLeft: '每日已打卡占比', captionRight: `均 ${avg}%` }],
    forecast: { text: trend >= 0 ? `🔮 近 7 天完成率 ${recent7}%，比月均高 ${trend} 点，保持住！` : `🔮 近 7 天 ${recent7}%，略低于月均，明天加把劲。` },
    insights: [],
  };
}

function papersBoard(get, _today, opts = {}) {
  const d = get('papers-planner');
  if (!d || !(d.items || []).length) return null;
  const today = todayStr();
  const days = opts.days || 30;
  const s = papersSummary(d.items, today);
  const cum = papersDailyDone(d.items, days, today).map((x) => x.cum);
  const weekRate = s.thisWeek / 7;
  const remain = s.total - s.done;
  const etaDays = weekRate > 0 ? Math.ceil(remain / weekRate) : null;
  return {
    icon: '📄', title: '论文大盘', stroke: 'var(--accent)',
    hero: { value: s.progressPct + '%', caption: `已读 ${s.done}/${s.total}`, delta: `近7天 ${s.thisWeek} 篇`, deltaTone: 'good' },
    kpis: [
      kpi('已读/清单', `${s.done}/${s.total}`, '', 'accent'),
      kpi('在读 / 想读', `${s.reading} / ${s.want}`, ''),
      kpi('连续阅读', s.streak + ' 天', '', 'good'),
      kpi('近 7 天', s.thisWeek + ' 篇', ''),
    ],
    charts: [{ title: `累计已读（近 ${days} 天）`, kind: 'line', values: cum, stroke: 'var(--accent)', captionLeft: '累计篇数', captionRight: `共 ${s.done} 篇` }],
    forecast: { text: etaDays ? `🔮 按近 7 天速度，约 ${etaDays} 天读完清单剩余 ${remain} 篇` : '🔮 多读几篇即可预测读完时间' },
    insights: [],
  };
}

function goalsBoard(get) {
  const d = get('goals-planner');
  const o = goalsOverall((d || {}).goals || []);
  if (!o.total) return null;
  const today = todayStr();
  const sorted = sortGoalsForBoard((d || {}).goals || [], today);
  const overdue = sorted.filter((g) => !isAchieved(g) && g.deadline && daysLeft(g, today) < 0).length;
  const soon = sorted.filter((g) => !isAchieved(g) && g.deadline && daysLeft(g, today) >= 0 && daysLeft(g, today) <= 14).length;
  const next = sorted.find((g) => !isAchieved(g));
  return {
    icon: '🎯', title: '目标大盘', stroke: 'var(--accent)',
    hero: { value: o.avgPercent + '%', caption: `平均进度 · ${o.achieved}/${o.total} 达成`, delta: overdue ? `${overdue} 逾期` : (soon ? `${soon} 临近` : ''), deltaTone: overdue ? 'bad' : 'good' },
    kpis: [
      kpi('进行中', o.total - o.achieved + '', '', 'accent'),
      kpi('已达成', o.achieved + '', '', 'good'),
      kpi('平均进度', o.avgPercent + '%', ''),
      kpi('逾期 / 临近', `${overdue} / ${soon}`, '14 天内', overdue ? 'bad' : undefined),
    ],
    charts: [{ title: '各目标进度', kind: 'goalbars', goals: sorted.slice(0, 8).map((g) => ({ title: g.title, pct: goalPercent(g), done: isAchieved(g) })) }],
    forecast: { text: next ? `🔮 建议优先推进：「${next.title}」（当前 ${goalPercent(next)}%${next.deadline ? `，${daysLeft(next, today) < 0 ? '已逾期' : daysLeft(next, today) + ' 天后截止'}` : ''}）` : '🔮 目标都达成了，定个新目标吧！' },
    insights: [],
  };
}

function learningBoard(get, _today, opts = {}) {
  const d = get('learning-planner');
  if (!d || !(d.plans || []).length) return null;
  const today = todayStr();
  const days = opts.days || 30;
  const st = learningStats(d.plans);
  if (!st.total) return null;
  const act = learnActivity(d.sessions || [], today, days).map((a) => a.minutes);
  const totalMin = studyMinutes(d.sessions || []);
  const streak = learnStreak(d.sessions || [], today);
  const recentMin = act.slice(-7).reduce((s, x) => s + x, 0);
  const remain = st.total - st.mastered;
  return {
    icon: '📚', title: '学习大盘', stroke: 'var(--accent)',
    hero: { value: Math.round(st.pct * 100) + '%', caption: `已掌握 ${st.mastered}/${st.total}`, delta: `近7天 ${Math.round(recentMin)} 分钟`, deltaTone: 'good' },
    kpis: [
      kpi('掌握度', Math.round(st.pct * 100) + '%', '', 'accent'),
      kpi('学习中', st.learning + '', ''),
      kpi('连续学习', streak + ' 天', '', 'good'),
      kpi('累计时长', Math.round(totalMin / 60) + ' 小时', ''),
    ],
    charts: [{ title: `近 ${days} 天学习时长（分钟）`, kind: 'bars', values: act, single: 'var(--accent)', captionLeft: '每日学习分钟' }],
    forecast: { text: `🔮 还剩 ${remain} 个知识点待掌握，保持每天学习习惯稳步推进` },
    insights: [],
  };
}

function fitnessBoard(get, _today, opts = {}) {
  const d = get('fitness-planner');
  const workouts = (d || {}).workouts || [];
  if (!workouts.length) return null;
  const today = todayStr();
  const week = workoutsThisWeek(workouts, today);
  const streak = weekStreak(workouts, today);
  const vol = totalVolume(workouts);
  const nWeeks = Math.max(6, Math.min(26, Math.ceil((opts.days || 42) / 7)));
  const act = fitActivity(workouts, today, nWeeks * 7);
  // 按周聚合训练次数
  const weeks = [];
  for (let w = 0; w < nWeeks; w++) {
    const slice = act.slice(w * 7, w * 7 + 7);
    weeks.push(slice.filter((x) => x.count > 0).length);
  }
  return {
    icon: '💪', title: '健身大盘', stroke: 'var(--accent)',
    hero: { value: week, unit: '次', caption: '本周训练', delta: `连续 ${streak} 周`, deltaTone: 'good' },
    kpis: [
      kpi('本周训练', week + ' 次', '', 'accent'),
      kpi('连续训练周', streak + ' 周', '', 'good'),
      kpi('累计容量', formatVolume(vol), '总负重'),
      kpi('总训练', workouts.length + ' 次', ''),
    ],
    charts: [{ title: `近 ${nWeeks} 周训练频率`, kind: 'bars', values: weeks, single: 'var(--accent)', captionLeft: '每周训练天数' }],
    forecast: { text: week >= 3 ? `🔮 本周已练 ${week} 次，保持每周 3+ 次稳步进步` : `🔮 本周 ${week} 次，建议再练 ${Math.max(0, 3 - week)} 次达到每周 3 次` },
    insights: [],
  };
}

function projectBoard(get, _today, opts = {}) {
  const d = get('project-planner');
  const tasks = (d || {}).tasks || [];
  if (!tasks.length) return null;
  const today = todayStr();
  const st = taskStats(tasks);
  const sessions = (d || {}).sessions || [];
  const focusMin = totalFocusMinutes(sessions);
  const fStreak = focusStreak(sessions, today);
  const dwin = Math.min(opts.days || 14, 60);
  const daily = projLastDays(sessions, dwin, today).map((x) => x.minutes);
  return {
    icon: '📋', title: '项目大盘', stroke: 'var(--accent)',
    hero: { value: st.donePct + '%', caption: `已完成 ${st.done}/${st.total} 任务`, delta: `专注连续 ${fStreak} 天`, deltaTone: 'good' },
    kpis: [
      kpi('待办', st.todo + '', '', 'accent'),
      kpi('进行中', st.doing + '', ''),
      kpi('已完成', st.done + '', '', 'good'),
      kpi('累计专注', Math.round(focusMin / 60) + ' 小时', `${fStreak} 天连续`),
    ],
    charts: [{ title: `近 ${dwin} 天专注（分钟）`, kind: 'bars', values: daily, single: 'var(--accent)', captionLeft: '每日番茄专注分钟' }],
    forecast: { text: `🔮 还有 ${st.todo + st.doing} 个任务进行中，按节奏推进即可` },
    insights: [],
  };
}

const BUILDERS = {
  wealth: financeBoard, cut: cutBoard, ledger: ledgerBoard, habits: habitsBoard,
  papers: papersBoard, goals: goalsBoard, learning: learningBoard,
  fitness: fitnessBoard, project: projectBoard,
};

/** 模块是否有专属大盘。 */
export function hasBoard(id) { return !!BUILDERS[id]; }

/**
 * 构造某模块的大盘数据；无数据/无专属分析返回 null。
 * @param {string} id 模块 id
 * @param {(key:string)=>object|null} get 读取器
 * @param {string} [today]
 */
export function buildAnalytics(id, get, today = todayStr(), opts = {}) {
  const fn = BUILDERS[id];
  if (!fn) return null;
  try { return fn(get, today, opts); } catch (e) { return null; }
}

/** 大盘可选时间范围。 */
export const BOARD_RANGES = [
  { id: 30, label: '30 天' },
  { id: 90, label: '90 天' },
  { id: 365, label: '一年' },
];

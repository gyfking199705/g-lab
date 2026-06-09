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
import { financeForecast, financeScenarios, passiveCrossover, formatMoney } from '../savings/calc.js';
import { summary as cutSummary, trendSeries as cutTrend, deficitSeries, estimateTDEE, weightForecast } from '../cut/calc.js';
import { monthTotals, byCategory, dailyExpense, balance } from '../ledger/calc.js';
import { todayBoard, currentStreak, bestStreak, isDoneOn, fitnessWorkoutDates } from '../habits/calc.js';
import { summary as papersSummary } from '../papers/calc.js';
import { overallStats as goalsOverall, sortGoalsForBoard, goalPercent, daysLeft, isAchieved } from '../goals/calc.js';
import { overallStats as learningStats, computeStreak as learnStreak, studyMinutes, activitySeries as learnActivity } from '../learning/calc.js';
import { workoutsThisWeek, weekStreak, totalVolume, activitySeries as fitActivity, formatVolume } from '../fitness/calc.js';
import { taskStats, totalFocusMinutes, focusStreak, lastNDays as projLastDays } from '../project/calc.js';
import { todayView, overdueCount } from '../schedule/calc.js';
import { portfolioStats, seriesChangePct } from '../stocks/analysis.js';
import { formatGram } from '../gold/calc.js';
import { holdingsValue, buildPriceCtx, effectiveHoldings, kindMeta } from '../holdings/calc.js';

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

/** 最近 n 天每日「完成的日程数」（按 doneAt）。 */
export function scheduleDailyDone(items = [], n = 30, today = todayStr()) {
  const byDate = {};
  for (const it of items) if (it && it.done && it.doneAt) {
    const d = it.doneAt.slice(0, 10);
    byDate[d] = (byDate[d] || 0) + 1;
  }
  return lastNDays(n, today).map((date) => ({ date, done: byDate[date] || 0 }));
}

/** 最近 n 天「累计完成的目标子任务数」（按子任务 doneAt）。 */
export function goalsCumulativeDone(goals = [], n = 30, today = todayStr()) {
  const byDate = {};
  for (const g of goals) for (const s of (g.subtasks || [])) {
    if (s.done && s.doneAt) { const d = s.doneAt.slice(0, 10); byDate[d] = (byDate[d] || 0) + 1; }
  }
  const from = addDays(today, -(n - 1));
  let cum = 0;
  for (const g of goals) for (const s of (g.subtasks || [])) {
    if (s.done && s.doneAt && s.doneAt.slice(0, 10) < from) cum += 1;
  }
  return lastNDays(n, today).map((date) => { cum += byDate[date] || 0; return { date, cum }; });
}

/* ----------------------------- 通用小工具 ----------------------------- */
const kpi = (label, value, sub, tone) => ({ label, value, sub, tone });
const num = (v) => (v == null || !isFinite(v) ? '—' : v);

/* ----------------------------- 各模块大盘 ----------------------------- */

/** 从记账近 3 月推断每月「主动收入」(工资+兼职) 与「净储蓄」。 */
const ACTIVE_INCOME_CATS = ['工资', '兼职'];
function ledgerIncomeStats(lg, today) {
  if (!lg || !(lg.entries || []).length) return null;
  const base = new Date(today.slice(0, 7) + '-01');
  let actSum = 0, netSum = 0, n = 0;
  for (let i = 0; i < 3; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const mk = d.toISOString().slice(0, 7);
    const t = monthTotals(lg.entries, mk);
    const inc = byCategory(lg.entries, mk, 'income').filter((c) => ACTIVE_INCOME_CATS.includes(c.category)).reduce((s, c) => s + c.amount, 0);
    actSum += inc; netSum += (t.income - t.expense); n += 1;
  }
  return { activeMonthly: Math.round(actSum / n), netMonthly: Math.round(netSum / n) };
}

/** 被动收入 vs 主动收入交叉预测（财务自由临界点）。 */
function passivePlan(get) {
  const today = todayStr();
  const sv = get('savings-planner');
  const f = financeForecast(sv);
  if (!f) return null;
  const sc = financeScenarios(sv);
  const annualReturn = sc ? sc.baseReturn : 0.05;
  const netWorth = f.latest;
  const li = ledgerIncomeStats(get('ledger-planner'), today);
  const activeMonthly = li ? li.activeMonthly : 0;
  const contribution = li && li.netMonthly != null ? Math.max(0, li.netMonthly) : Math.max(0, f.monthlyRate || 0);
  if (!(activeMonthly > 0)) return { ok: false, reason: '在「记账」记录工资/兼职等主动收入后，可预测被动超过主动的时间' };
  if (!(annualReturn > 0) || !(netWorth > 0)) return { ok: false, reason: '在「财富规划」记录净资产与资产配置后即可预测' };
  const cross = passiveCrossover({ netWorth, annualReturn, monthlyContribution: contribution, activeMonthly });
  return { ok: true, cross, netWorth, annualReturn, contribution, activeMonthly, currentPassive: Math.round(netWorth * annualReturn / 12) };
}

function financeBoard(get) {
  const s = get('savings-planner');
  // 持仓联动：现金/黄金/股票/基金 按实时价折算，作为额外资产自动计入净资产
  const ctx = buildPriceCtx(get('gold-cache'), get('stocks-watch-cache'), get('holdings-quotes-cache'));
  const hv = holdingsValue(effectiveHoldings(s), ctx);
  const f = financeForecast(s, { extraAssets: hv.total });
  if (!f || (!f.target && !f.latest)) return null;
  const sc = financeScenarios(s, { horizon: 24, extraAssets: hv.total });
  const pct = f.target > 0 ? Math.round((f.latest / f.target) * 100) : 0;
  const pp = passivePlan(get);
  // 持仓估值作为财富子项 KPI（有持仓时显示已计入的实时总值 + 分类拆解）
  let goldKpi = null;
  if (hv.total > 0) {
    const parts = Object.keys(hv.byKind).filter((k) => hv.byKind[k] > 0).map((k) => `${kindMeta(k).icon}${formatMoney(hv.byKind[k])}`).join(' ');
    goldKpi = kpi('持仓(实时)', formatMoney(hv.total), (parts + ' 已计入').trim(), 'accent');
  }
  const charts = [];
  if (sc) {
    charts.push({ title: '净资产趋势 + 三情景预测（24 个月）', kind: 'fan', values: sc.history,
      band: { upper: sc.optimistic, mid: sc.neutral, lower: sc.conservative }, goal: f.target || undefined,
      stroke: 'var(--accent)', fmt: formatMoney, captionLeft: '实线=历史 · 阴影带=保守～乐观 · 虚线=中性', captionRight: f.target ? `目标 ${formatMoney(f.target)}` : '' });
  } else {
    charts.push({ title: '净资产趋势 + 预测', kind: 'line', values: f.historyVals, projection: f.projection, goal: f.target || undefined, stroke: 'var(--accent)', fmt: formatMoney, captionLeft: '实线=历史 · 虚线=预测', captionRight: f.target ? `目标 ${formatMoney(f.target)}` : '' });
  }
  // 被动收入 vs 主动收入交叉图
  let passiveKpi = kpi('被动超主动', '—', pp && !pp.ok ? '需收入数据' : '记录后预测');
  let passiveLine = '';
  if (pp && pp.ok) {
    const cm = pp.cross.crossoverMonth;
    passiveKpi = kpi('被动超主动', cm != null ? (cm === 0 ? '已实现 🎉' : `${(cm / 12).toFixed(1)} 年`) : '50 年内未达', cm != null ? '投资收益≥工资' : '需提高储蓄/收益', cm != null ? 'good' : undefined);
    charts.push({ title: '被动收入 vs 主动收入（财务自由临界点）', kind: 'cross',
      passive: pp.cross.passiveSeries, active: pp.cross.activeSeries, crossMonth: cm,
      captionLeft: '虚线=主动(工资) · 实线=被动(投资收益) · 竖线=交叉点' });
    passiveLine = cm != null
      ? (cm === 0 ? '🎉 你的投资被动收入已超过主动收入！' : `🏝️ 按当前储蓄与年化 ${(pp.annualReturn * 100).toFixed(1)}%，约 ${(cm / 12).toFixed(1)} 年后被动收入(≈${formatMoney(pp.activeMonthly)}/月)将超过主动收入`)
      : '被动收入 50 年内未超过主动，提高储蓄率或投资年化可加速';
  }
  return {
    icon: '💰', title: '财富大盘', stroke: 'var(--accent)',
    hero: { value: formatMoney(f.latest), caption: f.target ? `目标 ${formatMoney(f.target)} · ${pct}% 达成` : '净资产', delta: f.monthlyRate != null ? `${f.monthlyRate >= 0 ? '↑' : '↓'} ${formatMoney(Math.abs(Math.round(f.monthlyRate)))}/月` : '', deltaTone: f.monthlyRate >= 0 ? 'good' : 'bad', progress: f.target > 0 ? Math.max(0, Math.min(100, pct)) : null, progressSub: f.target > 0 ? '达成' : null },
    kpis: [
      kpi('净资产', formatMoney(f.latest), '最新快照', 'accent'),
      kpi('月均增速', f.monthlyRate != null ? formatMoney(Math.round(f.monthlyRate)) : '—', '近期'),
      kpi('距目标', f.target ? formatMoney(Math.max(0, f.target - f.latest)) : '—', `${pct}% 已达成`),
      kpi('综合年化', sc ? `${(sc.baseReturn * 100).toFixed(1)}%` : '—', '按资产配置'),
      kpi('中性预计', sc && sc.etaNeutralMonths ? `${(sc.etaNeutralMonths / 12).toFixed(1)} 年` : (f.etaMonths ? `${(f.etaMonths / 12).toFixed(1)} 年` : '—'), '达成目标', 'good'),
      passiveKpi,
      ...(goldKpi ? [goldKpi] : []),
    ],
    charts,
    forecast: { text: passiveLine ? `🏝️ ${passiveLine.replace(/^🏝️ |^🎉 /, '')}` : `🔮 ${sc ? sc.etaText : f.etaText}` },
    insights: [...buildFinanceInsights(f, sc), ...(passiveLine ? [passiveLine] : (pp && !pp.ok ? [pp.reason] : []))],
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
    ? { title: '体重趋势 + 预测带（28 天）', kind: 'fan', values: trend, band: { upper: wf.upper, mid: wf.mid, lower: wf.lower }, goal: s.goalWeight, stroke: 'var(--accent)', fmt: (v) => v + 'kg', captionLeft: '实线=趋势 · 阴影带=慢~快 · 虚线=中性预测', captionRight: `目标 ${s.goalWeight}kg` }
    : { title: '体重趋势 + 目标', kind: 'line', values: trend, goal: s.goalWeight, stroke: 'var(--accent)', fmt: (v) => v + 'kg', captionLeft: '趋势体重(EMA)', captionRight: `目标 ${s.goalWeight}kg` };
  return {
    icon: '📉', title: '减脂大盘', stroke: 'var(--accent)',
    hero: { value: s.currentTrend, unit: 'kg', caption: `${s.startWeight}→${s.goalWeight}kg · ${s.progressPct}% 完成`, delta: `已减 ${s.lost}kg`, deltaTone: 'good', progress: Math.max(0, Math.min(100, s.progressPct)), progressSub: '完成' },
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
    hero: { value: formatMoney(t.expense), caption: `本月支出 · 结余 ${t.net >= 0 ? '+' : ''}${formatMoney(t.net)}`, delta: prevExp != null ? `上月 ${formatMoney(prevExp)}` : '', deltaTone: prevExp != null && t.expense > prevExp ? 'bad' : 'good', progress: d.budget > 0 ? Math.min(100, Math.round((t.expense / d.budget) * 100)) : null, progressSub: d.budget > 0 ? '预算' : null, progressTone: d.budget > 0 && t.expense > d.budget ? 'bad' : null },
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
      monthlyExpenseFan(months, d.budget),
    ],
    forecast: { text: `🔮 按当前节奏，本月预计支出约 ${formatMoney(proj)}` },
    insights: cats.length ? [`支出最多：${cats[0].category} ${formatMoney(cats[0].amount)}（${Math.round(cats[0].share * 100)}%）。`] : [],
  };
}

/** 月支出趋势 + 未来 3 月预测带（±15%）+ 预算参考线。 */
function monthlyExpenseFan(months, budget) {
  const mexp = months.map((m) => m.expense);
  const recent = mexp.slice(-3).filter((v) => v > 0);
  const avg = recent.length ? recent.reduce((s, x) => s + x, 0) / recent.length : (mexp[mexp.length - 1] || 0);
  if (avg <= 0 || mexp.length < 2) {
    return { title: '近 6 月支出', kind: 'bars', values: mexp, single: 'var(--accent)', captionLeft: months.map((m) => m.month.slice(5)).join(' · ') };
  }
  const k = 3;
  const mid = Array(k).fill(Math.round(avg));
  const lower = mid.map((v) => Math.round(v * 0.85));
  const upper = mid.map((v) => Math.round(v * 1.15));
  return {
    title: '月支出趋势 + 预测带（未来 3 月）', kind: 'fan', values: mexp,
    band: { upper, mid, lower }, goal: budget > 0 ? budget : undefined, stroke: 'var(--accent)',
    captionLeft: '实线=历史 · 阴影带=±15% 预测 · 虚线=预算', captionRight: budget > 0 ? `预算 ${formatMoney(budget)}/月` : '',
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
    hero: { value: `${b.doneCount}/${b.total}`, caption: '今日完成', delta: `近7天 ${recent7}%`, deltaTone: trend >= 0 ? 'good' : 'bad', progress: b.total ? Math.round((b.doneCount / b.total) * 100) : 0, progressSub: '今日' },
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
    hero: { value: s.progressPct + '%', caption: `已读 ${s.done}/${s.total}`, delta: `近7天 ${s.thisWeek} 篇`, deltaTone: 'good', progress: Math.max(0, Math.min(100, s.progressPct)), progressSub: '已读' },
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

function goalsBoard(get, _today, opts = {}) {
  const d = get('goals-planner');
  const goals = (d || {}).goals || [];
  const o = goalsOverall(goals);
  if (!o.total) return null;
  const today = todayStr();
  const days = opts.days || 30;
  const cum = goalsCumulativeDone(goals, days, today).map((x) => x.cum);
  const sorted = sortGoalsForBoard(goals, today);
  const overdue = sorted.filter((g) => !isAchieved(g) && g.deadline && daysLeft(g, today) < 0).length;
  const soon = sorted.filter((g) => !isAchieved(g) && g.deadline && daysLeft(g, today) >= 0 && daysLeft(g, today) <= 14).length;
  const next = sorted.find((g) => !isAchieved(g));
  return {
    icon: '🎯', title: '目标大盘', stroke: 'var(--accent)',
    hero: { value: o.avgPercent + '%', caption: `平均进度 · ${o.achieved}/${o.total} 达成`, delta: overdue ? `${overdue} 逾期` : (soon ? `${soon} 临近` : ''), deltaTone: overdue ? 'bad' : 'good', progress: Math.max(0, Math.min(100, o.avgPercent)), progressSub: '平均' },
    kpis: [
      kpi('进行中', o.total - o.achieved + '', '', 'accent'),
      kpi('已达成', o.achieved + '', '', 'good'),
      kpi('平均进度', o.avgPercent + '%', ''),
      kpi('逾期 / 临近', `${overdue} / ${soon}`, '14 天内', overdue ? 'bad' : undefined),
    ],
    charts: [
      { title: `近 ${days} 天累计完成子任务`, kind: 'line', values: cum, stroke: 'var(--accent)', captionLeft: '累计完成数', captionRight: `共 ${cum[cum.length - 1] || 0}` },
      { title: '各目标进度', kind: 'goalbars', goals: sorted.slice(0, 8).map((g) => ({ title: g.title, pct: goalPercent(g), done: isAchieved(g) })) },
    ],
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
    hero: { value: Math.round(st.pct * 100) + '%', caption: `已掌握 ${st.mastered}/${st.total}`, delta: `近7天 ${Math.round(recentMin)} 分钟`, deltaTone: 'good', progress: Math.max(0, Math.min(100, Math.round(st.pct * 100))), progressSub: '掌握' },
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
    hero: { value: week, unit: '次', caption: '本周训练', delta: `连续 ${streak} 周`, deltaTone: 'good', progress: Math.min(100, Math.round((week / 3) * 100)), progressSub: '周目标', progressLabel: `${week}/3` },
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
    hero: { value: st.donePct + '%', caption: `已完成 ${st.done}/${st.total} 任务`, delta: `专注连续 ${fStreak} 天`, deltaTone: 'good', progress: Math.max(0, Math.min(100, st.donePct)), progressSub: '完成' },
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

function scheduleBoard(get, _today, opts = {}) {
  const d = get('schedule-planner');
  const items = (d || {}).items || [];
  if (!items.length) return null;
  const today = todayStr();
  const days = opts.days || 30;
  const v = todayView(items, today);
  const todayTotal = v.pending.length + v.done.length;
  const od = overdueCount(items, today);
  const series = scheduleDailyDone(items, days, today).map((x) => x.done);
  const doneTotal = items.filter((it) => it.done).length;
  const recent = series.reduce((s, x) => s + x, 0);
  return {
    icon: '📅', title: '日程大盘', stroke: 'var(--accent)',
    hero: { value: `${v.done.length}/${todayTotal}`, caption: '今日完成', delta: od ? `${od} 逾期` : '无逾期', deltaTone: od ? 'bad' : 'good', progress: todayTotal ? Math.round((v.done.length / todayTotal) * 100) : 0, progressSub: '今日' },
    kpis: [
      kpi('今日完成', `${v.done.length}/${todayTotal}`, '', 'accent'),
      kpi('逾期未完成', od + '', '', od ? 'bad' : 'good'),
      kpi(`近 ${days} 天完成`, recent + ' 件', ''),
      kpi('累计完成', doneTotal + ' 件', ''),
    ],
    charts: [{ title: `近 ${days} 天每日完成`, kind: 'bars', values: series, single: 'var(--accent)', captionLeft: '每日完成的日程数' }],
    forecast: { text: od ? `🔮 有 ${od} 项逾期，先清掉逾期再推进今天的安排` : '🔮 节奏不错，保持每天清空当日清单' },
    insights: [],
  };
}

function stocksBoard(get) {
  const cache = get('stocks-watch-cache') || {};
  const cfg = get('stocks-watch') || {};
  const quotes = cache.quotes || [];
  const symbols = cfg.symbols || [];
  if (!quotes.length && !symbols.length) return null;
  const ps = portfolioStats(quotes);
  // 取涨幅最强的一只的走势作为时间维度展示
  const withSeries = quotes.filter((q) => q && Array.isArray(q.series) && q.series.length > 1);
  const pick = withSeries.sort((a, b) => (b.changePct || 0) - (a.changePct || 0))[0];
  const charts = [];
  if (pick) {
    charts.push({ title: `${pick.symbol} 近期走势`, kind: 'line', values: pick.series, stroke: 'var(--accent)', captionLeft: '最近一次抓取的价格序列', captionRight: `${pick.changePct >= 0 ? '+' : ''}${(pick.changePct || 0).toFixed(2)}%` });
  }
  return {
    icon: '📈', title: '股市大盘', stroke: 'var(--accent)',
    hero: { value: symbols.length + '', unit: '只', caption: '自选股', delta: ps.count ? `均 ${ps.avgChangePct >= 0 ? '+' : ''}${ps.avgChangePct}%` : '未刷新', deltaTone: ps.avgChangePct >= 0 ? 'good' : 'bad' },
    kpis: [
      kpi('自选数', symbols.length + '', '', 'accent'),
      kpi('上涨 / 下跌', `${ps.gainers} / ${ps.losers}`, '上次快照'),
      kpi('最强', ps.top ? `${ps.top.symbol} ${ps.top.changePct >= 0 ? '+' : ''}${(ps.top.changePct || 0).toFixed(1)}%` : '—', '', 'good'),
      kpi('最弱', ps.bottom ? `${ps.bottom.symbol} ${(ps.bottom.changePct || 0).toFixed(1)}%` : '—', '', 'bad'),
    ],
    charts,
    forecast: { text: '🔮 进入「股市观测」点「🤖 AI 分析」，用你自己的 AI 解读组合（非投资建议）' },
    insights: ps.count ? [] : ['进入模块刷新行情后，这里会显示涨跌分布与走势。'],
    disclaimer: '行情可能延迟，数据来自上次抓取的本地快照，非投资建议。',
  };
}

/** 金价大盘 —— 财富的子项；读 gold-cache（由首页「行情」卡抓取写入）。涨=红（中国市场惯例）。 */
function goldBoard(get) {
  const g = get('gold-cache');
  if (!g || !isFinite(g.pricePerGram)) return null;
  const up = (g.change || 0) >= 0;
  const series = Array.isArray(g.series) ? g.series.filter((v) => isFinite(v)) : [];
  const pct = `${g.changePct >= 0 ? '+' : ''}${(g.changePct || 0).toFixed(2)}%`;
  return {
    icon: '🪙', title: '金价大盘', stroke: 'var(--warn)',
    hero: {
      value: formatGram(g.pricePerGram), unit: '元/克',
      caption: `国际金价 $${g.usdPerOz != null ? g.usdPerOz.toLocaleString('en-US') : '—'}/oz × 汇率 ${g.usdCny ? g.usdCny.toFixed(2) : '—'} 折算 · ≈工行积存金`,
      delta: `${up ? '↑' : '↓'} ${formatGram(Math.abs(g.change || 0))} (${pct})`, deltaTone: up ? 'bad' : 'good',
    },
    kpis: [
      kpi('人民币金价', formatGram(g.pricePerGram) + ' 元/克', '≈工行积存金', 'accent'),
      kpi('国际金价', '$' + (g.usdPerOz != null ? g.usdPerOz.toLocaleString('en-US') : '—'), 'COMEX 期货/盎司'),
      kpi('美元兑人民币', g.usdCny ? g.usdCny.toFixed(3) : '—', g.fxFallback ? '近似汇率' : '实时'),
      kpi('日涨跌', pct, up ? '涨' : '跌', up ? 'bad' : 'good'),
    ],
    charts: series.length > 1
      ? [{ title: '人民币金价走势（元/克）', kind: 'line', values: series, stroke: 'var(--warn)', fmt: (v) => formatGram(v) + '元', captionLeft: '国际金价折算 · 仅供参考', captionRight: '≈工行积存金' }]
      : [],
    forecast: { text: '🔮 金价随国际行情与汇率波动，长期常作为抗通胀/分散配置的一部分（非投资建议）' },
    insights: [g.fxFallback ? '当前用兜底汇率折算，联网刷新后更准。' : '走势与工行积存金基本一致，绝对值因无银行点差可能差几元。'],
    disclaimer: '人民币金价由国际金价×汇率折算（≈工行积存金），行情可能延迟，非投资/购买建议。',
  };
}

const BUILDERS = {
  wealth: financeBoard, gold: goldBoard, cut: cutBoard, ledger: ledgerBoard, habits: habitsBoard,
  papers: papersBoard, goals: goalsBoard, learning: learningBoard,
  fitness: fitnessBoard, project: projectBoard, schedule: scheduleBoard, stocks: stocksBoard,
};

/** 模块是否有专属大盘。 */
export function hasBoard(id) { return !!BUILDERS[id]; }

/** 大盘的推荐展示顺序（首页卡片 / 详情轮播共用）。 */
export const BOARD_ORDER = ['wealth', 'gold', 'cut', 'ledger', 'goals', 'learning', 'papers', 'fitness', 'project', 'stocks', 'habits', 'schedule'];

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

/* ----------------------------- 分享 / 导出（纯函数） ----------------------------- */
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function truncate(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

/** 大盘的纯文本摘要（用于「分享/复制」）。 */
export function boardToText(a, today = todayStr()) {
  if (!a) return '';
  const lines = [`${a.icon} ${a.title} · ${today}`];
  lines.push(`${a.hero.value}${a.hero.unit || ''}${a.hero.caption ? ' — ' + a.hero.caption : ''}`);
  for (const k of a.kpis || []) lines.push(`· ${k.label}：${k.value}${k.sub ? `（${k.sub}）` : ''}`);
  if (a.forecast && a.forecast.text) lines.push(a.forecast.text);
  for (const s of a.insights || []) lines.push('💡 ' + s);
  lines.push('— 来自「成长规划」');
  return lines.join('\n');
}

/** 大盘快照卡（自包含 SVG 字符串，可下载为图片，无需任何库）。 */
export function boardToSVG(a, today = todayStr()) {
  if (!a) return '';
  const W = 480;
  const kpis = (a.kpis || []).slice(0, 6);
  const cols = 2;
  const rows = Math.ceil(kpis.length / cols);
  const kpiTop = 132, kpiH = 52, kpiGap = 8;
  const fcY = kpiTop + rows * (kpiH + kpiGap) + 6;
  const H = fcY + 64;
  const C = { bg: '#FFFFFF', card: '#FBFAF6', bd: '#ECEAE2', text: '#26241F', sub: '#83827A', accent: '#B5654A', band: '#F5ECE5' };
  const cellW = (W - 24 * 2 - 12) / cols;
  let kpiSvg = '';
  kpis.forEach((k, i) => {
    const cx = 24 + (i % cols) * (cellW + 12);
    const cy = kpiTop + Math.floor(i / cols) * (kpiH + kpiGap);
    kpiSvg += `<rect x="${cx}" y="${cy}" width="${cellW}" height="${kpiH}" rx="10" fill="${C.card}" stroke="${C.bd}"/>` +
      `<text x="${cx + 12}" y="${cy + 24}" font-family="Georgia,serif" font-size="19" font-weight="600" fill="${k.tone === 'good' ? '#6E9079' : k.tone === 'bad' ? '#BC6055' : C.accent}">${esc(truncate(k.value, 16))}</text>` +
      `<text x="${cx + 12}" y="${cy + 41}" font-family="sans-serif" font-size="11" fill="${C.sub}">${esc(truncate(k.label + (k.sub ? ' · ' + k.sub : ''), 22))}</text>`;
  });
  const fc = a.forecast && a.forecast.text ? a.forecast.text : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" rx="18" fill="${C.bg}"/>` +
    `<text x="24" y="42" font-family="Georgia,serif" font-size="22" font-weight="600" fill="${C.text}">${esc(a.icon + ' ' + a.title)}</text>` +
    `<text x="${W - 24}" y="42" font-family="sans-serif" font-size="12" fill="${C.sub}" text-anchor="end">${esc(today)}</text>` +
    `<text x="24" y="92" font-family="Georgia,serif" font-size="40" font-weight="600" fill="${C.accent}">${esc(truncate(a.hero.value + (a.hero.unit || ''), 18))}</text>` +
    `<text x="24" y="116" font-family="sans-serif" font-size="12.5" fill="${C.sub}">${esc(truncate(a.hero.caption || '', 46))}</text>` +
    kpiSvg +
    (fc ? `<rect x="24" y="${fcY}" width="${W - 48}" height="44" rx="10" fill="${C.band}"/><text x="36" y="${fcY + 27}" font-family="sans-serif" font-size="12.5" fill="${C.accent}">${esc(truncate(fc, 50))}</text>` : '') +
    `<text x="${W - 24}" y="${H - 12}" font-family="sans-serif" font-size="10.5" fill="${C.sub}" text-anchor="end">成长规划 · Growth Planner</text>` +
    `</svg>`;
}

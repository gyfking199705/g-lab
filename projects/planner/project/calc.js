/**
 * 项目规划 —— 纯函数计算逻辑（不依赖 React / UI，便于单测与复用）
 * ------------------------------------------------------------------
 * 一套**共享任务模型**，三个视图复用同一批 task：
 *   · 日程：按到期日分桶（逾期 / 今天 / 近 7 天 / 以后 / 未排期 / 已完成）
 *   · 人力甘特：按负责人分行，在时间轴上画起止条
 *   · 番茄专注：把专注时段(session)记到任务上，统计今日/连续/分布
 *
 * 任务 task = { id, title, status:'todo'|'doing'|'done', start, end, assignee, notes, createdAt }
 * 专注 session = { id, date, minutes, taskId|null }
 * 日期一律 'YYYY-MM-DD'（字典序即时间序）。可测试： node --test project/calc.test.js
 */

/* ============================ 日期工具（模块自含） ============================ */
export function todayStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
export function parseDate(str) {
  const [y, m, d] = String(str).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
export function addDays(str, n) {
  const dt = parseDate(str);
  dt.setDate(dt.getDate() + n);
  return todayStr(dt);
}
export function dayDiff(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}
/** 周一为一周之始，返回该周的周一日期串。 */
export function startOfWeek(str) {
  const dt = parseDate(str);
  const wd = (dt.getDay() + 6) % 7; // 周一=0
  return addDays(str, -wd);
}
const WD = ['日', '一', '二', '三', '四', '五', '六'];
export function weekdayCN(str) {
  return '周' + WD[parseDate(str).getDay()];
}
export function fmtMD(str) {
  const [, m, d] = String(str).split('-');
  return `${Number(m)}/${Number(d)}`;
}
export function fmtDate(str) {
  if (!str) return '';
  return `${fmtMD(str)} ${weekdayCN(str)}`;
}
/** 相对今天的人话：今天 / 明天 / 昨天 / N 天后 / N 天前。 */
export function relDay(str, today = todayStr()) {
  if (!str) return '';
  const d = dayDiff(today, str);
  if (d === 0) return '今天';
  if (d === 1) return '明天';
  if (d === -1) return '昨天';
  if (d > 1) return `${d} 天后`;
  return `${-d} 天前`;
}

let __seq = 0;
export function uid(prefix = 'id') {
  __seq = (__seq + 1) % 1e6;
  return `${prefix}_${Date.now().toString(36)}_${__seq.toString(36)}`;
}

/* ============================ 任务模型 ============================ */
export const STATUSES = [
  { id: 'todo', label: '待办' },
  { id: 'doing', label: '进行中' },
  { id: 'done', label: '已完成' },
];
/** 点一下在 待办→进行中→已完成→待办 之间循环。 */
export function nextStatus(s) {
  const order = ['todo', 'doing', 'done'];
  return order[(order.indexOf(s) + 1) % order.length] || 'todo';
}
/** 任务的“关键日期”：优先截止(end)，否则开始(start)。 */
export function taskDue(t) {
  return (t && (t.end || t.start)) || null;
}

export function taskStats(tasks = []) {
  let todo = 0;
  let doing = 0;
  let done = 0;
  for (const t of tasks) {
    if (t.status === 'done') done += 1;
    else if (t.status === 'doing') doing += 1;
    else todo += 1;
  }
  const total = tasks.length;
  return { total, todo, doing, done, donePct: total ? Math.round((done / total) * 100) : 0 };
}

/**
 * 按到期日把任务分桶（已完成单列）。
 * @returns {{overdue,today,soon,later,someday,done}} 每桶为任务数组
 */
export function scheduleBuckets(tasks = [], today = todayStr()) {
  const b = { overdue: [], today: [], soon: [], later: [], someday: [], done: [] };
  for (const t of tasks) {
    if (t.status === 'done') {
      b.done.push(t);
      continue;
    }
    const due = taskDue(t);
    if (!due) {
      b.someday.push(t);
      continue;
    }
    const d = dayDiff(today, due);
    if (d < 0) b.overdue.push(t);
    else if (d === 0) b.today.push(t);
    else if (d <= 7) b.soon.push(t);
    else b.later.push(t);
  }
  const byDue = (x, y) => {
    const dx = taskDue(x) || '9999';
    const dy = taskDue(y) || '9999';
    return dx < dy ? -1 : dx > dy ? 1 : (x.title || '').localeCompare(y.title || '');
  };
  for (const k of ['overdue', 'today', 'soon', 'later', 'someday']) b[k].sort(byDue);
  b.done.sort((x, y) => (taskDue(x) < taskDue(y) ? 1 : -1));
  return b;
}

/* ============================ 人力甘特 ============================ */
/** 计算甘特图的时间窗（覆盖所有任务起止，含今天，至少 minDays 天）。 */
export function ganttRange(tasks = [], today = todayStr(), minDays = 14) {
  const dated = tasks.filter((t) => t.start || t.end);
  let min = today;
  let max = today;
  for (const t of dated) {
    const s = t.start || t.end;
    const e = t.end || t.start;
    if (s < min) min = s;
    if (e > max) max = e;
  }
  if (dayDiff(min, max) < minDays) max = addDays(min, minDays);
  const days = dayDiff(min, max) + 1;
  return { start: min, end: max, days };
}

/** 单个任务条相对时间窗的位置（百分比，便于纯 CSS/SVG 布局）。 */
export function barMetrics(task, range) {
  const s0 = task.start || task.end;
  const e0 = task.end || task.start;
  if (!s0) return null;
  const s = s0 < range.start ? range.start : s0 > range.end ? range.end : s0;
  const e = e0 > range.end ? range.end : e0 < range.start ? range.start : e0;
  const offset = dayDiff(range.start, s);
  const span = Math.max(1, dayDiff(s, e) + 1);
  return {
    offset,
    span,
    leftPct: (offset / range.days) * 100,
    widthPct: (span / range.days) * 100,
  };
}

/** 按负责人分行，每行含其带日期的任务条。 */
export function ganttRows(tasks = [], range) {
  const groups = new Map();
  for (const t of tasks) {
    if (!(t.start || t.end)) continue;
    const who = (t.assignee || '').trim() || '未分配';
    if (!groups.has(who)) groups.set(who, []);
    groups.get(who).push({ task: t, ...barMetrics(t, range) });
  }
  return [...groups.entries()].map(([assignee, items]) => ({
    assignee,
    items: items.sort((a, b) => a.offset - b.offset),
  }));
}

/** 甘特轴上的日期刻度（每 step 天一个）。 */
export function axisTicks(range, step = 7) {
  const ticks = [];
  for (let i = 0; i < range.days; i += step) {
    const date = addDays(range.start, i);
    ticks.push({ date, leftPct: (i / range.days) * 100 });
  }
  return ticks;
}

/* ============================ 番茄专注 ============================ */
export function focusMinutesOn(sessions = [], date) {
  return sessions.reduce((s, x) => (x.date === date ? s + (x.minutes || 0) : s), 0);
}
export function focusCountOn(sessions = [], date) {
  return sessions.reduce((n, x) => (x.date === date ? n + 1 : n), 0);
}
export function totalFocusMinutes(sessions = []) {
  return sessions.reduce((s, x) => s + (x.minutes || 0), 0);
}
/** 连续专注天数：从今天（今天没有则从昨天）起向前数有专注记录的天数。 */
export function focusStreak(sessions = [], today = todayStr()) {
  let cur = today;
  if (focusCountOn(sessions, today) === 0) cur = addDays(today, -1);
  let streak = 0;
  while (focusCountOn(sessions, cur) > 0) {
    streak += 1;
    cur = addDays(cur, -1);
  }
  return streak;
}
/** 各任务累计专注分钟（key 为 taskId，无任务的归到 '__none'）。 */
export function focusByTask(sessions = []) {
  const m = {};
  for (const s of sessions) {
    const k = s.taskId || '__none';
    m[k] = (m[k] || 0) + (s.minutes || 0);
  }
  return m;
}
/** 最近 n 天的专注分钟序列（用于迷你柱图）。 */
export function lastNDays(sessions = [], n = 7, today = todayStr()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    out.push({ date, minutes: focusMinutesOn(sessions, date) });
  }
  return out;
}

/* ============================ 格式化 ============================ */
export function formatDuration(min) {
  const m = Math.max(0, Math.round(min || 0));
  if (m < 60) return `${m} 分钟`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} 小时 ${r} 分` : `${h} 小时`;
}
export function pad2(n) {
  return String(n).padStart(2, '0');
}
/** 秒 → mm:ss（番茄倒计时显示）。 */
export function mmss(totalSec) {
  const s = Math.max(0, Math.round(totalSec || 0));
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
}

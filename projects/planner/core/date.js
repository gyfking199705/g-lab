/**
 * 共享日期工具（纯函数，无依赖）
 * ------------------------------------------------------------------
 * 「成长规划」日常核心模块（看板 / 日程 / 目标 / 习惯）共用的一套日期逻辑。
 * 日期一律用 'YYYY-MM-DD' 字符串（字典序即时间序），便于存储 / 比较 / 单测。
 *
 * 可测试：node --test core/date.test.js
 */

/** 本地时区的 'YYYY-MM-DD'。 */
export function todayStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 'YYYY-MM-DD' → 本地 Date（当天 0 点）。 */
export function parseDate(str) {
  const [y, m, d] = String(str).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** 在日期串上加 n 天（可负），返回新的日期串。 */
export function addDays(str, n) {
  const dt = parseDate(str);
  dt.setDate(dt.getDate() + n);
  return todayStr(dt);
}

/** b - a 的天数差（向最近整数取整）。 */
export function dayDiff(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}

/** 周一为一周之始，返回该周周一的日期串。 */
export function startOfWeek(str) {
  const dt = parseDate(str);
  const wd = (dt.getDay() + 6) % 7; // 周一=0
  return addDays(str, -wd);
}

/** 返回从 start 起的 7 个日期串（一周）。 */
export function weekDates(str) {
  const mon = startOfWeek(str);
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}

const WD = ['日', '一', '二', '三', '四', '五', '六'];
export function weekdayCN(str) {
  return '周' + WD[parseDate(str).getDay()];
}

/** 'M/D' 简写。 */
export function fmtMD(str) {
  const [, m, d] = String(str).split('-');
  return `${Number(m)}/${Number(d)}`;
}

/** 'M/D 周X'。 */
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

/** 最近 n 天的日期串（含今天），从早到晚。 */
export function lastNDays(n, today = todayStr()) {
  return Array.from({ length: n }, (_, i) => addDays(today, -(n - 1 - i)));
}

/** 是否同一天。 */
export function isSameDay(a, b) {
  return a === b;
}

/** 是否今天之前（逾期判断用）。 */
export function isBefore(a, b) {
  return parseDate(a) < parseDate(b);
}

/**
 * 日程安排 —— 纯函数计算逻辑（不依赖 React / UI）
 * ------------------------------------------------------------------
 * 日程项 item = {
 *   id, title, date('YYYY-MM-DD'), time?('HH:MM'), note?,
 *   done, doneAt?, goalId?,        // 可选关联目标
 *   createdAt
 * }
 * 日期/周一律用 core/date.js 工具。可测试：node --test schedule/calc.test.js
 */
import { todayStr, weekDates, isBefore } from '../core/date.js';

/** 某一天的日程，按时间排序（无时间排最后）。 */
export function itemsOnDate(items = [], date) {
  return items
    .filter((it) => it.date === date)
    .sort((a, b) => timeKey(a) - timeKey(b));
}

/** 一周（含 date 所在周一起 7 天）按天分组：[{ date, items }]。 */
export function weekGroups(items = [], date) {
  return weekDates(date).map((d) => ({ date: d, items: itemsOnDate(items, d) }));
}

/** 今日分桶：逾期未完成 / 今天 / 已完成（今天）。供看板。 */
export function todayView(items = [], today = todayStr()) {
  const todays = itemsOnDate(items, today);
  const overdue = items
    .filter((it) => !it.done && it.date && isBefore(it.date, today))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  return {
    overdue,
    pending: todays.filter((it) => !it.done),
    done: todays.filter((it) => it.done),
  };
}

/** 某天完成统计。 */
export function dayStats(items, date) {
  const list = itemsOnDate(items, date);
  const done = list.filter((it) => it.done).length;
  return { done, total: list.length };
}

/** 某周完成统计（用于周视图标题）。 */
export function weekStats(items, date) {
  const list = weekDates(date).flatMap((d) => itemsOnDate(items, d));
  const done = list.filter((it) => it.done).length;
  return { done, total: list.length };
}

/** 逾期未完成数量（红点提醒用）。 */
export function overdueCount(items = [], today = todayStr()) {
  return items.filter((it) => !it.done && it.date && isBefore(it.date, today)).length;
}

function timeKey(it) {
  if (!it.time) return 24 * 60 + 1; // 无时间排最后
  const [h, m] = String(it.time).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

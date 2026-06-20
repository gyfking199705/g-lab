/**
 * 目标进度 —— 纯函数计算逻辑（不依赖 React / UI）
 * ------------------------------------------------------------------
 * 一个目标 goal = {
 *   id, title, note, category, deadline?('YYYY-MM-DD'), createdAt, archived,
 *   subtasks: [{ id, title, done, doneAt }],
 *   metric?: { current, target, unit }   // 可选数值型目标（如「跑量 100km」）
 * }
 *
 * 进度优先看 metric（数值型），否则看子任务完成比。两者皆空则 0%。
 * 可测试：node --test goals/calc.test.js
 */
import { dayDiff, todayStr } from '../core/date.js';

/** 单个目标的进度（0–1）。数值型 metric 优先，否则子任务比例。 */
export function goalProgress(goal) {
  if (!goal) return 0;
  const m = goal.metric;
  if (m && typeof m.target === 'number' && m.target > 0) {
    return clamp01((Number(m.current) || 0) / m.target);
  }
  const subs = goal.subtasks || [];
  if (!subs.length) return 0;
  const done = subs.filter((s) => s.done).length;
  return clamp01(done / subs.length);
}

/** 进度百分比整数（0–100）。 */
export function goalPercent(goal) {
  return Math.round(goalProgress(goal) * 100);
}

/** 目标是否达成（进度满）。 */
export function isAchieved(goal) {
  return goalProgress(goal) >= 1 && (goalHasMeasure(goal));
}

/** 目标是否有可度量内容（metric 有 target 或有子任务）。 */
export function goalHasMeasure(goal) {
  const m = goal && goal.metric;
  if (m && typeof m.target === 'number' && m.target > 0) return true;
  return !!(goal && goal.subtasks && goal.subtasks.length);
}

/** 距离截止日的天数（正=还剩，负=已逾期，null=无截止）。 */
export function daysLeft(goal, today = todayStr()) {
  if (!goal || !goal.deadline) return null;
  return dayDiff(today, goal.deadline);
}

/** 截止状态：'none' | 'overdue' | 'due-soon'(<=7天) | 'ok'。已达成视为 ok。 */
export function deadlineStatus(goal, today = todayStr()) {
  const d = daysLeft(goal, today);
  if (d == null) return 'none';
  if (isAchieved(goal)) return 'ok';
  if (d < 0) return 'overdue';
  if (d <= 7) return 'due-soon';
  return 'ok';
}

/** 子任务统计。 */
export function subtaskStats(goal) {
  const subs = (goal && goal.subtasks) || [];
  const done = subs.filter((s) => s.done).length;
  return { done, total: subs.length };
}

/** 全部（未归档）目标的汇总，供看板用。 */
export function overallStats(goals = []) {
  const active = goals.filter((g) => !g.archived);
  const achieved = active.filter(isAchieved).length;
  const avg = active.length
    ? active.reduce((s, g) => s + goalProgress(g), 0) / active.length
    : 0;
  return { total: active.length, achieved, avgPercent: Math.round(avg * 100) };
}

/** 排序：未达成在前、临近截止在前、无截止靠后。用于看板/列表展示。 */
export function sortGoalsForBoard(goals = [], today = todayStr()) {
  return [...goals]
    .filter((g) => !g.archived)
    .sort((a, b) => {
      const aa = isAchieved(a) ? 1 : 0;
      const bb = isAchieved(b) ? 1 : 0;
      if (aa !== bb) return aa - bb; // 未达成在前
      const ad = daysLeft(a, today);
      const bd = daysLeft(b, today);
      if (ad == null && bd == null) return 0;
      if (ad == null) return 1;
      if (bd == null) return -1;
      return ad - bd; // 截止近的在前
    });
}

function clamp01(x) {
  if (!isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

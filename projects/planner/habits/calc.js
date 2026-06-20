/**
 * 习惯打卡 —— 纯函数计算逻辑（不依赖 React / UI）
 * ------------------------------------------------------------------
 * 习惯 habit = {
 *   id, name, icon, color,
 *   type: 'check' | 'count',     // 勾选 / 计数（如喝水 8 杯）
 *   target?,                      // count 型的每日目标值
 *   unit?,                        // count 型单位（杯 / 分钟…）
 *   source?: 'manual' | 'fitness',// fitness=由健身模块训练记录自动点亮
 *   goalId?,                      // 可选：贡献到某个目标
 *   createdAt, archived
 * }
 * 打卡 checkins = { [habitId]: { [date]: number } }   // check 型用 1，count 型用累计值
 *
 * 与健身模块的联动通过 externalDoneDates(Set<dateStr>) 注入，保持本文件纯净可测。
 * 可测试：node --test habits/calc.test.js
 */
import { addDays, todayStr, lastNDays } from '../core/date.js';

/** 某习惯某天的原始打卡值（数字；无记录为 0）。 */
export function valueOn(habit, date, checkins) {
  const log = (checkins && checkins[habit.id]) || {};
  return Number(log[date]) || 0;
}

/**
 * 某习惯某天是否达成。
 * - source='fitness'：当天在 externalDoneDates 内即达成（也允许手动补打卡）。
 * - count 型：累计值 >= target。
 * - check 型：值 > 0。
 */
export function isDoneOn(habit, date, checkins, externalDoneDates = null) {
  if (habit.source === 'fitness' && externalDoneDates && externalDoneDates.has(date)) return true;
  const v = valueOn(habit, date, checkins);
  if (habit.type === 'count') return v >= (Number(habit.target) || 1);
  return v > 0;
}

/** 当前连续天数（从今天往回数；今天未达成则从昨天起算，保留「今天还能补」的体验）。 */
export function currentStreak(habit, checkins, today = todayStr(), externalDoneDates = null) {
  let streak = 0;
  let cursor = today;
  // 今天没完成不立刻断：从昨天往回数；今天完成了则从今天数。
  if (!isDoneOn(habit, today, checkins, externalDoneDates)) cursor = addDays(today, -1);
  while (isDoneOn(habit, cursor, checkins, externalDoneDates)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** 历史最长连续天数（扫描有记录的日期范围）。 */
export function bestStreak(habit, checkins, today = todayStr(), externalDoneDates = null) {
  const dates = collectDates(habit, checkins, externalDoneDates);
  if (!dates.length) return 0;
  const start = dates[0];
  const end = today > dates[dates.length - 1] ? today : dates[dates.length - 1];
  let best = 0;
  let run = 0;
  let cursor = start;
  while (cursor <= end) {
    if (isDoneOn(habit, cursor, checkins, externalDoneDates)) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
    cursor = addDays(cursor, 1);
  }
  return best;
}

/** 最近 n 天的完成率（0–1）。 */
export function completionRate(habit, checkins, n = 30, today = todayStr(), externalDoneDates = null) {
  const days = lastNDays(n, today);
  const done = days.filter((d) => isDoneOn(habit, d, checkins, externalDoneDates)).length;
  return days.length ? done / days.length : 0;
}

/** 最近 n 天的热力图数据：[{ date, done, value, ratio }]，ratio 用于 count 型深浅。 */
export function heatmap(habit, checkins, n = 70, today = todayStr(), externalDoneDates = null) {
  return lastNDays(n, today).map((date) => {
    const value = valueOn(habit, date, checkins);
    const done = isDoneOn(habit, date, checkins, externalDoneDates);
    let ratio = done ? 1 : 0;
    if (habit.type === 'count' && habit.target) ratio = Math.max(0, Math.min(1, value / habit.target));
    if (habit.source === 'fitness' && done) ratio = 1;
    return { date, done, value, ratio };
  });
}

/** 今天所有习惯的完成进度，供看板：{ doneCount, total, items:[{habit,done,value}] }。 */
export function todayBoard(habits = [], checkins = {}, today = todayStr(), externalDoneDates = null) {
  const active = habits.filter((h) => !h.archived);
  const items = active.map((h) => ({
    habit: h,
    done: isDoneOn(h, today, checkins, externalDoneDates),
    value: valueOn(h, today, checkins),
  }));
  return { doneCount: items.filter((i) => i.done).length, total: active.length, items };
}

/** 收集某习惯所有有意义的日期（手动打卡日 + 外部点亮日），升序去重。 */
function collectDates(habit, checkins, externalDoneDates) {
  const set = new Set(Object.keys((checkins && checkins[habit.id]) || {}));
  if (habit.source === 'fitness' && externalDoneDates) for (const d of externalDoneDates) set.add(d);
  return [...set].sort();
}

/** 从健身模块数据里取出「有训练记录的日期」集合，供 source='fitness' 习惯点亮。 */
export function fitnessWorkoutDates(fitnessData) {
  const set = new Set();
  const workouts = (fitnessData && fitnessData.workouts) || [];
  for (const w of workouts) if (w && w.date) set.add(w.date);
  return set;
}

/** 切换 check 型当天打卡，返回新的 checkins（不可变）。 */
export function toggleCheck(checkins, habitId, date) {
  const next = { ...checkins };
  const log = { ...(next[habitId] || {}) };
  if (log[date]) delete log[date];
  else log[date] = 1;
  next[habitId] = log;
  return next;
}

/** 调整 count 型当天数值（delta 可正负，结果不小于 0），返回新的 checkins。 */
export function bumpCount(checkins, habitId, date, delta) {
  const next = { ...checkins };
  const log = { ...(next[habitId] || {}) };
  const v = Math.max(0, (Number(log[date]) || 0) + delta);
  if (v === 0) delete log[date];
  else log[date] = v;
  next[habitId] = log;
  return next;
}

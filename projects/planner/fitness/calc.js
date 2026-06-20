/**
 * 健身训练规划 —— 纯函数计算逻辑
 * ------------------------------------------------------------------
 * 不依赖 React 或 UI，便于单元测试与复用。涵盖：
 *   1RM 估算(Epley/Brzycki)、训练容量(volume)、按肌群容量、最佳成绩与 1RM 走势、
 *   训练频率(本周次数/连续训练周)、活跃度序列、进阶建议、中文格式化。
 *
 * 约定：日期用 'YYYY-MM-DD'（字典序即时间序）；容量 = Σ(组次数 reps × 重量 weight)。
 * 可在 Node 中测试：  node --test fitness/calc.test.js
 */

/* ============================ 日期工具（模块自含，避免跨模块耦合） ============================ */
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

let __seq = 0;
export function uid(prefix = 'id') {
  __seq = (__seq + 1) % 1e6;
  return `${prefix}_${Date.now().toString(36)}_${__seq.toString(36)}`;
}

/* ============================ 1RM 估算 ============================ */
export const ONE_RM_FORMULAS = { epley: 'Epley', brzycki: 'Brzycki' };

/**
 * 由「重量 × 次数」估算 1RM（单位与输入重量一致）。
 * Epley:   1RM = w × (1 + reps/30)
 * Brzycki: 1RM = w × 36 / (37 − reps)
 */
export function estimate1RM(weight, reps, formula = 'epley') {
  const w = Math.max(0, weight || 0);
  const r = Math.max(1, Math.round(reps || 0));
  if (!w) return 0;
  if (r === 1) return w;
  if (formula === 'brzycki') return r >= 37 ? w : (w * 36) / (37 - r);
  return w * (1 + r / 30);
}

/* ============================ 训练容量 ============================ */
export function setVolume(set) {
  return Math.max(0, set?.reps || 0) * Math.max(0, set?.weight || 0);
}
export function entryVolume(entry) {
  return (entry?.sets || []).reduce((s, x) => s + setVolume(x), 0);
}
export function workoutVolume(workout) {
  return (workout?.entries || []).reduce((s, e) => s + entryVolume(e), 0);
}
export function workoutSetCount(workout) {
  return (workout?.entries || []).reduce((s, e) => s + (e.sets ? e.sets.length : 0), 0);
}
export function totalVolume(workouts) {
  return (workouts || []).reduce((s, w) => s + workoutVolume(w), 0);
}

/** 各肌群训练容量（可用 since 限定起始日期，含当天）。返回 { 肌群: 容量 }。 */
export function volumeByMuscle(workouts, since) {
  const map = {};
  for (const w of workouts || []) {
    if (since && w.date < since) continue;
    for (const e of w.entries || []) {
      const m = e.muscle || '其它';
      map[m] = (map[m] || 0) + entryVolume(e);
    }
  }
  return map;
}

/* ============================ 个人最佳 / 1RM 走势 ============================ */
/** 某动作历史最佳估算 1RM。 */
export function best1RM(workouts, exId, formula = 'epley') {
  let best = 0;
  for (const w of workouts || []) {
    for (const e of w.entries || []) {
      if (e.exId !== exId) continue;
      for (const s of e.sets || []) {
        const v = estimate1RM(s.weight, s.reps, formula);
        if (v > best) best = v;
      }
    }
  }
  return best;
}

/** 某动作按日期的最佳估算 1RM 走势（升序）。 */
export function oneRMSeries(workouts, exId, formula = 'epley') {
  const byDate = {};
  for (const w of workouts || []) {
    for (const e of w.entries || []) {
      if (e.exId !== exId) continue;
      let dayBest = 0;
      for (const s of e.sets || []) {
        const v = estimate1RM(s.weight, s.reps, formula);
        if (v > dayBest) dayBest = v;
      }
      if (dayBest > 0) byDate[w.date] = Math.max(byDate[w.date] || 0, dayBest);
    }
  }
  return Object.keys(byDate)
    .sort()
    .map((d) => ({ date: d, value: byDate[d] }));
}

/** 某动作的历史最重一组（重量优先，重量相同取次数多者）。 */
export function bestSet(workouts, exId) {
  let best = null;
  for (const w of workouts || []) {
    for (const e of w.entries || []) {
      if (e.exId !== exId) continue;
      for (const s of e.sets || []) {
        const wt = s.weight || 0;
        if (!best || wt > (best.weight || 0) || (wt === (best.weight || 0) && (s.reps || 0) > (best.reps || 0))) {
          best = { reps: s.reps || 0, weight: wt, date: w.date };
        }
      }
    }
  }
  return best;
}

/** 列出记录里出现过的动作（去重，带名称/肌群），便于在统计里选择。 */
export function loggedExercises(workouts) {
  const map = new Map();
  for (const w of workouts || []) {
    for (const e of w.entries || []) {
      if (e.exId && !map.has(e.exId)) map.set(e.exId, { exId: e.exId, name: e.name, muscle: e.muscle });
    }
  }
  return [...map.values()];
}

/* ============================ 训练频率 ============================ */
/** 周一为一周起点，返回该周的周一日期。 */
export function startOfWeek(dateStr) {
  const d = parseDate(dateStr);
  const wd = (d.getDay() + 6) % 7; // 周一=0
  return addDays(dateStr, -wd);
}

/** 本周训练「天数」（去重日期）。 */
export function workoutsThisWeek(workouts, today = todayStr()) {
  const start = startOfWeek(today);
  const dates = new Set();
  for (const w of workouts || []) {
    if (w.date >= start && w.date <= today) dates.add(w.date);
  }
  return dates.size;
}

/** 连续训练周数：本周还没练不立即断（顺延到上一周起算）。 */
export function weekStreak(workouts, today = todayStr()) {
  const weeks = new Set((workouts || []).map((w) => startOfWeek(w.date)));
  if (!weeks.size) return 0;
  let cur = 0;
  let cursor = startOfWeek(today);
  if (!weeks.has(cursor)) cursor = addDays(cursor, -7);
  while (weeks.has(cursor)) {
    cur += 1;
    cursor = addDays(cursor, -7);
  }
  return cur;
}

/* ============================ 活跃度 ============================ */
/** 最近 days 天的训练活跃度（含今天），按容量/次数上色。 */
export function activitySeries(workouts, today = todayStr(), days = 84) {
  const byDate = {};
  for (const w of workouts || []) {
    byDate[w.date] = byDate[w.date] || { volume: 0, count: 0 };
    byDate[w.date].volume += workoutVolume(w);
    byDate[w.date].count += 1;
  }
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const hit = byDate[date] || { volume: 0, count: 0 };
    out.push({ date, volume: hit.volume, count: hit.count, weekday: parseDate(date).getDay() });
  }
  return out;
}

/* ============================ 进阶建议 ============================ */
/** 达成目标次数后的线性增重建议（默认 +2.5）。 */
export function suggestNextWeight(topWeight, { step = 2.5, reachedTarget = true } = {}) {
  if (!topWeight) return 0;
  return reachedTarget ? Math.round((topWeight + step) * 2) / 2 : topWeight;
}

/* ============================ 格式化 ============================ */
function trim(n) {
  const v = Math.round((n || 0) * 10) / 10;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/** 容量格式化：kg 且 ≥1000 显示「吨」，否则带单位。 */
export function formatVolume(v, unit = 'kg') {
  const n = Math.round(v || 0);
  if (unit === 'kg' && n >= 1000) return `${trim(n / 1000)} 吨`;
  return `${n.toLocaleString('zh-CN')} ${unit}`;
}

/** 重量格式化，如 "60 kg"。 */
export function formatWeight(w, unit = 'kg') {
  return `${trim(w)} ${unit}`;
}

/** 'YYYY-MM-DD' → 'M月D日'。 */
export function fmtDate(str) {
  const [, m, d] = String(str).split('-');
  if (!m || !d) return str;
  return `${Number(m)}月${Number(d)}日`;
}

/** 相对今天：今天/昨天/N天前。 */
export function relDay(str, today = todayStr()) {
  const diff = dayDiff(str, today);
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff > 0) return `${diff} 天前`;
  return fmtDate(str);
}

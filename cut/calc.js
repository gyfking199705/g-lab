/**
 * 减脂计划 —— 纯函数计算逻辑（能量平衡 + 趋势体重引擎，不依赖 React / UI）
 * ------------------------------------------------------------------
 * 融合市面应用的核心做法：
 *   · 趋势体重（Happy Scale / MacroFactor）：对每日体重做指数移动平均(EMA)，抹平水分噪声
 *   · 自适应 TDEE（MacroFactor）：用「趋势体重变化 + 平均摄入」反推真实总消耗，比公式准
 *   · 公式 TDEE（Mifflin-St Jeor）：数据不足时的初始估计
 *   · 能量缺口 / 投影达成日 / 瘦体重·脂肪量拆分（7700 kcal ≈ 1kg 脂肪）
 *
 * 数据模型：
 *   profile = { sex:'male'|'female', height(cm), age, activity, startDate,
 *               startWeight, goalWeight, startBodyFat?, goalBodyFat? }
 *   logs = [ { date('YYYY-MM-DD'), weight?(kg), intake?(kcal), exercise?(kcal), bodyFat?(%), note? } ]
 *
 * 可测试：node --test cut/calc.test.js
 */
import { todayStr, addDays, dayDiff, lastNDays } from '../core/date.js';

export const KCAL_PER_KG = 7700; // 每公斤脂肪约含热量
export const EMA_ALPHA = 0.1; // 趋势体重平滑系数（越小越平滑）

export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: '久坐（很少运动）', factor: 1.2 },
  { id: 'light', label: '轻度（每周 1–3 次）', factor: 1.375 },
  { id: 'moderate', label: '中度（每周 3–5 次）', factor: 1.55 },
  { id: 'active', label: '高度（每周 6–7 次）', factor: 1.725 },
  { id: 'very', label: '极高（体力工作/二次训练）', factor: 1.9 },
];
const FACTOR = Object.fromEntries(ACTIVITY_LEVELS.map((a) => [a.id, a.factor]));

/** Mifflin-St Jeor 基础代谢率 BMR（kcal/天）。 */
export function mifflinBMR({ sex, weight, height, age }) {
  const w = Number(weight) || 0;
  const h = Number(height) || 0;
  const a = Number(age) || 0;
  const base = 10 * w + 6.25 * h - 5 * a;
  return Math.round(base + (sex === 'female' ? -161 : 5));
}

/** 公式 TDEE = BMR × 活动系数。 */
export function formulaTDEE(profile, weight) {
  const w = weight != null ? weight : profile.startWeight;
  const bmr = mifflinBMR({ sex: profile.sex, weight: w, height: profile.height, age: profile.age });
  const factor = FACTOR[profile.activity] || 1.2;
  return Math.round(bmr * factor);
}

/** 按日期升序排列（不改原数组）。 */
export function sortedLogs(logs = []) {
  return [...logs].filter((l) => l && l.date).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** 只取有体重的记录，做 EMA → [{date, weight, trend}]（升序）。 */
export function trendSeries(logs = [], alpha = EMA_ALPHA) {
  const ws = sortedLogs(logs).filter((l) => isNum(l.weight));
  let trend = null;
  return ws.map((l) => {
    const w = Number(l.weight);
    trend = trend == null ? w : alpha * w + (1 - alpha) * trend;
    return { date: l.date, weight: w, trend: round1(trend) };
  });
}

/** 最近一次实测体重（无则 null）。 */
export function latestWeight(logs = []) {
  const ws = sortedLogs(logs).filter((l) => isNum(l.weight));
  return ws.length ? Number(ws[ws.length - 1].weight) : null;
}

/** 最近的趋势体重（无则回退最近实测）。 */
export function latestTrend(logs = []) {
  const s = trendSeries(logs);
  return s.length ? s[s.length - 1].trend : latestWeight(logs);
}

/** 每周变化速度（kg/周，负=下降）。基于趋势体重在最近 windowDays 内的斜率。 */
export function weeklyRate(logs = [], windowDays = 14) {
  const s = trendSeries(logs);
  if (s.length < 2) return null;
  const end = s[s.length - 1];
  // 找窗口起点：尽量接近 windowDays 天前
  let start = s[0];
  for (let i = s.length - 1; i >= 0; i--) {
    if (dayDiff(s[i].date, end.date) >= windowDays) { start = s[i]; break; }
    start = s[i];
  }
  const days = dayDiff(start.date, end.date);
  if (days <= 0) return null;
  return round2(((end.trend - start.trend) / days) * 7);
}

/**
 * 自适应 TDEE：在最近 windowDays 内，
 *   TDEE ≈ 平均每日摄入 − (趋势体重变化 kg × 7700 / 天数)
 * 体重下降时（变化为负）→ 消耗 > 摄入。
 * 需要：窗口跨度 ≥ minDays，且窗口内有 ≥ minIntake 天摄入记录。否则返回 null。
 */
export function adaptiveTDEE(logs = [], { windowDays = 21, minDays = 10, minIntake = 7 } = {}) {
  const s = trendSeries(logs);
  if (s.length < 2) return null;
  const end = s[s.length - 1];
  let start = s[0];
  for (let i = s.length - 1; i >= 0; i--) {
    if (dayDiff(s[i].date, end.date) >= windowDays) { start = s[i]; break; }
    start = s[i];
  }
  const days = dayDiff(start.date, end.date);
  if (days < minDays) return null;

  // 窗口内的平均摄入
  const intakeLogs = sortedLogs(logs).filter(
    (l) => isNum(l.intake) && l.date >= start.date && l.date <= end.date
  );
  if (intakeLogs.length < minIntake) return null;
  const avgIntake = intakeLogs.reduce((sum, l) => sum + Number(l.intake), 0) / intakeLogs.length;

  const trendChange = end.trend - start.trend; // kg，负=减重
  const tdee = avgIntake - (trendChange * KCAL_PER_KG) / days;
  return Math.round(tdee);
}

/** 估计 TDEE：优先自适应，数据不足回退公式。返回 { tdee, mode }。 */
export function estimateTDEE(profile, logs = []) {
  const adaptive = adaptiveTDEE(logs);
  if (adaptive != null && adaptive > 800 && adaptive < 6000) return { tdee: adaptive, mode: 'adaptive' };
  const w = latestTrend(logs) || profile.startWeight;
  return { tdee: formulaTDEE(profile, w), mode: 'formula' };
}

/** 进度（0–1）：减重场景 (start-current)/(start-goal)。 */
export function progress(profile, current) {
  const span = profile.startWeight - profile.goalWeight;
  if (!span) return current <= profile.goalWeight ? 1 : 0;
  return clamp01((profile.startWeight - current) / span);
}

/** 已减 / 还剩（kg）。 */
export function lostKg(profile, current) {
  return round1(profile.startWeight - current);
}
export function remainingKg(profile, current) {
  return round1(current - profile.goalWeight);
}

/** 投影达成日：按当前每周速度，从当前趋势体重推到目标。方向不对/停滞返回 null。 */
export function projection(profile, currentTrend, rate, today = todayStr()) {
  if (rate == null) return null;
  const remaining = currentTrend - profile.goalWeight;
  if (Math.abs(remaining) < 0.05) return { date: today, days: 0 };
  // 需要朝目标方向：减重时 remaining>0 且 rate<0
  const towardGoal = (remaining > 0 && rate < 0) || (remaining < 0 && rate > 0);
  if (!towardGoal) return null;
  const days = Math.round(Math.abs(remaining) / (Math.abs(rate) / 7));
  if (!isFinite(days) || days > 3650) return null;
  return { date: addDays(today, days), days };
}

/** 身体成分：脂肪量 / 瘦体重（kg）。 */
export function bodyComposition(weight, bodyFatPct) {
  if (!isNum(weight) || !isNum(bodyFatPct)) return null;
  const f = clamp01(bodyFatPct / 100);
  const fat = round1(weight * f);
  return { fat, lean: round1(weight - fat) };
}

/** 在保持当前瘦体重的前提下，达到目标体脂率所需体重。 */
export function goalWeightAtBodyFat(leanMass, goalBodyFatPct) {
  const f = clamp01(goalBodyFatPct / 100);
  if (f >= 1) return null;
  return round1(leanMass / (1 - f));
}

/** 为达成某周减重速度所需的每日摄入目标。 */
export function calorieTargetForRate(tdee, kgPerWeek) {
  return Math.round(tdee - (kgPerWeek * KCAL_PER_KG) / 7);
}

/** 某天能量缺口 = (TDEE + 当日额外运动) − 摄入。无摄入返回 null。 */
export function deficitOf(log, baseTDEE) {
  if (!log || !isNum(log.intake)) return null;
  const expenditure = baseTDEE + (isNum(log.exercise) ? Number(log.exercise) : 0);
  return Math.round(expenditure - Number(log.intake));
}

/** 最近 n 天的缺口序列 [{date, deficit|null}]（用于柱状图）。 */
export function deficitSeries(logs = [], baseTDEE, n = 14, today = todayStr()) {
  const byDate = {};
  for (const l of logs) if (l && l.date) byDate[l.date] = l;
  return lastNDays(n, today).map((date) => ({ date, deficit: byDate[date] ? deficitOf(byDate[date], baseTDEE) : null }));
}

/** 连续达成「热量缺口为正」的天数（今天没记不立刻断，从昨天数）。 */
export function deficitStreak(logs = [], baseTDEE, today = todayStr()) {
  const byDate = {};
  for (const l of logs) if (l && l.date) byDate[l.date] = l;
  const ok = (d) => { const def = byDate[d] ? deficitOf(byDate[d], baseTDEE) : null; return def != null && def > 0; };
  let streak = 0;
  let cursor = ok(today) ? today : addDays(today, -1);
  while (ok(cursor)) { streak += 1; cursor = addDays(cursor, -1); }
  return streak;
}

/** 某天的记录（无则 null）。 */
export function logOn(logs = [], date) {
  return sortedLogs(logs).find((l) => l.date === date) || null;
}

/**
 * 仪表盘汇总：一次算好首页/模块都要用的指标。
 */
export function summary(profile, logs = [], today = todayStr()) {
  if (!profile) return null;
  const currentWeight = latestWeight(logs);
  const currentTrend = latestTrend(logs) || profile.startWeight;
  const ref = currentTrend; // 用趋势体重作为「当前」基准，更稳
  const { tdee, mode } = estimateTDEE(profile, logs);
  const rate = weeklyRate(logs);
  const proj = projection(profile, currentTrend, rate, today);
  const todayLog = logOn(logs, today);
  const todayDeficit = todayLog ? deficitOf(todayLog, tdee) : null;
  const latestBf = latestBodyFat(logs) ?? profile.startBodyFat ?? null;
  const comp = bodyComposition(ref, latestBf);
  const goalAtBf = comp && isNum(profile.goalBodyFat) ? goalWeightAtBodyFat(comp.lean, profile.goalBodyFat) : null;
  return {
    startWeight: profile.startWeight,
    goalWeight: profile.goalWeight,
    currentWeight,
    currentTrend,
    lost: lostKg(profile, ref),
    remaining: remainingKg(profile, ref),
    progressPct: Math.round(progress(profile, ref) * 100),
    weeklyRate: rate,
    tdee,
    tdeeMode: mode,
    todayIntake: todayLog && isNum(todayLog.intake) ? Number(todayLog.intake) : null,
    todayDeficit,
    deficitStreak: deficitStreak(logs, tdee, today),
    projectedDate: proj ? proj.date : null,
    etaDays: proj ? proj.days : null,
    bodyFat: latestBf,
    fatMass: comp ? comp.fat : null,
    leanMass: comp ? comp.lean : null,
    goalWeightAtBodyFat: goalAtBf,
    hasWeight: currentWeight != null,
  };
}

/** 最近一次体脂记录。 */
export function latestBodyFat(logs = []) {
  const bs = sortedLogs(logs).filter((l) => isNum(l.bodyFat));
  return bs.length ? Number(bs[bs.length - 1].bodyFat) : null;
}

/* ----------------------------- 小工具 ----------------------------- */
function isNum(v) { return v != null && v !== '' && isFinite(Number(v)); }
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function round1(x) { return Math.round(x * 10) / 10; }
function round2(x) { return Math.round(x * 100) / 100; }

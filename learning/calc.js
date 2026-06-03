/**
 * AI 学习计划站 —— 纯函数计算逻辑
 * ------------------------------------------------------------------
 * 本文件不依赖 React 或任何 UI，所有导出均为纯函数（除 uid 外），便于单元测试与复用。
 * 涵盖：间隔复习(SM-2 变体)、进度统计、连续学习天数、活跃度序列、学习节奏建议、
 *       模板脚手架、AI 计划的提示词构建与响应解析、以及中文格式化。
 *
 * 约定：
 *  - 日期统一用 'YYYY-MM-DD' 字符串表示（按本地日历），字典序即时间序，便于比较与存储。
 *  - 时长统一用「分钟」。
 *
 * 可在 Node 中直接测试：  node --test learning/calc.test.js
 * 可在浏览器中作为 ES Module 引入：  import { planStats } from './calc.js'
 */

/* =============================================================
 * 0. 数据结构（JSDoc 约定，便于阅读）
 * =============================================================
 * @typedef {Object} SR  间隔复习状态
 * @property {number} reps      已成功复习次数
 * @property {number} ease      难度系数(EF)，下限 1.3
 * @property {number} interval  当前间隔(天)
 * @property {string} due       下次到期日 'YYYY-MM-DD'
 * @property {string} [last]    上次复习日
 *
 * @typedef {Object} Lesson  知识点(可学习/可复习的最小单元)
 * @property {string} id
 * @property {string} title
 * @property {string} [note]
 * @property {'todo'|'learning'|'mastered'} status
 * @property {Array<{title?:string,url:string}>} [resources]
 * @property {SR|null} [sr]
 * @property {string} [explain]  AI 讲解缓存
 *
 * @typedef {Object} Module  { id, title, lessons: Lesson[] }
 * @typedef {Object} Plan    { id, title, subject, summary, icon, level, weeks, hoursPerWeek, createdAt, modules: Module[] }
 * @typedef {Object} Session { id, date:'YYYY-MM-DD', minutes:number, planId?:string, note?:string }
 */

export const LESSON_STATUS = ['todo', 'learning', 'mastered'];
export const STATUS_LABEL = { todo: '未开始', learning: '学习中', mastered: '已掌握' };

/* =============================================================
 * 1. 日期工具（'YYYY-MM-DD' 本地日历）
 * ============================================================= */
/** Date → 'YYYY-MM-DD'（本地时区）。 */
export function todayStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 'YYYY-MM-DD' → 本地 00:00 的 Date。 */
export function parseDate(str) {
  const [y, m, d] = String(str).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** 在日期字符串上加 n 天，返回新的 'YYYY-MM-DD'。 */
export function addDays(str, n) {
  const dt = parseDate(str);
  dt.setDate(dt.getDate() + n);
  return todayStr(dt);
}

/** 天数差 b - a（可为负）。 */
export function dayDiff(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}

/** 相对今天的中文表述：今天 / 明天 / 后天 / N 天后 / 逾期 N 天。 */
export function relDay(str, today = todayStr()) {
  const diff = dayDiff(today, str);
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  if (diff === 2) return '后天';
  if (diff > 0) return `${diff} 天后`;
  if (diff === -1) return '昨天';
  return `逾期 ${-diff} 天`;
}

/* 简单的本地唯一 id（非纯函数；仅用于生成新实体）。 */
let __seq = 0;
export function uid(prefix = 'id') {
  __seq = (__seq + 1) % 1e6;
  return `${prefix}_${Date.now().toString(36)}_${__seq.toString(36)}`;
}

/* =============================================================
 * 2. 间隔复习（SM-2 变体）
 * 评分 → 质量分 q：忘了(0) / 有点难(3) / 记得(4) / 太简单(5)。
 * q<3 视为没记住：重置复习次数，明天再来；q>=3 按 SM-2 拉长间隔。
 * 难度系数 EF 每次按 q 调整，下限 1.3。
 * ============================================================= */
export const GRADES = {
  again: { quality: 0, label: '忘了' },
  hard: { quality: 3, label: '有点难' },
  good: { quality: 4, label: '记得' },
  easy: { quality: 5, label: '太简单' },
};

/** 评分键 → 质量分（未知评分按 4 处理）。 */
export function qualityOf(grade) {
  return GRADES[grade] ? GRADES[grade].quality : 4;
}

const round2 = (v) => Math.round(v * 100) / 100;

/** 新建一个「初次纳入复习」的 SR 状态（明天首次复习）。 */
export function initialSR(today = todayStr()) {
  return { reps: 0, ease: 2.5, interval: 0, due: today, last: null };
}

/**
 * 根据评分推进 SR 状态。
 * @param {{sr:SR|null, grade:keyof GRADES, today?:string}} o
 * @returns {SR}
 */
export function scheduleReview({ sr, grade, today = todayStr() }) {
  const q = qualityOf(grade);
  const prev = sr || initialSR(today);
  let reps = prev.reps;
  // EF 调整（原 SM-2 公式），下限 1.3
  let ease = Math.max(1.3, prev.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  let interval;
  if (q < 3) {
    reps = 0; // 没记住，重新开始
    interval = 1; // 明天再来
  } else {
    reps = reps + 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 6;
    else interval = Math.max(1, Math.round((prev.interval || 1) * ease));
  }
  return { reps, ease: round2(ease), interval, due: addDays(today, interval), last: today };
}

/* =============================================================
 * 3. 进度统计
 * ============================================================= */
/** 遍历计划下所有知识点，统计各状态数量与完成度。 */
export function planStats(plan) {
  let total = 0;
  let mastered = 0;
  let learning = 0;
  for (const m of plan?.modules || []) {
    for (const l of m.lessons || []) {
      total += 1;
      if (l.status === 'mastered') mastered += 1;
      else if (l.status === 'learning') learning += 1;
    }
  }
  const todo = total - mastered - learning;
  return {
    total,
    mastered,
    learning,
    todo,
    pct: total > 0 ? mastered / total : 0,
    // 加权进度：学习中算半步，用于更顺滑的进度条
    weighted: total > 0 ? (mastered + learning * 0.5) / total : 0,
  };
}

/** 跨多个计划汇总统计。 */
export function overallStats(plans) {
  const acc = { total: 0, mastered: 0, learning: 0, todo: 0 };
  for (const p of plans || []) {
    const s = planStats(p);
    acc.total += s.total;
    acc.mastered += s.mastered;
    acc.learning += s.learning;
    acc.todo += s.todo;
  }
  acc.pct = acc.total > 0 ? acc.mastered / acc.total : 0;
  return acc;
}

/* =============================================================
 * 4. 学习 / 复习队列
 * ============================================================= */
/** 把每个知识点连同它所属计划/模块的引用摊平，便于队列展示。 */
function flattenLessons(plans, planId) {
  const out = [];
  for (const p of plans || []) {
    if (planId && p.id !== planId) continue;
    for (const m of p.modules || []) {
      for (const l of m.lessons || []) {
        out.push({ planId: p.id, planTitle: p.title, planIcon: p.icon, moduleId: m.id, moduleTitle: m.title, lesson: l });
      }
    }
  }
  return out;
}

/** 今日待复习：已纳入复习(sr)且到期日 ≤ 今天，逾期的排前面。 */
export function dueReviews(plans, today = todayStr()) {
  return flattenLessons(plans)
    .filter((x) => x.lesson.sr && x.lesson.status !== 'todo' && x.lesson.sr.due <= today)
    .sort((a, b) => (a.lesson.sr.due < b.lesson.sr.due ? -1 : 1));
}

/** 未来 days 天内每天的到期复习数量（含今天）。 */
export function upcomingReviews(plans, today = todayStr(), days = 7) {
  const buckets = {};
  for (let i = 0; i < days; i++) buckets[addDays(today, i)] = 0;
  for (const x of flattenLessons(plans)) {
    const sr = x.lesson.sr;
    if (!sr || x.lesson.status === 'todo') continue;
    const key = sr.due <= today ? today : sr.due; // 逾期归到今天
    if (key in buckets) buckets[key] += 1;
  }
  return Object.keys(buckets).map((date) => ({ date, count: buckets[date] }));
}

/**
 * 接下来要学的知识点（status ≠ mastered）。学习中优先于未开始，其余按文档顺序。
 * @param {Plan[]} plans
 * @param {number} n 数量上限
 * @param {string} [planId] 仅限某个计划
 */
export function nextLessons(plans, n = 5, planId) {
  const list = flattenLessons(plans, planId)
    .map((x, idx) => ({ ...x, idx }))
    .filter((x) => x.lesson.status !== 'mastered');
  list.sort((a, b) => {
    const rank = (s) => (s === 'learning' ? 0 : 1);
    const r = rank(a.lesson.status) - rank(b.lesson.status);
    return r !== 0 ? r : a.idx - b.idx;
  });
  return n > 0 ? list.slice(0, n) : list;
}

/* =============================================================
 * 5. 学习记录 / 连续天数 / 活跃度
 * ============================================================= */
/** 当天累计学习分钟。 */
export function minutesOn(sessions, dateStr) {
  return (sessions || []).filter((s) => s.date === dateStr).reduce((sum, s) => sum + Math.max(0, s.minutes || 0), 0);
}

/** 总学习分钟。 */
export function studyMinutes(sessions) {
  return (sessions || []).reduce((sum, s) => sum + Math.max(0, s.minutes || 0), 0);
}

/**
 * 连续学习天数。
 * - current：截止「今天或昨天」往前的连续有学习记录的天数（今天还没学不立刻断）。
 * - longest：历史最长连续天数。
 */
export function computeStreak(sessions, today = todayStr()) {
  const set = new Set((sessions || []).filter((s) => (s.minutes || 0) > 0).map((s) => s.date));
  if (set.size === 0) return { current: 0, longest: 0 };

  // current：从今天起；若今天没学但昨天学了，从昨天起接着算
  let cur = 0;
  let cursor = set.has(today) ? today : addDays(today, -1);
  if (set.has(cursor)) {
    while (set.has(cursor)) {
      cur += 1;
      cursor = addDays(cursor, -1);
    }
  }

  // longest：对去重日期排序后扫描最长连续段
  const days = [...set].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (dayDiff(days[i - 1], days[i]) === 1) run += 1;
    else run = 1;
    if (run > longest) longest = run;
  }
  return { current: cur, longest: Math.max(longest, cur) };
}

/** 最近 days 天的活跃度序列（含今天），用于柱状/热力图。 */
export function activitySeries(sessions, today = todayStr(), days = 84) {
  const byDate = {};
  for (const s of sessions || []) {
    byDate[s.date] = byDate[s.date] || { minutes: 0, count: 0 };
    byDate[s.date].minutes += Math.max(0, s.minutes || 0);
    byDate[s.date].count += 1;
  }
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const hit = byDate[date] || { minutes: 0, count: 0 };
    out.push({ date, minutes: hit.minutes, count: hit.count, weekday: parseDate(date).getDay() });
  }
  return out;
}

/* =============================================================
 * 6. 学习节奏建议
 * ============================================================= */
/** 计划的目标完成日（创建日 + 周数；缺省按今天起算）。 */
export function planTargetDate(plan, today = todayStr()) {
  const start = plan?.createdAt ? plan.createdAt.slice(0, 10) : today;
  const weeks = Math.max(1, plan?.weeks || 8);
  return addDays(start, weeks * 7);
}

/**
 * 今天建议学习的知识点数量：剩余未掌握 ÷ 剩余天数（向上取整），至少 1。
 * 若已到期/逾期，建议多学一些以追上进度。
 */
export function suggestedDailyLessons(plan, today = todayStr()) {
  const s = planStats(plan);
  const remaining = s.total - s.mastered;
  if (remaining <= 0) return 0;
  const target = planTargetDate(plan, today);
  const daysLeft = Math.max(1, dayDiff(today, target));
  return Math.max(1, Math.ceil(remaining / daysLeft));
}

/* =============================================================
 * 7. 模板脚手架 & 计划归一化
 * ============================================================= */
/** 把「模板」实例化为一份可编辑的学习计划。 */
export function scaffoldPlan(template, opts = {}) {
  const createdAt = opts.createdAt || new Date().toISOString();
  return {
    id: uid('plan'),
    title: opts.title || template.title,
    subject: opts.subject || template.subject || template.title,
    summary: opts.summary != null ? opts.summary : template.summary || '',
    icon: opts.icon || template.icon || '📘',
    level: opts.level || template.level || '入门',
    weeks: opts.weeks || template.weeks || 8,
    hoursPerWeek: opts.hoursPerWeek || template.hoursPerWeek || 5,
    source: opts.source || 'template',
    createdAt,
    modules: (template.modules || []).map((m) => ({
      id: uid('mod'),
      title: typeof m === 'string' ? m : m.title,
      lessons: ((typeof m === 'string' ? [] : m.lessons) || []).map((l) => makeLesson(l)),
    })),
  };
}

function makeLesson(l) {
  const obj = typeof l === 'string' ? { title: l } : l || {};
  return {
    id: uid('les'),
    title: String(obj.title || '未命名知识点').slice(0, 200),
    note: obj.note ? String(obj.note).slice(0, 1000) : '',
    status: LESSON_STATUS.includes(obj.status) ? obj.status : 'todo',
    resources: Array.isArray(obj.resources)
      ? obj.resources.filter((r) => r && r.url).map((r) => ({ title: r.title || r.url, url: String(r.url) })).slice(0, 10)
      : [],
    sr: obj.sr || null,
  };
}

const MAX_MODULES = 40;
const MAX_LESSONS = 60;

/**
 * 把任意来源(尤其是 AI 输出)的对象，归一化为合法的计划结构，并裁剪异常规模。
 * 容忍字段缺失/多余；为缺失 id 补齐。
 */
export function normalizePlan(raw, opts = {}) {
  const obj = raw && typeof raw === 'object' ? raw : {};
  const modulesIn = Array.isArray(obj.modules) ? obj.modules : [];
  const modules = modulesIn.slice(0, MAX_MODULES).map((m) => {
    const mm = m && typeof m === 'object' ? m : { title: String(m) };
    const lessonsIn = Array.isArray(mm.lessons) ? mm.lessons : [];
    return {
      id: mm.id || uid('mod'),
      title: String(mm.title || '未命名模块').slice(0, 120),
      lessons: lessonsIn.slice(0, MAX_LESSONS).map(makeLesson),
    };
  });
  return {
    id: obj.id || uid('plan'),
    title: String(obj.title || opts.title || 'AI 学习计划').slice(0, 120),
    subject: String(obj.subject || opts.subject || obj.title || '通用').slice(0, 60),
    summary: String(obj.summary || obj.description || '').slice(0, 600),
    icon: obj.icon || opts.icon || '✨',
    level: String(obj.level || opts.level || '入门').slice(0, 20),
    weeks: clampInt(obj.weeks || opts.weeks || 8, 1, 104),
    hoursPerWeek: clampInt(obj.hoursPerWeek || opts.hoursPerWeek || 5, 1, 80),
    source: opts.source || 'ai',
    createdAt: new Date().toISOString(),
    modules,
  };
}

function clampInt(v, lo, hi) {
  const n = Math.round(Number(v));
  if (!isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

/* =============================================================
 * 8. AI 提示词构建 & 响应解析（纯函数，便于测试）
 * ============================================================= */
/** 期望 AI 返回的 JSON 结构示意（用于提示词中的 schema 说明）。 */
export const PLAN_SCHEMA_HINT = `{
  "title": "计划标题",
  "subject": "学习主题",
  "summary": "一句话简介",
  "level": "入门/进阶/精通",
  "weeks": 8,
  "hoursPerWeek": 5,
  "modules": [
    { "title": "模块名", "lessons": [ { "title": "知识点", "note": "可选的一句话提示" } ] }
  ]
}`;

/**
 * 构建「生成学习计划」的对话消息（与具体厂商无关）。
 * @returns {{system:string, user:string}}
 */
export function buildPlanMessages({ goal, level = '入门', weeks = 8, hoursPerWeek = 5 } = {}) {
  const system =
    '你是一位资深的学习规划专家。请把用户的学习目标拆解成「循序渐进、可执行」的学习计划。' +
    '只输出一个 JSON 对象，不要任何解释、不要 Markdown 代码块以外的文字。' +
    `JSON 必须严格符合该结构：\n${PLAN_SCHEMA_HINT}\n` +
    '要求：模块按由易到难排序；每个模块 3~8 个具体知识点；知识点标题精炼可检索；' +
    'note 写一句关键提示或常见误区（可省略）；总量与给定周数和每周学习时长大致匹配。';
  const user =
    `学习目标：${goal || '（未填写，请按通用入门处理）'}\n` +
    `当前水平：${level}\n计划周期：${weeks} 周\n每周可投入：约 ${hoursPerWeek} 小时\n` +
    '请生成对应的学习计划 JSON。';
  return { system, user };
}

/** 构建「讲解某个知识点」的对话消息。 */
export function buildExplainMessages({ lessonTitle, planSubject, note } = {}) {
  const system =
    '你是一位擅长把复杂概念讲清楚的导师。用简体中文讲解，结构清晰、循序渐进、配简短例子。' +
    '控制在 300 字以内，必要时用要点列举。结尾给一个一句话的「自测问题」帮助巩固。';
  const user =
    `主题领域：${planSubject || '通用'}\n要讲解的知识点：${lessonTitle || ''}` +
    (note ? `\n补充提示：${note}` : '');
  return { system, user };
}

/**
 * 从模型输出的文本中解析出学习计划。
 * 兼容 ```json 代码块包裹与裸 JSON；取第一个 { 到最后一个 } 的片段解析。
 * @throws 解析失败时抛错（带可读信息）
 */
export function parsePlanFromText(text, opts = {}) {
  if (!text || typeof text !== 'string') throw new Error('AI 未返回内容');
  let body = text.trim();
  const fence = body.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) body = fence[1].trim();
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('未能在 AI 回复中找到 JSON 计划');
  }
  let parsed;
  try {
    parsed = JSON.parse(body.slice(start, end + 1));
  } catch (e) {
    throw new Error('AI 返回的 JSON 无法解析：' + e.message);
  }
  const plan = normalizePlan(parsed, { source: 'ai', ...opts });
  if (!plan.modules.length) throw new Error('AI 返回的计划没有任何模块');
  return plan;
}

/* =============================================================
 * 9. 中文格式化
 * ============================================================= */
/** 分钟 → 中文时长，如 "45 分钟"、"1.5 小时"。 */
export function formatDuration(min) {
  const m = Math.max(0, Math.round(min || 0));
  if (m < 60) return `${m} 分钟`;
  const h = m / 60;
  const txt = Number.isInteger(h) ? String(h) : (Math.round(h * 10) / 10).toString();
  return `${txt} 小时`;
}

/** 小数 → 百分比文本，如 0.42 → "42%"。 */
export function pctText(p) {
  if (p == null || isNaN(p)) return '0%';
  return `${Math.round(p * 100)}%`;
}

/** 'YYYY-MM-DD' → 'M月D日'。 */
export function fmtDate(str) {
  const [, m, d] = String(str).split('-');
  if (!m || !d) return str;
  return `${Number(m)}月${Number(d)}日`;
}

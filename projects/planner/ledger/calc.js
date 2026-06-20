/**
 * 记账 —— 纯函数计算逻辑（不依赖 React / UI）
 * ------------------------------------------------------------------
 * 日常收支流水，补「财富规划」缺的日常账。与净资产快照是两个层次：
 * 这里是「现金流（每天花了/赚了多少）」，净资产是「存量快照」。
 *
 * 记录 entry = { id, date('YYYY-MM-DD'), type:'expense'|'income', amount(>0), category, note? }
 * 数据：{ v, entries:[...], budget(月度预算, 0=未设) }
 *
 * 可测试：node --test ledger/calc.test.js
 */
import { todayStr, lastNDays } from '../core/date.js';

export const EXPENSE_CATEGORIES = [
  { id: '餐饮', icon: '🍜' }, { id: '交通', icon: '🚇' }, { id: '购物', icon: '🛍️' },
  { id: '居住', icon: '🏠' }, { id: '娱乐', icon: '🎮' }, { id: '医疗', icon: '💊' },
  { id: '学习', icon: '📚' }, { id: '健身', icon: '💪' }, { id: '人情', icon: '🎁' }, { id: '其它', icon: '📦' },
];
export const INCOME_CATEGORIES = [
  { id: '工资', icon: '💼' }, { id: '理财', icon: '📈' }, { id: '兼职', icon: '🧰' }, { id: '红包', icon: '🧧' }, { id: '其它', icon: '📦' },
];
export const CATEGORY_ICON = Object.fromEntries([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => [c.id, c.icon]));

/** 'YYYY-MM'。 */
export function monthKey(date = todayStr()) {
  return String(date).slice(0, 7);
}

/** 某月的记录（升序按日期）。 */
export function entriesInMonth(entries = [], mk = monthKey()) {
  return entries.filter((e) => e && e.date && e.date.slice(0, 7) === mk)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** 某月支出 / 收入 / 结余。 */
export function monthTotals(entries = [], mk = monthKey()) {
  let expense = 0, income = 0;
  for (const e of entries) {
    if (!e || e.date.slice(0, 7) !== mk) continue;
    const a = Math.max(0, Number(e.amount) || 0);
    if (e.type === 'income') income += a; else expense += a;
  }
  return { expense, income, net: income - expense };
}

/** 某月按分类汇总（默认支出），降序 + 占比。 */
export function byCategory(entries = [], mk = monthKey(), type = 'expense') {
  const map = {};
  let total = 0;
  for (const e of entries) {
    if (!e || e.date.slice(0, 7) !== mk || e.type !== type) continue;
    const a = Math.max(0, Number(e.amount) || 0);
    map[e.category || '其它'] = (map[e.category || '其它'] || 0) + a;
    total += a;
  }
  return Object.keys(map)
    .map((c) => ({ category: c, amount: map[c], share: total > 0 ? map[c] / total : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

/** 最近 n 天的每日支出序列（用于趋势图），从早到晚。 */
export function dailyExpense(entries = [], n = 14, today = todayStr()) {
  const byDate = {};
  for (const e of entries) {
    if (!e || e.type === 'income') continue;
    byDate[e.date] = (byDate[e.date] || 0) + Math.max(0, Number(e.amount) || 0);
  }
  return lastNDays(n, today).map((date) => ({ date, expense: byDate[date] || 0 }));
}

/** 预算状态：已用 / 预算 / 百分比 / 剩余（budget<=0 视为未设）。 */
export function budgetStatus(monthExpense, budget) {
  const b = Number(budget) || 0;
  if (b <= 0) return { set: false, used: monthExpense, budget: 0, pct: 0, remaining: 0 };
  return { set: true, used: monthExpense, budget: b, pct: Math.min(100, Math.round((monthExpense / b) * 100)), remaining: b - monthExpense, over: monthExpense > b };
}

/** 全部累计结余（收入 - 支出）。 */
export function balance(entries = []) {
  let net = 0;
  for (const e of entries) {
    const a = Math.max(0, Number(e.amount) || 0);
    net += e.type === 'income' ? a : -a;
  }
  return net;
}

/** 今日支出。 */
export function todayExpense(entries = [], today = todayStr()) {
  return entries.filter((e) => e.type !== 'income' && e.date === today)
    .reduce((s, e) => s + Math.max(0, Number(e.amount) || 0), 0);
}

/** 仪表盘汇总（供首页看板）。 */
export function summary(entries = [], budget = 0, today = todayStr()) {
  const mk = monthKey(today);
  const t = monthTotals(entries, mk);
  return {
    monthExpense: t.expense,
    monthIncome: t.income,
    monthNet: t.net,
    today: todayExpense(entries, today),
    budget: budgetStatus(t.expense, budget),
    dailySeries: dailyExpense(entries, 14, today).map((d) => d.expense),
    count: entriesInMonth(entries, mk).length,
  };
}

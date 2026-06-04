import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  monthKey, entriesInMonth, monthTotals, byCategory, dailyExpense,
  budgetStatus, balance, todayExpense, summary,
} from './calc.js';

const E = [
  { id: '1', date: '2026-06-01', type: 'expense', amount: 30, category: '餐饮' },
  { id: '2', date: '2026-06-01', type: 'expense', amount: 20, category: '交通' },
  { id: '3', date: '2026-06-04', type: 'expense', amount: 100, category: '餐饮' },
  { id: '4', date: '2026-06-04', type: 'income', amount: 5000, category: '工资' },
  { id: '5', date: '2026-05-20', type: 'expense', amount: 999, category: '购物' }, // 上月
];

test('monthKey', () => {
  assert.equal(monthKey('2026-06-04'), '2026-06');
});

test('entriesInMonth 只取当月、倒序', () => {
  const r = entriesInMonth(E, '2026-06').map((e) => e.id);
  assert.equal(r.includes('5'), false);
  assert.equal(r[0], '3'); // 6/4 在前（倒序）
});

test('monthTotals', () => {
  assert.deepEqual(monthTotals(E, '2026-06'), { expense: 150, income: 5000, net: 4850 });
  assert.deepEqual(monthTotals(E, '2026-05'), { expense: 999, income: 0, net: -999 });
});

test('byCategory 降序 + 占比', () => {
  const c = byCategory(E, '2026-06', 'expense');
  assert.equal(c[0].category, '餐饮');
  assert.equal(c[0].amount, 130);
  assert.ok(Math.abs(c[0].share - 130 / 150) < 1e-9);
});

test('dailyExpense 长度与值', () => {
  const s = dailyExpense(E, 4, '2026-06-04');
  assert.equal(s.length, 4);
  assert.equal(s[s.length - 1].expense, 100); // 6/4 支出 100（收入不算）
  assert.equal(s[1].expense, 0); // 6/2 无支出
});

test('dailyExpense 含窗口首日', () => {
  const s = dailyExpense(E, 4, '2026-06-04'); // 6/1,6/2,6/3,6/4
  assert.equal(s[0].date, '2026-06-01');
  assert.equal(s[0].expense, 50); // 30+20
});

test('budgetStatus', () => {
  assert.equal(budgetStatus(150, 0).set, false);
  const b = budgetStatus(150, 1000);
  assert.deepEqual({ set: b.set, pct: b.pct, remaining: b.remaining, over: b.over }, { set: true, pct: 15, remaining: 850, over: false });
  assert.equal(budgetStatus(1200, 1000).over, true);
});

test('balance 累计结余', () => {
  // 全部：收入 5000 - 支出(30+20+100+999)=1149 → 3851
  assert.equal(balance(E), 3851);
});

test('todayExpense', () => {
  assert.equal(todayExpense(E, '2026-06-04'), 100);
  assert.equal(todayExpense(E, '2026-06-01'), 50);
});

test('summary 综合', () => {
  const s = summary(E, 1000, '2026-06-04');
  assert.equal(s.monthExpense, 150);
  assert.equal(s.monthIncome, 5000);
  assert.equal(s.today, 100);
  assert.equal(s.budget.pct, 15);
  assert.equal(s.dailySeries.length, 14);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  annualIncomeTax,
  computeAfterTax,
  computeBudget,
  weightedAnnualReturn,
  projectWealth,
  yearsToGoal,
  realReturn,
  computePlan,
  formatMoney,
  formatPct,
  formatYears,
} from './calc.js';

const approx = (a, b, eps = 1e-6) =>
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} ≈ ${b}`);

test('个税：各级税率表临界值', () => {
  assert.equal(annualIncomeTax(0), 0);
  assert.equal(annualIncomeTax(-100), 0);
  approx(annualIncomeTax(36000), 36000 * 0.03); // 1080
  approx(annualIncomeTax(144000), 144000 * 0.1 - 2520); // 11880
  approx(annualIncomeTax(200000), 200000 * 0.2 - 16920); // 23080
  approx(annualIncomeTax(1000000), 1000000 * 0.45 - 181920); // 268080
});

test('税前→税后：50000×16薪，社保20%', () => {
  const r = computeAfterTax({ monthlyGross: 50000, monthsPerYear: 16, socialInsuranceRate: 0.2 });
  approx(r.annualGross, 800000);
  approx(r.socialInsurance, 120000); // 50000*12*0.2
  approx(r.taxableIncome, 620000); // 800000-120000-60000
  approx(r.tax, 620000 * 0.3 - 52920); // 133080
  approx(r.annualNet, 800000 - 120000 - 133080); // 546920
  approx(r.monthlyNetAvg, 546920 / 12);
  assert.ok(r.effectiveTaxRate > 0.3 && r.effectiveTaxRate < 0.35);
});

test('专项附加扣除降低应纳税所得额', () => {
  const base = computeAfterTax({ monthlyGross: 30000, monthsPerYear: 12, socialInsuranceRate: 0.2 });
  const withDed = computeAfterTax({
    monthlyGross: 30000,
    monthsPerYear: 12,
    socialInsuranceRate: 0.2,
    specialDeductionMonthly: 3000,
  });
  assert.ok(withDed.tax < base.tax);
  approx(base.taxableIncome - withDed.taxableIncome, 36000); // 3000*12
});

test('低收入触及起征点时不交税', () => {
  const r = computeAfterTax({ monthlyGross: 5000, monthsPerYear: 12, socialInsuranceRate: 0.2 });
  assert.equal(r.tax, 0);
  assert.equal(r.taxableIncome, 0);
});

test('家庭预算：储蓄率计算', () => {
  const b = computeBudget({
    persons: [{ monthlyNetAvg: 40000 }, { monthlyNetAvg: 45000 }],
    expenses: { housing: 10000, common: 5000, p1: 4000, p2: 4000 },
  });
  approx(b.monthlyNetIncome, 85000);
  approx(b.monthlyExpense, 23000);
  approx(b.monthlySaving, 62000);
  approx(b.savingRate, 62000 / 85000);
  approx(b.annualSaving, 62000 * 12);
});

test('综合年化：加权平均', () => {
  const { totalWeight, weightedReturn } = weightedAnnualReturn([
    { weight: 5, expectedReturn: 0.015 },
    { weight: 35, expectedReturn: 0.035 },
    { weight: 35, expectedReturn: 0.07 },
    { weight: 5, expectedReturn: 0.04 },
    { weight: 20, expectedReturn: 0.03 },
  ]);
  assert.equal(totalWeight, 100);
  approx(weightedReturn, 0.0455);
});

test('权重未归一(占比之和≠100)仍按相对比例', () => {
  const a = weightedAnnualReturn([
    { weight: 1, expectedReturn: 0.1 },
    { weight: 1, expectedReturn: 0.0 },
  ]);
  approx(a.weightedReturn, 0.05);
  const empty = weightedAnnualReturn([{ weight: 0, expectedReturn: 0.1 }]);
  assert.equal(empty.weightedReturn, 0);
});

test('复利预测：长度与单调性', () => {
  const s = projectWealth({ currentAssets: 2000000, annualSaving: 600000, annualReturn: 0.05, years: 10 });
  assert.equal(s.length, 11);
  assert.equal(s[0].assets, 2000000);
  // 第一年末 = 2000000*1.05 + 600000 = 2700000
  approx(s[1].assets, 2700000);
  for (let i = 1; i < s.length; i++) assert.ok(s[i].assets > s[i - 1].assets);
  // 本金线 = 当前 + 累计储蓄
  approx(s[10].principal, 2000000 + 600000 * 10);
  approx(s[10].gain, s[10].assets - s[10].principal);
});

test('达成目标年数：线性插值落在两整年之间', () => {
  const y = yearsToGoal({ currentAssets: 2000000, annualSaving: 600000, annualReturn: 0.05, target: 10000000 });
  assert.ok(isFinite(y));
  // 用迭代验证：y 介于使资产跨越 1000万 的两年之间
  const lo = Math.floor(y);
  const sLo = projectWealth({ currentAssets: 2000000, annualSaving: 600000, annualReturn: 0.05, years: lo });
  const sHi = projectWealth({ currentAssets: 2000000, annualSaving: 600000, annualReturn: 0.05, years: lo + 1 });
  assert.ok(sLo[lo].assets < 10000000 && sHi[lo + 1].assets >= 10000000);
});

test('达成目标年数：已达成返回0、无增长返回∞', () => {
  assert.equal(yearsToGoal({ currentAssets: 1e7, annualSaving: 0, annualReturn: 0, target: 1e7 }), 0);
  assert.equal(
    yearsToGoal({ currentAssets: 100, annualSaving: 0, annualReturn: 0, target: 1e7 }),
    Infinity
  );
});

test('实际年化：扣除通胀', () => {
  approx(realReturn(0.07, 0.025), (1.07 / 1.025) - 1);
  approx(realReturn(0.025, 0.025), 0);
});

test('computePlan：端到端聚合', () => {
  const input = {
    personA: { gross: 50000, months: 16, socialRate: 20, special: 0 },
    personB: { enabled: true, gross: 60000, months: 16, socialRate: 20, special: 0 },
    expenses: { housing: 10000, common: 5000, personalA: 4000, personalB: 4000 },
    allocations: [
      { key: 'cash', weight: 5, ret: 1.5 },
      { key: 'fixed', weight: 35, ret: 3.5 },
      { key: 'equity', weight: 35, ret: 7 },
      { key: 'gold', weight: 5, ret: 4 },
      { key: 'flex', weight: 20, ret: 3 },
    ],
    forecast: { currentAssets: 2000000, target: 10000000, years: 30, inflation: 2.5, useReal: false, rateOverride: null },
  };
  const r = computePlan(input);
  assert.ok(r.taxA && r.taxB);
  assert.ok(r.budget.monthlySaving > 0);
  approx(r.investment.weightedReturn, 0.0455);
  assert.equal(r.investment.allocations.length, 5);
  // 月投入金额之和 ≈ 月储蓄
  const sumMonthly = r.investment.allocations.reduce((s, a) => s + a.monthlyAmount, 0);
  approx(sumMonthly, Math.max(0, r.budget.monthlySaving), 1e-3);
  assert.equal(r.forecast.series.length, 31);
  assert.ok(isFinite(r.forecast.goalYears));
});

test('rateOverride 与 useReal 影响预测年化', () => {
  const base = {
    personA: { gross: 50000, months: 16, socialRate: 20, special: 0 },
    personB: { enabled: false, gross: 0, months: 12, socialRate: 20, special: 0 },
    expenses: { housing: 10000 },
    allocations: [{ key: 'equity', weight: 100, ret: 7 }],
    forecast: { currentAssets: 2000000, target: 10000000, years: 30, inflation: 2.5, useReal: false, rateOverride: null },
  };
  const nominal = computePlan(base);
  approx(nominal.investment.effectiveReturn, 0.07);
  const real = computePlan({ ...base, forecast: { ...base.forecast, useReal: true } });
  assert.ok(real.investment.effectiveReturn < 0.07);
  const overridden = computePlan({ ...base, forecast: { ...base.forecast, rateOverride: 10 } });
  approx(overridden.investment.effectiveReturn, 0.1);
});

test('格式化：中文金额/比率/年数', () => {
  assert.equal(formatMoney(3200000), '¥320万');
  assert.equal(formatMoney(10000000), '¥1000万');
  assert.equal(formatMoney(123456789), '¥1.23亿');
  assert.equal(formatMoney(5000), '¥5,000');
  assert.equal(formatPct(0.0455), '4.5%'); // 4.55 的浮点近似，toFixed 向下取到 4.5
  assert.equal(formatYears(Infinity), '∞');
  assert.equal(formatYears(8.34), '8.3 年');
});

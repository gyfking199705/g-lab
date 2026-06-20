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
  snapshotTotals,
  assetBreakdown,
  netWorthSeries,
  netWorthChange,
  financialHealth,
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

/* --------------------------- 净资产追踪 --------------------------- */
const NW_ACCOUNTS = [
  { id: 'cash', name: '现金', type: 'asset', category: '流动' },
  { id: 'fund', name: '基金', type: 'asset', category: '投资' },
  { id: 'house', name: '房产', type: 'asset', category: '固定' },
  { id: 'mortgage', name: '房贷', type: 'liability', category: '负债' },
];
const SNAP1 = { id: 's1', date: '2026-01', values: { cash: 100000, fund: 200000, house: 3000000, mortgage: 1500000 } };
const SNAP2 = { id: 's2', date: '2026-02', values: { cash: 150000, fund: 250000, house: 3000000, mortgage: 1400000 } };

test('snapshotTotals：资产/负债/净资产/流动', () => {
  const t = snapshotTotals(SNAP1, NW_ACCOUNTS);
  assert.equal(t.assets, 3300000);
  assert.equal(t.liabilities, 1500000);
  assert.equal(t.net, 1800000);
  assert.equal(t.liquid, 100000); // 仅「流动」类别
});

test('assetBreakdown：按类别降序 + 占比', () => {
  const b = assetBreakdown(SNAP1, NW_ACCOUNTS);
  assert.deepEqual(b.map((x) => x.category), ['固定', '投资', '流动']);
  approx(b.reduce((s, x) => s + x.share, 0), 1);
  assert.equal(b[0].amount, 3000000);
});

test('netWorthSeries：按日期升序；netWorthChange 算环比', () => {
  const series = netWorthSeries([SNAP2, SNAP1], NW_ACCOUNTS); // 故意乱序传入
  assert.deepEqual(series.map((s) => s.date), ['2026-01', '2026-02']);
  assert.equal(series[1].net, 2000000);
  const chg = netWorthChange(series);
  assert.equal(chg.abs, 200000);
  approx(chg.pct, 200000 / 1800000);
  assert.equal(chg.fromDate, '2026-01');
  assert.equal(netWorthChange(series.slice(0, 1)), null); // 不足两期
});

test('financialHealth：综合评分与等级', () => {
  const h = financialHealth({
    liquidAssets: 150000,
    monthlyExpense: 25000, // 6 个月 → good
    savingRate: 0.35, // good
    totalAssets: 3400000,
    totalLiabilities: 1400000, // 负债率 ≈41% → ok
    annualNetIncome: 1000000,
    netWorth: 2000000, // 2 倍 → ok
  });
  const by = Object.fromEntries(h.checks.map((c) => [c.key, c.status]));
  assert.equal(by.emergency, 'good');
  assert.equal(by.saving, 'good');
  assert.equal(by.debt, 'ok');
  assert.equal(by.multiple, 'ok');
  assert.equal(h.score, 75); // (2+2+1+1)/8
  assert.equal(h.grade, '良');
});

test('financialHealth：缺数据的项标记 na、不计分', () => {
  const h = financialHealth({ savingRate: 0.2 });
  assert.equal(h.checks.length, 4);
  const na = h.checks.filter((c) => c.status === 'na').map((c) => c.key);
  assert.deepEqual(na.sort(), ['debt', 'emergency', 'multiple']);
  assert.equal(h.score, 50); // 仅储蓄率 ok(1)/2
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

import { financeSummary } from './calc.js';

test('financeSummary：无快照回退 currentAssets', () => {
  const s = financeSummary({ forecast: { currentAssets: 2000000, target: 10000000 } });
  assert.equal(s.netWorth, 2000000);
  assert.equal(s.target, 10000000);
  assert.equal(s.progress, 0.2);
  assert.equal(s.hasSnapshots, false);
});

test('financeSummary：有快照取最新净资产', () => {
  const accounts = [{ id: 'a', type: 'asset', category: '流动' }, { id: 'd', type: 'liability', category: '负债' }];
  const state = {
    forecast: { target: 10000000 },
    netWorth: { accounts, snapshots: [
      { date: '2026-01-01', values: { a: 1000000, d: 200000 } },
      { date: '2026-02-01', values: { a: 1500000, d: 200000 } },
    ] },
  };
  const s = financeSummary(state);
  assert.equal(s.netWorth, 1300000); // 1.5M - 0.2M
  assert.equal(s.hasSnapshots, true);
  assert.ok(s.change && s.change.abs === 500000);
  assert.equal(Math.round(s.progress * 100), 13);
});

test('financeSummary：空状态返回 null', () => {
  assert.equal(financeSummary(null), null);
  assert.equal(financeSummary({}), null);
});

import { financeForecast } from './calc.js';

test('financeForecast：净资产线性预测 + 达成时间', () => {
  const accounts = [{ id: 'a', type: 'asset', category: '流动' }];
  const state = {
    forecast: { target: 1000000 },
    netWorth: { accounts, snapshots: [
      { date: '2026-01-01', values: { a: 100000 } },
      { date: '2026-02-01', values: { a: 150000 } },
      { date: '2026-03-01', values: { a: 200000 } },
    ] },
  };
  const f = financeForecast(state, { horizon: 6 });
  assert.equal(f.hasHistory, true);
  assert.equal(f.latest, 200000);
  assert.deepEqual(f.historyVals, [100000, 150000, 200000]);
  // 每月约 +50000；6 个月预测末值约 500000
  assert.equal(f.projection.length, 6);
  assert.ok(Math.abs(f.projection[5] - 500000) < 5000);
  assert.ok(f.monthlyRate > 40000 && f.monthlyRate < 60000);
  // 距 100万还差 80万，约 16 个月 → ~1.3 年
  assert.ok(f.etaMonths >= 14 && f.etaMonths <= 18);
  assert.match(f.etaText, /年达成/);
});

test('financeForecast：extraAssets（积存金）作为常量计入净资产，斜率不变', () => {
  const accounts = [{ id: 'a', type: 'asset', category: '流动' }];
  const state = {
    forecast: { target: 1000000 },
    netWorth: { accounts, snapshots: [
      { date: '2026-01-01', values: { a: 100000 } },
      { date: '2026-02-01', values: { a: 150000 } },
      { date: '2026-03-01', values: { a: 200000 } },
    ] },
  };
  const base = financeForecast(state, { horizon: 6 });
  const f = financeForecast(state, { horizon: 6, extraAssets: 60000 });
  assert.equal(f.latest, base.latest + 60000); // 总额 + 积存金
  assert.deepEqual(f.historyVals, base.historyVals.map((v) => v + 60000)); // 整条曲线上移
  assert.ok(Math.abs(f.monthlyRate - base.monthlyRate) < 1e-6); // 斜率不变
  assert.equal(f.extraAssets, 60000);
  assert.ok(f.etaMonths < base.etaMonths); // 离目标更近
});

test('financeForecast：已达成 / 无历史 / 无目标', () => {
  const accounts = [{ id: 'a', type: 'asset', category: '流动' }];
  assert.equal(financeForecast({ forecast: { target: 0 }, netWorth: { accounts, snapshots: [] } }).etaText, '设个目标，看预计达成');
  assert.match(financeForecast({ forecast: { target: 1000000, currentAssets: 200000 }, netWorth: { accounts, snapshots: [] } }).etaText, /多记几期/);
  const done = financeForecast({ forecast: { target: 100000 }, netWorth: { accounts, snapshots: [
    { date: '2026-01-01', values: { a: 90000 } }, { date: '2026-02-01', values: { a: 120000 } },
  ] } });
  assert.match(done.etaText, /已达成/);
});

test('financeForecast：下降趋势无法预测', () => {
  const accounts = [{ id: 'a', type: 'asset', category: '流动' }];
  const f = financeForecast({ forecast: { target: 1000000 }, netWorth: { accounts, snapshots: [
    { date: '2026-01-01', values: { a: 300000 } }, { date: '2026-02-01', values: { a: 250000 } },
  ] } });
  assert.equal(f.etaMonths, null);
  assert.match(f.etaText, /未增长/);
});

test('financeForecast：空状态 null', () => {
  assert.equal(financeForecast(null), null);
});

import { financeScenarios } from './calc.js';

test('financeScenarios：三情景带 + 复利', () => {
  const accounts = [{ id: 'a', type: 'asset', category: '流动' }];
  const state = {
    allocations: [{ weight: 100, ret: 6 }],
    forecast: { target: 2000000 },
    netWorth: { accounts, snapshots: [
      { date: '2026-01-01', values: { a: 200000 } },
      { date: '2026-03-01', values: { a: 300000 } },
    ] },
  };
  const s = financeScenarios(state, { horizon: 12 });
  assert.ok(s);
  assert.equal(s.neutral.length, 12);
  // 乐观 ≥ 中性 ≥ 保守（末值）
  const last = (a) => a[a.length - 1];
  assert.ok(last(s.optimistic) >= last(s.neutral));
  assert.ok(last(s.neutral) >= last(s.conservative));
  // 复利 + 储蓄使净资产增长
  assert.ok(last(s.neutral) > s.latest);
  assert.ok(s.baseReturn > 0.05 && s.baseReturn < 0.07);
});

test('financeScenarios：已达成 / 空', () => {
  const accounts = [{ id: 'a', type: 'asset', category: '流动' }];
  const done = financeScenarios({ allocations: [], forecast: { target: 100000 }, netWorth: { accounts, snapshots: [
    { date: '2026-01-01', values: { a: 80000 } }, { date: '2026-02-01', values: { a: 150000 } } ] } });
  assert.match(done.etaText, /已达成/);
  assert.equal(financeScenarios(null), null);
});

import { passiveCrossover } from './calc.js';

test('passiveCrossover：被动随复利上升并交叉主动', () => {
  // 净资产 100万，年化 6%→月被动 5000；主动 2万/月；每月存 1万
  const r = passiveCrossover({ netWorth: 1000000, annualReturn: 0.06, monthlyContribution: 10000, activeMonthly: 20000 });
  assert.ok(r);
  assert.ok(r.crossoverMonth > 0, '应在若干年后交叉');
  // 交叉点：被动 ≥ 主动
  const m = r.crossoverMonth;
  assert.ok(r.passiveSeries[m] >= r.activeSeries[m]);
  // 交叉前一月：被动 < 主动
  assert.ok(r.passiveSeries[m - 1] < r.activeSeries[m - 1]);
});

test('passiveCrossover：已经被动>主动 → 第 0 月', () => {
  const r = passiveCrossover({ netWorth: 10000000, annualReturn: 0.06, activeMonthly: 10000 });
  assert.equal(r.crossoverMonth, 0);
});

test('passiveCrossover：缺输入返回 null', () => {
  assert.equal(passiveCrossover({ netWorth: 100, annualReturn: 0, activeMonthly: 100 }), null);
  assert.equal(passiveCrossover({ netWorth: 100, annualReturn: 0.06, activeMonthly: 0 }), null);
});

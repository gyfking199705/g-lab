/**
 * 储蓄与财富规划 —— 纯函数计算逻辑
 * ------------------------------------------------------------------
 * 本文件不依赖 React 或任何 UI，所有函数均为纯函数，便于单元测试与复用。
 * 金额单位统一为「元」(人民币)，比率统一为「小数」(如 0.07 表示 7%)。
 *
 * 可在 Node 中直接测试：  node --test savings/calc.test.js
 * 可在浏览器中作为 ES Module 引入：  import { computePlan } from './calc.js'
 */

/* =============================================================
 * 1. 个税：中国综合所得「年度税率表」(七级超额累进)
 * 起征点 6 万/年 (即每月 5000)，基于真实税率表的年度近似。
 * quickDeduct 为该级「速算扣除数」。
 * ============================================================= */
export const TAX_BRACKETS = [
  { upTo: 36000, rate: 0.03, quickDeduct: 0 },
  { upTo: 144000, rate: 0.1, quickDeduct: 2520 },
  { upTo: 300000, rate: 0.2, quickDeduct: 16920 },
  { upTo: 420000, rate: 0.25, quickDeduct: 31920 },
  { upTo: 660000, rate: 0.3, quickDeduct: 52920 },
  { upTo: 960000, rate: 0.35, quickDeduct: 85920 },
  { upTo: Infinity, rate: 0.45, quickDeduct: 181920 },
];

/**
 * 按全年「应纳税所得额」计算全年个税。
 * @param {number} taxableIncome 全年应纳税所得额(已扣除起征点/社保/专项附加)
 * @returns {number} 全年个税
 */
export function annualIncomeTax(taxableIncome) {
  if (!(taxableIncome > 0)) return 0;
  for (const b of TAX_BRACKETS) {
    if (taxableIncome <= b.upTo) {
      return taxableIncome * b.rate - b.quickDeduct;
    }
  }
  return 0; // 理论上不会到达 (Infinity 兜底)
}

/* =============================================================
 * 2. 税前 → 税后换算 (单人，年度近似)
 * ============================================================= */
/**
 * @param {object} p
 * @param {number} p.monthlyGross           税前月薪
 * @param {number} [p.monthsPerYear=12]      一年发几个月 (12~18，含年终奖)
 * @param {number} [p.socialInsuranceRate=0.2] 五险一金综合扣除比例 (小数)
 * @param {number} [p.specialDeductionMonthly=0] 专项附加扣除合计 (元/月)
 * @returns {{
 *   annualGross:number, socialInsurance:number, specialAnnual:number,
 *   taxableIncome:number, tax:number, annualNet:number,
 *   monthlyNetAvg:number, monthlyGrossAvg:number, effectiveTaxRate:number
 * }}
 *
 * 假设说明：
 *  - 五险一金按「12 个月工资」计提，年终奖(多发的月数)不计社保；
 *  - 年终奖并入综合所得一起计税(年度近似，未单独用全年一次性奖金计税法)；
 *  - 到手收入按 12 个月摊平为月均。
 */
export function computeAfterTax({
  monthlyGross,
  monthsPerYear = 12,
  socialInsuranceRate = 0.2,
  specialDeductionMonthly = 0,
}) {
  const g = Math.max(0, monthlyGross || 0);
  const months = Math.max(1, monthsPerYear || 12);
  const annualGross = g * months;
  const socialInsurance = g * 12 * Math.max(0, socialInsuranceRate);
  const specialAnnual = Math.max(0, specialDeductionMonthly) * 12;
  const taxableIncome = Math.max(0, annualGross - socialInsurance - 60000 - specialAnnual);
  const tax = annualIncomeTax(taxableIncome);
  const annualNet = annualGross - socialInsurance - tax;
  return {
    annualGross,
    socialInsurance,
    specialAnnual,
    taxableIncome,
    tax,
    annualNet,
    monthlyNetAvg: annualNet / 12,
    monthlyGrossAvg: annualGross / 12,
    effectiveTaxRate: annualGross > 0 ? (socialInsurance + tax) / annualGross : 0,
  };
}

/* =============================================================
 * 3. 家庭收支预算
 * ============================================================= */
/**
 * @param {object} o
 * @param {Array<{monthlyNetAvg:number}>} o.persons 各人的税后结果(取 monthlyNetAvg)
 * @param {Record<string, number>} o.expenses 各项月支出 (住房/共同生活/个人...)
 * @returns {{monthlyNetIncome:number, monthlyExpense:number, monthlySaving:number, savingRate:number, annualSaving:number}}
 */
export function computeBudget({ persons, expenses }) {
  const monthlyNetIncome = (persons || []).reduce((s, p) => s + (p?.monthlyNetAvg || 0), 0);
  const monthlyExpense = Object.values(expenses || {}).reduce((s, v) => s + Math.max(0, v || 0), 0);
  const monthlySaving = monthlyNetIncome - monthlyExpense;
  const savingRate = monthlyNetIncome > 0 ? monthlySaving / monthlyNetIncome : 0;
  return {
    monthlyNetIncome,
    monthlyExpense,
    monthlySaving,
    savingRate,
    annualSaving: monthlySaving * 12,
  };
}

/* =============================================================
 * 4. 投资配置 → 综合年化
 * ============================================================= */
/**
 * @param {Array<{weight:number, expectedReturn:number}>} allocations
 *        weight 为占比(任意数值，按相对比例归一化)，expectedReturn 为小数年化
 * @returns {{totalWeight:number, weightedReturn:number}}
 */
export function weightedAnnualReturn(allocations) {
  const list = allocations || [];
  const totalWeight = list.reduce((s, a) => s + Math.max(0, a.weight || 0), 0);
  if (totalWeight <= 0) return { totalWeight: 0, weightedReturn: 0 };
  const weightedReturn = list.reduce(
    (s, a) => s + (Math.max(0, a.weight || 0) / totalWeight) * (a.expectedReturn || 0),
    0
  );
  return { totalWeight, weightedReturn };
}

/* =============================================================
 * 5. 复利产出预测
 * ============================================================= */
/**
 * 逐年迭代：每年末 = 上年末 × (1 + 年化) + 当年储蓄。
 * @param {object} o
 * @param {number} o.currentAssets 当前总资产
 * @param {number} o.annualSaving  每年新增储蓄
 * @param {number} o.annualReturn  年化回报(小数)
 * @param {number} o.years         预测年限
 * @returns {Array<{year:number, assets:number, principal:number, gain:number}>}
 *          长度 years+1，索引 0 为当前(第 0 年)。
 */
export function projectWealth({ currentAssets, annualSaving, annualReturn, years }) {
  const n = Math.max(0, Math.floor(years || 0));
  let assets = currentAssets || 0;
  let principal = currentAssets || 0;
  const series = [{ year: 0, assets, principal, gain: 0 }];
  for (let y = 1; y <= n; y++) {
    assets = assets * (1 + (annualReturn || 0)) + (annualSaving || 0);
    principal = principal + (annualSaving || 0);
    series.push({ year: y, assets, principal, gain: assets - principal });
  }
  return series;
}

/**
 * 达成目标所需年数(含小数，线性插值求精确年数)。
 * @param {object} o
 * @param {number} o.currentAssets
 * @param {number} o.annualSaving
 * @param {number} o.annualReturn 小数年化
 * @param {number} o.target 目标金额
 * @param {number} [o.maxYears=100]
 * @returns {number} 年数；若在 maxYears 内无法达成返回 Infinity。
 */
export function yearsToGoal({ currentAssets, annualSaving, annualReturn, target, maxYears = 100 }) {
  let assets = currentAssets || 0;
  if (assets >= target) return 0;
  for (let y = 1; y <= maxYears; y++) {
    const prev = assets;
    assets = assets * (1 + (annualReturn || 0)) + (annualSaving || 0);
    if (assets >= target) {
      const denom = assets - prev;
      const frac = denom > 0 ? (target - prev) / denom : 0;
      return y - 1 + Math.min(1, Math.max(0, frac));
    }
    // 资产不再增长 → 永远无法达成
    if (assets <= prev) break;
  }
  return Infinity;
}

/**
 * 名义年化换算为实际年化(扣除通胀)。
 * realReturn = (1 + nominal) / (1 + inflation) - 1
 */
export function realReturn(nominalReturn, inflation) {
  return (1 + (nominalReturn || 0)) / (1 + (inflation || 0)) - 1;
}

/* =============================================================
 * 6. 顶层聚合：把全部输入算成一份「规划结果」，供 UI 直接消费
 * ============================================================= */
/**
 * @param {object} input 完整规划输入 (见 SavingsPlanner 默认 state)
 * @returns 一份包含税务、预算、投资、预测的结果对象。
 */
export function computePlan(input) {
  const {
    personA,
    personB,
    expenses,
    allocations,
    forecast,
  } = input;

  // —— 税前→税后 ——
  const taxA = computeAfterTax({
    monthlyGross: personA.gross,
    monthsPerYear: personA.months,
    socialInsuranceRate: personA.socialRate / 100,
    specialDeductionMonthly: personA.special,
  });
  const personsForBudget = [taxA];
  let taxB = null;
  if (personB && personB.enabled) {
    taxB = computeAfterTax({
      monthlyGross: personB.gross,
      monthsPerYear: personB.months,
      socialInsuranceRate: personB.socialRate / 100,
      specialDeductionMonthly: personB.special,
    });
    personsForBudget.push(taxB);
  }

  // —— 预算 ——
  const budget = computeBudget({ persons: personsForBudget, expenses });

  // —— 投资 ——
  const allocDecimal = allocations.map((a) => ({ ...a, expectedReturn: a.ret / 100 }));
  const { totalWeight, weightedReturn } = weightedAnnualReturn(allocDecimal);
  // 每类月投入金额(按占比分配月储蓄；月储蓄为负时记 0)
  const investableMonthly = Math.max(0, budget.monthlySaving);
  const allocationsDetailed = allocations.map((a) => ({
    ...a,
    share: totalWeight > 0 ? a.weight / totalWeight : 0,
    monthlyAmount: totalWeight > 0 ? (a.weight / totalWeight) * investableMonthly : 0,
  }));

  // —— 预测 ——
  const nominalReturn = forecast.rateOverride != null ? forecast.rateOverride / 100 : weightedReturn;
  const effectiveReturn = forecast.useReal
    ? realReturn(nominalReturn, forecast.inflation / 100)
    : nominalReturn;

  const series = projectWealth({
    currentAssets: forecast.currentAssets,
    annualSaving: budget.annualSaving,
    annualReturn: effectiveReturn,
    years: forecast.years,
  });

  const goalYears = yearsToGoal({
    currentAssets: forecast.currentAssets,
    annualSaving: budget.annualSaving,
    annualReturn: effectiveReturn,
    target: forecast.target,
  });

  const last = series[series.length - 1];

  return {
    taxA,
    taxB,
    budget,
    investment: {
      totalWeight,
      weightedReturn, // 配置算出的综合年化(名义)
      nominalReturn, // 实际用于预测的名义年化(可能被滑块覆盖)
      effectiveReturn, // 是否扣通胀后的最终年化
      allocations: allocationsDetailed,
    },
    forecast: {
      series,
      goalYears,
      finalAssets: last.assets,
      finalPrincipal: last.principal,
      finalGain: last.gain,
    },
  };
}

/* =============================================================
 * 7. 中文金额 / 比率格式化
 * ============================================================= */
function trimNum(n, decimals = 1) {
  const f = Math.pow(10, decimals);
  const v = Math.round(n * f) / f;
  return v.toLocaleString('zh-CN', { maximumFractionDigits: decimals, useGrouping: false });
}

/** 按中文习惯展示金额：万 / 亿 为单位，如 "¥320万"、"¥1.2亿"。 */
export function formatMoney(amount, { decimals = 1 } = {}) {
  if (amount == null || isNaN(amount)) return '—';
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  if (abs >= 1e8) return `${sign}¥${trimNum(abs / 1e8, 2)}亿`;
  if (abs >= 1e4) return `${sign}¥${trimNum(abs / 1e4, decimals)}万`;
  return `${sign}¥${Math.round(abs).toLocaleString('zh-CN')}`;
}

/** 比率(小数)转百分号文本，如 0.0455 → "4.6%"。 */
export function formatPct(rate, { decimals = 1 } = {}) {
  if (rate == null || isNaN(rate)) return '—';
  return `${(rate * 100).toFixed(decimals)}%`;
}

/** 年数展示：Infinity → "—"，否则保留一位小数。 */
export function formatYears(years) {
  if (years == null || !isFinite(years)) return '∞';
  return `${years.toFixed(1)} 年`;
}

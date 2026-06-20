/**
 * 薪资到手评估 —— 纯函数计算逻辑（中国大陆个税/五险一金，不依赖 React / UI）
 * ------------------------------------------------------------------
 * 复用 savings/calc.js 的年度综合所得税率表（annualIncomeTax）做「累计预扣预缴」：
 * 因为个税累计预扣，月薪不变时每月「到手」会随月份递减（累计应纳税额跨档），本工具如实还原。
 * 五险一金取「个人缴纳部分」；工伤/生育由单位缴纳、个人不缴。
 *
 * 注意：各地社保缴费基数上下限、公积金比例、医保费率等差异较大，结果为估算、仅供参考。
 * 可测试：node --test salary/calc.test.js
 */
import { annualIncomeTax } from '../savings/calc.js';

export const MONTHLY_THRESHOLD = 5000; // 起征点 5000/月（60000/年）

/** 个人五险一金费率（默认值，可调）；工伤/生育个人不缴。 */
export const SOCIAL_FIELDS = [
  { key: 'pension', label: '养老保险', rate: 0.08 },
  { key: 'medical', label: '医疗保险', rate: 0.02 },
  { key: 'unemployment', label: '失业保险', rate: 0.005 },
  { key: 'housingFund', label: '住房公积金', rate: 0.07 },
];
export function defaultRates() {
  return Object.fromEntries(SOCIAL_FIELDS.map((f) => [f.key, f.rate]));
}

const n = (v, d = 0) => { const x = Number(v); return isFinite(x) ? x : d; };

/** 个人五险一金（按缴费基数 base 与各项费率），返回各项金额 + 合计。 */
export function socialInsurance(base, rates = {}) {
  const b = Math.max(0, n(base));
  const out = {};
  let total = 0;
  for (const f of SOCIAL_FIELDS) {
    const amt = Math.round(b * Math.max(0, n(rates[f.key], f.rate)) * 100) / 100;
    out[f.key] = amt;
    total += amt;
  }
  out.total = Math.round(total * 100) / 100;
  return out;
}

/**
 * 累计预扣：月薪不变时逐月计算个税与到手。
 * @returns {Array<{month, gross, social, taxable, tax, net}>}
 */
export function monthlySchedule({ monthlyGross, socialBase, rates, specialMonthly = 0, months = 12 }) {
  const g = Math.max(0, n(monthlyGross));
  const social = socialInsurance(socialBase != null && socialBase !== '' ? socialBase : g, rates);
  const sp = Math.max(0, n(specialMonthly));
  const rows = [];
  let prevCumTax = 0;
  for (let m = 1; m <= months; m++) {
    const cumTaxable = Math.max(0, g * m - social.total * m - MONTHLY_THRESHOLD * m - sp * m);
    const cumTax = annualIncomeTax(cumTaxable);
    const monthTax = Math.max(0, Math.round((cumTax - prevCumTax) * 100) / 100);
    prevCumTax = cumTax;
    rows.push({ month: m, gross: g, social: social.total, taxable: cumTaxable, tax: monthTax, net: Math.round((g - social.total - monthTax) * 100) / 100 });
  }
  return rows;
}

/** 全年一次性奖金（年终奖）单独计税的「按月换算」税率表。 */
export const BONUS_BRACKETS = [
  { upTo: 3000, rate: 0.03, quickDeduct: 0 },
  { upTo: 12000, rate: 0.1, quickDeduct: 210 },
  { upTo: 25000, rate: 0.2, quickDeduct: 1410 },
  { upTo: 35000, rate: 0.25, quickDeduct: 2660 },
  { upTo: 55000, rate: 0.3, quickDeduct: 4410 },
  { upTo: 80000, rate: 0.35, quickDeduct: 7160 },
  { upTo: Infinity, rate: 0.45, quickDeduct: 15160 },
];

/** 年终奖单独计税（按 bonus/12 定档）。返回 { tax, net, rate }。 */
export function bonusTaxSeparate(bonus) {
  const b = Math.max(0, n(bonus));
  if (b <= 0) return { tax: 0, net: 0, rate: 0 };
  const per = b / 12;
  const br = BONUS_BRACKETS.find((x) => per <= x.upTo) || BONUS_BRACKETS[BONUS_BRACKETS.length - 1];
  const tax = Math.max(0, Math.round((b * br.rate - br.quickDeduct) * 100) / 100);
  return { tax, net: Math.round((b - tax) * 100) / 100, rate: br.rate };
}

/**
 * 汇总评估：月度明细 + 年度合计 + 关键指标（含可选年终奖单独计税）。
 */
export function estimate({ monthlyGross, socialBase, rates, specialMonthly = 0, annualBonus = 0 }) {
  const g = Math.max(0, n(monthlyGross));
  const social = socialInsurance(socialBase != null && socialBase !== '' ? socialBase : g, rates);
  const schedule = monthlySchedule({ monthlyGross: g, socialBase, rates, specialMonthly });
  const annualSalaryTax = schedule.reduce((s, r) => s + r.tax, 0);
  const annualSocial = social.total * 12;
  const annualSalaryNet = schedule.reduce((s, r) => s + r.net, 0);
  const bonus = bonusTaxSeparate(annualBonus);
  const annualGross = g * 12 + Math.max(0, n(annualBonus));
  const annualNet = annualSalaryNet + bonus.net;
  const annualTax = annualSalaryTax + bonus.tax;
  return {
    social, // 每月各项 + 合计（个人部分）
    schedule, // 12 个月明细
    firstMonthNet: schedule[0] ? schedule[0].net : 0,
    lastMonthNet: schedule[11] ? schedule[11].net : 0,
    avgMonthlyNet: Math.round((annualSalaryNet / 12) * 100) / 100,
    annualSocial: Math.round(annualSocial * 100) / 100,
    annualSalaryTax: Math.round(annualSalaryTax * 100) / 100,
    annualSalaryNet: Math.round(annualSalaryNet * 100) / 100,
    bonus, // { tax, net, rate }
    annualGross,
    annualNet: Math.round(annualNet * 100) / 100,
    annualTax: Math.round(annualTax * 100) / 100,
    takeHomeRate: annualGross > 0 ? annualNet / annualGross : 0, // 到手占税前
    socialRate: g > 0 ? social.total / g : 0,
    effectiveTaxRate: annualGross > 0 ? annualTax / annualGross : 0,
  };
}

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

/* =============================================================
 * 8. 净资产追踪 & 财务体检（纯函数）
 * 账户 account: { id, name, type:'asset'|'liability', category }
 * 快照 snapshot: { id, date:'YYYY-MM', values: { [accountId]: 金额 } }
 * 体检会综合「最新快照」与「收支预算」给出几项财务健康度评估。
 * ============================================================= */

/** 哪些资产类别算作「流动资产」（用于应急储备评估）。 */
export const LIQUID_CATEGORIES = ['流动'];

function accountsIndex(accounts) {
  const m = {};
  for (const a of accounts || []) m[a.id] = a;
  return m;
}

/** 单个快照的总资产 / 总负债 / 净资产 / 流动资产。 */
export function snapshotTotals(snapshot, accounts) {
  const idx = accountsIndex(accounts);
  const values = (snapshot && snapshot.values) || {};
  let assets = 0;
  let liabilities = 0;
  let liquid = 0;
  for (const id of Object.keys(values)) {
    const a = idx[id];
    if (!a) continue;
    const v = Math.max(0, values[id] || 0);
    if (a.type === 'liability') {
      liabilities += v;
    } else {
      assets += v;
      if (LIQUID_CATEGORIES.includes(a.category)) liquid += v;
    }
  }
  return { assets, liabilities, net: assets - liabilities, liquid };
}

/** 资产按类别拆分（降序），用于占比展示。 */
export function assetBreakdown(snapshot, accounts) {
  const idx = accountsIndex(accounts);
  const values = (snapshot && snapshot.values) || {};
  const byCat = {};
  let total = 0;
  for (const id of Object.keys(values)) {
    const a = idx[id];
    const v = Math.max(0, values[id] || 0);
    if (!a || a.type !== 'asset' || v <= 0) continue;
    byCat[a.category] = (byCat[a.category] || 0) + v;
    total += v;
  }
  return Object.keys(byCat)
    .map((c) => ({ category: c, amount: byCat[c], share: total > 0 ? byCat[c] / total : 0 }))
    .sort((x, y) => y.amount - x.amount);
}

/** 净资产时间序列（按日期升序）。 */
export function netWorthSeries(snapshots, accounts) {
  return [...(snapshots || [])]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((s) => {
      const t = snapshotTotals(s, accounts);
      return { date: s.date, assets: t.assets, liabilities: t.liabilities, net: t.net };
    });
}

/** 最新一期相对上一期的净资产变化。 */
export function netWorthChange(series) {
  if (!series || series.length < 2) return null;
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  const abs = last.net - prev.net;
  const pct = prev.net !== 0 ? abs / Math.abs(prev.net) : null;
  return { abs, pct, fromDate: prev.date };
}

/**
 * 财务健康体检：综合最新净资产与收支，给出若干检查项 + 总评分/等级。
 * 任一输入缺失的项标记为 'na'（不计入评分）。
 * @returns {{ checks: Array, score: number|null, grade: string }}
 */
export function financialHealth({
  liquidAssets,
  monthlyExpense,
  savingRate,
  totalAssets,
  totalLiabilities,
  annualNetIncome,
  netWorth,
} = {}) {
  const checks = [];

  // 应急储备：流动资产能覆盖几个月支出
  if (liquidAssets != null && monthlyExpense > 0) {
    const months = liquidAssets / monthlyExpense;
    checks.push({
      key: 'emergency',
      label: '应急储备',
      value: `${months.toFixed(1)} 个月支出`,
      status: months >= 6 ? 'good' : months >= 3 ? 'ok' : 'warn',
      advice:
        months >= 6 ? '流动资金充足，能从容应对突发' : months >= 3 ? '够用，建议逐步攒到 6 个月' : '偏低，优先攒够 3~6 个月生活费',
    });
  } else {
    checks.push({ key: 'emergency', label: '应急储备', value: '—', status: 'na', advice: '记录净资产并填好月支出后可评估' });
  }

  // 储蓄率
  if (savingRate != null) {
    checks.push({
      key: 'saving',
      label: '储蓄率',
      value: formatPct(savingRate),
      status: savingRate >= 0.3 ? 'good' : savingRate >= 0.1 ? 'ok' : 'warn',
      advice:
        savingRate < 0
          ? '入不敷出，先压缩支出或增加收入'
          : savingRate >= 0.3
          ? '储蓄强劲，离目标更近'
          : savingRate >= 0.1
          ? '还行，能挤就再挤一点'
          : '偏低，看看哪些支出可优化',
    });
  }

  // 负债率：总负债 / 总资产
  if (totalAssets > 0) {
    const ratio = totalLiabilities / totalAssets;
    checks.push({
      key: 'debt',
      label: '负债率',
      value: formatPct(ratio),
      status: ratio <= 0.4 ? 'good' : ratio <= 0.6 ? 'ok' : 'warn',
      advice: ratio <= 0.4 ? '负债健康' : ratio <= 0.6 ? '尚可，注意月供压力' : '偏高，警惕现金流风险',
    });
  } else {
    checks.push({ key: 'debt', label: '负债率', value: '—', status: 'na', advice: '记录资产 / 负债后可评估' });
  }

  // 财富倍数：净资产 / 年到手收入
  if (annualNetIncome > 0 && netWorth != null) {
    const mult = netWorth / annualNetIncome;
    checks.push({
      key: 'multiple',
      label: '净资产 / 年收入',
      value: `${mult.toFixed(1)} 倍`,
      status: mult >= 3 ? 'good' : mult >= 1 ? 'ok' : 'warn',
      advice: mult >= 3 ? '资本积累良好' : mult >= 1 ? '稳步积累中' : '起步阶段，靠持续储蓄 + 复利',
    });
  } else {
    checks.push({ key: 'multiple', label: '净资产 / 年收入', value: '—', status: 'na', advice: '记录净资产后可评估' });
  }

  const scored = checks.filter((c) => c.status !== 'na');
  const sMap = { good: 2, ok: 1, warn: 0 };
  const score = scored.length ? Math.round((scored.reduce((s, c) => s + sMap[c.status], 0) / (scored.length * 2)) * 100) : null;
  const grade = score == null ? '—' : score >= 80 ? '优' : score >= 55 ? '良' : '待改善';
  return { checks, score, grade };
}

/**
 * 理财进度摘要（供首页看板的财富进度卡，纯函数）。
 * 取最新净资产快照（无则回退 forecast.currentAssets），对比 forecast.target 给出进度。
 * @param {object} state savings-planner 的完整状态
 * @returns {null|{netWorth:number,target:number,progress:number,change:object|null,hasSnapshots:boolean}}
 */
export function financeSummary(state) {
  if (!state || typeof state !== 'object') return null;
  const forecast = state.forecast || {};
  const target = Number(forecast.target) || 0;
  const nw = state.netWorth || {};
  const series = netWorthSeries(nw.snapshots || [], nw.accounts || []);
  const hasSnapshots = series.length > 0;
  const netWorth = hasSnapshots ? series[series.length - 1].net : (Number(forecast.currentAssets) || 0);
  if (!target && !netWorth) return null;
  const progress = target > 0 ? Math.max(0, Math.min(1, netWorth / target)) : 0;
  return { netWorth, target, progress, change: netWorthChange(series), hasSnapshots };
}

/** 两个日期串之间的月数（可带小数，按 30 天折算日）。 */
function monthsBetween(a, b) {
  const da = new Date(a), db = new Date(b);
  return (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth()) + (db.getDate() - da.getDate()) / 30;
}

/**
 * 理财「时间维度 + 趋势预测」：净资产历史序列 + 按近期速度的线性预测 + 预计达成目标时间。
 * 供首页看板的炫酷理财趋势卡。纯函数。
 * @param {object} state savings-planner 状态
 * @param {{horizon?:number}} [opts] 预测向前的月数（默认 12）
 * @returns {null|{historyVals:number[],projection:number[],target:number,latest:number,
 *   monthlyRate:number|null,etaMonths:number|null,etaText:string,hasHistory:boolean}}
 */
export function financeForecast(state, opts = {}) {
  if (!state || typeof state !== 'object') return null;
  const forecast = state.forecast || {};
  const target = Number(forecast.target) || 0;
  const nw = state.netWorth || {};
  const series = netWorthSeries(nw.snapshots || [], nw.accounts || []);
  const hasHistory = series.length >= 2;
  const latest = series.length ? series[series.length - 1].net : (Number(forecast.currentAssets) || 0);

  let monthlyRate = null;
  const projection = [];
  let etaMonths = null;
  if (hasHistory) {
    const first = series[0];
    const last = series[series.length - 1];
    const months = Math.max(1, monthsBetween(first.date, last.date));
    monthlyRate = (last.net - first.net) / months;
    const horizon = opts.horizon || 12;
    for (let m = 1; m <= horizon; m++) projection.push(Math.round(latest + monthlyRate * m));
    if (monthlyRate > 0 && target > latest) etaMonths = Math.ceil((target - latest) / monthlyRate);
  }

  let etaText;
  if (!target) etaText = '设个目标，看预计达成';
  else if (latest >= target) etaText = '已达成目标 🎉';
  else if (!hasHistory) etaText = '多记几期净资产即可预测';
  else if (monthlyRate == null || monthlyRate <= 0) etaText = '近期未增长，暂无法预测';
  else etaText = `按近期速度约 ${(etaMonths / 12).toFixed(1)} 年达成`;

  return { historyVals: series.map((s) => s.net), projection, target, latest, monthlyRate, etaMonths, etaText, hasHistory };
}

/** 从资产配置估算综合年化（小数）。读 ret(百分比) 或 expectedReturn；缺省 5%。 */
function allocAnnualReturn(allocations) {
  const list = allocations || [];
  const tw = list.reduce((s, a) => s + Math.max(0, a.weight || 0), 0);
  if (tw <= 0) return 0.05;
  const pct = list.reduce((s, a) => s + (Math.max(0, a.weight || 0) / tw) * (Number(a.ret != null ? a.ret : a.expectedReturn) || 0), 0);
  return pct / 100;
}

/**
 * 理财多情景预测带（乐观 / 中性 / 保守）。
 * 模型：以最新净资产为起点，按「近期月均净流入(储蓄近似) + 投资年化」逐月复利；
 * 三情景对年化做 ±2% 的不确定性带。纯函数。
 * @param {object} state savings-planner 状态
 * @param {{horizon?:number}} [opts] 预测月数（默认 24）
 * @returns {null|{history:number[],neutral:number[],optimistic:number[],conservative:number[],
 *   target:number,latest:number,baseReturn:number,contribution:number,etaNeutralMonths:number|null,etaText:string,hasHistory:boolean}}
 */
export function financeScenarios(state, opts = {}) {
  const f = financeForecast(state);
  if (!f) return null;
  const horizon = opts.horizon || 24;
  const latest = f.latest;
  const target = f.target;
  const contribution = Math.max(0, f.monthlyRate || 0); // 月均净流入（近似储蓄）
  const baseR = allocAnnualReturn(state.allocations);
  const project = (annualR) => {
    const mr = Math.max(-0.9, annualR) / 12;
    let v = latest;
    const arr = [];
    for (let m = 1; m <= horizon; m++) { v = v * (1 + mr) + contribution; arr.push(Math.round(v)); }
    return arr;
  };
  const neutral = project(baseR);
  const optimistic = project(baseR + 0.02);
  const conservative = project(Math.max(0, baseR - 0.02));
  const etaOf = (arr) => { if (!target || latest >= target) return null; const i = arr.findIndex((v) => v >= target); return i < 0 ? null : i + 1; };
  const etaN = etaOf(neutral);
  let etaText;
  if (!target) etaText = '设个目标看预测';
  else if (latest >= target) etaText = '已达成目标 🎉';
  else if (etaN) etaText = `中性情景约 ${(etaN / 12).toFixed(1)} 年达成`;
  else etaText = `${horizon} 个月内暂未达成，可提高储蓄或收益`;
  return { history: f.historyVals, neutral, optimistic, conservative, target, latest, baseReturn: baseR, contribution, etaNeutralMonths: etaN, etaText, hasHistory: f.hasHistory };
}

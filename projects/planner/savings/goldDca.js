/**
 * 黄金定投助手 —— 纯函数（便于单测）
 * ------------------------------------------------------------------
 * 把「分批接刀、用均价对抗择时」落成工具：记每笔买入，算累计克数 / 持仓均价 /
 * 按实时金价的浮盈亏；按计划（每期金额 + 周期 + 期数）算进度与下一期日期。
 * 核心洞察：定投赢在「均价」——只要现价高于你的持仓均价就是浮盈，不必猜底。
 * 一笔买入 = { id, date, amount(元), pricePerGram(元/克) }，克数 = amount / price 自动算。
 */

/** 单笔买入的克数（金额 ÷ 单价）。 */
export function buyGrams(r) {
  const amt = Number(r && r.amount) || 0;
  const p = Number(r && r.pricePerGram) || 0;
  return p > 0 ? amt / p : 0;
}

/**
 * 汇总买入记录 → 持仓统计。
 * @param {Array} records
 * @param {number} livePrice 实时金价（元/克），来自 gold-cache
 * @returns {{count,totalGrams,totalCost,avgCost,marketValue,pnl,pnlPct,livePrice,belowAvg}}
 */
export function dcaStats(records, livePrice = 0) {
  const list = Array.isArray(records) ? records : [];
  let totalGrams = 0, totalCost = 0;
  for (const r of list) {
    const g = buyGrams(r);
    totalGrams += g;
    totalCost += Number(r.amount) || 0;
  }
  const avgCost = totalGrams > 0 ? totalCost / totalGrams : 0;
  const lp = Number(livePrice) || 0;
  const marketValue = lp > 0 ? totalGrams * lp : 0;
  const pnl = lp > 0 ? marketValue - totalCost : 0;
  const pnlPct = totalCost > 0 && lp > 0 ? (pnl / totalCost) * 100 : 0;
  return {
    count: list.length,
    totalGrams,
    totalCost,
    avgCost,
    marketValue,
    pnl,
    pnlPct,
    livePrice: lp,
    belowAvg: lp > 0 && avgCost > 0 ? lp < avgCost : false, // 现价低于均价 = 此刻加仓拉低均价
  };
}

const CADENCE_DAYS = { weekly: 7, biweekly: 14, monthly: 30 };
export const CADENCE_LABEL = { weekly: '每周', biweekly: '每两周', monthly: '每月' };

/** 给日期加上 n 天，返回 'YYYY-MM-DD'。 */
export function addDaysStr(dateStr, n) {
  const d = new Date((dateStr || '') + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * 定投计划进度。
 * @param {{perAmount:number,cadence:string,count:number,startDate:string}} plan
 * @param {Array} records
 * @param {string} today 'YYYY-MM-DD'
 * @returns {{done,total,investedPct,nextDate,due,daysToNext,plannedTotal}}
 */
export function dcaProgress(plan, records, today) {
  const p = plan || {};
  const list = Array.isArray(records) ? records : [];
  const done = list.length;
  const total = Number(p.count) || 0;
  const perAmount = Number(p.perAmount) || 0;
  const invested = list.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const plannedTotal = total > 0 ? total * perAmount : 0;
  const investedPct = plannedTotal > 0 ? Math.min(100, Math.round((invested / plannedTotal) * 100)) : 0;
  const step = CADENCE_DAYS[p.cadence] || 30;
  // 下一期日期：最后一笔的日期 + 周期；无记录则用计划起始日
  const lastDate = list.length ? list.map((r) => r.date).sort().slice(-1)[0] : '';
  let nextDate = '';
  if (total === 0 || done < total) {
    nextDate = lastDate ? addDaysStr(lastDate, step) : (p.startDate || today || '');
  }
  const daysToNext = nextDate && today ? Math.round((new Date(nextDate) - new Date(today)) / 86400000) : null;
  return {
    done,
    total,
    invested,
    investedPct,
    plannedTotal,
    nextDate,
    daysToNext,
    due: nextDate && today ? nextDate <= today : false, // 今天到期/已过期 → 该买了
  };
}

/** 元/克展示（两位小数）。 */
export function fmtYuan(v) {
  if (v == null || !isFinite(v)) return '—';
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

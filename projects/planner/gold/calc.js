/**
 * 金价换算 —— 纯函数（便于单测）
 * ------------------------------------------------------------------
 * 工行积存金真实牌价无公开 API、纯前端抓不到，这里用国际金价折算「人民币元/克」近似：
 *   元/克 = 国际金价(美元/盎司) × 美元兑人民币汇率 ÷ 每盎司克数
 * 走势与积存金基本一致，绝对值可能差几元（无银行点差）。数据由 Yahoo GC=F / CNY=X 提供。
 */

/** 1 金衡盎司 = 31.1034768 克。 */
export const OZ_TO_GRAM = 31.1034768;

/** 缺汇率时的兜底美元兑人民币（仅用于折算近似，会在卡片标注）。 */
export const DEFAULT_USDCNY = 7.15;

/** 美元/盎司 + 美元兑人民币 → 人民币元/克；非法输入返回 null。 */
export function rmbPerGram(usdPerOz, usdCny) {
  if (!isFinite(usdPerOz) || !isFinite(usdCny) || usdPerOz <= 0 || usdCny <= 0) return null;
  return (usdPerOz * usdCny) / OZ_TO_GRAM;
}

/**
 * 由国际金价行情对象 + 汇率，产出人民币金价摘要。
 * @param {{price:number, prevClose?:number, series?:number[]}} gc Yahoo GC=F 行情（美元/盎司）
 * @param {number} usdCny 美元兑人民币
 * @returns {null|{pricePerGram:number, prevPerGram:number|null, change:number, changePct:number, series:number[], usdPerOz:number, usdCny:number}}
 */
export function goldSummary(gc, usdCny) {
  if (!gc || !isFinite(gc.price) || !isFinite(usdCny) || usdCny <= 0) return null;
  const price = rmbPerGram(gc.price, usdCny);
  if (price == null) return null;
  const prev = gc.prevClose != null && isFinite(gc.prevClose) ? rmbPerGram(gc.prevClose, usdCny) : null;
  const series = Array.isArray(gc.series) ? gc.series.map((v) => rmbPerGram(v, usdCny)).filter((v) => v != null) : [];
  const base = prev != null ? prev : (series.length >= 2 ? series[series.length - 2] : price);
  const change = price - base;
  const changePct = base ? (change / base) * 100 : 0;
  return { pricePerGram: price, prevPerGram: prev, change, changePct, series, usdPerOz: gc.price, usdCny };
}

/** 元/克展示格式（两位小数）。 */
export function formatGram(v) {
  if (v == null || !isFinite(v)) return '—';
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * 由财富状态的积存金持仓克数 + 金价缓存，算出当前折算价值（计入净资产用）。
 * @param {object} savingsState savings-planner（取 goldGrams）
 * @param {object} goldCache    gold-cache（取 pricePerGram / change / changePct）
 * @returns {{grams:number, price:number, value:number, change:number, changePct:number}}
 */
export function goldValueOf(savingsState, goldCache) {
  const grams = Math.max(0, Number(savingsState && savingsState.goldGrams) || 0);
  const g = goldCache || {};
  const price = isFinite(g.pricePerGram) && g.pricePerGram > 0 ? g.pricePerGram : 0;
  return {
    grams,
    price,
    value: grams > 0 && price > 0 ? Math.round(grams * price) : 0,
    change: Number(g.change) || 0,
    changePct: Number(g.changePct) || 0,
  };
}


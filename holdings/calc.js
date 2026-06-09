/**
 * 持仓估值 —— 纯函数（便于单测）
 * ------------------------------------------------------------------
 * 把「持有量」按实时价折算成市值，汇总成总持仓估值，作为额外资产计入净资产。
 * 价格上下文（ctx）来自各数据源缓存：金价 gold-cache、股票 stocks-watch-cache。
 *   · cash  现金/存款：金额（元），市值 = 金额
 *   · gold  黄金/积存金：克数 × 实时金价（元/克）
 *   · stock 股票：股数 × 最新报价（按 symbol 查 quotes）
 *   · fund  基金：份额 × 净值（暂手填 nav，后续可接数据源）
 *   · other 其他：直接手填市值（元）
 * 设计为「额外资产」叠加在净资产上，请勿与「账户快照」里同一笔重复登记。
 */

/** 持仓类型元信息（UI 与校验共用）。 */
export const HOLDING_KINDS = [
  { kind: 'cash', label: '现金 / 存款', icon: '💵', unit: '元', qtyLabel: '金额', live: false },
  { kind: 'gold', label: '黄金 / 积存金', icon: '🪙', unit: '克', qtyLabel: '克数', live: true },
  { kind: 'stock', label: '股票', icon: '📈', unit: '股', qtyLabel: '股数', live: true, needs: 'symbol' },
  { kind: 'fund', label: '基金', icon: '📊', unit: '份', qtyLabel: '份额', live: true, needs: 'nav' },
  { kind: 'other', label: '其他（手填市值）', icon: '🧾', unit: '元', qtyLabel: '市值', live: false },
];

export function kindMeta(kind) {
  return HOLDING_KINDS.find((k) => k.kind === kind) || HOLDING_KINDS[HOLDING_KINDS.length - 1];
}

/** 由各数据源缓存构造价格上下文：{ goldPrice, quotes:{SYM:quote} }。纯函数。 */
export function buildPriceCtx(goldCache, stocksCache) {
  const goldPrice = goldCache && isFinite(goldCache.pricePerGram) && goldCache.pricePerGram > 0 ? goldCache.pricePerGram : 0;
  const quotes = {};
  for (const q of (stocksCache && stocksCache.quotes) || []) {
    if (q && q.symbol && isFinite(q.price)) quotes[String(q.symbol).toUpperCase()] = q;
  }
  return { goldPrice, quotes };
}

/** 单条持仓估值 → { value, price, priced }。priced=false 表示暂缺实时价。 */
export function holdingValue(h, ctx = {}) {
  const qty = Number(h && h.qty) || 0;
  switch (h && h.kind) {
    case 'cash':
    case 'other':
      return { value: Math.round(qty), price: 1, priced: true };
    case 'gold': {
      const p = ctx.goldPrice || 0;
      return { value: p > 0 ? Math.round(qty * p) : 0, price: p, priced: p > 0 };
    }
    case 'stock': {
      const q = (ctx.quotes || {})[String(h.symbol || '').toUpperCase()];
      const p = q && isFinite(q.price) ? q.price : 0;
      return { value: p > 0 ? Math.round(qty * p) : 0, price: p, priced: p > 0 };
    }
    case 'fund': {
      const nav = Number(h.nav) || 0;
      return { value: nav > 0 ? Math.round(qty * nav) : 0, price: nav, priced: nav > 0 };
    }
    default:
      return { value: 0, price: 0, priced: false };
  }
}

/** 汇总持仓估值：{ total, items:[{...h, value, price, priced}], byKind }。 */
export function holdingsValue(holdings, ctx = {}) {
  const items = (holdings || []).map((h) => ({ ...h, ...holdingValue(h, ctx) }));
  const total = items.reduce((s, i) => s + (i.value || 0), 0);
  const byKind = {};
  for (const i of items) byKind[i.kind] = (byKind[i.kind] || 0) + (i.value || 0);
  return { total, items, byKind };
}

/**
 * 有效持仓列表（含旧版兼容）：把历史的 goldGrams 自动补成一条黄金持仓，
 * 这样从「金价单字段」平滑过渡到「持仓列表」，不丢已填的克数。
 */
export function effectiveHoldings(state) {
  const list = [...(((state && state.holdings) || []))];
  const grams = Number(state && state.goldGrams) || 0;
  if (grams > 0 && !list.some((h) => h.kind === 'gold')) {
    list.push({ id: 'legacy-gold', kind: 'gold', name: '积存金', qty: grams });
  }
  return list;
}

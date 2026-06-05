/**
 * 比价小助手 —— 纯函数计算逻辑（单价归一与比较，不依赖 React / UI）
 * ------------------------------------------------------------------
 * 输入不同规格/包装的商品（价格 + 规格数值 + 单位 + 件数），归一到「基准单位」后
 * 算出可比的单价，并标出最划算项与其它项贵多少。秉承 DRY：算一次、到处复用。
 *
 * 单位换算只在「同量纲」内有效（重量/体积/长度/数量），跨量纲不可比。
 * 可测试：node --test compare/calc.test.js
 */

/** 量纲分组：基准单位 + 展示单位（更易读的单价口径）。 */
export const GROUPS = {
  weight: { label: '重量', base: 'g', display: { per: 100, label: '100g' } },
  volume: { label: '体积', base: 'ml', display: { per: 1000, label: 'L' } },
  count: { label: '数量', base: '件', display: { per: 1, label: '件' } },
  length: { label: '长度', base: 'm', display: { per: 1, label: 'm' } },
};

/** 支持的单位 → 基准单位换算系数。 */
export const UNITS = [
  { id: 'g', label: '克 (g)', group: 'weight', toBase: 1 },
  { id: 'kg', label: '千克 (kg)', group: 'weight', toBase: 1000 },
  { id: 'jin', label: '斤', group: 'weight', toBase: 500 },
  { id: 'mg', label: '毫克 (mg)', group: 'weight', toBase: 0.001 },
  { id: 'lb', label: '磅 (lb)', group: 'weight', toBase: 453.592 },
  { id: 'oz', label: '盎司 (oz)', group: 'weight', toBase: 28.3495 },
  { id: 'ml', label: '毫升 (ml)', group: 'volume', toBase: 1 },
  { id: 'L', label: '升 (L)', group: 'volume', toBase: 1000 },
  { id: 'pc', label: '个 / 件', group: 'count', toBase: 1 },
  { id: 'roll', label: '卷', group: 'count', toBase: 1 },
  { id: 'sheet', label: '张 / 片', group: 'count', toBase: 1 },
  { id: 'cm', label: '厘米 (cm)', group: 'length', toBase: 0.01 },
  { id: 'm', label: '米 (m)', group: 'length', toBase: 1 },
];
const UNIT_MAP = Object.fromEntries(UNITS.map((u) => [u.id, u]));

export function unitOf(id) { return UNIT_MAP[id] || null; }

function num(v) { const n = Number(v); return isFinite(n) ? n : NaN; }

/** 商品折算到基准单位的总量（规格 × 件数 × 单位系数）。无效返回 NaN。 */
export function baseAmount(item) {
  const u = unitOf(item.unit);
  if (!u) return NaN;
  const size = num(item.size);
  const count = item.count == null || item.count === '' ? 1 : num(item.count);
  if (!(size > 0) || !(count > 0)) return NaN;
  return size * count * u.toBase;
}

/** 每基准单位价格（元/基准单位）。无效返回 null。 */
export function unitPriceBase(item) {
  const price = num(item.price);
  const amt = baseAmount(item);
  if (!(price >= 0) || !(amt > 0)) return null;
  return price / amt;
}

/** 展示口径单价（元/100g、元/L、元/件…）。无效返回 null。 */
export function displayUnitPrice(item) {
  const u = unitOf(item.unit);
  if (!u) return null;
  const upb = unitPriceBase(item);
  if (upb == null) return null;
  const g = GROUPS[u.group];
  return upb * g.display.per;
}

/**
 * 比较一组商品：以「出现最多的量纲」为主量纲，算可比单价、排名、贵多少。
 * @returns {{ group:string|null, displayLabel:string, rows:Array, bestId:string|null, comparableCount:number }}
 */
export function compare(items = []) {
  const enriched = items.map((it) => {
    const u = unitOf(it.unit);
    return { item: it, group: u ? u.group : null, display: displayUnitPrice(it), base: unitPriceBase(it) };
  });

  // 主量纲 = 有效项里出现最多的 group
  const tally = {};
  for (const e of enriched) if (e.group && e.display != null) tally[e.group] = (tally[e.group] || 0) + 1;
  const group = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0] || null;
  const displayLabel = group ? GROUPS[group].display.label : '';

  // 主量纲内的有效项参与排名
  const comparable = enriched.filter((e) => e.group === group && e.display != null);
  let best = null;
  for (const e of comparable) if (best == null || e.display < best.display) best = e;
  const bestVal = best ? best.display : null;

  const rows = enriched.map((e) => {
    const inGroup = e.group === group && e.display != null;
    const pctMore = inGroup && bestVal != null && bestVal > 0 ? ((e.display - bestVal) / bestVal) * 100 : null;
    return {
      id: e.item.id,
      item: e.item,
      group: e.group,
      display: e.display,
      base: e.base,
      comparable: inGroup,
      isBest: inGroup && best != null && e.item.id === best.item.id,
      pctMore: pctMore != null ? Math.round(pctMore * 10) / 10 : null,
    };
  });

  // 排序：可比项按单价升序在前，不可比/无效项在后
  rows.sort((a, b) => {
    if (a.comparable && b.comparable) return a.display - b.display;
    if (a.comparable) return -1;
    if (b.comparable) return 1;
    return 0;
  });

  return { group, displayLabel, rows, bestId: best ? best.item.id : null, comparableCount: comparable.length };
}

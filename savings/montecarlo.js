/**
 * 蒙特卡洛财富模拟 —— 纯函数（可固定种子，便于单测与「重新掷一次」）
 * ------------------------------------------------------------------
 * 不再假设每年固定年化，而是按「均值 + 波动率」的正态分布随机抽取每年的收益，
 * 把整套预测跑 N 遍，得到结果的「概率分布」：达成概率、P10/P50/P90 扇形带、
 * 最终结果直方图、首次达成目标的中位年数。
 *
 * 约定：金额单位「元」；mean/vol 为小数年化（0.06 / 0.15）。
 */

/** 可重现的伪随机数发生器（mulberry32），返回 [0,1)。 */
export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 标准正态分布抽样（Box–Muller）。 */
function normal(rng) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function percentile(sortedArr, p) {
  if (!sortedArr.length) return 0;
  const idx = Math.min(sortedArr.length - 1, Math.max(0, Math.floor((p / 100) * sortedArr.length)));
  return sortedArr[idx];
}

/**
 * 运行蒙特卡洛模拟。
 * @param {object} o
 * @param {number} o.currentAssets 当前总资产
 * @param {number} o.annualSaving  每年新增储蓄
 * @param {number} o.mean          年化均值（小数）
 * @param {number} o.vol           年化波动率（小数，标准差）
 * @param {number} o.years         预测年限
 * @param {number} o.target        目标金额
 * @param {number} [o.runs=2000]   模拟次数
 * @param {number} [o.seed=1]      随机种子（同种子结果可重现）
 * @returns {{
 *   years:number, runs:number,
 *   bands:Array<{year:number,p10:number,p25:number,p50:number,p75:number,p90:number}>,
 *   successProb:number, reachProb:number, medianYears:number|null,
 *   finals:{min:number,max:number,p10:number,p50:number,p90:number,mean:number},
 *   histogram:Array<{x0:number,x1:number,count:number}>, target:number
 * }}
 */
export function simulate({ currentAssets, annualSaving, mean, vol, years, target, runs = 2000, seed = 1 }) {
  const Y = Math.max(1, Math.floor(years || 1));
  const N = Math.max(1, Math.floor(runs || 1));
  const rng = makeRng(seed);
  const ca = currentAssets || 0;
  const sv = annualSaving || 0;
  const m = mean || 0;
  const v = Math.max(0, vol || 0);

  const byYear = Array.from({ length: Y + 1 }, () => new Float64Array(N));
  const finals = new Float64Array(N);
  let successCount = 0; // 期末 ≥ 目标
  const reachedYears = []; // 首次达成目标的年份（期限内）

  for (let i = 0; i < N; i++) {
    let assets = ca;
    byYear[0][i] = assets;
    let reached = -1;
    for (let y = 1; y <= Y; y++) {
      let r = m + v * normal(rng);
      if (r < -0.95) r = -0.95; // 单年最多亏 95%，避免荒谬的负值
      assets = assets * (1 + r) + sv;
      byYear[y][i] = assets;
      if (reached < 0 && assets >= target) reached = y;
    }
    finals[i] = assets;
    if (assets >= target) successCount += 1;
    if (reached > 0) reachedYears.push(reached);
  }

  const bands = byYear.map((arr, y) => {
    const a = Array.from(arr).sort((x, z) => x - z);
    return {
      year: y,
      p10: percentile(a, 10),
      p25: percentile(a, 25),
      p50: percentile(a, 50),
      p75: percentile(a, 75),
      p90: percentile(a, 90),
    };
  });

  const fa = Array.from(finals).sort((x, z) => x - z);
  const min = fa[0];
  const max = fa[fa.length - 1];
  const span = max - min || 1;
  const bins = 24;
  const counts = new Array(bins).fill(0);
  for (let i = 0; i < N; i++) {
    let b = Math.floor(((finals[i] - min) / span) * bins);
    if (b >= bins) b = bins - 1;
    if (b < 0) b = 0;
    counts[b] += 1;
  }
  const histogram = counts.map((count, k) => ({
    x0: min + (k / bins) * span,
    x1: min + ((k + 1) / bins) * span,
    count,
  }));

  const sortedReached = reachedYears.sort((x, z) => x - z);
  const medianYears = sortedReached.length ? sortedReached[Math.floor(sortedReached.length / 2)] : null;
  const meanFinal = fa.reduce((s, x) => s + x, 0) / N;

  return {
    years: Y,
    runs: N,
    bands,
    successProb: successCount / N,
    reachProb: reachedYears.length / N,
    medianYears,
    finals: { min, max, p10: percentile(fa, 10), p50: percentile(fa, 50), p90: percentile(fa, 90), mean: meanFinal },
    histogram,
    target,
  };
}

/** 一组波动率预设（保守/均衡/激进），小数年化标准差。 */
export const VOL_PRESETS = [
  { key: 'low', label: '保守', vol: 0.08 },
  { key: 'mid', label: '均衡', vol: 0.15 },
  { key: 'high', label: '激进', vol: 0.22 },
];

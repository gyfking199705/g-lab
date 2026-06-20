/**
 * muse-ui · 生成式装饰的纯逻辑（手绘边框 / 星点）。确定性：同 seed 同输出，可单测。
 */
import { roundTo } from './anim.js';

/** mulberry32 种子伪随机：返回一个每次调用产出 [0,1) 的函数（同 seed 序列一致）。 */
export function mulberry32(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function jitterEdge(x1, y1, x2, y2, segs, amp, rng) {
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const end = i === 0 || i === segs;
    const jx = end ? 0 : (rng() * 2 - 1) * amp;
    const jy = end ? 0 : (rng() * 2 - 1) * amp;
    pts.push([roundTo(x1 + (x2 - x1) * t + jx, 1), roundTo(y1 + (y2 - y1) * t + jy, 1)]);
  }
  return pts;
}

/**
 * 生成「手绘风」矩形的 SVG path（d 属性）。在 w×h 坐标系内，可放进 viewBox 拉伸。
 * @param {{roughness?:number, inset?:number, segments?:number, passes?:number, seed?:number}} [opts]
 */
export function roughRectPath(w, h, opts = {}) {
  const amp = opts.roughness == null ? 2 : opts.roughness;
  const inset = opts.inset == null ? 2 : opts.inset;
  const segs = opts.segments == null ? 3 : opts.segments;
  const passes = opts.passes == null ? 2 : opts.passes;
  const rng = mulberry32(opts.seed == null ? 42 : opts.seed);
  const x0 = inset;
  const y0 = inset;
  const x1 = w - inset;
  const y1 = h - inset;
  const edges = [
    [x0, y0, x1, y0],
    [x1, y0, x1, y1],
    [x1, y1, x0, y1],
    [x0, y1, x0, y0],
  ];
  let d = '';
  for (let p = 0; p < passes; p++) {
    for (const [ax, ay, bx, by] of edges) {
      const pts = jitterEdge(ax, ay, bx, by, segs, amp, rng);
      d += `M${pts[0][0]} ${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) d += `L${pts[i][0]} ${pts[i][1]}`;
      d += ' ';
    }
  }
  return d.trim();
}

/**
 * 生成 N 个星点的布局（x,y 为百分比，size px，delay/dur 秒）。rng 可注入以便测试。
 */
export function makeSparkles(count = 12, rng = Math.random) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: roundTo(rng() * 100, 2),
      y: roundTo(rng() * 100, 2),
      size: roundTo(6 + rng() * 10, 2),
      delay: roundTo(rng() * 2, 2),
      dur: roundTo(1 + rng() * 1.5, 2),
    });
  }
  return out;
}

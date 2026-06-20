/**
 * popcorn-ui · 纯数学/动画工具（不依赖 React 与 DOM，可在 Node 里单测）
 */

/** 把 v 夹在 [min,max] 内。 */
export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

/** 线性插值。 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** 把 v 从 [inMin,inMax] 映射到 [outMin,outMax]；区间退化时返回 outMin。 */
export function mapRange(v, inMin, inMax, outMin, outMax) {
  if (inMax === inMin) return outMin;
  return outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/** 四舍五入到 decimals 位小数。 */
export function roundTo(v, decimals = 0) {
  const p = Math.pow(10, decimals);
  return Math.round(v * p) / p;
}

/** 常用缓动函数（输入/输出均为 0..1）。 */
export const easings = {
  linear: (t) => t,
  easeOutQuad: (t) => 1 - (1 - t) * (1 - t),
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeOutExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeOutBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

/**
 * 轻量 classnames：支持字符串、数组、{类名:布尔} 对象，忽略假值。
 *   cx('a', cond && 'b', { c: true, d: false }) => 'a b c'
 */
export function cx(...args) {
  const out = [];
  for (const a of args) {
    if (!a) continue;
    if (typeof a === 'string' || typeof a === 'number') out.push(String(a));
    else if (Array.isArray(a)) {
      const s = cx(...a);
      if (s) out.push(s);
    } else if (typeof a === 'object') {
      for (const k in a) if (a[k]) out.push(k);
    }
  }
  return out.join(' ');
}

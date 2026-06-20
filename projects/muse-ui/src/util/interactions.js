/**
 * muse-ui · 交互/特效的纯计算（不依赖 React 与 DOM，可单测）
 * 组件(.jsx) 只负责把鼠标事件与 ref 接到这些纯函数上，几何/数学都在这里。
 */
import { clamp, mapRange, roundTo, easings } from './anim.js';

/**
 * 3D 倾斜：给定指针在元素内的坐标(px,py) 与元素宽高(w,h)，算出旋转角与高光位置。
 * @returns {{rx:number, ry:number, glareX:number, glareY:number}}  角度(度)、高光百分比
 */
export function tiltTransform(px, py, w, h, maxDeg = 12) {
  const x = clamp(px, 0, w);
  const y = clamp(py, 0, h);
  return {
    ry: roundTo(mapRange(x, 0, w, -maxDeg, maxDeg), 2),
    rx: roundTo(mapRange(y, 0, h, maxDeg, -maxDeg), 2),
    glareX: roundTo(mapRange(x, 0, w, 0, 100), 2),
    glareY: roundTo(mapRange(y, 0, h, 0, 100), 2),
  };
}

/**
 * 磁吸：指针相对元素中心的位移(dx,dy)，在 radius 内时把元素朝指针拉近。
 * 越靠近中心拉力越强、到边缘归零（平滑无跳变）。
 * @returns {{x:number, y:number, active:boolean}}
 */
export function magneticOffset(dx, dy, radius, strength = 0.4) {
  const dist = Math.hypot(dx, dy);
  if (radius <= 0 || dist >= radius) return { x: 0, y: 0, active: false };
  const factor = strength * (1 - dist / radius);
  return { x: roundTo(dx * factor, 2), y: roundTo(dy * factor, 2), active: true };
}

/** 光斑：返回一个跟随指针的径向渐变 style 对象。 */
export function spotlightStyle(px, py, size = 320, color = 'rgba(255,255,255,0.22)') {
  return { background: `radial-gradient(${size}px circle at ${px}px ${py}px, ${color}, transparent 70%)` };
}

/**
 * 涟漪几何：点击点(clientX,clientY) 相对元素 rect 的坐标，及覆盖整个元素所需直径。
 * @param {{left:number,top:number,width:number,height:number}} rect
 * @returns {{x:number, y:number, size:number}}
 */
export function rippleGeometry(rect, clientX, clientY) {
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const corners = [
    [0, 0],
    [rect.width, 0],
    [0, rect.height],
    [rect.width, rect.height],
  ];
  let max = 0;
  for (const [cx, cy] of corners) {
    const d = Math.hypot(cx - x, cy - y);
    if (d > max) max = d;
  }
  return { x: roundTo(x, 2), y: roundTo(y, 2), size: roundTo(max * 2, 2) };
}

/** 数字滚动：按进度(0..1)+缓动，算出当前显示值。 */
export function countAt(start, end, progress, ease = easings.easeOutCubic) {
  return start + (end - start) * ease(clamp(progress, 0, 1));
}

/** 千分位格式化（保留 decimals 位小数，负数与小数都正确处理）。 */
export function formatNumber(value, decimals = 0, sep = ',') {
  const fixed = Number(value || 0).toFixed(decimals);
  const neg = fixed.startsWith('-');
  const [intPart, fracPart] = (neg ? fixed.slice(1) : fixed).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return (neg ? '-' : '') + grouped + (fracPart ? '.' + fracPart : '');
}

/**
 * 动态网格渐变：把若干颜色按时间 t 在画布上缓慢漂移，返回 CSS background（多层 radial-gradient）。
 * 纯函数 + 确定性：同样的 (colors,t) 永远得到同样的字符串。
 */
export function meshGradient(colors, t = 0, opts = {}) {
  const spread = opts.spread == null ? 38 : opts.spread;
  const list = colors && colors.length ? colors : ['#CC785C', '#5C8A6B', '#6E83C4'];
  const n = list.length;
  return list
    .map((color, i) => {
      const a = t * Math.PI * 2 + (i / n) * Math.PI * 2;
      const x = roundTo(50 + spread * Math.cos(a), 2);
      const y = roundTo(50 + spread * Math.sin(a * 1.2 + i), 2);
      return `radial-gradient(circle at ${x}% ${y}%, ${color} 0%, transparent 55%)`;
    })
    .join(', ');
}

/** 打字机：按经过秒数与每秒字符数(cps)，返回当前应显示的文本切片。 */
export function typedSlice(text, elapsedSec, cps = 22) {
  const s = String(text == null ? '' : text);
  const n = Math.max(0, Math.floor((elapsedSec || 0) * cps));
  return s.slice(0, Math.min(n, s.length));
}
/** 打字是否已打完。 */
export function typeDone(text, elapsedSec, cps = 22) {
  return (elapsedSec || 0) * cps >= String(text == null ? '' : text).length;
}

/** 线性渐变字符串（渐变文字/描边等用）。 */
export function linearGradient(colors, angle = 90) {
  const list = colors && colors.length ? colors : ['#CC785C', '#6E83C4'];
  return `linear-gradient(${angle}deg, ${list.join(', ')})`;
}

/** 跑马灯：按经过秒数与速度(px/s)，在 [-width,0] 间循环的位移（无缝滚动用）。 */
export function marqueeOffset(elapsedSec, speed, width) {
  if (!width || width <= 0) return 0;
  const d = ((elapsedSec || 0) * speed) % width;
  return -(d < 0 ? d + width : d);
}

/** 文字解码动画：按进度返回应"已揭示"的字符数。 */
export function revealCount(total, progress) {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  return Math.max(0, Math.min(total, Math.floor(p * total)));
}

/**
 * 文字解码：前 revealed 个字符为真值，其余用随机字符（空格保持），rand 可注入以便测试。
 */
export function scrambleText(target, revealed, charset = '!<>-_\\/[]{}=+*^?#', rand = Math.random) {
  const s = String(target == null ? '' : target);
  const r = Math.max(0, Math.min(s.length, Math.floor(revealed)));
  let out = s.slice(0, r);
  for (let i = r; i < s.length; i++) {
    if (s[i] === ' ') out += ' ';
    else out += charset[Math.floor(rand() * charset.length)] || charset[0];
  }
  return out;
}

/**
 * 打字机状态机（多句循环 + 退格）：给定经过秒数 t 与时序参数，
 * 返回当前应显示文本、所在句子下标与阶段。纯函数、确定性，便于单测。
 * 时序：每句 = 打字(len/cps) → 停留(hold) → 删除(len/delCps) → 间隔(gap)。
 * @returns {{text:string, index:number, phase:'typing'|'hold'|'deleting'|'gap'|'done'}}
 */
export function typewriterState(texts, t, opts = {}) {
  const cps = opts.cps || 22;
  const delCps = opts.delCps || 40;
  const hold = opts.hold == null ? 1.2 : opts.hold;
  const gap = opts.gap == null ? 0.4 : opts.gap;
  const loop = opts.loop !== false;
  const list = (Array.isArray(texts) ? texts : [texts]).map((s) => String(s == null ? '' : s));
  if (!list.length) return { text: '', index: 0, phase: 'done' };

  const multi = loop || list.length > 1;
  const seg = list.map((s) => ({
    s,
    type: s.length / cps,
    hold,
    del: multi ? s.length / delCps : 0,
    gap: multi ? gap : 0,
  }));
  const total = seg.reduce((a, x) => a + x.type + x.hold + x.del + x.gap, 0);

  let time = t < 0 ? 0 : t;
  if (loop && total > 0) time %= total;

  for (let i = 0; i < seg.length; i++) {
    const g = seg[i];
    if (time < g.type) {
      const n = g.type > 0 ? Math.floor((time / g.type) * g.s.length) : g.s.length;
      return { text: g.s.slice(0, Math.min(g.s.length, n)), index: i, phase: 'typing' };
    }
    time -= g.type;
    if (time < g.hold) return { text: g.s, index: i, phase: 'hold' };
    time -= g.hold;
    if (time < g.del) {
      const left = Math.ceil(g.s.length * (1 - time / g.del));
      return { text: g.s.slice(0, left), index: i, phase: 'deleting' };
    }
    time -= g.del;
    if (time < g.gap) return { text: '', index: i, phase: 'gap' };
    time -= g.gap;
  }
  const last = list[list.length - 1];
  return { text: last, index: list.length - 1, phase: 'done' };
}

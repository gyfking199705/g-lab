/**
 * muse-ui · 视差分层的纯计算（不依赖 React 与 DOM，可单测）
 * 给定指针/滚动偏移，按层深度算出各层的平移量。
 */
import { clamp, mapRange, roundTo } from './anim.js';

/**
 * 指针视差：给定指针在容器内的归一化坐标 (nx, ny) ∈ [-1, 1]，
 * 以及该层的深度系数 depth（0=无移动，1=最大移动），
 * 算出该层应平移的 (x, y)，单位 px。
 *
 * 深度可为负值，此时层向指针反方向移动（远景感）。
 *
 * @param {number} nx  指针 X 归一化坐标，-1（左） .. 1（右）
 * @param {number} ny  指针 Y 归一化坐标，-1（上） .. 1（下）
 * @param {number} depth  层深度系数（建议范围 -1 .. 1）
 * @param {number} [maxPx=24]  depth=1 时的最大位移 px
 * @returns {{ x: number, y: number }}
 */
export function parallaxOffset(nx, ny, depth, maxPx = 24) {
  return {
    x: roundTo(clamp(nx, -1, 1) * depth * maxPx, 2),
    y: roundTo(clamp(ny, -1, 1) * depth * maxPx, 2),
  };
}

/**
 * 把容器内的鼠标坐标 (px, py) 换算成归一化坐标 (nx, ny) ∈ [-1, 1]。
 * 容器宽高为 (w, h)，中心点映射到 (0, 0)。
 *
 * @param {number} px  鼠标在容器内的 X 像素坐标
 * @param {number} py  鼠标在容器内的 Y 像素坐标
 * @param {number} w   容器宽度 px
 * @param {number} h   容器高度 px
 * @returns {{ nx: number, ny: number }}
 */
export function pointerToNorm(px, py, w, h) {
  if (w <= 0 || h <= 0) return { nx: 0, ny: 0 };
  return {
    nx: roundTo(mapRange(clamp(px, 0, w), 0, w, -1, 1), 4),
    ny: roundTo(mapRange(clamp(py, 0, h), 0, h, -1, 1), 4),
  };
}

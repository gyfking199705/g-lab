/**
 * muse-ui · 便利贴白板的纯逻辑（不依赖 React/DOM，可单测）
 */

/** 把便利贴左上角 (x,y) 夹到画板范围内（保证整张贴纸可见）。 */
export function clampNote(x, y, w, h, bounds) {
  const maxX = Math.max(0, (bounds.width || 0) - w);
  const maxY = Math.max(0, (bounds.height || 0) - h);
  return {
    x: Math.max(0, Math.min(x, maxX)),
    y: Math.max(0, Math.min(y, maxY)),
  };
}

/** 网格吸附；grid<=0 时不吸附。 */
export function snap(v, grid) {
  if (!grid || grid <= 0) return v;
  return Math.round(v / grid) * grid;
}

/** 把某张贴纸移到数组末尾（= 最上层 z 序），返回新数组；不存在则原样返回副本。 */
export function reorderToFront(notes, id) {
  const idx = notes.findIndex((n) => n.id === id);
  if (idx < 0) return notes.slice();
  const copy = notes.slice();
  const [item] = copy.splice(idx, 1);
  copy.push(item);
  return copy;
}

/** 新便利贴的级联落点（避免叠在一起）。 */
export function cascadeXY(count, step = 26, base = 24) {
  const k = count % 8;
  return { x: base + k * step, y: base + k * step };
}

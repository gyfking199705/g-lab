/**
 * 学习地图 —— 世界图布局引擎（纯函数，便于单测）
 * ------------------------------------------------------------------
 * 把 领域(domain) → 轨道 → 分组 → 知识点 摆成一张可漫游的六边形领土图：
 *   · 每个知识点 = 一格尖顶六边形（pointy-top hex）
 *   · 每个领域 = 一块「大陆」：知识点按 轨道→分组 顺序逐行排布，
 *     轨道之间空一整行、分组之间空一格，形成地貌纹理
 *   · 大陆按「货架打包」铺进世界（限宽换行），自建图（无 domain）排最前
 * 输出只含几何与引用（id/名称/状态），渲染交给 MapView。
 */

/** 六边形半径（世界坐标单位）。 */
export const HEX_R = 9;

/** 尖顶六边形的 polygon points 字符串。 */
export function hexPoints(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1));
  }
  return pts.join(' ');
}

/**
 * 单个领域 → 大陆布局。
 * @returns {{tiles:Array, w:number, h:number}} tiles: {x,y,topicId,trackId,clusterId,name,status,note,unlock,trackName,clusterName}
 */
export function layoutDomain(group, r = HEX_R) {
  const hw = Math.sqrt(3) * r; // 水平步长
  const vh = 1.5 * r; // 垂直步长
  let n = 0;
  for (const tr of group.tracks) for (const cl of tr.clusters) n += cl.topics.length;
  const cols = Math.max(4, Math.ceil(Math.sqrt(n * 1.9))); // 偏宽的版图
  const tiles = [];
  let row = 0, col = 0;
  const place = (t, tr, cl) => {
    if (col >= cols) { col = 0; row += 1; }
    const off = row % 2 ? hw / 2 : 0;
    tiles.push({
      x: col * hw + off + hw / 2,
      y: row * vh + r,
      topicId: t.id, trackId: tr.id, clusterId: cl.id,
      name: t.name, status: t.status, note: t.note || '', unlock: t.unlock || '', card: t.card || '',
      trackName: tr.name, clusterName: cl.name || '', domain: group.domain || '',
    });
    col += 1;
  };
  group.tracks.forEach((tr, ti) => {
    if (ti > 0 && (col > 0 || row > 0)) { row += 2; col = 0; } // 轨道间空一行
    tr.clusters.forEach((cl, ci) => {
      if (ci > 0 && col > 0) { col += 1; if (col >= cols) { col = 0; row += 1; } } // 分组间空一格
      for (const t of cl.topics) place(t, tr, cl);
    });
  });
  return { tiles, w: cols * hw + hw / 2 + r, h: row * vh + 2.6 * r };
}

/**
 * 全部领域 → 世界图（货架打包，限宽换行）。
 * @returns {{continents:Array, width:number, height:number, tileById:Object}}
 *   continents: {domain, icon, x, y, w, h, tiles, stats:{done,doing,fog,todo,total}}
 */
export function layoutWorld(groups, r = HEX_R, maxRowW = 900) {
  const PAD = 30; // 大陆间距
  const LABEL = 24; // 大陆标题预留
  const continents = (groups || []).map((g) => {
    const d = layoutDomain(g, r);
    const stats = { done: 0, doing: 0, fog: 0, todo: 0, total: d.tiles.length };
    for (const t of d.tiles) if (stats[t.status] != null) stats[t.status] += 1;
    return { domain: g.domain, icon: g.icon || '🗺️', ...d, stats, x: 0, y: 0 };
  });
  let x = 0, y = 0, shelfH = 0, width = 0;
  for (const c of continents) {
    if (x > 0 && x + c.w > maxRowW) { x = 0; y += shelfH + PAD + LABEL; shelfH = 0; }
    c.x = x; c.y = y + LABEL;
    x += c.w + PAD;
    shelfH = Math.max(shelfH, c.h);
    width = Math.max(width, c.x + c.w);
  }
  const height = y + LABEL + shelfH;
  const tileById = {};
  // gx/gy = 世界绝对坐标（大陆偏移 + 大陆内坐标），供「继续学习」等居中跳转用
  for (const c of continents) for (const t of c.tiles) tileById[t.topicId] = { ...t, gx: c.x + t.x, gy: c.y + t.y };
  return { continents, width, height, tileById };
}

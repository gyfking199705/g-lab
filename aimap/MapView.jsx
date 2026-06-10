/**
 * 学习地图 —— 世界图视图（SVG 六边形领土 + 漫游）
 * ------------------------------------------------------------------
 * 真·地图交互：
 *   · 拖拽平移 / 滚轮缩放 / ＋－⤢ 控件（变换走 ref 直写 DOM，拖动零重渲染）
 *   · 每格六边形 = 一个知识点：已掌握=点亮绿、进行中=琥珀前线、
 *     迷雾=紫色虚边、未开始=未踏足的纸色
 *   · 悬停浮签看名字；点击落子 → 底部详情面板（面包屑/改状态/记笔记/解锁问题）
 *   · 状态筛选时不隐藏，而是把不相关的领土压暗——保持地图完整感
 * 布局几何来自 ./layout.js（纯函数）；本组件只管渲染与手势。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { layoutWorld, hexPoints, HEX_R } from './layout.js';
import { STATUS_META, STATUS_CYCLE } from './calc.js';

const FILL = {
  done: '#79a186', doing: '#d2a45c', fog: '#9d8cc9', todo: '#e9e6db',
};
const STROKE = {
  done: '#5d8a6e', doing: '#b8884a', fog: '#8E7CC3', todo: '#d6d2c4',
};

export default function MapView({ groups, filter, onSetStatus, onPatchTopic }) {
  const world = useMemo(() => layoutWorld(groups, HEX_R), [groups]);
  const wrapRef = useRef(null);
  const gRef = useRef(null);
  const view = useRef({ x: 16, y: 16, k: 1 });
  const drag = useRef(null);
  const moved = useRef(false);
  const [selId, setSelId] = useState(null);
  const [tip, setTip] = useState(null);
  const sel = selId ? world.tileById[selId] : null;

  const apply = () => {
    const v = view.current;
    if (gRef.current) gRef.current.setAttribute('transform', `translate(${v.x},${v.y}) scale(${v.k})`);
  };

  // 初始：缩放到适配容器宽度
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const k = (el.clientWidth - 32) / (world.width || 1);
    view.current = { x: 16, y: 16, k: isFinite(k) && k > 0 ? Math.min(1.35, k) : 1 };
    apply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world.width, world.height]);
  useEffect(() => { apply(); });

  const zoomBy = (f, cx, cy) => {
    const el = wrapRef.current;
    const r = el.getBoundingClientRect();
    const px = cx != null ? cx - r.left : r.width / 2;
    const py = cy != null ? cy - r.top : r.height / 2;
    const v = view.current;
    const k2 = Math.min(4, Math.max(0.25, v.k * f));
    view.current = { k: k2, x: px - ((px - v.x) / v.k) * k2, y: py - ((py - v.y) / v.k) * k2 };
    apply();
  };
  const resetView = () => {
    const el = wrapRef.current;
    const k = el ? Math.min(1.35, (el.clientWidth - 32) / (world.width || 1)) : 1;
    view.current = { x: 16, y: 16, k: isFinite(k) && k > 0 ? k : 1 };
    apply();
  };

  const onPointerDown = (e) => {
    drag.current = { sx: e.clientX, sy: e.clientY, ox: view.current.x, oy: view.current.y };
    moved.current = false;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* 静默 */ }
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.sx, dy = e.clientY - drag.current.sy;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true;
    view.current.x = drag.current.ox + dx;
    view.current.y = drag.current.oy + dy;
    apply();
  };
  const onPointerUp = () => { drag.current = null; };
  const onWheel = (e) => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX, e.clientY); };

  const showTip = (e, t) => {
    const r = wrapRef.current.getBoundingClientRect();
    setTip({ x: e.clientX - r.left, y: e.clientY - r.top, t });
  };

  const dimmed = (t) => filter !== 'all' && t.status !== filter;

  return (
    <div className="amv-wrap" ref={wrapRef}>
      <svg className="amv-svg" onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerLeave={onPointerUp} onWheel={onWheel}>
        <g ref={gRef}>
          {world.continents.map((c) => (
            <g key={c.domain || '__own'}>
              {/* 大陆地块 */}
              <rect x={c.x - 12} y={c.y - 12} width={c.w + 24} height={c.h + 24} rx={16}
                className={`amv-plate${c.stats.done + c.stats.doing + c.stats.fog === 0 ? ' amv-unexplored' : ''}`} />
              <text x={c.x - 2} y={c.y - 18} className="amv-label">
                {(c.icon || '🗺️') + ' ' + (c.domain || '我的主线图')}
                <tspan className="amv-label-sub">{'  ' + (c.stats.done > 0 ? `${c.stats.done}/${c.stats.total}` : `${c.stats.total} 点待探索`)}</tspan>
              </text>
              {c.tiles.map((t) => (
                <polygon key={t.topicId}
                  points={hexPoints(c.x + t.x, c.y + t.y, HEX_R - 0.8)}
                  fill={FILL[t.status]} stroke={selId === t.topicId ? 'var(--accent-2)' : STROKE[t.status]}
                  strokeWidth={selId === t.topicId ? 2.4 : t.status === 'fog' ? 1.4 : 1}
                  strokeDasharray={t.status === 'fog' ? '3 2' : undefined}
                  opacity={dimmed(t) ? 0.16 : 1}
                  className="amv-hex"
                  onClick={() => { if (!moved.current) { setSelId(t.topicId); setTip(null); } }}
                  onMouseEnter={(e) => showTip(e, t)}
                  onMouseMove={(e) => showTip(e, t)}
                  onMouseLeave={() => setTip(null)}
                />
              ))}
            </g>
          ))}
        </g>
      </svg>

      {/* 控件 + 图例 */}
      <div className="amv-ctrl">
        <button onClick={() => zoomBy(1.25)} title="放大">＋</button>
        <button onClick={() => zoomBy(1 / 1.25)} title="缩小">－</button>
        <button onClick={resetView} title="回到全图">⤢</button>
      </div>
      <div className="amv-legend">
        {STATUS_CYCLE.map((k) => (
          <span key={k}><i style={{ background: FILL[k], borderColor: STROKE[k] }} />{STATUS_META[k].label}</span>
        ))}
      </div>

      {/* 悬停浮签 */}
      {tip && !sel && (
        <div className="amv-tip" style={{ left: Math.min(tip.x + 14, (wrapRef.current ? wrapRef.current.clientWidth - 240 : 600)), top: tip.y + 14 }}>
          <b>{tip.t.name}</b>
          <span style={{ color: FILL[tip.t.status] === FILL.todo ? 'var(--text-3)' : STROKE[tip.t.status] }}>{STATUS_META[tip.t.status].label}</span>
          <em>{tip.t.trackName}{tip.t.clusterName ? ' · ' + tip.t.clusterName : ''}</em>
          {tip.t.note && <p>{tip.t.note}</p>}
        </div>
      )}

      {/* 选中详情：落子改状态 / 记笔记 / 解锁问题 */}
      {sel && (
        <div className="amv-panel">
          <div className="amv-p-head">
            <div>
              <div className="amv-p-crumb">{sel.trackName}{sel.clusterName ? ' · ' + sel.clusterName : ''}</div>
              <div className="amv-p-name">{sel.name}</div>
            </div>
            <button className="amv-p-x" onClick={() => setSelId(null)}>×</button>
          </div>
          <div className="amv-p-status">
            {STATUS_CYCLE.map((k) => (
              <button key={k} className={sel.status === k ? 'on' : ''}
                style={sel.status === k ? { background: FILL[k], borderColor: STROKE[k], color: k === 'todo' ? 'var(--text-2)' : '#fff' } : {}}
                onClick={() => onSetStatus(sel, k)}>
                {STATUS_META[k].label}
              </button>
            ))}
          </div>
          <textarea className="amv-p-ta" rows={2} placeholder="一句话笔记：现在理解到哪一步"
            value={sel.note} onChange={(e) => onPatchTopic(sel, { note: e.target.value })} />
          {sel.status === 'fog' && (
            <textarea className="amv-p-ta amv-p-unlock" rows={2} placeholder="解锁问题：答出什么，雾才散？"
              value={sel.unlock} onChange={(e) => onPatchTopic(sel, { unlock: e.target.value })} />
          )}
        </div>
      )}
    </div>
  );
}

export const MAP_CSS = `
.amv-wrap{position:relative;border:1px solid var(--bd);border-radius:14px;overflow:hidden;height:560px;
  background:
    radial-gradient(circle at 1px 1px, rgba(38,36,31,.055) 1px, transparent 0) 0 0/22px 22px,
    linear-gradient(rgba(204,120,92,.025), transparent 50%),
    var(--surface-2,#FBFAF6);}
.amv-svg{width:100%;height:100%;display:block;cursor:grab;touch-action:none;}
.amv-svg:active{cursor:grabbing;}
.amv-plate{fill:var(--surface,#fff);stroke:var(--bd-2,#E3E0D7);stroke-width:1.2;}
.amv-plate.amv-unexplored{fill:color-mix(in srgb,var(--surface,#fff) 72%,transparent);stroke-dasharray:5 4;}
.amv-label{font-family:var(--serif);font-size:12.5px;fill:var(--text,#26241F);font-weight:600;user-select:none;}
.amv-label-sub{font-family:var(--sans);font-size:9.5px;fill:var(--text-3,#B0AFA5);font-weight:400;}
.amv-hex{cursor:pointer;transition:opacity .2s;}
.amv-hex:hover{filter:brightness(.93);}
.amv-ctrl{position:absolute;top:12px;right:12px;display:flex;flex-direction:column;gap:5px;}
.amv-ctrl button{width:30px;height:30px;border:1px solid var(--bd-2);background:var(--surface);border-radius:8px;
  cursor:pointer;font-size:15px;color:var(--text-2);line-height:1;box-shadow:0 2px 8px rgba(38,36,31,.08);transition:.15s;}
.amv-ctrl button:hover{color:var(--accent-2);border-color:var(--accent);}
.amv-legend{position:absolute;top:12px;left:14px;display:flex;gap:11px;font-size:10.5px;color:var(--text-2);
  background:color-mix(in srgb,var(--surface) 85%,transparent);border:1px solid var(--bd-soft);border-radius:999px;padding:4px 12px;backdrop-filter:blur(3px);}
.amv-legend span{display:inline-flex;align-items:center;gap:4px;}
.amv-legend i{width:9px;height:9px;border-radius:3px;border:1px solid;}
.amv-tip{position:absolute;z-index:4;max-width:230px;background:var(--surface);border:1px solid var(--bd-2);border-radius:10px;
  padding:8px 11px;box-shadow:0 8px 24px rgba(38,36,31,.14);pointer-events:none;font-size:11.5px;line-height:1.5;}
.amv-tip b{display:block;font-size:12px;color:var(--text);}
.amv-tip span{font-size:10px;font-weight:600;}
.amv-tip em{display:block;font-style:normal;font-size:10px;color:var(--text-3);margin-top:1px;}
.amv-tip p{color:var(--text-2);margin-top:4px;font-size:11px;}
.amv-panel{position:absolute;left:12px;right:12px;bottom:12px;z-index:5;background:var(--surface);border:1px solid var(--bd-2);
  border-radius:13px;padding:12px 14px;box-shadow:0 10px 30px rgba(38,36,31,.16);}
.amv-p-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;}
.amv-p-crumb{font-size:10px;color:var(--text-3);letter-spacing:.4px;}
.amv-p-name{font-weight:600;font-size:14px;margin-top:1px;}
.amv-p-x{border:none;background:none;font-size:18px;color:var(--text-3);cursor:pointer;line-height:1;padding:0 2px;}
.amv-p-x:hover{color:var(--text);}
.amv-p-status{display:flex;gap:6px;margin-top:9px;flex-wrap:wrap;}
.amv-p-status button{border:1px solid var(--bd-2);background:var(--surface-2);border-radius:999px;padding:4px 13px;
  font-size:11.5px;cursor:pointer;color:var(--text-2);transition:.15s;font-family:var(--sans);}
.amv-p-status button:hover{border-color:var(--accent);color:var(--accent-2);}
.amv-p-status button.on{font-weight:600;}
.amv-p-ta{width:100%;border:1px solid var(--bd);background:var(--surface-2);border-radius:8px;padding:6px 10px;
  font-size:11.5px;font-family:var(--sans);color:var(--text);margin-top:8px;resize:vertical;line-height:1.5;}
.amv-p-ta:focus{outline:none;border-color:var(--accent);}
.amv-p-unlock{border-color:color-mix(in srgb,#8E7CC3 40%,var(--bd));}
@media(max-width:640px){.amv-wrap{height:440px;}.amv-legend{display:none;}}
`;

/**
 * <StickyCanvas> — 便利贴白板：双击空白添加、拖拽移动、内联编辑、换色、删除。
 * 脑暴场景核心组件。用法：<StickyCanvas height={360} onChange={(notes)=>...} />
 * 拖拽几何用纯函数 ./util/board.js（可单测）。
 */
import React, { useRef, useState } from 'react';
import { clampNote, reorderToFront, cascadeXY } from './util/board.js';
import { useInjectedStyle } from './util/hooks.js';

const CSS = `
.muse-sticky{position:relative;border:1px solid #E5E1D8;border-radius:14px;overflow:hidden;background:#FBFAF6;
  background-image:radial-gradient(rgba(0,0,0,.06) 1px, transparent 1px);background-size:22px 22px;touch-action:none;}
.muse-sticky-hint{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#9B978C;font-size:13px;pointer-events:none;}
.muse-sticky-note{position:absolute;border-radius:10px;box-shadow:0 6px 16px rgba(40,36,30,.16);display:flex;flex-direction:column;overflow:hidden;}
.muse-sticky-bar{height:24px;display:flex;align-items:center;justify-content:flex-end;gap:5px;padding:0 6px;cursor:grab;background:rgba(0,0,0,.06);}
.muse-sticky-bar:active{cursor:grabbing;}
.muse-sticky-dot{width:13px;height:13px;border-radius:50%;border:1px solid rgba(0,0,0,.18);cursor:pointer;padding:0;}
.muse-sticky-x{border:none;background:none;cursor:pointer;font-size:13px;color:rgba(0,0,0,.45);line-height:1;padding:0 2px;}
.muse-sticky-ta{flex:1;border:none;background:transparent;resize:none;padding:8px;font-family:inherit;font-size:13px;line-height:1.4;color:#3a352c;outline:none;}
`;

const COLORS = ['#FDE68A', '#FCA5A5', '#A7F3D0', '#BFDBFE', '#DDD6FE', '#FBCFE8'];
const NOTE_W = 150;
const NOTE_H = 120;
let _nid = 0;

export default function StickyCanvas({ initialNotes, height = 360, colors = COLORS, onChange, className = '', style }) {
  useInjectedStyle('muse-sticky', CSS);
  const [notes, setNotes] = useState(() => initialNotes || []);
  const boardRef = useRef(null);
  const drag = useRef(null);

  const commit = (next) => {
    setNotes(next);
    if (onChange) onChange(next);
  };
  const bounds = () => ({ width: boardRef.current ? boardRef.current.clientWidth : 0, height });

  const addNote = (x, y) => {
    const raw = x == null ? cascadeXY(notes.length) : { x: x - NOTE_W / 2, y: y - 12 };
    const c = clampNote(raw.x, raw.y, NOTE_W, NOTE_H, bounds());
    commit([...notes, { id: 'n' + ++_nid, x: c.x, y: c.y, text: '', color: colors[notes.length % colors.length] }]);
  };
  const onDblClick = (e) => {
    if (e.target !== boardRef.current) return;
    const r = boardRef.current.getBoundingClientRect();
    addNote(e.clientX - r.left, e.clientY - r.top);
  };
  const setNote = (id, patch) => commit(notes.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  const removeNote = (id) => commit(notes.filter((n) => n.id !== id));
  const cycleColor = (n) => setNote(n.id, { color: colors[(colors.indexOf(n.color) + 1) % colors.length] });

  const onMove = (e) => {
    const d = drag.current;
    if (!d || !boardRef.current) return;
    const r = boardRef.current.getBoundingClientRect();
    const c = clampNote(e.clientX - r.left - d.dx, e.clientY - r.top - d.dy, NOTE_W, NOTE_H, bounds());
    setNotes((ns) => ns.map((x) => (x.id === d.id ? { ...x, x: c.x, y: c.y } : x)));
  };
  const endDrag = () => {
    drag.current = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', endDrag);
    setNotes((ns) => {
      if (onChange) onChange(ns);
      return ns;
    });
  };
  const startDrag = (e, n) => {
    e.preventDefault();
    commit(reorderToFront(notes, n.id));
    const r = boardRef.current.getBoundingClientRect();
    drag.current = { id: n.id, dx: e.clientX - r.left - n.x, dy: e.clientY - r.top - n.y };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', endDrag);
  };

  return (
    <div
      ref={boardRef}
      className={`muse-sticky ${className}`.trim()}
      style={{ height, ...style }}
      onDoubleClick={onDblClick}
    >
      {notes.length === 0 && <div className="muse-sticky-hint">双击空白处添加便利贴 · 拖动标题栏移动</div>}
      {notes.map((n, i) => (
        <div
          key={n.id}
          className="muse-sticky-note"
          style={{ left: n.x, top: n.y, width: NOTE_W, height: NOTE_H, background: n.color, zIndex: i + 1 }}
        >
          <div className="muse-sticky-bar" onPointerDown={(e) => startDrag(e, n)}>
            <button className="muse-sticky-dot" style={{ background: n.color }} title="换颜色" onClick={() => cycleColor(n)} />
            <button className="muse-sticky-x" title="删除" onClick={() => removeNote(n.id)}>✕</button>
          </div>
          <textarea
            className="muse-sticky-ta"
            value={n.text}
            placeholder="写点什么…"
            onChange={(e) => setNote(n.id, { text: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}

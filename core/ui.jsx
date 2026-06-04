/**
 * 共享 UI 基元：设计令牌 + 通用类名（前缀 gx-）+ 轻量 React 组件
 * ------------------------------------------------------------------
 * 日常核心模块（看板 / 日程 / 目标 / 习惯）共用一套视觉语言，避免各模块重复抄 CSS。
 * 风格遵循 DESIGN.md：暖纸色 + 陶土橙、留白分层、发丝边框、克制交互。
 *
 * 令牌作用在 .gx-root 上（独立页也能用）；在主应用里与根 :root 令牌一致，重复声明无害。
 */
import React from 'react';

export const SHARED_CSS = `
.gx-root{
  --bg:#F6F5F0;--surface:#FFFFFF;--surface-2:#FBFAF6;--surface-3:#F1EFE8;
  --text:#26241F;--text-2:#83827A;--text-3:#B0AFA5;
  --accent:#CC785C;--accent-2:#B5654A;--accent-soft:#F5ECE5;
  --bd:#ECEAE2;--bd-2:#E3E0D7;--bd-soft:#F0EEE7;
  --success:#6E9079;--success-soft:#E8EFE9;--danger:#BC6055;--danger-soft:#F7E7E3;--warn:#BE9356;
  --serif:'Tiempos Text',Georgia,'Songti SC','STSong','Source Han Serif SC','Noto Serif CJK SC',serif;
  --sans:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;
  font-family:var(--sans);color:var(--text);
}
.gx-root *{box-sizing:border-box;}

/* 模块头 */
.gx-head{margin-bottom:18px;}
.gx-head h2{font-family:var(--serif);font-size:23px;font-weight:500;letter-spacing:-.3px;display:flex;align-items:center;gap:10px;}
.gx-head p{color:var(--text-2);font-size:13px;margin-top:5px;}
.gx-headrow{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px;}
.gx-headrow .gx-head{margin-bottom:0;}

/* 卡片 / 面板 */
.gx-card{background:var(--surface);border:1px solid var(--bd);border-radius:14px;padding:18px;}
.gx-card+.gx-card{margin-top:14px;}
.gx-sechead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;}
.gx-sechead h3{font-family:var(--serif);font-size:16px;font-weight:500;letter-spacing:-.2px;display:flex;align-items:center;gap:8px;}
.gx-sechead .gx-sub{font-size:12px;color:var(--text-3);font-variant-numeric:tabular-nums;}

/* 分段切换 */
.gx-seg{display:inline-flex;gap:3px;background:var(--surface-2);padding:3px;border-radius:10px;border:1px solid var(--bd-soft);}
.gx-seg button{border:none;background:none;padding:6px 14px;border-radius:8px;font-size:13px;cursor:pointer;color:var(--text-2);font-family:var(--sans);transition:.15s;}
.gx-seg button:hover{color:var(--text);}
.gx-seg button.active{background:var(--surface);color:var(--accent-2);font-weight:500;box-shadow:0 1px 2px rgba(0,0,0,.04);}

/* 按钮 */
.gx-btn{padding:8px 15px;border:1px solid var(--bd);background:var(--surface);border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;transition:background .15s,border-color .15s,transform .1s;font-family:var(--sans);color:var(--text);}
.gx-btn:hover{border-color:var(--bd-2);background:var(--surface-2);}
.gx-btn:active{transform:translateY(1px);}
.gx-btn-primary{background:var(--accent);color:#fff;border-color:var(--accent);box-shadow:0 1px 2px rgba(204,120,92,.25);}
.gx-btn-primary:hover{background:var(--accent-2);border-color:var(--accent-2);}
.gx-btn-ghost{border-color:transparent;background:none;color:var(--text-3);padding:5px 9px;}
.gx-btn-ghost:hover{background:var(--surface-3);color:var(--text);}
.gx-btn-ghost.danger:hover{color:var(--danger);}
.gx-btn-sm{padding:5px 11px;font-size:12px;}

/* 输入 */
.gx-in{padding:9px 12px;background:var(--surface-2);border:1px solid var(--bd);border-radius:9px;font-size:13.5px;color:var(--text);font-family:var(--sans);transition:.15s;width:100%;}
.gx-in::placeholder{color:var(--text-3);}
.gx-in:focus{outline:none;background:var(--surface);border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft);}
.gx-inrow{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
.gx-date,.gx-time{flex:none;width:auto;}

/* 进度条 */
.gx-prog{height:7px;border-radius:999px;background:var(--surface-3);overflow:hidden;}
.gx-prog>span{display:block;height:100%;background:var(--accent);border-radius:999px;transition:width .3s ease;}
.gx-prog.good>span{background:var(--success);}

/* KPI 小卡 */
.gx-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;}
.gx-kpi{background:var(--surface-2);border:1px solid var(--bd-soft);border-radius:12px;padding:12px 14px;}
.gx-kpi-v{font-family:var(--serif);font-size:22px;font-weight:500;letter-spacing:-.3px;font-variant-numeric:tabular-nums;}
.gx-kpi-v.accent{color:var(--accent-2);}
.gx-kpi-v.good{color:var(--success);}
.gx-kpi-l{font-size:11.5px;color:var(--text-3);margin-top:2px;}

/* 列表项（可勾选） */
.gx-row{display:flex;align-items:center;gap:11px;padding:9px 11px;border:1px solid transparent;border-radius:10px;background:var(--surface-2);transition:background .15s,border-color .15s;animation:gxfade .2s ease;}
@keyframes gxfade{from{opacity:0;transform:translateY(-3px);}to{opacity:1;transform:translateY(0);}}
.gx-row:hover{background:var(--surface);border-color:var(--bd);}
.gx-row.done{opacity:.55;}
.gx-row.done .gx-row-title{text-decoration:line-through;color:var(--text-3);}
.gx-row-main{flex:1;min-width:0;}
.gx-row-title{font-size:13.5px;font-weight:500;letter-spacing:-.1px;overflow-wrap:anywhere;}
.gx-row-sub{font-size:11px;color:var(--text-3);margin-top:1px;font-variant-numeric:tabular-nums;display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
.gx-check{width:17px;height:17px;accent-color:var(--accent);cursor:pointer;flex:none;}
.gx-acts{display:flex;gap:2px;flex:none;}

/* 标签 / 徽标 */
.gx-tag{display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:1px 8px;border-radius:999px;background:var(--surface-3);color:var(--text-2);}
.gx-tag.accent{background:var(--accent-soft);color:var(--accent-2);}
.gx-tag.good{background:var(--success-soft);color:var(--success);}
.gx-tag.bad{background:var(--danger-soft);color:var(--danger);}

/* 空态 */
.gx-empty{text-align:center;padding:34px 18px;color:var(--text-3);}
.gx-empty .ic{font-size:30px;margin-bottom:8px;opacity:.6;}
.gx-empty .t{font-family:var(--serif);font-size:14px;color:var(--text-2);}

/* 免责声明 */
.gx-disclaim{font-size:11px;color:var(--text-3);line-height:1.6;margin-top:10px;}
`;

/** 进度条组件。pct 0–100；good=true 用绿色（如已达成）。 */
export function Progress({ pct, good }) {
  const w = Math.max(0, Math.min(100, Math.round(pct || 0)));
  return (
    <div className={`gx-prog${good ? ' good' : ''}`}>
      <span style={{ width: w + '%' }} />
    </div>
  );
}

/** 空状态。 */
export function Empty({ icon = '📭', title = '还没有内容', hint }) {
  return (
    <div className="gx-empty">
      <div className="ic">{icon}</div>
      <div className="t">{title}</div>
      {hint && <div style={{ fontSize: 12.5, marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

/**
 * 迷你趋势图（手写 SVG，无图表库）。
 * @param {number[]} values        历史值（实线）
 * @param {number[]} [projection]  预测值（虚线，从 values 末尾接续；首元素应与 values 末值一致或自动衔接）
 * @param {number} [goal]          目标值（虚线水平参考线）
 * @param {object} props           width/height/stroke/fill/goalColor
 */
export function Sparkline({ values = [], projection = [], goal, width = 132, height = 40, stroke = 'var(--accent)', fill = true, goalColor = 'var(--danger)' }) {
  const hist = values.filter((v) => isFinite(v));
  if (hist.length < 2) return <div style={{ height, display: 'flex', alignItems: 'center', fontSize: 10.5, color: 'var(--text-3)' }}>数据不足，记录后显示趋势</div>;
  const proj = (projection || []).filter((v) => isFinite(v));
  const all = goal != null && isFinite(goal) ? [...hist, ...proj, goal] : [...hist, ...proj];
  let min = Math.min(...all), max = Math.max(...all);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.12; min -= pad; max += pad;
  const total = hist.length + proj.length; // 时间轴总点数（proj 接在 hist 之后）
  const padX = 2, padY = 3;
  const x = (i) => padX + (i / (total - 1)) * (width - padX * 2);
  const y = (v) => padY + (1 - (v - min) / (max - min)) * (height - padY * 2);
  const histPts = hist.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const histPath = 'M' + histPts.join(' L');
  // 预测段：从 hist 末点接续
  let projPath = '';
  if (proj.length) {
    const startI = hist.length - 1;
    const pts = [`${x(startI).toFixed(1)},${y(hist[hist.length - 1]).toFixed(1)}`,
      ...proj.map((v, k) => `${x(hist.length + k).toFixed(1)},${y(v).toFixed(1)}`)];
    projPath = 'M' + pts.join(' L');
  }
  const areaPath = `${histPath} L${x(hist.length - 1).toFixed(1)},${(height - padY).toFixed(1)} L${x(0).toFixed(1)},${(height - padY).toFixed(1)} Z`;
  const gid = 'spk' + Math.random().toString(36).slice(2, 7);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
      {fill && (
        <>
          <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient></defs>
          <path d={areaPath} fill={`url(#${gid})`} stroke="none" />
        </>
      )}
      {goal != null && isFinite(goal) && (
        <line x1={padX} y1={y(goal)} x2={width - padX} y2={y(goal)} stroke={goalColor} strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
      )}
      <path d={histPath} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      {projPath && <path d={projPath} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="3 3" opacity="0.75" />}
      <circle cx={x(hist.length - 1)} cy={y(hist[hist.length - 1])} r="2.4" fill={stroke} />
      {proj.length > 0 && <circle cx={x(total - 1)} cy={y(proj[proj.length - 1])} r="2.2" fill={stroke} opacity="0.7" />}
    </svg>
  );
}

/** 迷你柱状图（手写，无图表库）。values:number[]；正负用不同色。 */
export function MiniBars({ values = [], height = 56, pos = 'var(--success)', neg = 'var(--danger)', single }) {
  const vals = values.map((v) => (isFinite(v) ? v : 0));
  if (!vals.length) return null;
  const maxAbs = Math.max(1, ...vals.map((v) => Math.abs(v)));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height }}>
      {vals.map((v, i) => {
        const h = Math.max(2, (Math.abs(v) / maxAbs) * 100);
        const color = single || (v >= 0 ? pos : neg);
        return <div key={i} style={{ flex: 1, height: h + '%', background: color, borderRadius: '3px 3px 0 0', minWidth: 2, transition: 'height .3s' }} title={String(v)} />;
      })}
    </div>
  );
}

/** 分段切换。tabs=[{id,label}]。 */
export function Segmented({ tabs, value, onChange }) {
  return (
    <div className="gx-seg">
      {tabs.map((t) => (
        <button key={t.id} className={value === t.id ? 'active' : ''} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

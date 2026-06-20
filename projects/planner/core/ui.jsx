/**
 * 共享 UI 基元：设计令牌 + 通用类名（前缀 gx-）+ 轻量 React 组件
 * ------------------------------------------------------------------
 * 日常核心模块（看板 / 日程 / 目标 / 习惯）共用一套视觉语言，避免各模块重复抄 CSS。
 * 风格遵循 DESIGN.md：暖纸色 + 陶土橙、留白分层、发丝边框、克制交互。
 *
 * 令牌作用在 .gx-root 上（独立页也能用）；在主应用里与根 :root 令牌一致，重复声明无害。
 */
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * 把全屏弹窗/遮罩传送到 document.body 渲染。
 * 侧栏是 position:sticky（自成层叠上下文），若 fixed 弹窗渲染在侧栏内部，
 * 其 zIndex 只在侧栏内部比较，会被主区 hover 卡片（z-index:1）盖住。
 * 凡全屏 overlay 一律经此传送，与触发按钮位置解耦。
 */
export function BodyPortal({ children }) {
  if (typeof document === 'undefined') return children;
  return createPortal(children, document.body);
}

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

/* 交互式折线图 tooltip */
.gx-lc-tip{position:absolute;top:-6px;transform:translate(-50%,-100%);background:#33302A;color:#fff;border-radius:8px;
  padding:4px 9px;font-size:11.5px;line-height:1.35;white-space:nowrap;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:0;box-shadow:0 2px 8px rgba(0,0,0,.16);z-index:5;}
.gx-lc-tip strong{font-variant-numeric:tabular-nums;font-weight:600;}
.gx-lc-tip span{font-size:10px;opacity:.75;}
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

/** 环形进度（手写 SVG，无图表库）；挂载时自动「描线」动画。 */
export function Ring({ pct = 0, size = 60, stroke = 'var(--accent)', width = 6, label, sub }) {
  const p = Math.max(0, Math.min(100, isFinite(pct) ? pct : 0));
  const r = (size - width) / 2;
  const c = 2 * Math.PI * r;
  const target = c * (1 - p / 100);
  const [off, setOff] = useState(c);
  useEffect(() => { const t = requestAnimationFrame(() => setOff(target)); return () => cancelAnimationFrame(t); }, [target]);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flex: 'none' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bd-2)" strokeWidth={width} opacity="0.5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)' }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" dy={sub ? '-0.35em' : '0'}
        fontSize={size * 0.27} fontFamily="var(--serif)" fontWeight="600" fill={stroke}
        style={{ fontVariantNumeric: 'tabular-nums' }}>{label != null ? label : Math.round(p) + '%'}</text>
      {sub && <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" dy="0.95em" fontSize={size * 0.15} fill="var(--text-3)">{sub}</text>}
    </svg>
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
export function Sparkline({ values = [], projection = [], band = null, goal, width = 132, height = 40, stroke = 'var(--accent)', fill = true, goalColor = 'var(--danger)' }) {
  const hist = values.filter((v) => isFinite(v));
  if (hist.length < 2) return <div style={{ height, display: 'flex', alignItems: 'center', fontSize: 10.5, color: 'var(--text-3)' }}>数据不足，记录后显示趋势</div>;
  const proj = band ? (band.mid || []).filter((v) => isFinite(v)) : (projection || []).filter((v) => isFinite(v));
  const bandVals = band ? [...(band.upper || []), ...(band.lower || []), ...(band.mid || [])] : [];
  const all = [...hist, ...proj, ...bandVals];
  if (goal != null && isFinite(goal)) all.push(goal);
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
  // 预测带（乐观↑ / 保守↓ 之间的扇形）
  let bandArea = '';
  if (band && (band.upper || []).length) {
    const h0 = hist.length - 1, v0 = hist[hist.length - 1];
    const up = [`${x(h0).toFixed(1)},${y(v0).toFixed(1)}`, ...band.upper.map((v, k) => `${x(hist.length + k).toFixed(1)},${y(v).toFixed(1)}`)];
    const lo = [...band.lower.map((v, k) => `${x(hist.length + k).toFixed(1)},${y(v).toFixed(1)}`).reverse(), `${x(h0).toFixed(1)},${y(v0).toFixed(1)}`];
    bandArea = 'M' + up.join(' L') + ' L' + lo.join(' L') + ' Z';
  }
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
      {bandArea && <path d={bandArea} fill={stroke} opacity="0.13" stroke="none" />}
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

/**
 * 交互式折线图（手写 SVG，无图表库）：支持历史线 + 预测虚线 / 扇形带 + 目标线，
 * 鼠标/手指悬停显示十字准星 + 数值气泡 tooltip。首页迷你卡与大盘复用同一组件。
 * @param {number[]} values        历史值（实线）
 * @param {number[]} [projection]  预测值（虚线，接续历史末点）
 * @param {{upper,mid,lower}} [band] 扇形预测带（阴影=upper~lower，虚线=mid）
 * @param {number} [goal]          目标参考线
 * @param {string[]} [labels]      每个点的标签（长度=历史+预测点数），tooltip 显示
 * @param {(v:number)=>string} [fmt] 数值格式化（tooltip 用）
 * @param {boolean} [interactive=true]
 */
export function LineChart({ values = [], projection = [], band = null, goal, labels = null, fmt, stroke = 'var(--accent)', height = 110, fill = true, goalColor = 'var(--danger)', interactive = true }) {
  const hist = values.filter((v) => isFinite(v));
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);
  if (hist.length < 2) return <div style={{ height, display: 'flex', alignItems: 'center', fontSize: 11, color: 'var(--text-3)' }}>数据不足，记录后显示趋势</div>;

  const mid = band ? (band.mid || []).filter((v) => isFinite(v)) : (projection || []).filter((v) => isFinite(v));
  const future = mid; // 接在历史之后的「主线」未来段
  const bandVals = band ? [...(band.upper || []), ...(band.lower || []), ...mid] : [];
  const all = [...hist, ...future, ...bandVals];
  if (goal != null && isFinite(goal)) all.push(goal);
  let min = Math.min(...all), max = Math.max(...all);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.12; min -= pad; max += pad;
  const total = hist.length + future.length;
  const W = 600, padX = 4, padT = 8, padB = 8;
  const x = (i) => padX + (i / (total - 1)) * (W - padX * 2);
  const y = (v) => padT + (1 - (v - min) / (max - min)) * (height - padT - padB);
  const mainAt = (i) => (i < hist.length ? hist[i] : future[i - hist.length]);

  const histPath = hist.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  let projPath = '';
  if (future.length) {
    const pts = [`${x(hist.length - 1).toFixed(1)},${y(hist[hist.length - 1]).toFixed(1)}`,
      ...future.map((v, k) => `${x(hist.length + k).toFixed(1)},${y(v).toFixed(1)}`)];
    projPath = 'M' + pts.join(' L');
  }
  const areaPath = `${histPath} L${x(hist.length - 1).toFixed(1)},${(height - padB).toFixed(1)} L${x(0).toFixed(1)},${(height - padB).toFixed(1)} Z`;
  let bandArea = '';
  if (band && (band.upper || []).length) {
    const h0 = hist.length - 1, v0 = hist[hist.length - 1];
    const up = [`${x(h0).toFixed(1)},${y(v0).toFixed(1)}`, ...band.upper.map((v, k) => `${x(hist.length + k).toFixed(1)},${y(v).toFixed(1)}`)];
    const lo = [...band.lower.map((v, k) => `${x(hist.length + k).toFixed(1)},${y(v).toFixed(1)}`).reverse(), `${x(h0).toFixed(1)},${y(v0).toFixed(1)}`];
    bandArea = 'M' + up.join(' L') + ' L' + lo.join(' L') + ' Z';
  }
  const gid = 'lc' + Math.random().toString(36).slice(2, 7);

  const onMove = (e) => {
    if (!interactive || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const frac = Math.max(0, Math.min(1, cx / rect.width));
    setHover(Math.round(frac * (total - 1)));
  };
  const fmtV = (v) => (fmt ? fmt(v) : (Math.round(v * 100) / 100).toLocaleString('zh-CN'));
  const hv = hover != null ? mainAt(hover) : null;

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}
      onMouseMove={onMove} onMouseLeave={() => setHover(null)} onTouchStart={onMove} onTouchMove={onMove} onTouchEnd={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
        {bandArea && <path d={bandArea} fill={stroke} opacity="0.13" />}
        {fill && (
          <>
            <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.18" /><stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient></defs>
            <path d={areaPath} fill={`url(#${gid})`} />
          </>
        )}
        {goal != null && isFinite(goal) && <line x1={padX} y1={y(goal)} x2={W - padX} y2={y(goal)} stroke={goalColor} strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />}
        <path d={histPath} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {projPath && <path d={projPath} fill="none" stroke={stroke} strokeWidth="1.6" strokeDasharray="3 3" opacity="0.75" />}
        <circle cx={x(hist.length - 1)} cy={y(hist[hist.length - 1])} r="2.6" fill={stroke} />
        {hover != null && (
          <>
            <line x1={x(hover)} y1={padT} x2={x(hover)} y2={height - padB} stroke="var(--text-3)" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
            <circle cx={x(hover)} cy={y(hv)} r="3.6" fill={stroke} stroke="#fff" strokeWidth="1.2" />
          </>
        )}
      </svg>
      {hover != null && (
        <div className="gx-lc-tip" style={{ left: `${(hover / (total - 1)) * 100}%` }}>
          <strong>{fmtV(hv)}</strong>
          {labels && labels[hover] ? <span>{labels[hover]}</span> : (hover >= hist.length ? <span>预测</span> : null)}
        </div>
      )}
    </div>
  );
}

/** 迷你柱状图（手写，无图表库）。values:number[]；正负用不同色；悬停高亮 + 数值气泡。 */
export function MiniBars({ values = [], height = 56, pos = 'var(--success)', neg = 'var(--danger)', single, labels = null, fmt, interactive = true }) {
  const vals = values.map((v) => (isFinite(v) ? v : 0));
  const [hover, setHover] = useState(null);
  if (!vals.length) return null;
  const maxAbs = Math.max(1, ...vals.map((v) => Math.abs(v)));
  const fmtV = (v) => (fmt ? fmt(v) : (Math.round(v * 100) / 100).toLocaleString('zh-CN'));
  return (
    <div style={{ position: 'relative', width: '100%' }} onMouseLeave={() => setHover(null)}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height }}>
        {vals.map((v, i) => {
          const h = Math.max(2, (Math.abs(v) / maxAbs) * 100);
          const color = single || (v >= 0 ? pos : neg);
          const dim = hover != null && hover !== i;
          return (
            <div key={i} onMouseEnter={interactive ? () => setHover(i) : undefined}
              style={{ flex: 1, height: h + '%', background: color, borderRadius: '3px 3px 0 0', minWidth: 2,
                transition: 'height .3s,opacity .15s', opacity: dim ? 0.35 : 1, cursor: interactive ? 'pointer' : 'default' }} />
          );
        })}
      </div>
      {hover != null && (
        <div className="gx-lc-tip" style={{ left: `${((hover + 0.5) / vals.length) * 100}%`, top: -2 }}>
          <strong>{fmtV(vals[hover])}</strong>
          {labels && labels[hover] ? <span>{labels[hover]}</span> : null}
        </div>
      )}
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

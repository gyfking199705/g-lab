/**
 * 影响力 × 落地成本 四象限散点图（手写 SVG，不引图表库）。
 * X 轴：落地成本（左低右高）；Y 轴：影响力（下低上高）。
 * 左上象限 =「高影响 · 低成本」= 优先采用。
 */
import React from 'react';
import { LEVEL } from '../data/systems.js';

const W = 560, H = 380, PAD = 48;

function pos(level) { return (LEVEL[level] && LEVEL[level].order) || 2; } // 1..3

// 把 1..3 映射到坐标轴像素（留边距）
function xOf(effort) {
  const t = (pos(effort) - 1) / 2; // 0..1
  return PAD + t * (W - PAD * 2);
}
function yOf(impact) {
  const t = (pos(impact) - 1) / 2; // 0..1
  return (H - PAD) - t * (H - PAD * 2);
}

// 把同坐标的点做微小散开，避免完全重叠
function jitter(items) {
  const buckets = new Map();
  return items.map((it) => {
    const key = `${it.impact}|${it.effort}`;
    const n = buckets.get(key) || 0;
    buckets.set(key, n + 1);
    const angle = n * 2.399; // 黄金角，螺旋散开
    const r = n === 0 ? 0 : 7 + n * 3.5;
    return { it, dx: Math.cos(angle) * r, dy: Math.sin(angle) * r };
  });
}

const CAT_COLOR = {
  paradigm: '#CC785C', server: '#7C8AAE', python: '#6E9079',
  technique: '#BE9356', guardrail: '#BC6055',
};
const LABEL = { paradigm: '范式', server: 'Mock 服务', python: 'Python 接入', technique: '提效技巧', guardrail: '质量护栏' };

export default function MatrixChart({ items, onPick, activeId }) {
  const pts = jitter(items);
  return (
    <div className="mkl-matrix">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="影响力与落地成本四象限图">
        {/* 象限淡底：左上高亮（高影响低成本） */}
        <rect x={PAD} y={PAD} width={(W - PAD * 2) / 2} height={(H - PAD * 2) / 2}
          fill="#F5ECE5" opacity="0.7" />
        {/* 网格中线 */}
        <line x1={(PAD + (W - PAD)) / 2} y1={PAD} x2={(PAD + (W - PAD)) / 2} y2={H - PAD} stroke="#ECEAE2" />
        <line x1={PAD} y1={(PAD + (H - PAD)) / 2} x2={W - PAD} y2={(PAD + (H - PAD)) / 2} stroke="#ECEAE2" />
        {/* 外框 */}
        <rect x={PAD} y={PAD} width={W - PAD * 2} height={H - PAD * 2} fill="none" stroke="#ECEAE2" />

        {/* 轴标签 */}
        <text x={PAD} y={PAD - 16} className="mkl-mx-quad">⬑ 高影响 · 低成本（优先采用）</text>
        <text x={W - PAD} y={H - PAD + 30} className="mkl-mx-axis" textAnchor="end">落地成本 →</text>
        <text x={PAD - 16} y={PAD - 2} className="mkl-mx-axis" transform={`rotate(-90 ${PAD - 16} ${PAD - 2})`}>影响力 →</text>
        <text x={PAD} y={H - PAD + 18} className="mkl-mx-tick">低</text>
        <text x={W - PAD} y={H - PAD + 18} className="mkl-mx-tick" textAnchor="end">高</text>
        <text x={PAD - 12} y={H - PAD} className="mkl-mx-tick" textAnchor="end">低</text>
        <text x={PAD - 12} y={PAD + 6} className="mkl-mx-tick" textAnchor="end">高</text>

        {/* 散点 */}
        {pts.map(({ it, dx, dy }) => {
          const cx = xOf(it.effort) + dx;
          const cy = yOf(it.impact) + dy;
          const active = it.id === activeId;
          return (
            <g key={it.id} className="mkl-mx-pt" onClick={() => onPick && onPick(it)}>
              <circle cx={cx} cy={cy} r={active ? 9 : 6}
                fill={CAT_COLOR[it.category] || '#CC785C'}
                stroke="#FFFFFF" strokeWidth={active ? 2.5 : 1.5}
                opacity={active ? 1 : 0.88} />
              <title>{`${it.title}\n影响力：${it.impact} · 落地成本：${it.effort}`}</title>
            </g>
          );
        })}
      </svg>
      <div className="mkl-mx-legend">
        {Object.entries(CAT_COLOR).map(([k, c]) => (
          <span key={k} className="mkl-mx-leg"><i style={{ background: c }} />{LABEL[k]}</span>
        ))}
        <span className="mkl-mx-hint">点击圆点查看详情</span>
      </div>
    </div>
  );
}

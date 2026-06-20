/**
 * 总览图：类别 × 成熟度 的水平堆叠条（手写 SVG，不引图表库）。
 * 每行一个类别，分段按成熟度（萌芽/成长/成熟）着色；右侧标总数。
 */
import React from 'react';
import { CATEGORIES, MATURITY } from '../data/practices.js';
import { maturityMatrix } from './filter.js';

const MAT_KEYS = ['emerging', 'growing', 'established'];
const MAT_COLOR = { emerging: '#E4C5B4', growing: '#D8956F', established: '#B5654A' };
const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, `${c.icon} ${c.label}`]));

const W = 560, ROW_H = 38, GAP = 14, LABEL_W = 104, NUM_W = 34, PAD = 8;

export default function OverviewChart({ items, onPickCategory, activeCats }) {
  const catIds = CATEGORIES.map((c) => c.id);
  const { rows, maxRowTotal } = maturityMatrix(items, catIds, MAT_KEYS);
  const barMax = W - LABEL_W - NUM_W - PAD * 2;
  const H = PAD * 2 + rows.length * ROW_H + (rows.length - 1) * GAP + 26;
  const scale = maxRowTotal ? barMax / maxRowTotal : 0;

  return (
    <div className="acl-ov">
      <div className="acl-ov-title">类别 × 成熟度分布<span>（点击行可按类别筛选）</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="各类别按成熟度的条形分布图">
        {rows.map((row, ri) => {
          const y = PAD + ri * (ROW_H + GAP);
          let x = LABEL_W + PAD;
          const on = activeCats && activeCats.includes(row.category);
          return (
            <g key={row.category} className="acl-ov-row" onClick={() => onPickCategory && onPickCategory(row.category)}>
              <text x={PAD} y={y + ROW_H / 2} className={`acl-ov-lbl${on ? ' on' : ''}`} dominantBaseline="middle">
                {CAT_LABEL[row.category]}
              </text>
              {/* 底槽 */}
              <rect x={LABEL_W + PAD} y={y + 6} width={barMax} height={ROW_H - 12} rx="5" fill="#F1EFE8" />
              {row.cells.map((cell) => {
                const w = cell.count * scale;
                const seg = (
                  <g key={cell.maturity}>
                    {w > 0 && (
                      <rect x={x} y={y + 6} width={w} height={ROW_H - 12} fill={MAT_COLOR[cell.maturity]}>
                        <title>{`${CAT_LABEL[row.category]} · ${MATURITY[cell.maturity].label}：${cell.count}`}</title>
                      </rect>
                    )}
                    {w > 22 && (
                      <text x={x + w / 2} y={y + ROW_H / 2} className="acl-ov-seg" textAnchor="middle" dominantBaseline="middle">
                        {cell.count}
                      </text>
                    )}
                  </g>
                );
                x += w;
                return seg;
              })}
              <text x={W - PAD} y={y + ROW_H / 2} className="acl-ov-num" textAnchor="end" dominantBaseline="middle">
                {row.total}
              </text>
            </g>
          );
        })}
        {/* 图例 */}
        <g transform={`translate(${LABEL_W + PAD}, ${H - 8})`}>
          {MAT_KEYS.map((k, i) => (
            <g key={k} transform={`translate(${i * 96}, 0)`}>
              <rect x="0" y="-9" width="11" height="11" rx="2" fill={MAT_COLOR[k]} />
              <text x="16" y="0" className="acl-ov-leg">{MATURITY[k].label}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

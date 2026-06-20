/**
 * 团队画像视图：手写 SVG 雷达图（按 8 类别的落地率）+ 一键生成《团队提效报告》。
 * 两个序列：已落地%（实心陶土）与 含进行中%（浅琥珀），叠出「在做但没落地」的差。
 */
import React, { useState } from 'react';
import { PRACTICES } from './data.js';
import { categoryRadar, teamReportMarkdown, adoptionStats } from './calc.js';

const SIZE = 320;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 104;

function angle(i, n) {
  return -Math.PI / 2 + (i * 2 * Math.PI) / n;
}
function point(i, n, ratio) {
  const a = angle(i, n);
  return [CX + Math.cos(a) * R * ratio, CY + Math.sin(a) * R * ratio];
}
function polygon(data, key, n) {
  return data
    .map((d, i) => point(i, n, (d[key] || 0) / 100).map((v) => v.toFixed(1)).join(','))
    .join(' ');
}

function Radar({ data }) {
  const n = data.length;
  const rings = [0.25, 0.5, 0.75, 1];
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="团队能力雷达图">
      {/* 同心环 */}
      {rings.map((r) => (
        <polygon
          key={r}
          points={data.map((_, i) => point(i, n, r).map((v) => v.toFixed(1)).join(',')).join(' ')}
          fill="none"
          stroke="#ECEAE2"
          strokeWidth="1"
        />
      ))}
      {/* 轴线 */}
      {data.map((_, i) => {
        const [x, y] = point(i, n, 1);
        return <line key={i} x1={CX} y1={CY} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke="#ECEAE2" strokeWidth="1" />;
      })}
      {/* 含进行中%（浅琥珀） */}
      <polygon points={polygon(data, 'activePct', n)} fill="rgba(190,147,86,.18)" stroke="#BE9356" strokeWidth="1.5" strokeDasharray="3 3" />
      {/* 已落地%（实心陶土） */}
      <polygon points={polygon(data, 'donePct', n)} fill="rgba(204,120,92,.22)" stroke="#CC785C" strokeWidth="2" />
      {data.map((d, i) => {
        const [dx, dy] = point(i, n, (d.donePct || 0) / 100);
        return <circle key={i} cx={dx.toFixed(1)} cy={dy.toFixed(1)} r="2.5" fill="#CC785C" />;
      })}
      {/* 轴标签 */}
      {data.map((d, i) => {
        const [lx, ly] = point(i, n, 1.22);
        const a = angle(i, n);
        const anchor = Math.abs(Math.cos(a)) < 0.3 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end';
        return (
          <text key={i} x={lx.toFixed(1)} y={ly.toFixed(1)} textAnchor={anchor} dominantBaseline="middle"
            fontSize="10.5" fill="#83827A" fontFamily="ui-sans-serif,system-ui,'PingFang SC',sans-serif">
            {d.icon}{d.name}
          </text>
        );
      })}
    </svg>
  );
}

/** 进度趋势折线：落地率（陶土实线）+ DORA 评分（绿色虚线），同 0–100 刻度。 */
function Trend({ snaps }) {
  const W = 560, H = 170, padL = 30, padR = 14, padT = 14, padB = 24;
  const n = snaps.length;
  const x = (i) => padL + (n <= 1 ? 0 : (i * (W - padL - padR)) / (n - 1));
  const y = (v) => padT + (1 - v / 100) * (H - padT - padB);
  const line = (key) => snaps.map((s, i) => `${x(i).toFixed(1)},${y(s[key] || 0).toFixed(1)}`).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="进度趋势" style={{ maxWidth: W }}>
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={padL} y1={y(g)} x2={W - padR} y2={y(g)} stroke="#ECEAE2" strokeWidth="1" />
          <text x={padL - 5} y={y(g) + 3} textAnchor="end" fontSize="9" fill="#B0AFA5">{g}</text>
        </g>
      ))}
      <polyline points={line('score')} fill="none" stroke="#6E9079" strokeWidth="1.6" strokeDasharray="4 3" />
      <polyline points={line('percent')} fill="none" stroke="#CC785C" strokeWidth="2" />
      {snaps.map((s, i) => (
        <circle key={i} cx={x(i).toFixed(1)} cy={y(s.percent).toFixed(1)} r="2.6" fill="#CC785C" />
      ))}
      {n > 0 && (
        <>
          <text x={x(0).toFixed(1)} y={H - 8} textAnchor="start" fontSize="9" fill="#B0AFA5">{snaps[0].date}</text>
          {n > 1 && (
            <text x={x(n - 1).toFixed(1)} y={H - 8} textAnchor="end" fontSize="9" fill="#B0AFA5">{snaps[n - 1].date}</text>
          )}
        </>
      )}
    </svg>
  );
}

export default function Profile({ bands, statuses, snaps = [], onSnapshot }) {
  const radar = categoryRadar(PRACTICES, statuses);
  const adopt = adoptionStats(PRACTICES, statuses);
  const [copied, setCopied] = useState(false);

  async function copyReport() {
    const md = teamReportMarkdown({ bands, statuses });
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('复制下面的报告 Markdown：', md);
    }
  }

  function downloadReport() {
    const md = teamReportMarkdown({ bands, statuses });
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-devx-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const last = snaps[snaps.length - 1];
  const prev = snaps[snaps.length - 2];
  const delta = last && prev ? last.percent - prev.percent : null;

  return (
    <div className="dx-profile">
      <section className="dx-pf-card">
        <div className="dx-pf-radar">
          <Radar data={radar} />
          <div className="dx-pf-legend">
            <span><i className="sw done" />已落地%</span>
            <span><i className="sw active" />含进行中%</span>
          </div>
        </div>
        <div className="dx-pf-side">
          <h2 className="dx-pf-h">团队能力画像</h2>
          <p className="dx-pf-sub">
            按 8 个能力类别的范式落地率画出团队画像——外圈越满代表该条线越成熟。
            总体落地率 <b>{adopt.percent}%</b>（{adopt.done}/{adopt.total}）。
          </p>
          <div className="dx-pf-list">
            {[...radar].sort((a, b) => b.donePct - a.donePct).map((c) => (
              <div className="dx-pf-row" key={c.id}>
                <span className="nm">{c.icon} {c.name}</span>
                <span className="bar"><i style={{ width: c.donePct + '%' }} /></span>
                <span className="pct">{c.donePct}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dx-pf-report">
        <div>
          <h2 className="dx-pf-h">一键《团队研发提效报告》</h2>
          <p className="dx-pf-sub">
            聚合 DORA 评级、采纳总览、能力画像、框架覆盖度与优先处方，导出为 Markdown，
            可直接贴进周报/文档或分享给管理层。
          </p>
        </div>
        <div className="dx-pf-actions">
          <button className="dx-copy" onClick={copyReport}>{copied ? '✓ 已复制' : '复制报告'}</button>
          <button className="dx-copy" onClick={downloadReport}>下载 .md</button>
        </div>
      </section>

      <section className="dx-pf-trend">
        <div className="dx-pf-trend-h">
          <div>
            <h2 className="dx-pf-h" style={{ marginBottom: 4 }}>进度趋势</h2>
            <p className="dx-pf-sub" style={{ margin: 0 }}>
              定期保存快照，看落地率与 DORA 评分随时间的变化——让持续改进看得见。
            </p>
          </div>
          <button className="dx-copy" onClick={onSnapshot}>保存今日快照</button>
        </div>

        {snaps.length >= 2 ? (
          <>
            <div className="dx-pf-trend-legend">
              <span><i className="sw" style={{ background: '#CC785C' }} />落地率</span>
              <span><i className="sw" style={{ borderTop: '2px dashed #6E9079', background: 'none', height: 0 }} />DORA 评分</span>
              {delta != null && (
                <span className="delta" style={{ color: delta >= 0 ? 'var(--ok)' : 'var(--danger)' }}>
                  较上次落地率 {delta >= 0 ? '+' : ''}{delta}%
                </span>
              )}
            </div>
            <Trend snaps={snaps} />
          </>
        ) : (
          <div className="dx-pf-sub" style={{ marginTop: 4 }}>
            已保存 {snaps.length} 个快照——再存至少 {2 - snaps.length} 个（如每周一次）即可看到趋势线。
          </div>
        )}
      </section>
    </div>
  );
}

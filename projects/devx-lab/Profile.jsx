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

export default function Profile({ bands, statuses }) {
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
    </div>
  );
}

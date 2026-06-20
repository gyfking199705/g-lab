/**
 * DORA 自评视图：四项指标各选一档 → 综合评级（Elite/High/Medium/Low）+ 手写 SVG 仪表盘。
 * 口径取自业界 State of DevOps 通用分级，仅供团队自我对标，非个人考核。
 */
import React from 'react';
import { DORA_METRICS, DORA_LEVELS } from './data.js';
import { classifyDora } from './calc.js';

const LV_KEYS = ['Elite', 'High', 'Medium', 'Low'];

/** 半圆仪表盘：score 0..100 映射到 180° 弧，指针 + 当前等级。 */
function Gauge({ score, color }) {
  const W = 200, H = 120, cx = W / 2, cy = H - 8, r = 84;
  const angle = Math.PI * (1 - score / 100); // 100→0(右), 0→π(左)
  const px = cx + r * Math.cos(angle);
  const py = cy - r * Math.sin(angle);
  // 背景弧四段（Low→Elite 从左到右），与档位色一致
  const segs = [...DORA_LEVELS].reverse(); // Low, Medium, High, Elite
  const arc = (a0, a1) => {
    const x0 = cx + r * Math.cos(a0), y0 = cy - r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy - r * Math.sin(a1);
    return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  };
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`DORA 评分 ${score}`}>
      {segs.map((lv, i) => {
        const a0 = Math.PI - (Math.PI * i) / 4;
        const a1 = Math.PI - (Math.PI * (i + 1)) / 4;
        return (
          <path key={lv.name} d={arc(a0, a1)} stroke={lv.color} strokeWidth="11"
            fill="none" strokeLinecap="butt" opacity="0.9" />
        );
      })}
      <line x1={cx} y1={cy} x2={px.toFixed(1)} y2={py.toFixed(1)} stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill={color} />
      <text x={cx} y={cy - 26} textAnchor="middle" fontFamily="'Tiempos Text',Georgia,serif"
        fontSize="30" fontWeight="600" fill="#26241F">{score}</text>
    </svg>
  );
}

export default function Assessment({ bands, onSet }) {
  const result = classifyDora(bands);
  const answered = DORA_METRICS.filter((m) => bands[m.key] != null).length;

  return (
    <div className="dx-assess">
      <p className="intro">
        用业界 <a href="https://dora.dev/" target="_blank" rel="noreferrer noopener">DORA</a> 四项指标给团队做一次自评：
        每项选一个最贴近现状的档位，下面即时算出综合评级。结果只存在你本地浏览器，用于团队对标与找改进点，
        <b>不适合用来考核个人</b>。
      </p>

      {DORA_METRICS.map((m) => (
        <div className="dx-metric" key={m.key}>
          <div className="mh">
            <span className="mn">{m.name}</span>
            <span className="mhint">{m.hint}</span>
          </div>
          <div className="dx-levels">
            {m.levels.map((lab, idx) => (
              <button
                key={idx}
                className="dx-lv"
                aria-pressed={bands[m.key] === idx}
                onClick={() => onSet(m.key, bands[m.key] === idx ? null : idx)}
              >
                <span className="lvk" style={{ color: DORA_LEVELS[idx].color }}>{LV_KEYS[idx]}</span>
                <span className="lvv">{lab}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="dx-result">
        <Gauge score={result.score} color={result.level.color} />
        <div>
          <div className="dx-gauge-cap" style={{ color: result.level.color }}>
            {result.level.name} · {result.level.cn}
          </div>
          <div className="dx-gauge-sub">
            {answered < DORA_METRICS.length
              ? `已评 ${answered}/4 项；未评项暂按最弱档计入，补全后更准。`
              : result.level.desc}
          </div>
          <div className="dx-pm">
            {result.perMetric.map((pm) => (
              <span key={pm.key} className="tag" style={{ background: pm.level.color }}>
                {pm.name}：{pm.level.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { lintPrompt } from '../lint.js';

const TONE = { ok: 'var(--ok)', warn: 'var(--warn)', danger: 'var(--danger)' };

/** 手写 SVG 评分环。 */
function ScoreRing({ score, color }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const off = c * (1 - score / 100);
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" style={{ flex: '0 0 auto' }}>
      <circle cx="34" cy="34" r={r} fill="none" stroke="var(--fill)" strokeWidth="6" />
      <circle
        cx="34"
        cy="34"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform="rotate(-90 34 34)"
        style={{ transition: 'stroke-dashoffset .3s' }}
      />
      <text x="34" y="34" textAnchor="middle" dominantBaseline="central" fontFamily="var(--serif)" fontSize="19" fontWeight="600" fill="var(--t1)">
        {score}
      </text>
    </svg>
  );
}

/** 质量体检面板：评分环 + 逐项清单（未通过项给出建议，可点击跳到编辑器修复）。 */
export default function LintPanel({ prompt, onFix }) {
  const r = lintPrompt(prompt);
  const color = TONE[r.grade.tone];
  return (
    <div className="pl-block">
      <h5>质量体检{onFix && r.passed < r.total ? <span style={{ color: 'var(--t3)', fontWeight: 400 }}>点未达标项去修复 →</span> : null}</h5>
      <div className="pl-lint">
        <div className="pl-lint-top">
          <ScoreRing score={r.score} color={color} />
          <div>
            <div className="pl-lint-grade" style={{ color }}>
              {r.grade.key} · {r.grade.label}
            </div>
            <div className="pl-lint-sub">
              通过 {r.passed}/{r.total} 项业界最佳实践
            </div>
          </div>
        </div>
        <ul className="pl-lint-list">
          {r.checks.map((c) => {
            const clickable = !c.pass && onFix;
            return (
              <li
                key={c.id}
                className={(c.pass ? 'pl-ck-on' : 'pl-ck-off') + (clickable ? ' pl-ck-fix' : '')}
                onClick={clickable ? () => onFix(c.field) : undefined}
                title={clickable ? '点击去编辑器修复' : undefined}
              >
                <span className="pl-ck-mark">{c.pass ? '✓' : '!'}</span>
                <span className="pl-ck-body">
                  <span className="pl-ck-label">{c.label}{clickable ? ' →' : ''}</span>
                  {!c.pass ? <span className="pl-ck-tip">{c.tip}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

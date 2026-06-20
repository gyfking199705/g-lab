import React, { useState } from 'react';
import { diffLines, diffStat } from '../diff.js';

function fmt(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString('zh-CN', { hour12: false });
  } catch (e) {
    return '';
  }
}

/** 把当前正文与某历史快照做行级对比，渲染彩色 diff。 */
function DiffView({ from, to }) {
  const rows = diffLines(from, to);
  const stat = diffStat(rows);
  return (
    <div className="pl-block">
      <h5>
        对比（旧 → 当前）
        <span style={{ color: 'var(--t3)', fontWeight: 400 }}>
          <span style={{ color: 'var(--ok)' }}>+{stat.add}</span>{' '}
          <span style={{ color: 'var(--danger)' }}>−{stat.del}</span>
        </span>
      </h5>
      <div className="pl-diff">
        {rows.map((r, i) => (
          <div key={i} className={'pl-diff-row pl-diff-' + r.type}>
            <span className="pl-diff-gut">{r.type === 'add' ? '+' : r.type === 'del' ? '−' : ' '}</span>
            <span className="pl-diff-txt">{r.text || ' '}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 版本历史：列出快照，可展开对比、可恢复。 */
export default function HistoryPanel({ prompt, onRestore }) {
  const [openIdx, setOpenIdx] = useState(-1);
  const history = prompt.history || [];
  if (!history.length) return null;

  return (
    <div className="pl-block">
      <h5>版本历史（{history.length}）</h5>
      <div className="pl-hist">
        {history.map((h, i) => (
          <div key={i} className="pl-hist-item">
            <div className="pl-hist-head">
              <span>
                <b>{h.version || '未标版本'}</b>
                <span className="pl-hist-time">{fmt(h.savedAt)}</span>
              </span>
              <span style={{ display: 'flex', gap: 4 }}>
                <button
                  className="pl-btn pl-btn-sm pl-ghost"
                  onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
                >
                  {openIdx === i ? '收起' : '对比'}
                </button>
                <button
                  className="pl-btn pl-btn-sm pl-ghost"
                  onClick={() => onRestore(prompt.id, h)}
                  title="把这一版的正文/角色写回为当前"
                >
                  恢复
                </button>
              </span>
            </div>
            {openIdx === i ? <DiffView from={h.content} to={prompt.content} /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

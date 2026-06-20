/**
 * 反模式库视图：列出业界公认的「效能杀手」，每个给症状 / 危害，
 * 并把「解药」链到范式库对应条目（正反对照）。
 */
import React from 'react';
import { ANTIPATTERNS, PRACTICES, CATEGORIES } from './data.js';

const P_MAP = Object.fromEntries(PRACTICES.map((p) => [p.id, p]));
const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export default function AntiPatterns({ onGoto }) {
  return (
    <div className="dx-ap">
      <p className="dx-ap-intro">
        与范式库相对的一面：业界公认的<b>效能杀手</b>。识别它们往往比堆新工具更省力——
        每个反模式都给出症状、危害，以及可以「对症下药」的范式（点击跳到范式库）。
      </p>
      <div className="dx-ap-grid">
        {ANTIPATTERNS.map((a) => (
          <article className="dx-ap-card" key={a.id}>
            <h3 className="dx-ap-name">⚠️ {a.name}</h3>
            <div className="dx-ap-block">
              <span className="lab">症状</span>
              <p>{a.symptom}</p>
            </div>
            <div className="dx-ap-block">
              <span className="lab">危害</span>
              <p>{a.why}</p>
            </div>
            <div className="dx-ap-anti">
              <span className="lab">解药</span>
              <div className="chips">
                {a.antidotes.map((id) => {
                  const p = P_MAP[id];
                  if (!p) return null;
                  return (
                    <button key={id} className="dx-ap-chip" onClick={() => onGoto(id)} title="去范式库查看">
                      {CAT_MAP[p.category]?.icon} {p.title}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="dx-ap-src">
              <a href={a.source.url} target="_blank" rel="noreferrer noopener">{a.source.label} ↗</a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

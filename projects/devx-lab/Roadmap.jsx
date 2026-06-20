/**
 * 落地路线视图：把「自评诊断 + 范式库」变成有先后的行动计划。
 *   处方区 —— 针对 DORA 自评里的薄弱指标，推荐能提升它、且尚未落地的范式。
 *   路线区 —— 按 requires 前置关系拓扑分批，给出建议落地顺序，标注已落地与依赖。
 */
import React from 'react';
import { PRACTICES, CATEGORIES, ADOPTION_STATUS } from './data.js';
import { prescribe, topoOrder, statusOf, roi } from './calc.js';

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
const P_MAP = Object.fromEntries(PRACTICES.map((p) => [p.id, p]));
const ST_MAP = Object.fromEntries(ADOPTION_STATUS.map((s) => [s.id, s]));

function MiniItem({ p, statuses, onGoto }) {
  const st = statusOf(statuses, p.id);
  const cat = CAT_MAP[p.category];
  return (
    <button className="dx-rm-item" onClick={() => onGoto(p.id)} title="去范式库查看">
      <span className="ic">{cat?.icon}</span>
      <span className="tt">{p.title}</span>
      <span className="meta">
        <span className="roi">性价比 {roi(p).toFixed(1)}</span>
        <span className="st" style={{ color: ST_MAP[st]?.color }}>{ST_MAP[st]?.name}</span>
      </span>
    </button>
  );
}

export default function Roadmap({ bands, statuses, onGoto, onGotoAssess }) {
  const rx = prescribe(bands, PRACTICES, statuses);
  const { waves } = topoOrder(PRACTICES);
  const assessed = bands && Object.keys(bands).length > 0;

  return (
    <div className="dx-roadmap">
      {/* —— 处方区 —— */}
      <section className="dx-rm-sec">
        <h2 className="dx-rm-h">① 针对你的薄弱项 · 处方建议</h2>
        {!assessed ? (
          <div className="dx-rm-hint">
            先到 <button className="dx-link" onClick={onGotoAssess}>DORA 自评</button> 给团队打个分，
            这里会按你的薄弱指标推荐「优先该补哪些范式」。
          </div>
        ) : rx.allElite ? (
          <div className="dx-rm-hint">四项指标都已是 <b>Elite</b> 🎉 暂无需补短板，保持并向纵深优化即可。</div>
        ) : !rx.hasWeak ? (
          <div className="dx-rm-hint">当前没有落到 Medium/Low 的指标，挑感兴趣的范式继续深化即可。</div>
        ) : (
          <div className="dx-rm-rx">
            {rx.items.map((it) => (
              <div className="dx-rm-card" key={it.key}>
                <div className="dx-rm-card-h">
                  <span className="mn">{it.name}</span>
                  <span className="lv" style={{ background: it.level.color }}>{it.level.name}</span>
                </div>
                <div className="dx-rm-sub">能提升它、且还没落地的范式（按性价比）：</div>
                {it.practices.length ? (
                  it.practices.slice(0, 5).map((p) => (
                    <MiniItem key={p.id} p={p} statuses={statuses} onGoto={onGoto} />
                  ))
                ) : (
                  <div className="dx-rm-hint sm">相关范式已全部落地 ✅</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* —— 路线区 —— */}
      <section className="dx-rm-sec">
        <h2 className="dx-rm-h">② 建议落地顺序 · 依前置关系分批</h2>
        <div className="dx-rm-hint" style={{ marginBottom: 14 }}>
          按范式之间的前置依赖（如「主干开发」依赖「CI/CD」）拓扑分批，波内按性价比排序。
          先打好地基，再逐层往上。
        </div>
        <div className="dx-rm-waves">
          {waves.map((w, i) => (
            <div className="dx-rm-wave" key={i}>
              <div className="dx-rm-wave-h">
                <span className="no">第 {i + 1} 批</span>
                <span className="cnt">{w.length} 条</span>
              </div>
              <div className="dx-rm-wave-items">
                {w.map((p) => {
                  const reqs = (p.requires || []).map((r) => P_MAP[r]?.title).filter(Boolean);
                  return (
                    <div className="dx-rm-row" key={p.id}>
                      <MiniItem p={p} statuses={statuses} onGoto={onGoto} />
                      {reqs.length > 0 && (
                        <div className="dx-rm-dep">前置：{reqs.join('、')}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

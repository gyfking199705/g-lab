/**
 * 大盘 —— 通用分析视图渲染器
 * ------------------------------------------------------------------
 * 消费 app/analytics.js 的 buildAnalytics 产出的统一结构，渲染成一个炫酷的
 * 分析大盘：渐变英雄区 + 多指标 KPI + 趋势图(线/柱) + 预测横幅 + 洞察。
 *
 * props：{ id, get, onBack, onEnter }
 *   get(key) 读取模块数据；onBack 返回看板；onEnter 进入该模块编辑。
 */
import React, { useMemo, useState } from 'react';
import { SHARED_CSS, Sparkline, MiniBars, Progress, Empty, Segmented } from '../core/ui.jsx';
import { todayStr, fmtDate } from '../core/date.js';
import { buildAnalytics, BOARD_RANGES } from './analytics.js';

export default function BigBoard({ id, get, onBack, onEnter }) {
  const today = todayStr();
  const [range, setRange] = useState(30);
  const a = useMemo(() => buildAnalytics(id, get, today, { days: range }), [id, today, range]);
  const hasSeries = a && (a.charts || []).some((c) => c.kind === 'line' || c.kind === 'bars' || c.kind === 'fan');

  if (!a) {
    return (
      <div className="gx-root">
        <style>{SHARED_CSS}{BOARD_CSS}</style>
        <BoardHead title="大盘" onBack={onBack} onEnter={onEnter} />
        <div className="gx-card"><Empty icon="📊" title="这个模块还没有数据" hint="先进入模块添加内容，大盘会自动汇总趋势与预测" />
          <div style={{ textAlign: 'center' }}><button className="gx-btn gx-btn-primary" onClick={onEnter}>进入模块 →</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="gx-root">
      <style>{SHARED_CSS}{BOARD_CSS}</style>
      <BoardHead title={`${a.icon} ${a.title}`} sub={fmtDate(today)} onBack={onBack} onEnter={onEnter} />

      {hasSeries && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <Segmented tabs={BOARD_RANGES.map((r) => ({ id: r.id, label: r.label }))} value={range} onChange={setRange} />
        </div>
      )}

      {/* 英雄区 */}
      <div className="bb-hero" style={{ '--bb': a.stroke || 'var(--accent)' }}>
        <div className="bb-hero-main">
          <span className="bb-hero-v">{a.hero.value}{a.hero.unit && <span className="bb-hero-u">{a.hero.unit}</span>}</span>
          {a.hero.delta && <span className={`bb-hero-d ${a.hero.deltaTone || ''}`}>{a.hero.delta}</span>}
        </div>
        {a.hero.caption && <div className="bb-hero-c">{a.hero.caption}</div>}
      </div>

      {/* KPI 网格 */}
      <div className="bb-kpis">
        {a.kpis.map((k, i) => (
          <div className="bb-kpi" key={i}>
            <div className={`bb-kpi-v ${k.tone || ''}`}>{k.value}</div>
            <div className="bb-kpi-l">{k.label}</div>
            {k.sub && <div className="bb-kpi-s">{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* 图表 */}
      {a.charts.map((c, i) => (
        <div className="gx-card" key={i} style={{ marginTop: 12 }}>
          <div className="gx-sechead"><h3>{c.title}</h3>{c.captionRight && <span className="gx-sub">{c.captionRight}</span>}</div>
          <ChartView c={c} />
          {c.captionLeft && <div className="bb-cap">{c.captionLeft}</div>}
        </div>
      ))}

      {/* 预测 */}
      {a.forecast && <div className="bb-forecast">{a.forecast.text}</div>}

      {/* 洞察 */}
      {a.insights && a.insights.length > 0 && (
        <div className="gx-card" style={{ marginTop: 12 }}>
          <div className="gx-sechead"><h3>💡 洞察</h3></div>
          <ul className="bb-ins">{a.insights.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}

      {a.disclaimer && <p className="gx-disclaim">{a.disclaimer}</p>}

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
        <button className="gx-btn gx-btn-primary" onClick={onEnter}>进入「{a.title.replace('大盘', '')}」模块 →</button>
      </div>
    </div>
  );
}

function BoardHead({ title, sub, onBack, onEnter }) {
  return (
    <div className="gx-headrow">
      <div className="gx-head"><h2>{title}</h2>{sub && <p>{sub}</p>}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="gx-btn gx-btn-sm" onClick={onBack}>‹ 看板</button>
        <button className="gx-btn gx-btn-sm" onClick={onEnter}>进入模块</button>
      </div>
    </div>
  );
}

function ChartView({ c }) {
  if (c.kind === 'line') return <Sparkline values={c.values} projection={c.projection} goal={c.goal} stroke={c.stroke} height={96} />;
  if (c.kind === 'fan') return (
    <>
      <Sparkline values={c.values} band={c.band} goal={c.goal} stroke={c.stroke} height={110} />
      <div className="bb-legend"><span><i className="solid" />历史</span><span><i className="band" />保守～乐观</span><span><i className="dash" />中性</span>{c.goal && <span><i className="goal" />目标</span>}</div>
    </>
  );
  if (c.kind === 'bars') return <MiniBars values={c.values} single={c.single} height={84} />;
  if (c.kind === 'goalbars') {
    if (!c.goals || !c.goals.length) return <Empty icon="🎯" title="还没有目标" />;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {c.goals.map((g, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</span>
              <span style={{ color: g.done ? 'var(--success)' : 'var(--accent-2)', fontVariantNumeric: 'tabular-nums' }}>{g.pct}%</span>
            </div>
            <Progress pct={g.pct} good={g.done} />
          </div>
        ))}
      </div>
    );
  }
  return null;
}

const BOARD_CSS = `
.bb-hero{background:linear-gradient(135deg,color-mix(in srgb,var(--bb) 16%,var(--surface)),var(--surface) 70%);border:1px solid var(--bd);border-radius:16px;padding:20px 22px;}
.bb-hero-main{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;}
.bb-hero-v{font-family:var(--serif);font-size:40px;font-weight:500;letter-spacing:-1px;line-height:1;color:var(--bb);}
.bb-hero-u{font-size:18px;color:var(--text-3);margin-left:3px;}
.bb-hero-d{font-size:13px;padding:3px 10px;border-radius:999px;background:var(--surface-2);color:var(--text-2);}
.bb-hero-d.good{color:var(--success);background:var(--success-soft);}
.bb-hero-d.bad{color:var(--danger);background:var(--danger-soft);}
.bb-hero-c{font-size:13px;color:var(--text-2);margin-top:8px;}
.bb-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(115px,1fr));gap:10px;margin-top:14px;}
.bb-kpi{background:var(--surface);border:1px solid var(--bd);border-radius:12px;padding:12px 14px;}
.bb-kpi-v{font-family:var(--serif);font-size:21px;font-weight:500;letter-spacing:-.3px;font-variant-numeric:tabular-nums;line-height:1.1;}
.bb-kpi-v.accent{color:var(--accent-2);}
.bb-kpi-v.good{color:var(--success);}
.bb-kpi-v.bad{color:var(--danger);}
.bb-kpi-l{font-size:11.5px;color:var(--text-2);margin-top:4px;}
.bb-kpi-s{font-size:10.5px;color:var(--text-3);margin-top:1px;}
.bb-cap{font-size:10.5px;color:var(--text-3);margin-top:7px;text-align:center;}
.bb-forecast{margin-top:12px;background:var(--accent-soft);border:1px solid #E6C8B9;color:var(--accent-2);border-radius:12px;padding:12px 15px;font-size:13.5px;line-height:1.6;}
.bb-ins{margin:0;padding-left:18px;color:var(--text-2);font-size:13px;line-height:1.8;}
.bb-legend{display:flex;flex-wrap:wrap;gap:14px;font-size:10.5px;color:var(--text-3);margin-top:8px;}
.bb-legend i{display:inline-block;width:14px;height:8px;vertical-align:middle;margin-right:4px;}
.bb-legend i.solid{height:0;border-top:2px solid var(--accent);}
.bb-legend i.dash{height:0;border-top:2px dashed var(--accent);opacity:.75;}
.bb-legend i.band{background:var(--accent);opacity:.13;border-radius:2px;}
.bb-legend i.goal{height:0;border-top:2px dashed var(--danger);}
@media(max-width:560px){ .bb-hero-v{font-size:33px;} }
`;

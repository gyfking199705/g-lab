/**
 * 薪资到手评估 —— React 组件（函数式 + hooks）
 * ------------------------------------------------------------------
 * 输入税前月薪 + 五险一金费率 + 专项附加扣除（+ 可选年终奖），算出：
 *   · 月均/首月/末月到手（累计预扣预缴下到手逐月变化）
 *   · 五险一金（个人部分）各项拆解 + 个税
 *   · 月度到手曲线（手写 SVG）+ 年度汇总（年到手 / 五险一金 / 个税 / 实际税负率）
 *
 * 计算来自 ./calc.js（纯函数，复用 savings 个税表，已单测）。样式复用 core/ui.jsx。
 * 数据：localStorage 键 `salary-planner`。props：{ storageKey?, onChange? }
 */
import React, { useEffect, useMemo, useState } from 'react';
import { loadState, saveState } from '../core/store.js';
import { SHARED_CSS, Sparkline } from '../core/ui.jsx';
import { formatMoney } from '../savings/calc.js';
import { SOCIAL_FIELDS, defaultRates, estimate } from './calc.js';

const STORE_KEY = 'salary-planner';
const DEFAULTS = { v: 1, monthlyGross: 20000, socialBase: '', rates: defaultRates(), specialMonthly: 0, annualBonus: 0 };
const HOUSING_OPTS = [0.05, 0.07, 0.08, 0.1, 0.12];
const yuan = (v) => '¥' + Math.round(v).toLocaleString('zh-CN');
const pct = (v) => (v * 100).toFixed(1) + '%';

export default function SalaryEstimator({ storageKey = STORE_KEY, onChange }) {
  const [data, setData] = useState(() => loadState(storageKey, DEFAULTS));
  const [adv, setAdv] = useState(false);
  useEffect(() => { saveState(storageKey, data); if (onChange) onChange(); }, [data, storageKey, onChange]);

  const set = (patch) => setData((d) => ({ ...d, ...patch }));
  const setRate = (key, v) => setData((d) => ({ ...d, rates: { ...d.rates, [key]: (Number(v) || 0) / 100 } }));

  const e = useMemo(() => estimate(data), [data]);
  const gross = Number(data.monthlyGross) || 0;
  const netSeries = e.schedule.map((r) => r.net);

  return (
    <div className="gx-root">
      <style>{SHARED_CSS}{SAL_CSS}</style>

      <div className="gx-head">
        <h2>💵 薪资到手评估</h2>
        <p>算清税前到手多少：五险一金 + 个税（累计预扣预缴），月度到手随月份变化一目了然</p>
      </div>

      {/* 输入 */}
      <div className="gx-card" style={{ marginBottom: 14 }}>
        <div className="sal-form">
          <label className="sal-field"><span>税前月薪 ¥</span>
            <input className="gx-in" type="number" inputMode="decimal" value={data.monthlyGross} onChange={(ev) => set({ monthlyGross: ev.target.value })} /></label>
          <label className="sal-field"><span>社保缴费基数（默认=月薪）</span>
            <input className="gx-in" type="number" inputMode="decimal" placeholder={`默认 ${gross || '月薪'}`} value={data.socialBase} onChange={(ev) => set({ socialBase: ev.target.value })} /></label>
          <label className="sal-field"><span>公积金比例</span>
            <select className="gx-in" value={data.rates.housingFund} onChange={(ev) => setRate('housingFund', Number(ev.target.value) * 100)}>
              {HOUSING_OPTS.map((r) => <option key={r} value={r}>{(r * 100).toFixed(0)}%</option>)}
            </select></label>
          <label className="sal-field"><span>专项附加扣除 ¥/月</span>
            <input className="gx-in" type="number" inputMode="decimal" placeholder="房租/房贷、子女、赡养老人…" value={data.specialMonthly} onChange={(ev) => set({ specialMonthly: ev.target.value })} /></label>
          <label className="sal-field"><span>年终奖 ¥（可选，单独计税）</span>
            <input className="gx-in" type="number" inputMode="decimal" value={data.annualBonus} onChange={(ev) => set({ annualBonus: ev.target.value })} /></label>
        </div>
        <div style={{ marginTop: 8 }}>
          <button className="gx-btn gx-btn-ghost gx-btn-sm" onClick={() => setAdv((v) => !v)}>{adv ? '收起' : '高级：调养老/医疗/失业费率'}</button>
        </div>
        {adv && (
          <div className="sal-form" style={{ marginTop: 8 }}>
            {SOCIAL_FIELDS.filter((f) => f.key !== 'housingFund').map((f) => (
              <label className="sal-field" key={f.key}><span>{f.label} %</span>
                <input className="gx-in" type="number" inputMode="decimal" value={+( (data.rates[f.key] ?? f.rate) * 100).toFixed(2)} onChange={(ev) => setRate(f.key, ev.target.value)} /></label>
            ))}
          </div>
        )}
      </div>

      {/* 到手英雄区 */}
      <div className="gx-card sal-hero">
        <div>
          <div className="sal-big">{yuan(e.avgMonthlyNet)}<span className="sal-unit">/月（均）</span></div>
          <div className="sal-sub">税前 {yuan(gross)}/月 · 到手率 {pct(e.takeHomeRate)}</div>
        </div>
        <div className="sal-hero-side">
          <div><span className="sal-side-v">{yuan(e.firstMonthNet)}</span><span className="sal-side-l">首月到手</span></div>
          <div><span className="sal-side-v">{yuan(e.lastMonthNet)}</span><span className="sal-side-l">末月到手</span></div>
        </div>
      </div>

      {/* 拆解 */}
      <div className="gx-card" style={{ marginTop: 14 }}>
        <div className="gx-sechead"><h3>每月构成</h3><span className="gx-sub">个人五险一金 {pct(e.socialRate)}</span></div>
        <div className="sal-break">
          <Bar label="税前" value={gross} total={gross} color="var(--text-3)" yuan={yuan} />
          {SOCIAL_FIELDS.map((f) => <Bar key={f.key} label={f.label} value={e.social[f.key]} total={gross} color="var(--warn)" yuan={yuan} neg />)}
          <Bar label="个税（首月）" value={e.schedule[0] ? e.schedule[0].tax : 0} total={gross} color="var(--danger)" yuan={yuan} neg />
          <Bar label="首月到手" value={e.firstMonthNet} total={gross} color="var(--success)" yuan={yuan} strong />
        </div>
      </div>

      {/* 月度到手曲线 */}
      <div className="gx-card" style={{ marginTop: 14 }}>
        <div className="gx-sechead"><h3>📈 月度到手（累计预扣预缴）</h3><span className="gx-sub">首月 {yuan(e.firstMonthNet)} → 末月 {yuan(e.lastMonthNet)}</span></div>
        <Sparkline values={netSeries} stroke="var(--accent)" height={96} />
        <div className="bb-cap" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>个税累计预扣：收入累计跨档后税率上升，故后几月到手通常低于前几月（全年总额不变）。</div>
      </div>

      {/* 年度汇总 */}
      <div className="gx-card" style={{ marginTop: 14 }}>
        <div className="gx-sechead"><h3>年度汇总</h3></div>
        <div className="gx-kpis">
          <div className="gx-kpi"><div className="gx-kpi-v good">{yuan(e.annualNet)}</div><div className="gx-kpi-l">年到手{data.annualBonus > 0 ? '（含年终奖）' : ''}</div></div>
          <div className="gx-kpi"><div className="gx-kpi-v">{yuan(e.annualSocial)}</div><div className="gx-kpi-l">五险一金/年</div></div>
          <div className="gx-kpi"><div className="gx-kpi-v" style={{ color: 'var(--danger)' }}>{yuan(e.annualTax)}</div><div className="gx-kpi-l">个税/年</div></div>
          <div className="gx-kpi"><div className="gx-kpi-v accent">{pct(e.effectiveTaxRate)}</div><div className="gx-kpi-l">实际税负率</div></div>
        </div>
        {data.annualBonus > 0 && (
          <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-2)' }}>
            🎁 年终奖 {yuan(Number(data.annualBonus))}：单独计税扣个税 {yuan(e.bonus.tax)}（{pct(e.bonus.rate)} 档），到手 <strong>{yuan(e.bonus.net)}</strong>。
          </div>
        )}
      </div>

      <p className="gx-disclaim">
        ⚠️ 估算仅供参考：各地社保缴费基数上下限、医保/公积金比例不同；个税按全国综合所得年度税率表 + 累计预扣预缴；
        年终奖按「全年一次性奖金单独计税」。专项扣除、年中调薪、跨年入职等会影响实际结果。数据仅存本地浏览器。
      </p>
    </div>
  );
}

function Bar({ label, value, total, color, yuan, neg, strong }) {
  const w = total > 0 ? Math.max(1, Math.min(100, (value / total) * 100)) : 0;
  return (
    <div className="sal-barrow">
      <span className="sal-barlabel">{label}</span>
      <div className="sal-bartrack"><div className="sal-barfill" style={{ width: w + '%', background: color }} /></div>
      <span className="sal-barval" style={{ color: strong ? 'var(--success)' : neg ? color : 'var(--text)', fontWeight: strong ? 600 : 500 }}>{neg ? '−' : ''}{yuan(value)}</span>
    </div>
  );
}

const SAL_CSS = `
.sal-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;}
.sal-field{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--text-2);}
.sal-hero{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;background:linear-gradient(135deg,var(--accent-soft),var(--surface) 65%);}
.sal-big{font-family:var(--serif);font-size:38px;font-weight:500;letter-spacing:-1px;line-height:1;color:var(--accent-2);}
.sal-unit{font-size:15px;color:var(--text-3);margin-left:4px;}
.sal-sub{font-size:12.5px;color:var(--text-2);margin-top:7px;}
.sal-hero-side{display:flex;gap:18px;}
.sal-hero-side>div{display:flex;flex-direction:column;text-align:right;}
.sal-side-v{font-family:var(--serif);font-size:18px;font-weight:500;font-variant-numeric:tabular-nums;}
.sal-side-l{font-size:10.5px;color:var(--text-3);}
.sal-break{display:flex;flex-direction:column;gap:7px;}
.sal-barrow{display:grid;grid-template-columns:88px 1fr auto;gap:10px;align-items:center;font-size:12.5px;}
.sal-barlabel{color:var(--text-2);}
.sal-bartrack{height:8px;background:var(--surface-3);border-radius:999px;overflow:hidden;}
.sal-barfill{height:100%;border-radius:999px;transition:width .3s;}
.sal-barval{font-variant-numeric:tabular-nums;white-space:nowrap;}
@media(max-width:560px){ .sal-barrow{grid-template-columns:72px 1fr auto;} .sal-big{font-size:32px;} }
`;

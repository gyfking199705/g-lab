/**
 * 储蓄与财富规划器 —— React 组件 (函数式 + hooks)
 * ------------------------------------------------------------------
 * - 计算逻辑全部来自 ./calc.js (纯函数)，本文件只负责 UI 与交互。
 * - 图表为手写 SVG，不依赖任何图表库。
 * - 自带样式 (组件内注入 <style>)，无需外部 CSS。
 * - 可通过 props 接入主应用：
 *     <SavingsPlanner
 *        initialState={...}          // 可选：初始数据(优先于 localStorage)
 *        onChange={(state, result) => {}}  // 可选：数据/结果变化回调
 *        storageKey="savings-planner"      // 可选：localStorage 键名；传 null 关闭本地持久化
 *     />
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { computePlan, formatMoney, formatPct, formatYears } from './calc.js';

/* ----------------------------- 默认数据 ----------------------------- */
export const DEFAULT_STATE = {
  personA: { gross: 50000, months: 16, socialRate: 20, special: 0, specials: emptySpecials() },
  personB: { enabled: true, gross: 60000, months: 16, socialRate: 20, special: 0, specials: emptySpecials() },
  expenses: { housing: 10000, common: 5000, personalA: 4000, personalB: 4000 },
  allocations: [
    { key: 'cash', label: '现金', weight: 5, ret: 1.5, color: '#94a3b8' },
    { key: 'fixed', label: '固收', weight: 35, ret: 3.5, color: '#38bdf8' },
    { key: 'equity', label: '权益', weight: 35, ret: 7, color: '#f472b6' },
    { key: 'gold', label: '黄金', weight: 5, ret: 4, color: '#fbbf24' },
    { key: 'flex', label: '机动', weight: 20, ret: 3, color: '#a78bfa' },
  ],
  forecast: {
    currentAssets: 2000000,
    target: 10000000,
    years: 30,
    inflation: 2.5,
    useReal: false,
    rateOverride: null,
  },
};

function emptySpecials() {
  // 专项附加扣除明细 (元/月)
  return { rent: 0, elder: 0, child: 0, baby: 0, edu: 0 };
}

const SPECIAL_FIELDS = [
  { key: 'rent', label: '住房租金/房贷', hint: '一线城市租金 1500/月，房贷 1000/月' },
  { key: 'elder', label: '赡养老人', hint: '独生子女 3000/月' },
  { key: 'child', label: '子女教育', hint: '每孩 2000/月' },
  { key: 'baby', label: '婴幼儿照护', hint: '3岁以下每孩 2000/月' },
  { key: 'edu', label: '继续教育', hint: '学历教育 400/月' },
];

function sumSpecials(specials) {
  return SPECIAL_FIELDS.reduce((s, f) => s + Math.max(0, specials?.[f.key] || 0), 0);
}

/* ----------------------------- 工具 ----------------------------- */
function deepMerge(base, override) {
  if (!override) return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const k of Object.keys(override)) {
    const v = override[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof base[k] === 'object') {
      out[k] = deepMerge(base[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function loadInitial(initialState, storageKey) {
  let state = DEFAULT_STATE;
  if (storageKey) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) state = deepMerge(DEFAULT_STATE, JSON.parse(raw));
    } catch (e) {
      /* 忽略损坏的本地数据 */
    }
  }
  if (initialState) state = deepMerge(state, initialState);
  return state;
}

/* ============================ 主组件 ============================ */
export default function SavingsPlanner({ initialState, onChange, storageKey = 'savings-planner' }) {
  const [state, setState] = useState(() => loadInitial(initialState, storageKey));

  // 把每个人的专项附加扣除明细同步成总额，喂给 calc
  const planInput = useMemo(() => {
    const withSpecial = (p) => ({ ...p, special: sumSpecials(p.specials) });
    return {
      ...state,
      personA: withSpecial(state.personA),
      personB: withSpecial(state.personB),
    };
  }, [state]);

  const result = useMemo(() => computePlan(planInput), [planInput]);

  // 持久化 + 对外回调
  useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch (e) {
        /* localStorage 不可用时静默 */
      }
    }
    if (onChange) onChange(state, result);
  }, [state, result, storageKey, onChange]);

  /* ---- 受控更新 helper ---- */
  const update = (path, value) =>
    setState((prev) => {
      const next = structuredCloneSafe(prev);
      let node = next;
      for (let i = 0; i < path.length - 1; i++) node = node[path[i]];
      node[path[path.length - 1]] = value;
      return next;
    });

  const updateAlloc = (idx, field, value) =>
    setState((prev) => {
      const next = structuredCloneSafe(prev);
      next.allocations[idx][field] = value;
      return next;
    });

  const reset = () => setState(deepMerge(DEFAULT_STATE, initialState || {}));

  const { taxA, taxB, budget, investment, forecast } = result;
  const totalWeight = investment.totalWeight;
  const weightOk = Math.abs(totalWeight - 100) < 0.01;

  return (
    <div className="sp-root">
      <style>{CSS}</style>

      <header className="sp-header">
        <div>
          <h1>储蓄与财富规划器</h1>
          <p className="sp-sub">调整收入、支出与投资配置，实时测算多久能达成你的财富目标</p>
        </div>
        <button className="sp-reset" onClick={reset}>↺ 恢复默认</button>
      </header>

      {/* ===== 顶部关键指标 ===== */}
      <div className="sp-kpis">
        <Kpi label="税后月收入" value={formatMoney(budget.monthlyNetIncome)} tone="calc" />
        <Kpi label="月储蓄" value={formatMoney(budget.monthlySaving)} tone={budget.monthlySaving >= 0 ? 'good' : 'bad'} />
        <Kpi label="储蓄率" value={formatPct(budget.savingRate)} tone="calc" />
        <Kpi label="综合年化" value={formatPct(investment.effectiveReturn)} tone="calc" />
        <Kpi
          label="达成目标"
          value={isFinite(forecast.goalYears) ? `约 ${forecast.goalYears.toFixed(1)} 年` : '当前节奏无法达成'}
          tone="hero"
        />
      </div>

      <div className="sp-grid">
        {/* ============ 左列：输入 ============ */}
        <div className="sp-col">
          {/* —— 1. 收支 —— */}
          <Section title="① 收支输入" badge="输入">
            <PersonInputs
              title="本人 (A)"
              p={state.personA}
              tax={taxA}
              onChange={(field, v) => update(['personA', field], v)}
              onSpecial={(key, v) => update(['personA', 'specials', key], v)}
            />
            <label className="sp-toggle">
              <input
                type="checkbox"
                checked={state.personB.enabled}
                onChange={(e) => update(['personB', 'enabled'], e.target.checked)}
              />
              <span>计入配偶 / 伴侣 (B) 的收入</span>
            </label>
            {state.personB.enabled && (
              <PersonInputs
                title="配偶 (B)"
                p={state.personB}
                tax={taxB}
                onChange={(field, v) => update(['personB', field], v)}
                onSpecial={(key, v) => update(['personB', 'specials', key], v)}
              />
            )}

            <h4 className="sp-h4">每月支出</h4>
            <div className="sp-fields">
              <NumberField label="住房 (房租/月供)" value={state.expenses.housing} onChange={(v) => update(['expenses', 'housing'], v)} unit="元" step={500} />
              <NumberField label="共同生活" value={state.expenses.common} onChange={(v) => update(['expenses', 'common'], v)} unit="元" step={500} />
              <NumberField label="A 个人支出" value={state.expenses.personalA} onChange={(v) => update(['expenses', 'personalA'], v)} unit="元" step={500} />
              {state.personB.enabled && (
                <NumberField label="B 个人支出" value={state.expenses.personalB} onChange={(v) => update(['expenses', 'personalB'], v)} unit="元" step={500} />
              )}
            </div>

            {/* 储蓄率进度条 */}
            <div className="sp-saverate">
              <div className="sp-saverate-top">
                <span>月支出 {formatMoney(budget.monthlyExpense)} · 月储蓄 {formatMoney(budget.monthlySaving)}</span>
                <strong className={budget.savingRate >= 0 ? 'sp-pos' : 'sp-neg'}>储蓄率 {formatPct(budget.savingRate)}</strong>
              </div>
              <div className="sp-bar">
                <div
                  className="sp-bar-fill"
                  style={{ width: `${Math.max(0, Math.min(100, budget.savingRate * 100))}%` }}
                />
              </div>
            </div>
          </Section>

          {/* —— 3. 投资配置 —— */}
          <Section title="③ 投资配置" badge="输入">
            <p className="sp-note">
              拖动调整每类资产的「占比」与「预期年化」，自动加权出综合回报。占比之和应为 100%。
            </p>
            {state.allocations.map((a, i) => {
              const detail = investment.allocations[i];
              return (
                <div className="sp-alloc" key={a.key}>
                  <div className="sp-alloc-head">
                    <span className="sp-dot" style={{ background: a.color }} />
                    <strong>{a.label}</strong>
                    <span className="sp-alloc-amt">{formatMoney(detail.monthlyAmount)}/月</span>
                  </div>
                  <div className="sp-alloc-sliders">
                    <SliderRow label="占比" value={a.weight} min={0} max={100} step={1} unit="%" onChange={(v) => updateAlloc(i, 'weight', v)} />
                    <SliderRow label="年化" value={a.ret} min={-5} max={15} step={0.5} unit="%" onChange={(v) => updateAlloc(i, 'ret', v)} />
                  </div>
                  <div className="sp-alloc-bar">
                    <div className="sp-alloc-bar-fill" style={{ width: `${detail.share * 100}%`, background: a.color }} />
                  </div>
                </div>
              );
            })}
            <div className={`sp-weightsum ${weightOk ? 'ok' : 'warn'}`}>
              占比合计 {totalWeight.toFixed(0)}%{weightOk ? ' ✓' : '（建议调整为 100%）'}
              <span className="sp-weightsum-ret">综合年化 {formatPct(investment.weightedReturn)}</span>
            </div>
          </Section>
        </div>

        {/* ============ 右列：预测 ============ */}
        <div className="sp-col">
          <Section title="④ 产出预测" badge="结果">
            <div className="sp-fields">
              <NumberField label="当前总资产" value={state.forecast.currentAssets} onChange={(v) => update(['forecast', 'currentAssets'], v)} unit="元" step={100000} />
              <NumberField label="目标金额" value={state.forecast.target} onChange={(v) => update(['forecast', 'target'], v)} unit="元" step={1000000} />
            </div>
            <SliderRow label="预测年限" value={state.forecast.years} min={5} max={50} step={1} unit="年" onChange={(v) => update(['forecast', 'years'], v)} wide />

            {/* 达成目标大字 */}
            <div className="sp-goal">
              <div className="sp-goal-label">按当前节奏，达成 {formatMoney(state.forecast.target)} 约需</div>
              <div className="sp-goal-value">
                {isFinite(forecast.goalYears) ? (
                  <><span className="sp-goal-num">{forecast.goalYears.toFixed(1)}</span> 年</>
                ) : (
                  <span className="sp-goal-num sp-neg">无法达成</span>
                )}
              </div>
              {isFinite(forecast.goalYears) && (
                <div className="sp-goal-sub">约在 {new Date().getFullYear() + Math.ceil(forecast.goalYears)} 年前后</div>
              )}
            </div>

            {/* SVG 资产增长曲线 */}
            <WealthChart series={forecast.series} target={state.forecast.target} years={state.forecast.years} />

            {/* 本金 vs 收益 拆分 */}
            <div className="sp-split">
              <div className="sp-split-head">
                第 {state.forecast.years} 年末预计 <strong>{formatMoney(forecast.finalAssets)}</strong>
              </div>
              <div className="sp-split-bar">
                <div
                  className="sp-split-principal"
                  style={{ width: `${pctOf(forecast.finalPrincipal, forecast.finalAssets)}%` }}
                />
                <div className="sp-split-gain" style={{ width: `${pctOf(forecast.finalGain, forecast.finalAssets)}%` }} />
              </div>
              <div className="sp-split-legend">
                <span><i className="sp-sq sp-sq-p" /> 累计本金 {formatMoney(forecast.finalPrincipal)}</span>
                <span><i className="sp-sq sp-sq-g" /> 投资收益 {formatMoney(forecast.finalGain)}</span>
              </div>
            </div>

            {/* 敏感性：年化覆盖 + 通胀 */}
            <div className="sp-sensitivity">
              <h4 className="sp-h4">敏感性测试</h4>
              <SliderRow
                label="年化回报"
                value={state.forecast.rateOverride != null ? state.forecast.rateOverride : round1(investment.weightedReturn * 100)}
                min={0}
                max={15}
                step={0.1}
                unit="%"
                wide
                onChange={(v) => update(['forecast', 'rateOverride'], v)}
              />
              <div className="sp-sens-row">
                {state.forecast.rateOverride != null && (
                  <button className="sp-link" onClick={() => update(['forecast', 'rateOverride'], null)}>
                    ↺ 回到配置年化 {formatPct(investment.weightedReturn)}
                  </button>
                )}
                <label className="sp-toggle sp-toggle-inline">
                  <input
                    type="checkbox"
                    checked={state.forecast.useReal}
                    onChange={(e) => update(['forecast', 'useReal'], e.target.checked)}
                  />
                  <span>按实际购买力（扣通胀</span>
                </label>
                <input
                  className="sp-mini-input"
                  type="number"
                  value={state.forecast.inflation}
                  step={0.1}
                  onChange={(e) => update(['forecast', 'inflation'], num(e.target.value))}
                />
                <span className="sp-toggle-tail">%）</span>
              </div>
              <div className="sp-effret">实际用于测算的年化：<strong>{formatPct(investment.effectiveReturn)}</strong></div>
            </div>
          </Section>
        </div>
      </div>

      <p className="sp-disclaimer">
        ⚠️ 免责声明：投资回报为长期假设，实际会逐年波动，本工具仅供规划参考，<strong>不构成投资建议</strong>；
        个税与五险一金为基于税率表的年度近似估算，<strong>以实际工资条与当地政策为准</strong>。
      </p>
    </div>
  );
}

/* ============================ 子组件 ============================ */
function Kpi({ label, value, tone }) {
  return (
    <div className={`sp-kpi sp-kpi-${tone}`}>
      <div className="sp-kpi-label">{label}</div>
      <div className="sp-kpi-value">{value}</div>
    </div>
  );
}

function Section({ title, badge, children }) {
  return (
    <section className="sp-section">
      <div className="sp-section-head">
        <h3>{title}</h3>
        <span className={`sp-badge sp-badge-${badge === '输入' ? 'in' : 'out'}`}>{badge}</span>
      </div>
      <div className="sp-section-body">{children}</div>
    </section>
  );
}

function PersonInputs({ title, p, tax, onChange, onSpecial }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sp-person">
      <div className="sp-person-title">{title}</div>
      <div className="sp-fields">
        <NumberField label="税前月薪" value={p.gross} onChange={(v) => onChange('gross', v)} unit="元" step={1000} />
        <NumberField label="一年发几个月" value={p.months} onChange={(v) => onChange('months', clamp(v, 12, 18))} unit="薪" step={1} min={12} max={18} />
        <NumberField label="五险一金比例" value={p.socialRate} onChange={(v) => onChange('socialRate', v)} unit="%" step={1} />
      </div>
      <button className="sp-link" onClick={() => setOpen((o) => !o)}>
        {open ? '收起' : '展开'}专项附加扣除（{formatMoney(sumSpecials(p.specials))}/月）
      </button>
      {open && (
        <div className="sp-specials">
          {SPECIAL_FIELDS.map((f) => (
            <NumberField
              key={f.key}
              label={f.label}
              title={f.hint}
              value={p.specials?.[f.key] || 0}
              onChange={(v) => onSpecial(f.key, v)}
              unit="元/月"
              step={500}
              small
            />
          ))}
        </div>
      )}
      {/* 税后明细 (自动计算，视觉区分) */}
      {tax && (
        <div className="sp-taxout">
          <span>税前 {formatMoney(tax.monthlyGrossAvg)}/月</span>
          <span className="sp-arrow">→</span>
          <span className="sp-taxout-net">税后 {formatMoney(tax.monthlyNetAvg)}/月</span>
          <span className="sp-taxout-detail">
            五险一金 −{formatMoney(tax.socialInsurance / 12)} · 个税 −{formatMoney(tax.tax / 12)} · 实际税负 {formatPct(tax.effectiveTaxRate)}
          </span>
        </div>
      )}
    </div>
  );
}

function NumberField({ label, value, onChange, unit, step = 1, min, max, small, title }) {
  return (
    <label className={`sp-field ${small ? 'sp-field-sm' : ''}`} title={title}>
      <span className="sp-field-label">{label}</span>
      <span className="sp-field-input">
        <input
          type="number"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(num(e.target.value))}
        />
        {unit && <em>{unit}</em>}
      </span>
    </label>
  );
}

function SliderRow({ label, value, min, max, step, unit, onChange, wide }) {
  return (
    <div className={`sp-slider ${wide ? 'sp-slider-wide' : ''}`}>
      <span className="sp-slider-label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(num(e.target.value))} />
      <span className="sp-slider-value">
        {value}
        {unit}
      </span>
    </div>
  );
}

/* ----------------------- SVG 资产增长曲线 ----------------------- */
function WealthChart({ series, target, years }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(560);
  const [hover, setHover] = useState(null); // {index}
  const height = 260;
  const pad = { top: 18, right: 16, bottom: 28, left: 56 };

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      if (w > 0) setWidth(Math.max(280, w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const maxAssets = Math.max(target, ...series.map((d) => d.assets)) * 1.08;
  const n = series.length;

  const x = (i) => pad.left + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
  const y = (v) => pad.top + innerH - (v / maxAssets) * innerH;

  const areaPath =
    `M ${x(0)} ${y(0)} ` +
    series.map((d, i) => `L ${x(i)} ${y(d.assets)}`).join(' ') +
    ` L ${x(n - 1)} ${y(0)} Z`;
  const assetLine = series.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.assets)}`).join(' ');
  const principalLine = series.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.principal)}`).join(' ');

  // Y 轴刻度
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => (maxAssets / ticks) * i);
  // X 轴刻度 (最多约 6 个)
  const xStep = Math.max(1, Math.round((n - 1) / 6));
  const xTicks = series.filter((_, i) => i % xStep === 0 || i === n - 1);

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = width / rect.width;
    const px = (e.clientX - rect.left) * scale;
    const rel = (px - pad.left) / innerW;
    const idx = Math.round(rel * (n - 1));
    if (idx >= 0 && idx < n) setHover({ index: idx });
  };

  const hv = hover ? series[hover.index] : null;

  return (
    <div className="sp-chart" ref={wrapRef}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="sp-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* 网格 + Y 轴标签 */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={pad.left} y1={y(v)} x2={width - pad.right} y2={y(v)} stroke="#eef2f7" />
            <text x={pad.left - 8} y={y(v) + 4} textAnchor="end" className="sp-axis">{formatMoney(v)}</text>
          </g>
        ))}
        {/* X 轴标签 */}
        {xTicks.map((d) => (
          <text key={d.year} x={x(d.year)} y={height - 8} textAnchor="middle" className="sp-axis">
            {d.year}年
          </text>
        ))}

        {/* 目标参考线 */}
        {target <= maxAssets && (
          <g>
            <line x1={pad.left} y1={y(target)} x2={width - pad.right} y2={y(target)} stroke="#ef4444" strokeDasharray="5 4" />
            <text x={width - pad.right} y={y(target) - 6} textAnchor="end" className="sp-axis sp-axis-target">目标 {formatMoney(target)}</text>
          </g>
        )}

        {/* 面积 + 资产线 + 本金线 */}
        <path d={areaPath} fill="url(#sp-area)" />
        <path d={assetLine} fill="none" stroke="#2563eb" strokeWidth="2.5" />
        <path d={principalLine} fill="none" stroke="#10b981" strokeWidth="1.8" strokeDasharray="4 3" />

        {/* 悬停指示 */}
        {hv && (
          <g>
            <line x1={x(hv.year)} y1={pad.top} x2={x(hv.year)} y2={pad.top + innerH} stroke="#94a3b8" strokeDasharray="3 3" />
            <circle cx={x(hv.year)} cy={y(hv.assets)} r="4.5" fill="#2563eb" stroke="#fff" strokeWidth="1.5" />
            <circle cx={x(hv.year)} cy={y(hv.principal)} r="3.5" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
          </g>
        )}
      </svg>

      {/* 悬停信息卡 */}
      {hv && (
        <div
          className="sp-tip"
          style={{
            left: `${(x(hv.year) / width) * 100}%`,
            transform: `translateX(${hv.year > n / 2 ? '-105%' : '8px'})`,
          }}
        >
          <div className="sp-tip-year">第 {hv.year} 年</div>
          <div><i className="sp-sq sp-sq-a" /> 总资产 {formatMoney(hv.assets)}</div>
          <div><i className="sp-sq sp-sq-g2" /> 累计本金 {formatMoney(hv.principal)}</div>
          <div className="sp-tip-gain">投资收益 {formatMoney(hv.gain)}</div>
        </div>
      )}

      <div className="sp-legend">
        <span><i className="sp-line sp-line-a" /> 总资产</span>
        <span><i className="sp-line sp-line-p" /> 累计本金</span>
        <span><i className="sp-line sp-line-t" /> 目标</span>
      </div>
    </div>
  );
}

/* ----------------------------- 工具函数 ----------------------------- */
function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}
function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}
function round1(v) {
  return Math.round(v * 10) / 10;
}
function pctOf(part, whole) {
  if (!whole || whole <= 0) return 0;
  return Math.max(0, Math.min(100, (part / whole) * 100));
}
function structuredCloneSafe(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

/* ============================ 样式 ============================ */
const CSS = `
.sp-root{--p:#2563eb;--g:#10b981;--bg:#f6f8fb;--card:#fff;--bd:#e6eaf0;--t1:#0f172a;--t2:#64748b;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;
  color:var(--t1);background:var(--bg);padding:20px;border-radius:16px;line-height:1.5;max-width:1080px;margin:0 auto;}
.sp-root *{box-sizing:border-box;}
.sp-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px;}
.sp-header h1{font-size:22px;font-weight:800;margin:0;}
.sp-sub{margin:4px 0 0;color:var(--t2);font-size:13px;}
.sp-reset{flex:none;background:#fff;border:1px solid var(--bd);border-radius:8px;padding:8px 12px;font-size:13px;cursor:pointer;color:var(--t2);}
.sp-reset:hover{border-color:var(--p);color:var(--p);}

.sp-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px;}
.sp-kpi{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:12px 14px;}
.sp-kpi-label{font-size:12px;color:var(--t2);margin-bottom:4px;}
.sp-kpi-value{font-size:18px;font-weight:700;}
.sp-kpi-hero{background:linear-gradient(135deg,#2563eb,#1d4ed8);border:none;color:#fff;}
.sp-kpi-hero .sp-kpi-label{color:rgba(255,255,255,.85);}
.sp-kpi-good .sp-kpi-value{color:var(--g);}
.sp-kpi-bad .sp-kpi-value{color:#ef4444;}

.sp-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.sp-col{display:flex;flex-direction:column;gap:16px;}
.sp-section{background:var(--card);border:1px solid var(--bd);border-radius:14px;overflow:hidden;}
.sp-section-head{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid var(--bd);}
.sp-section-head h3{margin:0;font-size:15px;font-weight:700;}
.sp-badge{font-size:11px;padding:2px 8px;border-radius:999px;font-weight:600;}
.sp-badge-in{background:#eff6ff;color:#2563eb;}
.sp-badge-out{background:#ecfdf5;color:#059669;}
.sp-section-body{padding:16px;}
.sp-h4{margin:18px 0 8px;font-size:13px;font-weight:700;color:var(--t2);}

.sp-person{border:1px dashed var(--bd);border-radius:10px;padding:12px;margin-bottom:10px;background:#fcfdff;}
.sp-person-title{font-size:13px;font-weight:700;margin-bottom:8px;}
.sp-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.sp-field{display:flex;flex-direction:column;gap:4px;}
.sp-field-sm{font-size:12px;}
.sp-field-label{font-size:12px;color:var(--t2);}
.sp-field-input{display:flex;align-items:center;background:#fff;border:1px solid var(--bd);border-radius:8px;padding:0 10px;}
.sp-field-input input{flex:1;border:none;outline:none;padding:9px 0;font-size:14px;background:transparent;width:100%;color:var(--t1);}
.sp-field-input em{font-style:normal;color:var(--t2);font-size:12px;margin-left:4px;}
.sp-field-input:focus-within{border-color:var(--p);box-shadow:0 0 0 3px rgba(37,99,235,.1);}

.sp-link{background:none;border:none;color:var(--p);font-size:12px;cursor:pointer;padding:8px 0 0;text-align:left;}
.sp-link:hover{text-decoration:underline;}
.sp-specials{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;padding:10px;background:#f8fafc;border-radius:8px;}

.sp-taxout{margin-top:10px;padding:10px;background:#f1f5f9;border-radius:8px;font-size:12px;display:flex;flex-wrap:wrap;align-items:center;gap:6px;}
.sp-arrow{color:var(--t2);}
.sp-taxout-net{font-weight:700;color:var(--g);}
.sp-taxout-detail{flex-basis:100%;color:var(--t2);margin-top:2px;}

.sp-toggle{display:flex;align-items:center;gap:8px;font-size:13px;margin:8px 0;cursor:pointer;}
.sp-toggle input{width:16px;height:16px;accent-color:var(--p);}
.sp-toggle-inline{margin:0;}

.sp-saverate{margin-top:16px;}
.sp-saverate-top{display:flex;justify-content:space-between;font-size:12px;color:var(--t2);margin-bottom:6px;flex-wrap:wrap;gap:4px;}
.sp-pos{color:var(--g);}.sp-neg{color:#ef4444;}
.sp-bar{height:10px;background:#eef2f7;border-radius:999px;overflow:hidden;}
.sp-bar-fill{height:100%;background:linear-gradient(90deg,#10b981,#2563eb);border-radius:999px;transition:width .35s;}

.sp-note{font-size:12px;color:var(--t2);margin:0 0 12px;}
.sp-alloc{padding:10px 0;border-bottom:1px solid #f1f5f9;}
.sp-alloc-head{display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:6px;}
.sp-dot{width:10px;height:10px;border-radius:3px;flex:none;}
.sp-alloc-amt{margin-left:auto;color:var(--t2);font-size:12px;}
.sp-alloc-sliders{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.sp-alloc-bar{height:6px;background:#f1f5f9;border-radius:999px;margin-top:8px;overflow:hidden;}
.sp-alloc-bar-fill{height:100%;border-radius:999px;transition:width .3s;}
.sp-weightsum{margin-top:12px;font-size:13px;font-weight:600;display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;padding:8px 10px;border-radius:8px;}
.sp-weightsum.ok{background:#ecfdf5;color:#059669;}
.sp-weightsum.warn{background:#fef3c7;color:#b45309;}
.sp-weightsum-ret{font-weight:700;}

.sp-slider{display:grid;grid-template-columns:34px 1fr 48px;align-items:center;gap:8px;font-size:12px;}
.sp-slider-wide{grid-template-columns:56px 1fr 52px;margin:12px 0;}
.sp-slider-label{color:var(--t2);}
.sp-slider input[type=range]{width:100%;accent-color:var(--p);}
.sp-slider-value{text-align:right;font-weight:600;}

.sp-goal{margin:16px 0;padding:16px;border-radius:12px;background:linear-gradient(135deg,#eff6ff,#f5f3ff);text-align:center;}
.sp-goal-label{font-size:13px;color:var(--t2);}
.sp-goal-value{font-size:18px;margin-top:4px;}
.sp-goal-num{font-size:40px;font-weight:800;color:var(--p);}
.sp-goal-sub{font-size:12px;color:var(--t2);margin-top:2px;}

.sp-chart{position:relative;margin:8px 0 4px;}
.sp-chart svg{display:block;width:100%;height:auto;}
.sp-axis{font-size:10px;fill:#94a3b8;}
.sp-axis-target{fill:#ef4444;}
.sp-tip{position:absolute;top:10px;background:#0f172a;color:#fff;border-radius:8px;padding:8px 10px;font-size:12px;pointer-events:none;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.18);z-index:2;}
.sp-tip-year{font-weight:700;margin-bottom:3px;}
.sp-tip-gain{color:#fbbf24;margin-top:2px;}
.sp-sq{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px;}
.sp-sq-a{background:#60a5fa;}.sp-sq-g2{background:#34d399;}
.sp-legend{display:flex;gap:16px;font-size:12px;color:var(--t2);justify-content:center;margin-top:4px;}
.sp-line{display:inline-block;width:16px;height:0;border-top-width:2px;border-top-style:solid;vertical-align:middle;margin-right:5px;}
.sp-line-a{border-color:#2563eb;}
.sp-line-p{border-color:#10b981;border-top-style:dashed;}
.sp-line-t{border-color:#ef4444;border-top-style:dashed;}

.sp-split{margin:16px 0;}
.sp-split-head{font-size:13px;margin-bottom:8px;}
.sp-split-bar{display:flex;height:16px;border-radius:8px;overflow:hidden;}
.sp-split-principal{background:#10b981;}
.sp-split-gain{background:#fbbf24;}
.sp-split-legend{display:flex;gap:16px;font-size:12px;color:var(--t2);margin-top:6px;flex-wrap:wrap;}
.sp-sq-p{background:#10b981;}.sp-sq-g{background:#fbbf24;}

.sp-sensitivity{margin-top:16px;padding-top:12px;border-top:1px solid #f1f5f9;}
.sp-sens-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;margin-top:4px;}
.sp-mini-input{width:56px;border:1px solid var(--bd);border-radius:6px;padding:4px 6px;font-size:12px;}
.sp-toggle-tail{font-size:13px;}
.sp-effret{margin-top:8px;font-size:13px;color:var(--t2);}
.sp-effret strong{color:var(--p);}

.sp-disclaimer{margin-top:16px;font-size:12px;color:var(--t2);background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 14px;line-height:1.6;}

@media(max-width:860px){
  .sp-kpis{grid-template-columns:repeat(2,1fr);}
  .sp-kpi-hero{grid-column:1 / -1;}
  .sp-grid{grid-template-columns:1fr;}
}
@media(max-width:480px){
  .sp-fields{grid-template-columns:1fr;}
  .sp-specials{grid-template-columns:1fr;}
  .sp-alloc-sliders{grid-template-columns:1fr;}
}
`;

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
import {
  computePlan,
  formatMoney,
  formatPct,
  formatYears,
  snapshotTotals,
  assetBreakdown,
  netWorthSeries,
  netWorthChange,
  financialHealth,
} from './calc.js';
import { simulate, VOL_PRESETS } from './montecarlo.js';

/* ----------------------------- 默认数据 ----------------------------- */
/* 净资产默认账户：资产/负债 + 类别（「流动」类计入应急储备） */
const DEFAULT_ACCOUNTS = [
  { id: 'cash', name: '现金 / 活期', type: 'asset', category: '流动' },
  { id: 'deposit', name: '存款 / 理财', type: 'asset', category: '流动' },
  { id: 'invest', name: '基金 / 股票', type: 'asset', category: '投资' },
  { id: 'gjj', name: '公积金', type: 'asset', category: '其他' },
  { id: 'house', name: '自住房产', type: 'asset', category: '固定' },
  { id: 'mortgage', name: '房贷', type: 'liability', category: '负债' },
  { id: 'loan', name: '其他贷款', type: 'liability', category: '负债' },
];

export const DEFAULT_STATE = {
  personA: { gross: 50000, months: 16, socialRate: 20, special: 0, specials: emptySpecials() },
  personB: { enabled: true, gross: 60000, months: 16, socialRate: 20, special: 0, specials: emptySpecials() },
  expenses: { housing: 10000, common: 5000, personalA: 4000, personalB: 4000 },
  allocations: [
    { key: 'cash', label: '现金', weight: 5, ret: 1.5, color: '#B0AAA0' },
    { key: 'fixed', label: '固收', weight: 35, ret: 3.5, color: '#8AA1A8' },
    { key: 'equity', label: '权益', weight: 35, ret: 7, color: '#CC785C' },
    { key: 'gold', label: '黄金', weight: 5, ret: 4, color: '#C9A24B' },
    { key: 'flex', label: '机动', weight: 20, ret: 3, color: '#9D8AA6' },
  ],
  forecast: {
    currentAssets: 2000000,
    target: 10000000,
    years: 30,
    inflation: 2.5,
    useReal: false,
    rateOverride: null,
  },
  // 净资产追踪：账户定义 + 各期快照
  netWorth: { accounts: DEFAULT_ACCOUNTS, snapshots: [] },
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
  let saved = null;
  if (storageKey) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) saved = JSON.parse(raw);
    } catch (e) {
      /* 忽略损坏的本地数据 */
    }
  }
  if (saved) state = deepMerge(DEFAULT_STATE, saved);
  if (initialState) state = deepMerge(state, initialState);
  // 净资产的 accounts / snapshots 是「长度可变数组」，不能按索引深合并，直接以来源为准
  const nwSrc = (initialState && initialState.netWorth) || (saved && saved.netWorth) || DEFAULT_STATE.netWorth;
  state = {
    ...state,
    netWorth: {
      accounts: Array.isArray(nwSrc.accounts) && nwSrc.accounts.length ? nwSrc.accounts : DEFAULT_ACCOUNTS,
      snapshots: Array.isArray(nwSrc.snapshots) ? nwSrc.snapshots : [],
    },
  };
  return state;
}

/* ============================ 主组件 ============================ */
export default function SavingsPlanner({ initialState, onChange, storageKey = 'savings-planner', initialTab = 'plan' }) {
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

  const [tab, setTab] = useState(initialTab); // plan | networth | health
  // 净资产更新器（accounts/snapshots 整体替换式更新）
  const setNW = (updater) =>
    setState((prev) => {
      const next = structuredCloneSafe(prev);
      next.netWorth = updater(next.netWorth || { accounts: DEFAULT_ACCOUNTS, snapshots: [] });
      return next;
    });

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

      <div className="sp-tabs">
        <button className={`sp-tab ${tab === 'plan' ? 'active' : ''}`} onClick={() => setTab('plan')}>测算</button>
        <button className={`sp-tab ${tab === 'networth' ? 'active' : ''}`} onClick={() => setTab('networth')}>净资产</button>
        <button className={`sp-tab ${tab === 'health' ? 'active' : ''}`} onClick={() => setTab('health')}>体检</button>
        <button className={`sp-tab ${tab === 'mc' ? 'active' : ''}`} onClick={() => setTab('mc')}>压力测试</button>
      </div>

      {tab === 'plan' && (
        <>
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
        </>
      )}

      {tab === 'networth' && <NetWorthTab netWorth={state.netWorth} setNW={setNW} />}
      {tab === 'health' && <HealthTab netWorth={state.netWorth} budget={budget} />}
      {tab === 'mc' && <MonteCarloTab forecast={state.forecast} budget={budget} investment={investment} />}
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
            <stop offset="0%" stopColor="#CC785C" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#CC785C" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* 网格 + Y 轴标签 */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={pad.left} y1={y(v)} x2={width - pad.right} y2={y(v)} stroke="#ECEAE2" />
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
            <line x1={pad.left} y1={y(target)} x2={width - pad.right} y2={y(target)} stroke="#B4493E" strokeDasharray="5 4" />
            <text x={width - pad.right} y={y(target) - 6} textAnchor="end" className="sp-axis sp-axis-target">目标 {formatMoney(target)}</text>
          </g>
        )}

        {/* 面积 + 资产线 + 本金线 */}
        <path d={areaPath} fill="url(#sp-area)" />
        <path d={assetLine} fill="none" stroke="#CC785C" strokeWidth="2.5" />
        <path d={principalLine} fill="none" stroke="#5C8A6B" strokeWidth="1.8" strokeDasharray="4 3" />

        {/* 悬停指示 */}
        {hv && (
          <g>
            <line x1={x(hv.year)} y1={pad.top} x2={x(hv.year)} y2={pad.top + innerH} stroke="#B8B5AA" strokeDasharray="3 3" />
            <circle cx={x(hv.year)} cy={y(hv.assets)} r="4.5" fill="#CC785C" stroke="#fff" strokeWidth="2" />
            <circle cx={x(hv.year)} cy={y(hv.principal)} r="3.5" fill="#5C8A6B" stroke="#fff" strokeWidth="2" />
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

/* ============================ 净资产追踪 ============================ */
const NW_CATEGORIES = ['流动', '投资', '固定', '其他'];

function NetWorthTab({ netWorth, setNW }) {
  const accounts = netWorth.accounts || [];
  const snapshots = netWorth.snapshots || [];
  const series = useMemo(() => netWorthSeries(snapshots, accounts), [snapshots, accounts]);
  const change = useMemo(() => netWorthChange(series), [series]);
  const [manageOpen, setManageOpen] = useState(false);

  const current = snapshots[snapshots.length - 1] || null;

  const addSnapshot = () =>
    setNW((nw) => {
      const last = nw.snapshots[nw.snapshots.length - 1];
      const values = last ? { ...last.values } : {};
      return { ...nw, snapshots: [...nw.snapshots, { id: uid('snap'), date: monthLabel(), values }] };
    });
  const updateValue = (snapId, accId, amount) =>
    setNW((nw) => ({
      ...nw,
      snapshots: nw.snapshots.map((s) => (s.id === snapId ? { ...s, values: { ...s.values, [accId]: amount } } : s)),
    }));
  const updateDate = (snapId, date) =>
    setNW((nw) => ({ ...nw, snapshots: nw.snapshots.map((s) => (s.id === snapId ? { ...s, date } : s)) }));
  const removeSnapshot = (snapId) =>
    setNW((nw) => ({ ...nw, snapshots: nw.snapshots.filter((s) => s.id !== snapId) }));
  const addAccount = (name, type, category) =>
    setNW((nw) => ({ ...nw, accounts: [...nw.accounts, { id: uid('acc'), name, type, category: type === 'liability' ? '负债' : category }] }));
  const removeAccount = (accId) =>
    setNW((nw) => ({ ...nw, accounts: nw.accounts.filter((a) => a.id !== accId) }));

  if (!current) {
    return (
      <Section title="净资产追踪" badge="结果">
        <div className="sp-nw-empty">
          <div className="sp-nw-empty-ic">📒</div>
          <p>记录一次你当前的资产与负债，之后定期更新，就能看到净资产随时间增长的曲线，并解锁财务体检。</p>
          <button className="sp-nw-start" onClick={addSnapshot}>＋ 记录第一笔净资产</button>
        </div>
      </Section>
    );
  }

  const totals = snapshotTotals(current, accounts);
  const breakdown = assetBreakdown(current, accounts);
  const maxCat = Math.max(1, ...breakdown.map((b) => b.amount));
  const assetAccts = accounts.filter((a) => a.type === 'asset');
  const liabAccts = accounts.filter((a) => a.type === 'liability');
  const history = snapshots.filter((s) => s.id !== current.id).map((s) => ({ s, net: snapshotTotals(s, accounts).net })).sort((a, b) => (a.s.date < b.s.date ? 1 : -1));

  return (
    <div className="sp-nw">
      <div className="sp-kpis sp-kpis-4">
        <Kpi label="当前净资产" value={formatMoney(totals.net)} tone="hero" />
        <Kpi label="总资产" value={formatMoney(totals.assets)} tone="calc" />
        <Kpi label="总负债" value={formatMoney(totals.liabilities)} tone="bad" />
        <Kpi
          label="较上期"
          value={change ? `${change.abs >= 0 ? '▲' : '▼'} ${formatMoney(Math.abs(change.abs))}` : '—'}
          tone={change && change.abs >= 0 ? 'good' : change ? 'bad' : 'calc'}
        />
      </div>

      <Section title="净资产走势" badge="结果">
        <NetWorthChart series={series} />
        {breakdown.length > 0 && (
          <>
            <h4 className="sp-h4">资产构成</h4>
            <div className="sp-nw-breakdown">
              {breakdown.map((b) => (
                <div className="sp-nw-brow" key={b.category}>
                  <span className="sp-nw-bcat">{b.category}</span>
                  <div className="sp-bar"><div className="sp-bar-fill" style={{ width: `${(b.amount / maxCat) * 100}%` }} /></div>
                  <span className="sp-nw-bamt">{formatMoney(b.amount)} · {formatPct(b.share)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      <Section title="本期明细" badge="输入">
        <div className="sp-nw-daterow">
          <span>记录月份</span>
          <input className="sp-mini-input sp-nw-date" type="month" value={current.date} onChange={(e) => updateDate(current.id, e.target.value)} />
          <button className="sp-link" onClick={() => removeSnapshot(current.id)}>删除本期</button>
        </div>

        <h4 className="sp-h4">资产</h4>
        <div className="sp-fields">
          {assetAccts.map((a) => (
            <NumberField key={a.id} label={a.name} value={current.values[a.id] || 0} onChange={(v) => updateValue(current.id, a.id, v)} unit="元" step={10000} />
          ))}
        </div>

        <h4 className="sp-h4">负债</h4>
        <div className="sp-fields">
          {liabAccts.map((a) => (
            <NumberField key={a.id} label={a.name} value={current.values[a.id] || 0} onChange={(v) => updateValue(current.id, a.id, v)} unit="元" step={10000} />
          ))}
        </div>

        <div className="sp-nw-net">本期净资产 <strong>{formatMoney(totals.net)}</strong>（资产 {formatMoney(totals.assets)} − 负债 {formatMoney(totals.liabilities)}）</div>

        <button className="sp-link" onClick={() => setManageOpen((o) => !o)}>{manageOpen ? '收起' : '管理账户（增删）'}</button>
        {manageOpen && (
          <AccountManager accounts={accounts} onAdd={addAccount} onRemove={removeAccount} />
        )}
      </Section>

      <Section title="历史记录" badge="结果">
        <button className="sp-nw-add" onClick={addSnapshot}>＋ 记录新一期（复制本期数值）</button>
        {history.length === 0 ? (
          <p className="sp-note" style={{ marginTop: 12 }}>还没有更早的记录。每隔一段时间「记录新一期」，曲线就会长出来。</p>
        ) : (
          <div className="sp-nw-hist">
            {history.map(({ s, net }) => (
              <div className="sp-nw-hrow" key={s.id}>
                <span className="sp-nw-hdate">{s.date}</span>
                <span className="sp-nw-hnet">{formatMoney(net)}</span>
                <button className="sp-link sp-link-del" onClick={() => removeSnapshot(s.id)}>删除</button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function AccountManager({ accounts, onAdd, onRemove }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('asset');
  const [category, setCategory] = useState('流动');
  const submit = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), type, category);
    setName('');
  };
  return (
    <div className="sp-acctmgr">
      <div className="sp-acctlist">
        {accounts.map((a) => (
          <div className="sp-acctchip" key={a.id}>
            <span>{a.name}<em>{a.type === 'liability' ? '负债' : a.category}</em></span>
            <button onClick={() => onRemove(a.id)} title="删除账户">✕</button>
          </div>
        ))}
      </div>
      <div className="sp-acctadd">
        <input className="sp-mini-input" placeholder="账户名" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <select className="sp-mini-input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="asset">资产</option>
          <option value="liability">负债</option>
        </select>
        {type === 'asset' && (
          <select className="sp-mini-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {NW_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <button className="sp-link" onClick={submit}>添加</button>
      </div>
    </div>
  );
}

/* SVG 净资产走势（按期数等距，悬停看 title） */
function NetWorthChart({ series }) {
  if (!series || series.length < 2) {
    return <div className="sp-nw-charthint">记录至少两期，这里会出现净资产曲线。</div>;
  }
  const W = 560;
  const H = 200;
  const pad = { t: 16, r: 14, b: 24, l: 60 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const nets = series.map((d) => d.net);
  const max = Math.max(...nets, 0) * 1.08;
  const min = Math.min(...nets, 0);
  const range = max - min || 1;
  const n = series.length;
  const x = (i) => pad.l + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
  const y = (v) => pad.t + innerH - ((v - min) / range) * innerH;
  const area = `M ${x(0)} ${y(min)} ` + series.map((d, i) => `L ${x(i)} ${y(d.net)}`).join(' ') + ` L ${x(n - 1)} ${y(min)} Z`;
  const line = series.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.net)}`).join(' ');
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => min + (range / ticks) * i);
  return (
    <div className="sp-chart">
      <svg viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="sp-nw-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#CC785C" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#CC785C" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={pad.l} y1={y(v)} x2={W - pad.r} y2={y(v)} stroke="#ECEAE2" />
            <text x={pad.l - 7} y={y(v) + 4} textAnchor="end" className="sp-axis">{formatMoney(v)}</text>
          </g>
        ))}
        <path d={area} fill="url(#sp-nw-area)" />
        <path d={line} fill="none" stroke="#CC785C" strokeWidth="2.5" />
        {series.map((d, i) => (
          <g key={d.date}>
            <circle cx={x(i)} cy={y(d.net)} r="3.2" fill="#CC785C" stroke="#fff" strokeWidth="1.5">
              <title>{`${d.date}：${formatMoney(d.net)}`}</title>
            </circle>
            {(i === 0 || i === n - 1) && (
              <text x={x(i)} y={H - 7} textAnchor={i === 0 ? 'start' : 'end'} className="sp-axis">{d.date}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ============================ 财务体检 ============================ */
function HealthTab({ netWorth, budget }) {
  const snaps = netWorth.snapshots || [];
  const current = snaps[snaps.length - 1] || null;
  const totals = current ? snapshotTotals(current, netWorth.accounts) : null;
  const health = financialHealth({
    liquidAssets: totals ? totals.liquid : null,
    monthlyExpense: budget.monthlyExpense,
    savingRate: budget.savingRate,
    totalAssets: totals ? totals.assets : 0,
    totalLiabilities: totals ? totals.liabilities : 0,
    annualNetIncome: budget.monthlyNetIncome * 12,
    netWorth: totals ? totals.net : null,
  });

  return (
    <Section title="财务健康体检" badge="结果">
      <div className={`sp-health-score s-${health.grade === '优' ? 'good' : health.grade === '良' ? 'ok' : 'warn'}`}>
        <div className="sp-health-grade">{health.grade}</div>
        <div className="sp-health-meta">
          <div className="sp-health-num">{health.score == null ? '—' : `${health.score} 分`}</div>
          <div className="sp-health-cap">综合财务健康度</div>
        </div>
      </div>

      {!current && (
        <p className="sp-note" style={{ marginTop: 12 }}>
          提示：去「净资产」记录一次资产 / 负债，即可解锁应急储备、负债率、净资产倍数等更多体检项。
        </p>
      )}

      <div className="sp-health-list">
        {health.checks.map((c) => (
          <div className={`sp-health-item s-${c.status}`} key={c.key}>
            <div className="sp-health-top">
              <span className="sp-health-dot" />
              <span className="sp-health-label">{c.label}</span>
              <span className="sp-health-val">{c.value}</span>
            </div>
            <div className="sp-health-advice">{c.advice}</div>
          </div>
        ))}
      </div>
      <p className="sp-disclaimer">体检基于通用经验阈值的粗略参考，因人 / 因城而异，<strong>不构成专业财务建议</strong>。</p>
    </Section>
  );
}

/* ============================ 压力测试（蒙特卡洛） ============================ */
function MonteCarloTab({ forecast, budget, investment }) {
  const makeDefaults = () => ({
    mean: round1((investment.effectiveReturn || 0) * 100),
    vol: 15,
    annualSaving: Math.max(0, Math.round(budget.annualSaving || 0)),
    currentAssets: forecast.currentAssets,
    target: forecast.target,
    years: forecast.years,
    runs: 2000,
    seed: 1,
  });
  const [mc, setMc] = useState(makeDefaults);
  const set = (patch) => setMc((p) => ({ ...p, ...patch }));
  const sim = useMemo(
    () =>
      simulate({
        currentAssets: mc.currentAssets,
        annualSaving: mc.annualSaving,
        mean: mc.mean / 100,
        vol: mc.vol / 100,
        years: mc.years,
        target: mc.target,
        runs: mc.runs,
        seed: mc.seed,
      }),
    [mc.currentAssets, mc.annualSaving, mc.mean, mc.vol, mc.years, mc.target, mc.runs, mc.seed]
  );

  return (
    <div className="sp-grid">
      <div className="sp-col">
        <Section title="假设与变量" badge="输入">
          <p className="sp-note">
            收益不再固定，而是每年按「均值 ± 波动率」随机抽样，跑 {mc.runs} 次看结果分布。拖动滑块，下方实时变化。
          </p>
          <SliderRow label="预期年化" value={mc.mean} min={0} max={15} step={0.1} unit="%" wide onChange={(v) => set({ mean: v })} />
          <SliderRow label="波动率" value={mc.vol} min={0} max={35} step={1} unit="%" wide onChange={(v) => set({ vol: v })} />
          <div className="sp-mc-presets">
            <span>波动预设：</span>
            {VOL_PRESETS.map((p) => {
              const pv = Math.round(p.vol * 100);
              return (
                <button key={p.key} className={`sp-mc-preset ${Math.round(mc.vol) === pv ? 'on' : ''}`} onClick={() => set({ vol: pv })}>
                  {p.label} {pv}%
                </button>
              );
            })}
          </div>
          <div className="sp-fields" style={{ marginTop: 12 }}>
            <NumberField label="当前总资产" value={mc.currentAssets} onChange={(v) => set({ currentAssets: v })} unit="元" step={100000} />
            <NumberField label="每年储蓄" value={mc.annualSaving} onChange={(v) => set({ annualSaving: v })} unit="元" step={50000} />
            <NumberField label="目标金额" value={mc.target} onChange={(v) => set({ target: v })} unit="元" step={1000000} />
          </div>
          <SliderRow label="预测年限" value={mc.years} min={5} max={50} step={1} unit="年" wide onChange={(v) => set({ years: v })} />
          <SliderRow label="模拟次数" value={mc.runs} min={500} max={5000} step={500} unit="次" wide onChange={(v) => set({ runs: v })} />
          <div className="sp-mc-actions">
            <button className="sp-link" onClick={() => setMc(makeDefaults())}>↺ 用规划数值</button>
            <button className="sp-mc-roll" onClick={() => set({ seed: mc.seed + 1 })}>🎲 重新模拟</button>
          </div>
        </Section>
      </div>

      <div className="sp-col">
        <Section title="达成概率" badge="结果">
          <div className="sp-mc-prob">
            <Gauge value={sim.successProb} />
            <div className="sp-mc-readouts">
              <div className="sp-mc-r"><span>中位结果</span><strong>{formatMoney(sim.finals.p50)}</strong></div>
              <div className="sp-mc-r"><span>区间 P10–P90</span><strong>{formatMoney(sim.finals.p10)} ~ {formatMoney(sim.finals.p90)}</strong></div>
              <div className="sp-mc-r"><span>中位达成年数</span><strong>{sim.medianYears ? `${sim.medianYears} 年` : '期限内未达成'}</strong></div>
              <div className="sp-mc-r"><span>期限内曾达成</span><strong>{formatPct(sim.reachProb)}</strong></div>
            </div>
          </div>
        </Section>
        <Section title="可能的资产区间" badge="结果">
          <FanChart bands={sim.bands} target={mc.target} />
        </Section>
        <Section title={`第 ${mc.years} 年结果分布`} badge="结果">
          <Histogram histogram={sim.histogram} target={mc.target} />
        </Section>
      </div>
    </div>
  );
}

function Gauge({ value }) {
  const pct = Math.max(0, Math.min(1, value || 0));
  const size = 132;
  const r = 56;
  const c = 2 * Math.PI * r;
  const color = pct >= 0.8 ? '#6E9079' : pct >= 0.5 ? '#BE9356' : '#BC6055';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="sp-gauge">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1EFE8" strokeWidth="12" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray .35s, stroke .35s' }}
      />
      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central" className="sp-gauge-num" style={{ fill: color }}>
        {Math.round(pct * 100)}%
      </text>
      <text x="50%" y="64%" textAnchor="middle" className="sp-gauge-cap">达成概率</text>
    </svg>
  );
}

function FanChart({ bands, target }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(520);
  const [hover, setHover] = useState(null);
  const height = 240;
  const pad = { top: 16, right: 14, bottom: 26, left: 56 };

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      if (w > 0) setWidth(Math.max(280, w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const n = bands.length;
  const maxV = Math.max(target, ...bands.map((b) => b.p90)) * 1.08 || 1;
  const x = (i) => pad.left + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
  const y = (v) => pad.top + innerH - (v / maxV) * innerH;

  const areaBetween = (lo, hi) => {
    let d = `M ${x(0)} ${y(bands[0][hi])}`;
    for (let i = 1; i < n; i++) d += ` L ${x(i)} ${y(bands[i][hi])}`;
    for (let i = n - 1; i >= 0; i--) d += ` L ${x(i)} ${y(bands[i][lo])}`;
    return d + ' Z';
  };
  const lineOf = (key) => bands.map((b, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(b[key])}`).join(' ');

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => (maxV / ticks) * i);
  const xStep = Math.max(1, Math.round((n - 1) / 6));
  const xTicks = bands.filter((_, i) => i % xStep === 0 || i === n - 1);

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (width / rect.width);
    const idx = Math.round(((px - pad.left) / innerW) * (n - 1));
    if (idx >= 0 && idx < n) setHover(idx);
  };
  const hv = hover != null ? bands[hover] : null;

  return (
    <div className="sp-chart" ref={wrapRef}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={pad.left} y1={y(v)} x2={width - pad.right} y2={y(v)} stroke="#ECEAE2" />
            <text x={pad.left - 8} y={y(v) + 4} textAnchor="end" className="sp-axis">{formatMoney(v)}</text>
          </g>
        ))}
        {xTicks.map((b) => (
          <text key={b.year} x={x(b.year)} y={height - 8} textAnchor="middle" className="sp-axis">{b.year}年</text>
        ))}
        {target <= maxV && (
          <g>
            <line x1={pad.left} y1={y(target)} x2={width - pad.right} y2={y(target)} stroke="#B4493E" strokeDasharray="5 4" />
            <text x={width - pad.right} y={y(target) - 6} textAnchor="end" className="sp-axis sp-axis-target">目标 {formatMoney(target)}</text>
          </g>
        )}
        <path d={areaBetween('p10', 'p90')} fill="#CC785C" opacity="0.12" />
        <path d={areaBetween('p25', 'p75')} fill="#CC785C" opacity="0.22" />
        <path d={lineOf('p50')} fill="none" stroke="#CC785C" strokeWidth="2.5" />
        {hv && (
          <g>
            <line x1={x(hv.year)} y1={pad.top} x2={x(hv.year)} y2={pad.top + innerH} stroke="#B8B5AA" strokeDasharray="3 3" />
            <circle cx={x(hv.year)} cy={y(hv.p50)} r="4" fill="#CC785C" stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hv && (
        <div className="sp-tip" style={{ left: `${(x(hv.year) / width) * 100}%`, transform: `translateX(${hv.year > n / 2 ? '-105%' : '8px'})` }}>
          <div className="sp-tip-year">第 {hv.year} 年</div>
          <div>乐观 P90 {formatMoney(hv.p90)}</div>
          <div>中位 P50 {formatMoney(hv.p50)}</div>
          <div className="sp-tip-gain">悲观 P10 {formatMoney(hv.p10)}</div>
        </div>
      )}
      <div className="sp-legend">
        <span><i className="sp-fan-sw" style={{ background: 'rgba(204,120,92,.22)' }} /> P25–75</span>
        <span><i className="sp-fan-sw" style={{ background: 'rgba(204,120,92,.12)' }} /> P10–90</span>
        <span><i className="sp-line sp-line-a" /> 中位</span>
        <span><i className="sp-line sp-line-t" /> 目标</span>
      </div>
    </div>
  );
}

function Histogram({ histogram, target }) {
  const W = 520;
  const H = 168;
  const pad = { t: 10, r: 12, b: 22, l: 12 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const maxC = Math.max(1, ...histogram.map((h) => h.count));
  const min = histogram[0].x0;
  const max = histogram[histogram.length - 1].x1;
  const span = max - min || 1;
  const bw = innerW / histogram.length;
  const tx = pad.l + ((target - min) / span) * innerW;
  return (
    <div className="sp-chart">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        {histogram.map((h, i) => {
          const bh = (h.count / maxC) * innerH;
          const success = h.x0 >= target;
          return (
            <rect key={i} x={pad.l + i * bw + 0.5} y={pad.t + innerH - bh} width={Math.max(1, bw - 1)} height={bh} rx={1.5} fill={success ? '#6E9079' : '#D8CFC4'}>
              <title>{`${formatMoney(h.x0)} ~ ${formatMoney(h.x1)}：${h.count} 次`}</title>
            </rect>
          );
        })}
        {target > min && target < max && (
          <line x1={tx} y1={pad.t} x2={tx} y2={pad.t + innerH} stroke="#B4493E" strokeDasharray="4 3" />
        )}
        <text x={pad.l} y={H - 6} className="sp-axis" textAnchor="start">{formatMoney(min)}</text>
        <text x={W - pad.r} y={H - 6} className="sp-axis" textAnchor="end">{formatMoney(max)}</text>
      </svg>
      <div className="sp-legend">
        <span><i className="sp-sq" style={{ background: '#6E9079' }} /> 达标</span>
        <span><i className="sp-sq" style={{ background: '#D8CFC4' }} /> 未达标</span>
        <span><i className="sp-line sp-line-t" /> 目标线</span>
      </div>
    </div>
  );
}

/* ----------------------------- 工具函数 ----------------------------- */
let __sid = 0;
function uid(prefix) {
  __sid = (__sid + 1) % 1e6;
  return `${prefix}_${Date.now().toString(36)}_${__sid.toString(36)}`;
}
function monthLabel(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
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
.sp-root{--accent:#CC785C;--accent-2:#B5654A;--accent-soft:#F5ECE5;--g:#6E9079;
  --surface:#FFFFFF;--surface-2:#FBFAF6;--surface-3:#F1EFE8;--bd:#ECEAE2;--bd-2:#E3E0D7;--bd-soft:#F0EEE7;
  --t1:#26241F;--t2:#83827A;--t3:#B0AFA5;--danger:#BC6055;--warn:#BE9356;
  --serif:'Tiempos Text',Georgia,'Songti SC','STSong','Source Han Serif SC','Noto Serif CJK SC',serif;
  --sans:ui-sans-serif,system-ui,-apple-system,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;
  font-family:var(--sans);font-size:13px;color:var(--t1);line-height:1.55;max-width:1000px;margin:0 auto;}
.sp-root *{box-sizing:border-box;}
.sp-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:18px;}
.sp-header h1{font-family:var(--serif);font-size:21px;font-weight:500;margin:0;letter-spacing:-.3px;}
.sp-sub{margin:5px 0 0;color:var(--t2);font-size:12.5px;}
.sp-reset{flex:none;background:none;border:1px solid var(--bd);border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer;color:var(--t2);transition:.15s;}
.sp-reset:hover{border-color:var(--bd-2);background:var(--surface-2);color:var(--t1);}

.sp-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px;}
.sp-kpi{background:var(--surface);border:1px solid var(--bd);border-radius:12px;padding:11px 13px;}
.sp-kpi-label{font-size:11px;color:var(--t3);margin-bottom:5px;letter-spacing:.2px;}
.sp-kpi-value{font-family:var(--serif);font-size:18px;font-weight:500;letter-spacing:-.3px;}
.sp-kpi-hero{background:var(--accent-soft);border-color:transparent;}
.sp-kpi-hero .sp-kpi-label{color:var(--accent-2);opacity:.8;}
.sp-kpi-hero .sp-kpi-value{color:var(--accent-2);}
.sp-kpi-calc .sp-kpi-value{color:var(--t1);}
.sp-kpi-good .sp-kpi-value{color:var(--g);}
.sp-kpi-bad .sp-kpi-value{color:var(--danger);}

.sp-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.sp-col{display:flex;flex-direction:column;gap:14px;}
.sp-section{background:var(--surface);border:1px solid var(--bd);border-radius:14px;overflow:hidden;}
.sp-section-head{display:flex;justify-content:space-between;align-items:center;padding:13px 16px;border-bottom:1px solid var(--bd-soft);}
.sp-section-head h3{margin:0;font-size:14px;font-weight:600;letter-spacing:-.1px;}
.sp-badge{font-size:10.5px;padding:2px 8px;border-radius:999px;font-weight:500;letter-spacing:.3px;}
.sp-badge-in{background:none;color:var(--t3);border:1px solid var(--bd);}
.sp-badge-out{background:none;color:var(--accent-2);border:1px solid var(--accent-soft);}
.sp-section-body{padding:16px;}
.sp-h4{margin:18px 0 8px;font-size:12px;font-weight:600;color:var(--t2);letter-spacing:.2px;}

.sp-person{border:1px solid var(--bd-soft);border-radius:11px;padding:13px;margin-bottom:10px;background:var(--surface-2);}
.sp-person-title{font-size:12px;font-weight:600;margin-bottom:9px;color:var(--accent-2);letter-spacing:.2px;}
.sp-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.sp-field{display:flex;flex-direction:column;gap:4px;}
.sp-field-sm{font-size:11.5px;}
.sp-field-label{font-size:11.5px;color:var(--t2);}
.sp-field-input{display:flex;align-items:center;background:var(--surface);border:1px solid var(--bd);border-radius:8px;padding:0 10px;transition:.15s;}
.sp-field-input input{flex:1;border:none;outline:none;padding:8px 0;font-size:13px;background:transparent;width:100%;color:var(--t1);font-family:var(--sans);font-variant-numeric:tabular-nums;}
.sp-field-input em{font-style:normal;color:var(--t3);font-size:11.5px;margin-left:4px;}
.sp-field-input:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft);}

.sp-link{background:none;border:none;color:var(--accent-2);font-size:11.5px;cursor:pointer;padding:9px 0 0;text-align:left;}
.sp-link:hover{text-decoration:underline;}
.sp-specials{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:9px;padding:11px;background:var(--surface);border:1px solid var(--bd-soft);border-radius:9px;}

.sp-taxout{margin-top:11px;padding:11px;background:var(--surface);border:1px solid var(--bd-soft);border-radius:9px;font-size:11.5px;display:flex;flex-wrap:wrap;align-items:center;gap:6px;}
.sp-arrow{color:var(--t3);}
.sp-taxout-net{font-weight:600;color:var(--g);font-variant-numeric:tabular-nums;}
.sp-taxout-detail{flex-basis:100%;color:var(--t3);margin-top:3px;}

.sp-toggle{display:flex;align-items:center;gap:7px;font-size:12.5px;margin:9px 0;cursor:pointer;color:var(--t2);}
.sp-toggle input{width:14px;height:14px;accent-color:var(--accent);}
.sp-toggle-inline{margin:0;}

.sp-saverate{margin-top:16px;}
.sp-saverate-top{display:flex;justify-content:space-between;font-size:11.5px;color:var(--t2);margin-bottom:7px;flex-wrap:wrap;gap:4px;}
.sp-pos{color:var(--g);}.sp-neg{color:var(--danger);}
.sp-bar{height:6px;background:var(--surface-3);border-radius:999px;overflow:hidden;}
.sp-bar-fill{height:100%;background:var(--accent);opacity:.85;border-radius:999px;transition:width .35s;}

.sp-note{font-size:11.5px;color:var(--t3);margin:0 0 14px;}
.sp-alloc{padding:10px 0;border-bottom:1px solid var(--bd-soft);}
.sp-alloc-head{display:flex;align-items:center;gap:8px;font-size:12.5px;margin-bottom:7px;}
.sp-dot{width:8px;height:8px;border-radius:2px;flex:none;opacity:.85;}
.sp-alloc-amt{margin-left:auto;color:var(--t2);font-size:11.5px;font-variant-numeric:tabular-nums;}
.sp-alloc-sliders{display:grid;grid-template-columns:1fr 1fr;gap:11px;}
.sp-alloc-bar{height:5px;background:var(--surface-3);border-radius:999px;margin-top:8px;overflow:hidden;}
.sp-alloc-bar-fill{height:100%;border-radius:999px;opacity:.8;transition:width .3s;}
.sp-weightsum{margin-top:13px;font-size:12.5px;font-weight:500;display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;padding:8px 11px;border-radius:9px;}
.sp-weightsum.ok{background:var(--surface-2);color:var(--g);border:1px solid var(--bd-soft);}
.sp-weightsum.warn{background:var(--surface-2);color:var(--warn);border:1px solid var(--bd-soft);}
.sp-weightsum-ret{font-weight:600;font-variant-numeric:tabular-nums;}

.sp-slider{display:grid;grid-template-columns:30px 1fr 44px;align-items:center;gap:9px;font-size:11.5px;}
.sp-slider-wide{grid-template-columns:52px 1fr 48px;margin:12px 0;}
.sp-slider-label{color:var(--t2);}
.sp-slider input[type=range]{width:100%;accent-color:var(--accent);}
.sp-slider-value{text-align:right;font-weight:500;font-variant-numeric:tabular-nums;color:var(--t1);}

.sp-goal{margin:16px 0;padding:20px;border-radius:14px;background:var(--surface-2);border:1px solid var(--bd-soft);text-align:center;}
.sp-goal-label{font-size:12.5px;color:var(--t2);}
.sp-goal-value{font-size:16px;margin-top:5px;color:var(--t2);}
.sp-goal-num{font-family:var(--serif);font-size:42px;font-weight:500;color:var(--accent-2);letter-spacing:-1.2px;}
.sp-goal-sub{font-size:11.5px;color:var(--t3);margin-top:5px;font-variant-numeric:tabular-nums;}

.sp-chart{position:relative;margin:10px 0 4px;}
.sp-chart svg{display:block;width:100%;height:auto;}
.sp-axis{font-size:9.5px;fill:var(--t3);font-variant-numeric:tabular-nums;}
.sp-axis-target{fill:var(--danger);}
.sp-tip{position:absolute;top:10px;background:#33302A;color:#fff;border-radius:10px;padding:8px 10px;font-size:11.5px;pointer-events:none;white-space:nowrap;box-shadow:0 6px 20px rgba(40,36,30,.18);z-index:2;}
.sp-tip-year{font-weight:600;margin-bottom:3px;}
.sp-tip-gain{color:#E6BE97;margin-top:3px;}
.sp-tip div{font-variant-numeric:tabular-nums;}
.sp-sq{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:5px;}
.sp-sq-a{background:var(--accent);}.sp-sq-g2{background:var(--g);}
.sp-legend{display:flex;gap:16px;font-size:11.5px;color:var(--t3);justify-content:center;margin-top:7px;}
.sp-line{display:inline-block;width:15px;height:0;border-top-width:2px;border-top-style:solid;vertical-align:middle;margin-right:5px;}
.sp-line-a{border-color:var(--accent);}
.sp-line-p{border-color:var(--g);border-top-style:dashed;}
.sp-line-t{border-color:var(--danger);border-top-style:dashed;}

.sp-split{margin:16px 0;}
.sp-split-head{font-size:12.5px;margin-bottom:9px;color:var(--t2);}
.sp-split-head strong{color:var(--t1);font-family:var(--serif);font-size:15px;font-weight:500;}
.sp-split-bar{display:flex;height:11px;border-radius:7px;overflow:hidden;background:var(--surface-3);}
.sp-split-principal{background:var(--g);opacity:.85;}
.sp-split-gain{background:#D9A066;opacity:.85;}
.sp-split-legend{display:flex;gap:16px;font-size:11.5px;color:var(--t2);margin-top:8px;flex-wrap:wrap;}
.sp-sq-p{background:var(--g);}.sp-sq-g{background:#D9A066;}

.sp-sensitivity{margin-top:16px;padding-top:14px;border-top:1px solid var(--bd-soft);}
.sp-sens-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11.5px;margin-top:5px;color:var(--t2);}
.sp-mini-input{width:52px;background:var(--surface);border:1px solid var(--bd);border-radius:7px;padding:4px 7px;font-size:11.5px;color:var(--t1);font-variant-numeric:tabular-nums;}
.sp-toggle-tail{font-size:12.5px;color:var(--t2);}
.sp-effret{margin-top:9px;font-size:12.5px;color:var(--t2);}
.sp-effret strong{color:var(--accent-2);font-variant-numeric:tabular-nums;}

.sp-disclaimer{margin-top:18px;font-size:11px;color:var(--t3);background:none;border:1px solid var(--bd-soft);border-radius:11px;padding:12px 14px;line-height:1.65;}
.sp-disclaimer strong{color:var(--t2);}

/* ===== Tab ===== */
.sp-tabs{display:flex;gap:4px;border-bottom:1px solid var(--bd);margin-bottom:16px;}
.sp-tab{background:none;border:none;padding:9px 15px;font-size:13px;color:var(--t2);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;font-family:var(--sans);transition:.15s;}
.sp-tab:hover{color:var(--t1);}
.sp-tab.active{color:var(--accent-2);border-bottom-color:var(--accent);font-weight:600;}
.sp-kpis-4{grid-template-columns:repeat(4,1fr);}

/* ===== 净资产 ===== */
.sp-nw{display:flex;flex-direction:column;gap:14px;}
.sp-nw-empty{text-align:center;padding:34px 16px;color:var(--t2);}
.sp-nw-empty-ic{font-size:34px;margin-bottom:10px;}
.sp-nw-empty p{font-size:12.5px;max-width:420px;margin:0 auto 16px;line-height:1.7;}
.sp-nw-start,.sp-nw-add{background:var(--accent);color:#fff;border:none;border-radius:9px;padding:9px 16px;font-size:13px;cursor:pointer;font-family:var(--sans);transition:.15s;}
.sp-nw-start:hover,.sp-nw-add:hover{background:var(--accent-2);}
.sp-nw-breakdown{display:flex;flex-direction:column;gap:9px;}
.sp-nw-brow{display:grid;grid-template-columns:56px 1fr auto;align-items:center;gap:10px;font-size:11.5px;}
.sp-nw-bcat{color:var(--t2);}
.sp-nw-bamt{color:var(--t2);font-variant-numeric:tabular-nums;font-size:11px;}
.sp-nw-daterow{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--t2);margin-bottom:6px;flex-wrap:wrap;}
.sp-nw-date{width:130px;}
.sp-nw-net{margin-top:14px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--bd-soft);border-radius:9px;font-size:12.5px;color:var(--t2);}
.sp-nw-net strong{font-family:var(--serif);font-size:16px;color:var(--accent-2);margin-right:4px;}
.sp-nw-charthint{padding:26px 16px;text-align:center;color:var(--t3);font-size:12px;background:var(--surface-2);border:1px dashed var(--bd-2);border-radius:10px;}
.sp-nw-hist{display:flex;flex-direction:column;gap:7px;margin-top:12px;}
.sp-nw-hrow{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:12px;font-size:12.5px;padding:8px 11px;background:var(--surface-2);border:1px solid var(--bd-soft);border-radius:9px;}
.sp-nw-hdate{color:var(--t2);font-variant-numeric:tabular-nums;}
.sp-nw-hnet{font-weight:600;font-variant-numeric:tabular-nums;color:var(--t1);}
.sp-link-del{color:var(--t3);}
.sp-link-del:hover{color:var(--danger);}

.sp-acctmgr{margin-top:10px;padding:11px;background:var(--surface-2);border:1px solid var(--bd-soft);border-radius:9px;}
.sp-acctlist{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;}
.sp-acctchip{display:flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--bd);border-radius:999px;padding:4px 6px 4px 11px;font-size:11.5px;}
.sp-acctchip em{font-style:normal;color:var(--t3);margin-left:5px;}
.sp-acctchip button{background:none;border:none;color:var(--t3);cursor:pointer;font-size:11px;padding:1px 4px;border-radius:5px;}
.sp-acctchip button:hover{color:var(--danger);background:var(--surface-3);}
.sp-acctadd{display:flex;gap:7px;align-items:center;flex-wrap:wrap;}
.sp-acctadd .sp-mini-input{width:auto;flex:1;min-width:90px;}

/* ===== 体检 ===== */
.sp-health-score{display:flex;align-items:center;gap:16px;padding:16px 18px;border-radius:14px;background:var(--surface-2);border:1px solid var(--bd-soft);}
.sp-health-grade{font-family:var(--serif);font-size:34px;font-weight:500;width:58px;height:58px;display:flex;align-items:center;justify-content:center;border-radius:50%;flex:none;}
.sp-health-score.s-good .sp-health-grade{color:var(--g);background:#EBF1ED;}
.sp-health-score.s-ok .sp-health-grade{color:var(--warn);background:#F6EFE2;}
.sp-health-score.s-warn .sp-health-grade{color:var(--danger);background:#F6E8E5;}
.sp-health-num{font-family:var(--serif);font-size:22px;font-weight:500;color:var(--t1);}
.sp-health-cap{font-size:11.5px;color:var(--t3);margin-top:2px;}
.sp-health-list{display:flex;flex-direction:column;gap:9px;margin-top:14px;}
.sp-health-item{padding:11px 13px;border:1px solid var(--bd-soft);border-radius:10px;background:var(--surface);border-left-width:3px;}
.sp-health-item.s-good{border-left-color:var(--g);}
.sp-health-item.s-ok{border-left-color:var(--warn);}
.sp-health-item.s-warn{border-left-color:var(--danger);}
.sp-health-item.s-na{border-left-color:var(--bd-2);}
.sp-health-top{display:flex;align-items:center;gap:8px;}
.sp-health-dot{width:7px;height:7px;border-radius:50%;flex:none;background:var(--t3);}
.sp-health-item.s-good .sp-health-dot{background:var(--g);}
.sp-health-item.s-ok .sp-health-dot{background:var(--warn);}
.sp-health-item.s-warn .sp-health-dot{background:var(--danger);}
.sp-health-label{font-size:13px;font-weight:600;}
.sp-health-val{margin-left:auto;font-size:12.5px;color:var(--t2);font-variant-numeric:tabular-nums;}
.sp-health-advice{font-size:11.5px;color:var(--t2);margin-top:5px;padding-left:15px;}

/* ===== 压力测试 ===== */
.sp-mc-presets{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:11.5px;color:var(--t3);margin-top:10px;}
.sp-mc-preset{border:1px solid var(--bd);background:var(--surface);border-radius:999px;padding:4px 11px;font-size:11.5px;cursor:pointer;color:var(--t2);transition:.15s;font-family:var(--sans);}
.sp-mc-preset:hover{border-color:var(--bd-2);}
.sp-mc-preset.on{background:var(--accent-soft);border-color:var(--accent);color:var(--accent-2);font-weight:600;}
.sp-mc-actions{display:flex;justify-content:space-between;align-items:center;margin-top:14px;}
.sp-mc-roll{background:var(--accent);color:#fff;border:none;border-radius:9px;padding:8px 15px;font-size:12.5px;cursor:pointer;font-family:var(--sans);transition:.15s;}
.sp-mc-roll:hover{background:var(--accent-2);}
.sp-mc-prob{display:flex;align-items:center;gap:18px;flex-wrap:wrap;}
.sp-gauge{flex:none;}
.sp-gauge-num{font-family:var(--serif);font-size:26px;font-weight:600;}
.sp-gauge-cap{font-size:10.5px;fill:var(--t3);}
.sp-mc-readouts{flex:1;min-width:180px;display:flex;flex-direction:column;gap:8px;}
.sp-mc-r{display:flex;justify-content:space-between;align-items:baseline;gap:10px;font-size:12px;color:var(--t2);border-bottom:1px solid var(--bd-soft);padding-bottom:7px;}
.sp-mc-r:last-child{border-bottom:none;}
.sp-mc-r strong{font-family:var(--serif);font-size:14.5px;font-weight:500;color:var(--t1);font-variant-numeric:tabular-nums;text-align:right;}
.sp-fan-sw{display:inline-block;width:14px;height:9px;border-radius:2px;margin-right:5px;vertical-align:middle;}

@media(max-width:860px){
  .sp-kpis{grid-template-columns:repeat(2,1fr);}
  .sp-kpis-4{grid-template-columns:repeat(2,1fr);}
  .sp-kpi-hero{grid-column:1 / -1;}
  .sp-grid{grid-template-columns:1fr;}
}
@media(max-width:480px){
  .sp-fields{grid-template-columns:1fr;}
  .sp-specials{grid-template-columns:1fr;}
  .sp-alloc-sliders{grid-template-columns:1fr;}
}
`;

/**
 * 减脂计划 —— React 组件（函数式 + hooks）
 * ------------------------------------------------------------------
 * 体态/减脂追踪器：每日记体重 + 摄入热量（可选运动消耗 / 体脂%），
 * 用趋势体重(EMA)与自适应 TDEE 给出激励性仪表盘：进度、预计达成日、
 * 本周速度、能量缺口与连续达标、体重趋势曲线(手写 SVG)。
 *
 * 计算逻辑全部来自 ./calc.js（纯函数，已单测）。样式复用 core/ui.jsx 的 gx- 基元。
 * 数据：localStorage 键 `cut-planner`，结构 { v, profile, logs:[...] }，带版本迁移。
 * props：{ storageKey?, onChange? }
 */
import React, { useEffect, useMemo, useState } from 'react';
import { loadState, saveState, uid } from '../core/store.js';
import { SHARED_CSS, Progress, Empty } from '../core/ui.jsx';
import { todayStr, fmtDate, fmtMD, relDay, weekdayCN } from '../core/date.js';
import {
  ACTIVITY_LEVELS,
  summary,
  trendSeries,
  deficitSeries,
  estimateTDEE,
  calorieTargetForRate,
  logOn,
  bodyComposition,
} from './calc.js';

const STORE_KEY = 'cut-planner';
const DEFAULTS = { v: 1, profile: null, logs: [] };

export default function CutPlanner({ storageKey = STORE_KEY, onChange }) {
  const [data, setData] = useState(() => loadState(storageKey, DEFAULTS));
  const [editingProfile, setEditingProfile] = useState(false);

  useEffect(() => {
    saveState(storageKey, data);
    if (onChange) onChange();
  }, [data, storageKey, onChange]);

  const today = todayStr();
  const profile = data.profile;
  const logs = data.logs || [];

  const setProfile = (p) => { setData((d) => ({ ...d, profile: p })); setEditingProfile(false); };
  const upsertLog = (patch) => setData((d) => {
    const logs = d.logs || [];
    const idx = logs.findIndex((l) => l.date === patch.date);
    const clean = { ...patch };
    // 去掉空字段
    for (const k of ['weight', 'intake', 'exercise', 'bodyFat']) if (clean[k] === '' || clean[k] == null) delete clean[k];
    let next;
    if (idx >= 0) {
      const merged = { ...logs[idx], ...clean };
      next = logs.map((l, i) => (i === idx ? merged : l));
    } else {
      next = [...logs, { id: uid('cut'), ...clean }];
    }
    return { ...d, logs: next };
  });
  const deleteLog = (date) => setData((d) => ({ ...d, logs: (d.logs || []).filter((l) => l.date !== date) }));

  if (!profile) {
    return (
      <div className="gx-root">
        <style>{SHARED_CSS}</style>
        <div className="gx-head">
          <h2>📉 减脂计划</h2>
          <p>设定你的减脂目标，开始用数据驱动的方式稳步推进</p>
        </div>
        <ProfileForm onSubmit={setProfile} />
        <p className="gx-disclaim">⚠️ 体重与热量为长期趋势估算，个体差异大、并非医疗或营养建议。极端节食有害健康，如有需要请咨询专业人士。</p>
      </div>
    );
  }

  const s = summary(profile, logs, today);
  const { tdee } = estimateTDEE(profile, logs);

  return (
    <div className="gx-root">
      <style>{SHARED_CSS}{CUT_CSS}</style>

      <div className="gx-headrow">
        <div className="gx-head">
          <h2>📉 减脂计划</h2>
          <p>{profile.startWeight}kg → {profile.goalWeight}kg{profile.goalBodyFat ? ` · 目标体脂 ${profile.goalBodyFat}%` : ''}</p>
        </div>
        <button className="gx-btn gx-btn-sm" onClick={() => setEditingProfile(true)}>⚙ 目标设置</button>
      </div>

      {/* 进度英雄区 */}
      <div className="gx-card cut-hero">
        <div className="cut-hero-top">
          <div>
            <div className="cut-big">{s.currentTrend}<span className="cut-unit">kg</span></div>
            <div className="cut-sub">趋势体重{s.currentWeight != null && s.currentWeight !== s.currentTrend ? ` · 今日实测 ${s.currentWeight}kg` : ''}</div>
          </div>
          <div className="cut-hero-stat">
            <div><span className="cut-stat-v good">−{s.lost}</span><span className="cut-stat-l">已减 kg</span></div>
            <div><span className="cut-stat-v accent">{s.remaining}</span><span className="cut-stat-l">还剩 kg</span></div>
          </div>
        </div>
        <div style={{ margin: '12px 0 6px' }}><Progress pct={s.progressPct} good={s.progressPct >= 100} /></div>
        <div className="cut-scale"><span>{profile.startWeight}kg</span><span>{s.progressPct}%</span><span>{profile.goalWeight}kg</span></div>
      </div>

      {/* KPI 区 */}
      <div className="gx-kpis" style={{ marginTop: 14 }}>
        <div className="gx-kpi">
          <div className="gx-kpi-v">{s.weeklyRate == null ? '—' : (s.weeklyRate > 0 ? '+' : '') + s.weeklyRate}<span style={{ fontSize: 12 }}> kg/周</span></div>
          <div className="gx-kpi-l">本周趋势速度</div>
        </div>
        <div className="gx-kpi">
          <div className="gx-kpi-v accent">{s.projectedDate ? fmtMD(s.projectedDate) : '—'}</div>
          <div className="gx-kpi-l">{s.projectedDate ? `预计达成 · ${relDay(s.projectedDate, today)}` : '保持缺口才能预测'}</div>
        </div>
        <div className="gx-kpi">
          <div className="gx-kpi-v">{s.tdee}<span style={{ fontSize: 12 }}> kcal</span></div>
          <div className="gx-kpi-l">日均消耗 · {s.tdeeMode === 'adaptive' ? '自适应' : '公式估算'}</div>
        </div>
        <div className="gx-kpi">
          <div className="gx-kpi-v good">{s.deficitStreak}<span style={{ fontSize: 12 }}> 天</span></div>
          <div className="gx-kpi-l">连续缺口达标 🔥</div>
        </div>
      </div>

      {/* 今日记录 */}
      <TodayLog today={today} log={logOn(logs, today)} tdee={tdee} profile={profile} onSave={upsertLog} />

      {/* 体重趋势图 */}
      <div className="gx-card" style={{ marginTop: 14 }}>
        <div className="gx-sechead"><h3>📈 体重趋势</h3><span className="gx-sub">实测点 + 趋势线 + 目标线</span></div>
        <WeightChart logs={logs} profile={profile} />
      </div>

      {/* 能量缺口 */}
      <div className="gx-card" style={{ marginTop: 14 }}>
        <div className="gx-sechead"><h3>🔥 能量缺口（近 14 天）</h3><span className="gx-sub">绿=有缺口 · 红=超标</span></div>
        <DeficitBars logs={logs} tdee={tdee} today={today} />
      </div>

      {/* 身体成分（有体脂时） */}
      {s.bodyFat != null && (
        <div className="gx-card" style={{ marginTop: 14 }}>
          <div className="gx-sechead"><h3>🧬 身体成分</h3><span className="gx-sub">体脂 {s.bodyFat}%</span></div>
          <div className="gx-kpis">
            <div className="gx-kpi"><div className="gx-kpi-v">{s.fatMass}<span style={{ fontSize: 12 }}> kg</span></div><div className="gx-kpi-l">脂肪量</div></div>
            <div className="gx-kpi"><div className="gx-kpi-v good">{s.leanMass}<span style={{ fontSize: 12 }}> kg</span></div><div className="gx-kpi-l">瘦体重</div></div>
            {s.goalWeightAtBodyFat && <div className="gx-kpi"><div className="gx-kpi-v accent">{s.goalWeightAtBodyFat}<span style={{ fontSize: 12 }}> kg</span></div><div className="gx-kpi-l">达 {profile.goalBodyFat}% 体脂约需</div></div>}
          </div>
        </div>
      )}

      {/* 历史 */}
      <div className="gx-card" style={{ marginTop: 14 }}>
        <div className="gx-sechead"><h3>📒 记录历史</h3><span className="gx-sub">{logs.length} 天</span></div>
        <HistoryList logs={logs} tdee={tdee} onDelete={deleteLog} />
      </div>

      <p className="gx-disclaim">⚠️ 体重与热量为长期趋势估算，个体差异大、并非医疗或营养建议。健康减重通常每周 0.5–1% 体重，极端节食有害，如有需要请咨询专业人士。</p>

      {editingProfile && <ProfileModal profile={profile} onSubmit={setProfile} onClose={() => setEditingProfile(false)} />}
    </div>
  );
}

/* ----------------------------- 今日记录 ----------------------------- */
function TodayLog({ today, log, tdee, profile, onSave }) {
  const [weight, setWeight] = useState(log?.weight ?? '');
  const [intake, setIntake] = useState(log?.intake ?? '');
  const [exercise, setExercise] = useState(log?.exercise ?? '');
  const [bodyFat, setBodyFat] = useState(log?.bodyFat ?? '');
  const [showExtra, setShowExtra] = useState(log?.exercise != null || log?.bodyFat != null);

  // 切换到新的一天/外部更新时同步
  useEffect(() => {
    setWeight(log?.weight ?? ''); setIntake(log?.intake ?? '');
    setExercise(log?.exercise ?? ''); setBodyFat(log?.bodyFat ?? '');
  }, [log?.date]);

  const save = () => {
    onSave({ date: today, weight: numOrEmpty(weight), intake: numOrEmpty(intake), exercise: numOrEmpty(exercise), bodyFat: numOrEmpty(bodyFat) });
  };
  const target = calorieTargetForRate(tdee, 0.6); // 默认每周 ~0.6kg 的摄入建议
  const liveDeficit = intake !== '' ? Math.round((tdee + (exercise !== '' ? Number(exercise) : 0)) - Number(intake)) : null;

  return (
    <div className="gx-card" style={{ marginTop: 14 }}>
      <div className="gx-sechead">
        <h3>✏️ 今日记录 · {fmtMD(today)} {weekdayCN(today)}</h3>
        {liveDeficit != null && <span className="gx-sub" style={{ color: liveDeficit > 0 ? 'var(--success)' : 'var(--danger)' }}>缺口 {liveDeficit > 0 ? '+' : ''}{liveDeficit} kcal</span>}
      </div>
      <div className="cut-inputs">
        <label className="cut-field"><span>体重 kg</span>
          <input className="gx-in" type="number" step="0.1" inputMode="decimal" placeholder="如 84.5" value={weight} onChange={(e) => setWeight(e.target.value)} /></label>
        <label className="cut-field"><span>摄入 kcal</span>
          <input className="gx-in" type="number" inputMode="numeric" placeholder={`建议 ≤ ${target}`} value={intake} onChange={(e) => setIntake(e.target.value)} /></label>
        {showExtra && (
          <>
            <label className="cut-field"><span>额外运动 kcal</span>
              <input className="gx-in" type="number" inputMode="numeric" placeholder="可选" value={exercise} onChange={(e) => setExercise(e.target.value)} /></label>
            <label className="cut-field"><span>体脂 %</span>
              <input className="gx-in" type="number" step="0.1" inputMode="decimal" placeholder="可选" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} /></label>
          </>
        )}
      </div>
      <div className="gx-inrow" style={{ marginTop: 10 }}>
        <button className="gx-btn gx-btn-primary" onClick={save}>保存今日</button>
        {!showExtra && <button className="gx-btn gx-btn-sm" onClick={() => setShowExtra(true)}>+ 运动 / 体脂</button>}
        <span style={{ fontSize: 11.5, color: 'var(--text-3)', marginLeft: 'auto' }}>消耗约 {tdee} kcal · 目标摄入 ≤ {target}</span>
      </div>
    </div>
  );
}

/* ----------------------------- 体重趋势 SVG ----------------------------- */
function WeightChart({ logs, profile }) {
  const series = useMemo(() => trendSeries(logs), [logs]);
  if (series.length < 2) {
    return <Empty icon="📈" title="记录 2 天以上即可看到趋势" hint="坚持每天称重，曲线会越来越清晰" />;
  }
  const W = 600, H = 220, padL = 36, padR = 12, padT = 12, padB = 22;
  const dates = series.map((p) => p.date);
  const vals = series.flatMap((p) => [p.weight, p.trend]).concat([profile.goalWeight]);
  let min = Math.min(...vals), max = Math.max(...vals);
  const pad = Math.max(0.5, (max - min) * 0.1); min -= pad; max += pad;
  const n = series.length;
  const x = (i) => padL + (i / (n - 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - min) / (max - min || 1)) * (H - padT - padB);

  const trendPath = series.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.trend).toFixed(1)}`).join(' ');
  const goalY = y(profile.goalWeight);
  const ticks = [min, (min + max) / 2, max];

  return (
    <div style={{ width: '100%', overflowX: 'hidden' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} preserveAspectRatio="xMidYMid meet">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} y1={y(t)} x2={W - padR} y2={y(t)} stroke="#ECEAE2" strokeWidth="1" />
            <text x={4} y={y(t) + 3} fontSize="9" fill="#B0AFA5">{t.toFixed(1)}</text>
          </g>
        ))}
        {/* 目标线 */}
        <line x1={padL} y1={goalY} x2={W - padR} y2={goalY} stroke="#BC6055" strokeWidth="1.2" strokeDasharray="4 3" />
        <text x={W - padR} y={goalY - 4} fontSize="9" fill="#BC6055" textAnchor="end">目标 {profile.goalWeight}kg</text>
        {/* 实测散点 */}
        {series.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.weight)} r="2" fill="#B0AFA5" opacity="0.6" />)}
        {/* 趋势线 */}
        <path d={trendPath} fill="none" stroke="#CC785C" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* 末端点 */}
        <circle cx={x(n - 1)} cy={y(series[n - 1].trend)} r="3.5" fill="#CC785C" />
        {/* x 轴端点日期 */}
        <text x={padL} y={H - 6} fontSize="9" fill="#B0AFA5">{fmtMD(dates[0])}</text>
        <text x={W - padR} y={H - 6} fontSize="9" fill="#B0AFA5" textAnchor="end">{fmtMD(dates[n - 1])}</text>
      </svg>
    </div>
  );
}

/* ----------------------------- 缺口柱状 ----------------------------- */
function DeficitBars({ logs, tdee, today }) {
  const series = useMemo(() => deficitSeries(logs, tdee, 14, today), [logs, tdee, today]);
  const maxAbs = Math.max(500, ...series.map((d) => Math.abs(d.deficit || 0)));
  return (
    <div className="cut-bars">
      {series.map((d) => {
        const v = d.deficit;
        const h = v == null ? 0 : Math.min(100, (Math.abs(v) / maxAbs) * 100);
        const pos = v != null && v > 0;
        return (
          <div key={d.date} className="cut-bar-col" title={`${fmtMD(d.date)} ${weekdayCN(d.date)} · ${v == null ? '未记录' : (v > 0 ? '缺口 +' : '盈余 ') + v + ' kcal'}`}>
            <div className="cut-bar-track">
              {v != null && <div className="cut-bar-fill" style={{ height: h + '%', background: pos ? 'var(--success)' : 'var(--danger)' }} />}
            </div>
            <div className="cut-bar-x">{fmtMD(d.date).replace(/^\d+\//, '')}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------- 历史列表 ----------------------------- */
function HistoryList({ logs, tdee, onDelete }) {
  const sorted = useMemo(() => [...logs].filter((l) => l.date).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 30), [logs]);
  if (!sorted.length) return <Empty icon="📒" title="还没有记录" hint="从今天的体重和摄入开始" />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {sorted.map((l) => {
        const comp = l.weight != null && l.bodyFat != null ? bodyComposition(l.weight, l.bodyFat) : null;
        const def = l.intake != null ? Math.round((tdee + (l.exercise || 0)) - l.intake) : null;
        return (
          <div className="gx-row" key={l.date} style={{ padding: '8px 10px' }}>
            <div style={{ width: 52, flex: 'none', fontSize: 12, color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>{fmtMD(l.date)}<div style={{ fontSize: 10, color: 'var(--text-3)' }}>{weekdayCN(l.date)}</div></div>
            <div className="gx-row-main">
              <div className="gx-row-sub" style={{ fontSize: 12, color: 'var(--text)' }}>
                {l.weight != null && <span>⚖ {l.weight}kg</span>}
                {l.intake != null && <span>🍽 {l.intake}</span>}
                {l.exercise != null && <span>🏃 {l.exercise}</span>}
                {l.bodyFat != null && <span>🧬 {l.bodyFat}%</span>}
                {def != null && <span style={{ color: def > 0 ? 'var(--success)' : 'var(--danger)' }}>缺口 {def > 0 ? '+' : ''}{def}</span>}
              </div>
            </div>
            <button className="gx-btn gx-btn-ghost gx-btn-sm danger" onClick={() => onDelete(l.date)}>删</button>
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------- 目标设置 ----------------------------- */
function ProfileForm({ onSubmit, initial }) {
  const [sex, setSex] = useState(initial?.sex || 'male');
  const [height, setHeight] = useState(initial?.height || '');
  const [age, setAge] = useState(initial?.age || '');
  const [activity, setActivity] = useState(initial?.activity || 'light');
  const [startWeight, setStartWeight] = useState(initial?.startWeight || '');
  const [goalWeight, setGoalWeight] = useState(initial?.goalWeight || '');
  const [goalBodyFat, setGoalBodyFat] = useState(initial?.goalBodyFat || '');
  const [startBodyFat, setStartBodyFat] = useState(initial?.startBodyFat || '');

  const submit = () => {
    if (!height || !age || !startWeight || !goalWeight) { alert('请填写身高、年龄、当前体重、目标体重'); return; }
    onSubmit({
      sex, height: Number(height), age: Number(age), activity,
      startWeight: Number(startWeight), goalWeight: Number(goalWeight),
      goalBodyFat: goalBodyFat ? Number(goalBodyFat) : null,
      startBodyFat: startBodyFat ? Number(startBodyFat) : null,
      startDate: initial?.startDate || todayStr(),
    });
  };

  return (
    <div className="gx-card">
      <div className="gx-sechead"><h3>{initial ? '调整目标' : '设定你的减脂目标'}</h3></div>
      <div className="cut-form">
        <label className="cut-field"><span>性别</span>
          <div className="gx-seg" style={{ width: 'fit-content' }}>
            <button className={sex === 'male' ? 'active' : ''} onClick={() => setSex('male')}>男</button>
            <button className={sex === 'female' ? 'active' : ''} onClick={() => setSex('female')}>女</button>
          </div></label>
        <label className="cut-field"><span>身高 cm</span><input className="gx-in" type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="178" /></label>
        <label className="cut-field"><span>年龄</span><input className="gx-in" type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="30" /></label>
        <label className="cut-field"><span>当前体重 kg</span><input className="gx-in" type="number" step="0.1" value={startWeight} onChange={(e) => setStartWeight(e.target.value)} placeholder="85" /></label>
        <label className="cut-field"><span>目标体重 kg</span><input className="gx-in" type="number" step="0.1" value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)} placeholder="70" /></label>
        <label className="cut-field"><span>目标体脂 %（可选）</span><input className="gx-in" type="number" step="0.1" value={goalBodyFat} onChange={(e) => setGoalBodyFat(e.target.value)} placeholder="10" /></label>
        <label className="cut-field"><span>当前体脂 %（可选）</span><input className="gx-in" type="number" step="0.1" value={startBodyFat} onChange={(e) => setStartBodyFat(e.target.value)} placeholder="可选" /></label>
        <label className="cut-field" style={{ gridColumn: '1 / -1' }}><span>活动水平</span>
          <select className="gx-in" value={activity} onChange={(e) => setActivity(e.target.value)}>
            {ACTIVITY_LEVELS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select></label>
      </div>
      <div className="gx-inrow" style={{ marginTop: 12 }}>
        <button className="gx-btn gx-btn-primary" onClick={submit}>{initial ? '保存' : '开始减脂计划'}</button>
      </div>
    </div>
  );
}

function ProfileModal({ profile, onSubmit, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(38,36,31,.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div className="gx-root" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 16, maxWidth: 560, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <ProfileForm initial={profile} onSubmit={onSubmit} />
        <div style={{ padding: '0 18px 16px', textAlign: 'right' }}><button className="gx-btn gx-btn-sm" onClick={onClose}>关闭</button></div>
      </div>
    </div>
  );
}

/* ----------------------------- 工具 ----------------------------- */
function numOrEmpty(v) { return v === '' || v == null ? '' : Number(v); }

const CUT_CSS = `
.cut-hero{background:linear-gradient(180deg,var(--accent-soft),var(--surface));}
.cut-hero-top{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;}
.cut-big{font-family:var(--serif);font-size:40px;font-weight:500;letter-spacing:-1px;line-height:1;color:var(--accent-2);}
.cut-unit{font-size:17px;margin-left:4px;color:var(--text-3);}
.cut-sub{font-size:12px;color:var(--text-2);margin-top:5px;}
.cut-hero-stat{display:flex;gap:18px;}
.cut-hero-stat>div{text-align:right;display:flex;flex-direction:column;}
.cut-stat-v{font-family:var(--serif);font-size:24px;font-weight:500;font-variant-numeric:tabular-nums;}
.cut-stat-v.good{color:var(--success);}
.cut-stat-v.accent{color:var(--accent-2);}
.cut-stat-l{font-size:10.5px;color:var(--text-3);}
.cut-scale{display:flex;justify-content:space-between;font-size:11px;color:var(--text-3);font-variant-numeric:tabular-nums;}
.cut-scale span:nth-child(2){color:var(--accent-2);font-weight:500;}
.cut-inputs,.cut-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;}
.cut-field{display:flex;flex-direction:column;gap:4px;font-size:11.5px;color:var(--text-2);}
.cut-bars{display:flex;align-items:flex-end;gap:4px;height:90px;}
.cut-bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;height:100%;}
.cut-bar-track{flex:1;width:100%;display:flex;align-items:flex-end;justify-content:center;background:var(--surface-3);border-radius:4px;overflow:hidden;min-height:4px;}
.cut-bar-fill{width:100%;border-radius:4px 4px 0 0;transition:height .3s;}
.cut-bar-x{font-size:8.5px;color:var(--text-3);}
`;

/**
 * 习惯打卡 —— React 组件（函数式 + hooks）
 * ------------------------------------------------------------------
 * 追踪日常正向习惯：勾选型 / 计数型；连续打卡 streak、最近 70 天热力图回顾。
 * 与健身模块联动：source='fitness' 的习惯（如「训练完成」）会读取 `fitness-planner`
 * 的训练记录，当天有训练记录即自动点亮（也允许手动补打卡）。
 *
 * 计算逻辑全部来自 ./calc.js（纯函数，已单测）。样式复用 core/ui.jsx 的 gx- 基元。
 * 数据：localStorage 键 `habits-planner`，结构 { v, habits:[...], checkins:{...} }。
 * props：{ storageKey?, onChange? }
 */
import React, { useEffect, useMemo, useState } from 'react';
import { loadState, saveState, readModule, uid } from '../core/store.js';
import { SHARED_CSS, Empty } from '../core/ui.jsx';
import { todayStr, fmtDate, fmtMD, weekdayCN } from '../core/date.js';
import {
  isDoneOn,
  valueOn,
  currentStreak,
  bestStreak,
  completionRate,
  heatmap,
  fitnessWorkoutDates,
  toggleCheck,
  bumpCount,
} from './calc.js';

const STORE_KEY = 'habits-planner';
const FITNESS_KEY = 'fitness-planner';
const DEFAULTS = { v: 1, habits: [], checkins: {} };

/** 预置模板：健康/训练向，开箱即用；用户可改可删。 */
const PRESETS = [
  { name: '训练完成', icon: '💪', type: 'check', color: '#CC785C', source: 'fitness' },
  { name: '喝水', icon: '💧', type: 'count', target: 8, unit: '杯', color: '#5B8DB8' },
  { name: '早睡', icon: '😴', type: 'check', color: '#7B6BA8' },
  { name: '日常活动 / 步行', icon: '🚶', type: 'check', color: '#6E9079' },
];

export default function HabitsPlanner({ storageKey = STORE_KEY, onChange }) {
  const [data, setData] = useState(() => loadState(storageKey, DEFAULTS));
  const [adding, setAdding] = useState(false);
  const [reviewing, setReviewing] = useState(null); // 正在回顾的 habit id

  useEffect(() => {
    saveState(storageKey, data);
    if (onChange) onChange();
  }, [data, storageKey, onChange]);

  const today = todayStr();
  const habits = (data.habits || []).filter((h) => !h.archived);
  const checkins = data.checkins || {};

  // 联动：从健身模块读取「有训练记录的日期」，用于点亮 source='fitness' 的习惯
  const fitDates = useMemo(() => fitnessWorkoutDates(readModule(FITNESS_KEY)), [data, today]);

  const mutate = (fn) => setData((d) => fn(d));
  const setCheckins = (next) => mutate((d) => ({ ...d, checkins: next }));

  const seed = () => mutate((d) => ({
    ...d,
    habits: [
      ...d.habits,
      ...PRESETS.map((p) => ({ id: uid('hab'), createdAt: new Date().toISOString(), archived: false, ...p })),
    ],
  }));

  const addHabit = (h) => {
    mutate((d) => ({ ...d, habits: [...d.habits, { id: uid('hab'), createdAt: new Date().toISOString(), archived: false, ...h }] }));
    setAdding(false);
  };
  const updateHabit = (id, fn) => mutate((d) => ({ ...d, habits: d.habits.map((h) => (h.id === id ? fn(h) : h)) }));
  const removeHabit = (id) => {
    if (!confirm('删除这个习惯及其打卡记录？此操作不可撤销。')) return;
    mutate((d) => {
      const ci = { ...d.checkins };
      delete ci[id];
      return { ...d, habits: d.habits.filter((h) => h.id !== id), checkins: ci };
    });
  };

  const doneToday = habits.filter((h) => isDoneOn(h, today, checkins, fitDates)).length;
  const reviewHabit = reviewing && (data.habits || []).find((h) => h.id === reviewing);

  return (
    <div className="gx-root">
      <style>{SHARED_CSS}</style>

      <div className="gx-headrow">
        <div className="gx-head">
          <h2>🔥 习惯打卡</h2>
          <p>每天的小坚持累积成改变 · {fmtDate(today)}</p>
        </div>
        {!adding && habits.length > 0 && (
          <button className="gx-btn gx-btn-primary" onClick={() => setAdding(true)}>＋ 新习惯</button>
        )}
      </div>

      {habits.length > 0 && (
        <div className="gx-kpis" style={{ marginBottom: 14 }}>
          <div className="gx-kpi"><div className="gx-kpi-v accent">{doneToday}<span style={{ fontSize: 13, color: 'var(--text-3)' }}>/{habits.length}</span></div><div className="gx-kpi-l">今日已打卡</div></div>
          <div className="gx-kpi"><div className="gx-kpi-v">{Math.max(0, ...habits.map((h) => currentStreak(h, checkins, today, fitDates)), 0)}</div><div className="gx-kpi-l">最长当前连续(天)</div></div>
        </div>
      )}

      {adding && <HabitForm onSubmit={addHabit} onCancel={() => setAdding(false)} />}

      <div className="gx-card">
        {habits.length === 0 && !adding ? (
          <div style={{ textAlign: 'center', padding: '24px 16px' }}>
            <Empty icon="🔥" title="还没有习惯" hint="用一组健康向模板快速开始，或自定义" />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 6, flexWrap: 'wrap' }}>
              <button className="gx-btn gx-btn-primary" onClick={seed}>✨ 用推荐模板开始</button>
              <button className="gx-btn" onClick={() => setAdding(true)}>＋ 自定义习惯</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {habits.map((h) => (
              <HabitRow
                key={h.id}
                habit={h}
                today={today}
                checkins={checkins}
                fitDates={fitDates}
                onToggle={() => setCheckins(toggleCheck(checkins, h.id, today))}
                onBump={(delta) => setCheckins(bumpCount(checkins, h.id, today, delta))}
                onReview={() => setReviewing(h.id)}
              />
            ))}
          </div>
        )}
      </div>

      {reviewHabit && (
        <ReviewModal habit={reviewHabit} checkins={checkins} today={today} fitDates={fitDates}
          onClose={() => setReviewing(null)}
          onUpdate={(fn) => updateHabit(reviewHabit.id, fn)}
          onRemove={() => { removeHabit(reviewHabit.id); setReviewing(null); }} />
      )}
    </div>
  );
}

/* ----------------------------- 习惯行（今日打卡） ----------------------------- */
function HabitRow({ habit, today, checkins, fitDates, onToggle, onBump, onReview }) {
  const done = isDoneOn(habit, today, checkins, fitDates);
  const value = valueOn(habit, today, checkins);
  const streak = currentStreak(habit, checkins, today, fitDates);
  const isFitnessAuto = habit.source === 'fitness';
  const isCount = habit.type === 'count';

  return (
    <div className={`gx-row${done ? ' done' : ''}`} style={{ opacity: done ? 0.85 : 1 }}>
      <div style={{ width: 30, fontSize: 19, textAlign: 'center', flex: 'none', filter: done ? 'none' : 'grayscale(.2)' }}>{habit.icon || '⭐'}</div>
      <div className="gx-row-main">
        <div className="gx-row-title" style={{ textDecoration: 'none', color: 'var(--text)' }}>{habit.name}</div>
        <div className="gx-row-sub">
          {streak > 0 && <span style={{ color: 'var(--accent-2)' }}>🔥 连续 {streak} 天</span>}
          {isCount && <span>{value}/{habit.target} {habit.unit}</span>}
          {isFitnessAuto && <span className="gx-tag accent" style={{ fontSize: 10 }}>↔ 健身联动</span>}
        </div>
      </div>
      <div className="gx-acts" style={{ alignItems: 'center', gap: 6 }}>
        {isCount ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button className="gx-btn gx-btn-sm" onClick={() => onBump(-1)} disabled={value <= 0}>−</button>
            <span style={{ minWidth: 22, textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{value}</span>
            <button className="gx-btn gx-btn-sm" onClick={() => onBump(1)}>＋</button>
          </div>
        ) : isFitnessAuto && done && !checkins?.[habit.id]?.[today] ? (
          <span className="gx-tag good" title="今天已有训练记录，自动点亮">✓ 已训练</span>
        ) : (
          <button className={done ? 'gx-btn gx-btn-sm' : 'gx-btn gx-btn-primary gx-btn-sm'} onClick={onToggle}>
            {done ? '✓ 已完成' : '打卡'}
          </button>
        )}
        <button className="gx-btn gx-btn-ghost gx-btn-sm" onClick={onReview} title="回顾 / 设置">📊</button>
      </div>
    </div>
  );
}

/* ----------------------------- 新建 / 编辑表单 ----------------------------- */
function HabitForm({ onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('⭐');
  const [type, setType] = useState('check');
  const [target, setTarget] = useState('8');
  const [unit, setUnit] = useState('次');

  const submit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), icon: icon.trim() || '⭐', type,
      ...(type === 'count' ? { target: Math.max(1, Number(target) || 1), unit: unit.trim() } : {}) });
  };

  return (
    <div className="gx-card" style={{ marginBottom: 14 }}>
      <div className="gx-sechead"><h3>新习惯</h3></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="gx-inrow">
          <input className="gx-in" style={{ width: 56, textAlign: 'center', fontSize: 18 }} value={icon} onChange={(e) => setIcon(e.target.value)} />
          <input className="gx-in" style={{ flex: 1 }} autoFocus placeholder="习惯名称，如「拉伸 10 分钟」" value={name}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </div>
        <div className="gx-inrow">
          <div className="gx-seg">
            <button className={type === 'check' ? 'active' : ''} onClick={() => setType('check')}>勾选型</button>
            <button className={type === 'count' ? 'active' : ''} onClick={() => setType('count')}>计数型</button>
          </div>
          {type === 'count' && (
            <>
              <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>每日目标</span>
              <input className="gx-in" style={{ width: 80 }} type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)} />
              <input className="gx-in" style={{ width: 70 }} placeholder="单位" value={unit} onChange={(e) => setUnit(e.target.value)} />
            </>
          )}
        </div>
        <div className="gx-inrow">
          <button className="gx-btn gx-btn-primary" onClick={submit}>创建</button>
          <button className="gx-btn" onClick={onCancel}>取消</button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- 回顾弹窗（热力图 + 统计 + 管理） ----------------------------- */
function ReviewModal({ habit, checkins, today, fitDates, onClose, onUpdate, onRemove }) {
  const cells = useMemo(() => heatmap(habit, checkins, 70, today, fitDates), [habit, checkins, today, fitDates]);
  const cur = currentStreak(habit, checkins, today, fitDates);
  const best = bestStreak(habit, checkins, today, fitDates);
  const rate30 = Math.round(completionRate(habit, checkins, 30, today, fitDates) * 100);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(38,36,31,.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div className="gx-root" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, maxWidth: 560, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="gx-sechead">
          <h3>{habit.icon} {habit.name}</h3>
          <button className="gx-btn gx-btn-ghost gx-btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="gx-kpis" style={{ marginBottom: 14 }}>
          <div className="gx-kpi"><div className="gx-kpi-v accent">{cur}</div><div className="gx-kpi-l">当前连续(天)</div></div>
          <div className="gx-kpi"><div className="gx-kpi-v">{best}</div><div className="gx-kpi-l">历史最长(天)</div></div>
          <div className="gx-kpi"><div className="gx-kpi-v good">{rate30}<span style={{ fontSize: 13 }}>%</span></div><div className="gx-kpi-l">近 30 天完成率</div></div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>最近 70 天</div>
        <Heatmap cells={cells} />

        <div style={{ borderTop: '1px solid var(--bd-soft)', marginTop: 16, paddingTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="gx-btn gx-btn-ghost gx-btn-sm" onClick={() => { onUpdate((h) => ({ ...h, archived: true })); onClose(); }}>归档</button>
          <button className="gx-btn gx-btn-ghost gx-btn-sm danger" onClick={onRemove}>删除习惯</button>
        </div>
      </div>
    </div>
  );
}

/** 热力图：10 列网格，深浅由 ratio 决定。 */
function Heatmap({ cells }) {
  const color = (c) => {
    if (!c.ratio) return 'var(--surface-3)';
    const a = 0.25 + c.ratio * 0.75;
    return `rgba(204,120,92,${a.toFixed(2)})`;
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4 }}>
      {cells.map((c) => (
        <div key={c.date} title={`${fmtMD(c.date)} ${weekdayCN(c.date)} · ${c.done ? '已完成' : (c.value ? c.value + ' (未达标)' : '未打卡')}`}
          style={{ aspectRatio: '1', borderRadius: 4, background: color(c), border: '1px solid var(--bd-soft)' }} />
      ))}
    </div>
  );
}

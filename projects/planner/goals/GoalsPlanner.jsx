/**
 * 目标进度 —— React 组件（函数式 + hooks）
 * ------------------------------------------------------------------
 * 管理中长期目标：拆子任务、可选数值指标、进度条、截止日提醒、归档。
 * 计算逻辑全部来自 ./calc.js（纯函数，已单测）。样式复用 core/ui.jsx 的 gx- 基元。
 *
 * 数据：localStorage 键 `goals-planner`，结构 { v, goals:[...] }，带版本迁移。
 * props：{ storageKey?, onChange? }
 */
import React, { useEffect, useMemo, useState } from 'react';
import { loadState, saveState, uid } from '../core/store.js';
import { SHARED_CSS, Progress, Empty, Segmented } from '../core/ui.jsx';
import { todayStr, fmtDate, relDay } from '../core/date.js';
import {
  goalPercent,
  isAchieved,
  daysLeft,
  deadlineStatus,
  subtaskStats,
  overallStats,
  sortGoalsForBoard,
} from './calc.js';

const STORE_KEY = 'goals-planner';
const DEFAULTS = { v: 1, goals: [] };

const CATEGORIES = [
  { id: 'fitness', label: '健身', icon: '💪' },
  { id: 'health', label: '健康', icon: '🥗' },
  { id: 'learn', label: '学习', icon: '📚' },
  { id: 'life', label: '生活', icon: '🌱' },
  { id: 'work', label: '事业', icon: '💼' },
];
const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export default function GoalsPlanner({ storageKey = STORE_KEY, onChange, linkOptions = [], resolveLink }) {
  const [data, setData] = useState(() => loadState(storageKey, DEFAULTS));
  const [filter, setFilter] = useState('active'); // active | done | all
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    saveState(storageKey, data);
    if (onChange) onChange();
  }, [data, storageKey, onChange]);

  // 跨模块链接型目标：用真实数据填充 metric.current（resolveLink 由主应用注入）
  const goals = (data.goals || []).map((g) => {
    const link = g.metric && g.metric.link;
    if (!link || typeof resolveLink !== 'function') return g;
    const cur = resolveLink(link, g.id);
    if (cur == null) return g;
    return { ...g, metric: { ...g.metric, current: cur } };
  });
  const today = todayStr();
  const stats = useMemo(() => overallStats(goals), [goals]);

  const visible = useMemo(() => {
    const sorted = sortGoalsForBoard(goals, today);
    const archivedSorted = goals.filter((g) => g.archived);
    if (filter === 'all') return [...sorted, ...archivedSorted];
    if (filter === 'done') return goals.filter((g) => g.archived || isAchieved(g));
    return sorted.filter((g) => !isAchieved(g));
  }, [goals, filter, today]);

  const mutate = (fn) => setData((d) => ({ ...d, goals: fn(d.goals || []) }));
  const update = (id, fn) => mutate((gs) => gs.map((g) => (g.id === id ? fn(g) : g)));

  const addGoal = (g) => {
    mutate((gs) => [
      { id: uid('goal'), title: g.title, note: '', category: g.category, deadline: g.deadline || '',
        createdAt: new Date().toISOString(), archived: false, subtasks: [],
        metric: g.useMetric ? { current: 0, target: g.target, unit: g.unit || '', link: g.link || null } : null },
      ...gs,
    ]);
    setAdding(false);
  };
  const removeGoal = (id) => {
    if (!confirm('删除这个目标及其所有子任务？此操作不可撤销。')) return;
    mutate((gs) => gs.filter((g) => g.id !== id));
  };

  return (
    <div className="gx-root">
      <style>{SHARED_CSS}</style>

      <div className="gx-headrow">
        <div className="gx-head">
          <h2>🎯 目标进度</h2>
          <p>把中长期目标拆成子任务，进度看得见，成就感持续在线</p>
        </div>
        {!adding && (
          <button className="gx-btn gx-btn-primary" onClick={() => setAdding(true)}>＋ 新目标</button>
        )}
      </div>

      {goals.length > 0 && (
        <div className="gx-kpis" style={{ marginBottom: 14 }}>
          <div className="gx-kpi"><div className="gx-kpi-v accent">{stats.total}</div><div className="gx-kpi-l">进行中目标</div></div>
          <div className="gx-kpi"><div className="gx-kpi-v good">{stats.achieved}</div><div className="gx-kpi-l">已达成</div></div>
          <div className="gx-kpi"><div className="gx-kpi-v">{stats.avgPercent}<span style={{ fontSize: 13 }}>%</span></div><div className="gx-kpi-l">平均进度</div></div>
        </div>
      )}

      {adding && <GoalForm onSubmit={addGoal} onCancel={() => setAdding(false)} linkOptions={linkOptions} />}

      <div className="gx-card">
        <div className="gx-sechead">
          <Segmented
            tabs={[{ id: 'active', label: '进行中' }, { id: 'done', label: '已达成' }, { id: 'all', label: '全部' }]}
            value={filter}
            onChange={setFilter}
          />
        </div>
        {visible.length === 0 ? (
          <Empty icon="🎯" title={goals.length ? '这个筛选下没有目标' : '还没有目标'} hint="设一个具体、可衡量的目标，从拆解第一步开始" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visible.map((g) => (
              <GoalCard key={g.id} goal={g} today={today} onUpdate={(fn) => update(g.id, fn)} onRemove={() => removeGoal(g.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- 新建表单 ----------------------------- */
function GoalForm({ onSubmit, onCancel, linkOptions = [] }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('fitness');
  const [deadline, setDeadline] = useState('');
  const [useMetric, setUseMetric] = useState(false);
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('');
  const [link, setLink] = useState(''); // '' = 手动；否则跨模块自动追踪来源 id

  const pickLink = (id) => {
    setLink(id);
    const src = linkOptions.find((o) => o.id === id);
    if (src && src.unit) setUnit(src.unit); // 选了来源自动带出单位
  };

  const submit = () => {
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), category, deadline, useMetric: useMetric && Number(target) > 0, target: Number(target), unit: unit.trim(), link: link || null });
  };

  return (
    <div className="gx-card" style={{ marginBottom: 14 }}>
      <div className="gx-sechead"><h3>新目标</h3></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input className="gx-in" autoFocus placeholder="目标名称，如「12 周增肌 5kg」" value={title}
          onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <div className="gx-inrow">
          <div className="gx-seg">
            {CATEGORIES.map((c) => (
              <button key={c.id} className={category === c.id ? 'active' : ''} onClick={() => setCategory(c.id)}>{c.icon} {c.label}</button>
            ))}
          </div>
        </div>
        <div className="gx-inrow">
          <label style={{ fontSize: 12.5, color: 'var(--text-2)' }}>截止日</label>
          <input className="gx-in gx-date" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        <label style={{ fontSize: 12.5, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={useMetric} onChange={(e) => setUseMetric(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
          用数值衡量进度（否则按子任务完成比）
        </label>
        {useMetric && (
          <>
            <div className="gx-inrow">
              <input className="gx-in" style={{ width: 130 }} type="number" min="0" placeholder="目标值，如 100" value={target} onChange={(e) => setTarget(e.target.value)} />
              <input className="gx-in" style={{ width: 110 }} placeholder="单位，如 km" value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
            {linkOptions.length > 0 && (
              <div className="gx-inrow">
                <label style={{ fontSize: 12.5, color: 'var(--text-2)' }}>进度来源</label>
                <select className="gx-in" style={{ flex: 1 }} value={link} onChange={(e) => pickLink(e.target.value)}>
                  <option value="">手动输入</option>
                  {linkOptions.map((o) => (
                    <option key={o.id} value={o.id}>自动 · {o.label}（{o.unit}）</option>
                  ))}
                </select>
              </div>
            )}
            {link && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>进度将自动从所选模块的真实数据读取，无需手动更新。</div>}
          </>
        )}
        <div className="gx-inrow">
          <button className="gx-btn gx-btn-primary" onClick={submit}>创建</button>
          <button className="gx-btn" onClick={onCancel}>取消</button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- 单个目标卡 ----------------------------- */
function GoalCard({ goal, today, onUpdate, onRemove }) {
  const [open, setOpen] = useState(false);
  const [newSub, setNewSub] = useState('');
  const pct = goalPercent(goal);
  const achieved = isAchieved(goal);
  const dl = daysLeft(goal, today);
  const dlStatus = deadlineStatus(goal, today);
  const st = subtaskStats(goal);
  const cat = CAT[goal.category];
  const isMetric = goal.metric && goal.metric.target > 0;

  const addSub = () => {
    if (!newSub.trim()) return;
    onUpdate((g) => ({ ...g, subtasks: [...(g.subtasks || []), { id: uid('st'), title: newSub.trim(), done: false }] }));
    setNewSub('');
  };
  const toggleSub = (sid) => onUpdate((g) => ({
    ...g,
    subtasks: g.subtasks.map((s) => (s.id === sid ? { ...s, done: !s.done, doneAt: !s.done ? new Date().toISOString() : null } : s)),
  }));
  const delSub = (sid) => onUpdate((g) => ({ ...g, subtasks: g.subtasks.filter((s) => s.id !== sid) }));
  const setMetric = (current) => onUpdate((g) => ({ ...g, metric: { ...g.metric, current: Math.max(0, Number(current) || 0) } }));

  return (
    <div className="gx-card" style={{ padding: 16, background: 'var(--surface-2)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14.5, fontWeight: 500, letterSpacing: '-.1px', overflowWrap: 'anywhere' }}>{goal.title}</span>
            {cat && <span className="gx-tag">{cat.icon} {cat.label}</span>}
            {goal.metric && goal.metric.link && <span className="gx-tag accent">🔗 自动</span>}
            {achieved && <span className="gx-tag good">✓ 已达成</span>}
            {!achieved && dlStatus === 'overdue' && <span className="gx-tag bad">逾期 {-dl} 天</span>}
            {!achieved && dlStatus === 'due-soon' && <span className="gx-tag accent">{relDay(goal.deadline, today)}截止</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 9 }}>
            <div style={{ flex: 1 }}><Progress pct={pct} good={achieved} /></div>
            <span style={{ fontSize: 12.5, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: achieved ? 'var(--success)' : 'var(--accent-2)', minWidth: 36, textAlign: 'right' }}>{pct}%</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {isMetric ? <span>{goal.metric.current} / {goal.metric.target} {goal.metric.unit}</span> : <span>子任务 {st.done}/{st.total}</span>}
            {goal.deadline && <span>· 截止 {fmtDate(goal.deadline)}</span>}
          </div>
        </div>
        <div className="gx-acts">
          <button className="gx-btn gx-btn-ghost gx-btn-sm" onClick={() => setOpen((o) => !o)}>{open ? '收起' : '展开'}</button>
        </div>
      </div>

      {open && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--bd-soft)', paddingTop: 12 }}>
          {isMetric && goal.metric.link ? (
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 10 }}>
              🔗 自动追踪：<strong style={{ fontVariantNumeric: 'tabular-nums' }}>{goal.metric.current}</strong> / {goal.metric.target} {goal.metric.unit}
              <span style={{ color: 'var(--text-3)' }}> · 来自其它模块的真实数据，自动更新</span>
            </div>
          ) : isMetric ? (
            <div className="gx-inrow" style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12.5, color: 'var(--text-2)' }}>当前进度</label>
              <input className="gx-in" style={{ width: 120 }} type="number" min="0" value={goal.metric.current} onChange={(e) => setMetric(e.target.value)} />
              <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>/ {goal.metric.target} {goal.metric.unit}</span>
            </div>
          ) : (
            <>
              {(goal.subtasks || []).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
                  {goal.subtasks.map((s) => (
                    <div className={`gx-row${s.done ? ' done' : ''}`} key={s.id} style={{ padding: '7px 10px' }}>
                      <input type="checkbox" className="gx-check" checked={s.done} onChange={() => toggleSub(s.id)} />
                      <div className="gx-row-main"><div className="gx-row-title" style={{ fontSize: 13 }}>{s.title}</div></div>
                      <button className="gx-btn gx-btn-ghost gx-btn-sm danger" onClick={() => delSub(s.id)}>删</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="gx-inrow" style={{ marginBottom: 10 }}>
                <input className="gx-in" placeholder="添加子任务…" value={newSub} onChange={(e) => setNewSub(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSub()} />
                <button className="gx-btn" onClick={addSub}>添加</button>
              </div>
            </>
          )}
          <div className="gx-inrow" style={{ justifyContent: 'flex-end' }}>
            <button className="gx-btn gx-btn-ghost gx-btn-sm" onClick={() => onUpdate((g) => ({ ...g, archived: !g.archived }))}>
              {goal.archived ? '取消归档' : '归档'}
            </button>
            <button className="gx-btn gx-btn-ghost gx-btn-sm danger" onClick={onRemove}>删除目标</button>
          </div>
        </div>
      )}
    </div>
  );
}

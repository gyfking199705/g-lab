/**
 * 日程安排 —— React 组件（函数式 + hooks）
 * ------------------------------------------------------------------
 * 管理日常事项，按日 / 周查看。日视图含「逾期」提醒；周视图 7 天概览。
 * 事项可选关联一个目标（goalId），完成情况回流到看板。
 *
 * 计算逻辑全部来自 ./calc.js（纯函数，已单测）。样式复用 core/ui.jsx 的 gx- 基元。
 * 数据：localStorage 键 `schedule-planner`，结构 { v, items:[...] }。
 * props：{ storageKey?, onChange? }
 */
import React, { useEffect, useMemo, useState } from 'react';
import { loadState, saveState, readModule, uid } from '../core/store.js';
import { SHARED_CSS, Empty, Segmented } from '../core/ui.jsx';
import { todayStr, addDays, fmtDate, fmtMD, weekdayCN, relDay, startOfWeek, weekDates } from '../core/date.js';
import { itemsOnDate, weekGroups, dayStats, weekStats } from './calc.js';

const STORE_KEY = 'schedule-planner';
const GOALS_KEY = 'goals-planner';
const DEFAULTS = { v: 1, items: [] };

export default function SchedulePlanner({ storageKey = STORE_KEY, onChange }) {
  const [data, setData] = useState(() => loadState(storageKey, DEFAULTS));
  const [view, setView] = useState('day'); // day | week
  const [cursor, setCursor] = useState(() => todayStr()); // 当前查看的日期
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [goalId, setGoalId] = useState('');

  useEffect(() => {
    saveState(storageKey, data);
    if (onChange) onChange();
  }, [data, storageKey, onChange]);

  const today = todayStr();
  const items = data.items || [];
  const goals = useMemo(() => ((readModule(GOALS_KEY) || {}).goals || []).filter((g) => !g.archived), [data]);
  const goalName = (id) => (goals.find((g) => g.id === id) || {}).title;

  const mutate = (fn) => setData((d) => ({ ...d, items: fn(d.items || []) }));

  const add = () => {
    if (!title.trim()) return;
    mutate((list) => [...list, {
      id: uid('sch'), title: title.trim(), date: cursor, time: time || '', note: '',
      done: false, goalId: goalId || '', createdAt: new Date().toISOString(),
    }]);
    setTitle(''); setTime(''); setGoalId('');
  };
  const toggle = (id) => mutate((list) => list.map((it) => (it.id === id ? { ...it, done: !it.done, doneAt: !it.done ? new Date().toISOString() : null } : it)));
  const edit = (id) => {
    const it = items.find((x) => x.id === id);
    const t = prompt('编辑事项：', it.title);
    if (t !== null && t.trim()) mutate((list) => list.map((x) => (x.id === id ? { ...x, title: t.trim() } : x)));
  };
  const del = (id) => mutate((list) => list.filter((it) => it.id !== id));
  const move = (n) => setCursor((c) => addDays(c, view === 'week' ? n * 7 : n));

  const periodLabel = view === 'week'
    ? `${fmtMD(startOfWeek(cursor))} – ${fmtMD(weekDates(cursor)[6])}`
    : fmtDate(cursor);
  const stats = view === 'week' ? weekStats(items, cursor) : dayStats(items, cursor);

  return (
    <div className="gx-root">
      <style>{SHARED_CSS}</style>

      <div className="gx-headrow">
        <div className="gx-head">
          <h2>📅 日程安排</h2>
          <p>安排日常事项，按日 / 周查看，逾期不漏</p>
        </div>
        <Segmented tabs={[{ id: 'day', label: '日' }, { id: 'week', label: '周' }]} value={view} onChange={setView} />
      </div>

      {/* 快速添加 */}
      <div className="gx-card" style={{ marginBottom: 14 }}>
        <div className="gx-inrow">
          <input className="gx-in" style={{ flex: 1, minWidth: 180 }} placeholder={`给 ${view === 'week' ? '本周起始日' : fmtMD(cursor)} 添加事项…`}
            value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <input className="gx-in gx-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} title="时间（可选）" />
          {goals.length > 0 && (
            <select className="gx-in" style={{ width: 'auto', maxWidth: 160 }} value={goalId} onChange={(e) => setGoalId(e.target.value)}>
              <option value="">不关联目标</option>
              {goals.map((g) => <option key={g.id} value={g.id}>🎯 {g.title}</option>)}
            </select>
          )}
          <button className="gx-btn gx-btn-primary" onClick={add}>添加</button>
        </div>
      </div>

      {/* 日期导航 */}
      <div className="gx-card">
        <div className="gx-sechead">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="gx-btn gx-btn-sm" onClick={() => move(-1)}>‹</button>
            <button className="gx-btn gx-btn-sm" onClick={() => setCursor(today)}>今天</button>
            <button className="gx-btn gx-btn-sm" onClick={() => move(1)}>›</button>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 15, marginLeft: 4 }}>{periodLabel}</span>
          </div>
          <span className="gx-sub">{stats.done}/{stats.total} 已完成</span>
        </div>

        {view === 'day' ? (
          <DayList items={itemsOnDate(items, cursor)} cursor={cursor} today={today} goalName={goalName}
            onToggle={toggle} onEdit={edit} onDel={del} />
        ) : (
          <WeekGrid groups={weekGroups(items, cursor)} today={today} goalName={goalName}
            onToggle={toggle} onDel={del} onPick={(d) => { setCursor(d); setView('day'); }} />
        )}
      </div>
    </div>
  );
}

function ItemRow({ it, today, goalName, onToggle, onEdit, onDel }) {
  const overdue = !it.done && it.date < today;
  return (
    <div className={`gx-row${it.done ? ' done' : ''}`}>
      <input type="checkbox" className="gx-check" checked={it.done} onChange={() => onToggle(it.id)} />
      <div className="gx-row-main">
        <div className="gx-row-title">{it.title}</div>
        <div className="gx-row-sub">
          {it.time && <span>🕑 {it.time}</span>}
          {overdue && <span style={{ color: 'var(--danger)' }}>逾期</span>}
          {it.goalId && goalName(it.goalId) && <span className="gx-tag accent" style={{ fontSize: 10 }}>🎯 {goalName(it.goalId)}</span>}
        </div>
      </div>
      <div className="gx-acts">
        {onEdit && <button className="gx-btn gx-btn-ghost gx-btn-sm" onClick={() => onEdit(it.id)}>编辑</button>}
        <button className="gx-btn gx-btn-ghost gx-btn-sm danger" onClick={() => onDel(it.id)}>删除</button>
      </div>
    </div>
  );
}

function DayList({ items, cursor, today, goalName, onToggle, onEdit, onDel }) {
  if (!items.length) return <Empty icon="🗓️" title={`${relDay(cursor, today)}还没有安排`} hint="在上方添加，给自己一个清晰的一天" />;
  const pending = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {pending.map((it) => <ItemRow key={it.id} it={it} today={today} goalName={goalName} onToggle={onToggle} onEdit={onEdit} onDel={onDel} />)}
      {done.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-3)', margin: '6px 2px 0' }}>已完成 {done.length}</div>
          {done.map((it) => <ItemRow key={it.id} it={it} today={today} goalName={goalName} onToggle={onToggle} onEdit={onEdit} onDel={onDel} />)}
        </>
      )}
    </div>
  );
}

function WeekGrid({ groups, today, goalName, onToggle, onDel, onPick }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
      {groups.map((g) => {
        const isToday = g.date === today;
        return (
          <div key={g.date} style={{ border: `1px solid ${isToday ? 'var(--accent)' : 'var(--bd-soft)'}`, borderRadius: 11, padding: 10, background: isToday ? 'var(--accent-soft)' : 'var(--surface-2)' }}>
            <div onClick={() => onPick(g.date)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
              <span style={{ fontWeight: 500, fontSize: 12.5, color: isToday ? 'var(--accent-2)' : 'var(--text-2)' }}>{weekdayCN(g.date)}</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{fmtMD(g.date)}</span>
            </div>
            {g.items.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text-3)', padding: '6px 0' }}>—</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {g.items.map((it) => (
                  <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, opacity: it.done ? 0.5 : 1 }}>
                    <input type="checkbox" className="gx-check" style={{ width: 14, height: 14 }} checked={it.done} onChange={() => onToggle(it.id)} />
                    <span style={{ textDecoration: it.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={it.title}>
                      {it.time ? it.time + ' ' : ''}{it.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

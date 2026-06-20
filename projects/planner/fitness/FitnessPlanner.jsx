/**
 * 健身训练规划 —— React 组件（函数式 + hooks）
 * ------------------------------------------------------------------
 * 一个正经的训练追踪器：
 *   · 今日：本周/累计概览 + 实时训练记录器（加动作 → 逐组记录 次数×重量）
 *   · 计划：从模板（推/拉/腿、全身、上下肢）或空白创建训练计划，编辑目标组次，一键开练
 *   · 记录：历史训练流水（容量/组数/肌群），可展开查看每组、删除
 *   · 统计：各肌群周容量 + 选定动作的 1RM 走势（手写 SVG 折线）+ 训练热力图
 *
 * 计算逻辑来自 ./calc.js（纯函数，可单测）；动作库与模板见 ./exercises.js。
 * 自带样式（类名前缀 fp-），不依赖外部 CSS / 图表库。props 约定同 LearningPlanner。
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  todayStr,
  addDays,
  uid,
  workoutVolume,
  workoutSetCount,
  totalVolume,
  volumeByMuscle,
  best1RM,
  oneRMSeries,
  loggedExercises,
  workoutsThisWeek,
  weekStreak,
  activitySeries,
  estimate1RM,
  formatVolume,
  formatWeight,
  fmtDate,
  relDay,
  ONE_RM_FORMULAS,
} from './calc.js';
import { EXERCISES, MUSCLES, ROUTINE_TEMPLATES, findExercise } from './exercises.js';

const DEFAULT_DATA = {
  routines: [],
  workouts: [],
  customExercises: [],
  settings: { unit: 'kg', formula: 'epley' },
};

function loadData(initialState, storageKey) {
  let data = clone(DEFAULT_DATA);
  if (storageKey) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) data = { ...data, ...JSON.parse(raw) };
    } catch (e) {
      /* 忽略损坏数据 */
    }
  }
  if (initialState) data = { ...data, ...initialState };
  for (const k of ['routines', 'workouts', 'customExercises']) if (!Array.isArray(data[k])) data[k] = [];
  data.settings = { ...DEFAULT_DATA.settings, ...(data.settings || {}) };
  return data;
}
function clone(o) {
  return typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o));
}

/* ============================ 主组件 ============================ */
export default function FitnessPlanner({ initialState, onChange, storageKey = 'fitness-planner' }) {
  const [data, setData] = useState(() => loadData(initialState, storageKey));
  const [tab, setTab] = useState('today'); // today | routines | history | stats
  const [active, setActive] = useState(null); // 进行中的训练
  const [openRoutineId, setOpenRoutineId] = useState(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [picker, setPicker] = useState(null); // 动作选择器：{ target:'active'|routineId }

  const today = todayStr();
  const { unit, formula } = data.settings;

  useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch (e) {
        /* 静默 */
      }
    }
    if (onChange) onChange(data);
  }, [data, storageKey, onChange]);

  /* ---- 派生 ---- */
  const weekCount = useMemo(() => workoutsThisWeek(data.workouts, today), [data.workouts, today]);
  const streak = useMemo(() => weekStreak(data.workouts, today), [data.workouts, today]);
  const totalVol = useMemo(() => totalVolume(data.workouts), [data.workouts]);
  const lastWorkout = useMemo(
    () => [...data.workouts].sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null,
    [data.workouts]
  );

  /* ---- 计划 ---- */
  const setRoutines = (updater) => setData((d) => ({ ...d, routines: updater(d.routines) }));
  const addRoutine = (routine) => {
    setData((d) => ({ ...d, routines: [...d.routines, routine] }));
    setOpenRoutineId(routine.id);
    setTab('routines');
    setCreatorOpen(false);
  };
  const updateRoutine = (id, updater) => setRoutines((rs) => rs.map((r) => (r.id === id ? updater(r) : r)));
  const removeRoutine = (id) => {
    setRoutines((rs) => rs.filter((r) => r.id !== id));
    if (openRoutineId === id) setOpenRoutineId(null);
  };

  /* ---- 进行中训练 ---- */
  const startBlank = () => {
    setActive({ date: today, name: '自由训练', entries: [], note: '' });
    setTab('today');
  };
  const startRoutine = (r) => {
    setActive({
      date: today,
      name: r.name,
      note: '',
      entries: (r.items || []).map((it) => ({
        id: uid('en'),
        exId: it.exId,
        name: it.name,
        muscle: it.muscle,
        sets: Array.from({ length: Math.max(1, it.sets || 1) }, () => ({ reps: it.reps || 10, weight: 0 })),
      })),
    });
    setOpenRoutineId(null);
    setTab('today');
  };
  const saveWorkout = () => {
    const entries = (active.entries || []).filter((e) => (e.sets || []).length > 0);
    if (entries.length === 0) {
      alert('还没有记录任何动作组数');
      return;
    }
    setData((d) => ({ ...d, workouts: [...d.workouts, { id: uid('wk'), ...active, entries }] }));
    setActive(null);
    setTab('history');
  };
  const discardWorkout = () => {
    if (confirm('放弃这次训练记录？')) setActive(null);
  };

  /* ---- 动作选择器回调：把动作加到 active 或某计划 ---- */
  const onPickExercise = (ex) => {
    const target = picker.target;
    if (target === 'active') {
      setActive((a) => ({
        ...a,
        entries: [...a.entries, { id: uid('en'), exId: ex.id, name: ex.name, muscle: ex.muscle, sets: [{ reps: 10, weight: 0 }] }],
      }));
    } else {
      updateRoutine(target, (r) => ({
        ...r,
        items: [...r.items, { id: uid('ri'), exId: ex.id, name: ex.name, muscle: ex.muscle, sets: 3, reps: 10 }],
      }));
    }
    setPicker(null);
  };
  const addCustomExercise = (ex) => setData((d) => ({ ...d, customExercises: [...d.customExercises, ex] }));

  const openRoutine = data.routines.find((r) => r.id === openRoutineId) || null;

  return (
    <div className="fp-root">
      <style>{CSS}</style>

      <header className="fp-header">
        <div className="fp-brand">
          <h1>💪 训练规划</h1>
          <p>定计划 · 记录每组 · 看见力量与容量的增长</p>
        </div>
        <div className="fp-headact">
          {!active && (
            <button className="fp-btn fp-btn-primary" onClick={startBlank}>▶ 开始训练</button>
          )}
          <button className="fp-btn" onClick={() => setCreatorOpen(true)}>＋ 新建计划</button>
        </div>
      </header>

      <nav className="fp-tabs">
        <button className={tabCls(tab, 'today')} onClick={() => setTab('today')}>
          今日{active && <span className="fp-dot-live" title="训练进行中" />}
        </button>
        <button className={tabCls(tab, 'routines')} onClick={() => setTab('routines')}>
          训练计划 {data.routines.length > 0 && <span className="fp-tabnum">{data.routines.length}</span>}
        </button>
        <button className={tabCls(tab, 'history')} onClick={() => setTab('history')}>记录</button>
        <button className={tabCls(tab, 'stats')} onClick={() => setTab('stats')}>统计</button>
      </nav>

      <div className="fp-body">
        {tab === 'today' &&
          (active ? (
            <ActiveWorkout
              active={active}
              unit={unit}
              setActive={setActive}
              onAddExercise={() => setPicker({ target: 'active' })}
              onSave={saveWorkout}
              onDiscard={discardWorkout}
            />
          ) : (
            <TodayHome
              weekCount={weekCount}
              streak={streak}
              totalVol={totalVol}
              unit={unit}
              lastWorkout={lastWorkout}
              routines={data.routines}
              onStartBlank={startBlank}
              onStartRoutine={startRoutine}
              onNewRoutine={() => setCreatorOpen(true)}
            />
          ))}

        {tab === 'routines' &&
          (openRoutine ? (
            <RoutineDetail
              routine={openRoutine}
              unit={unit}
              onBack={() => setOpenRoutineId(null)}
              onUpdate={(updater) => updateRoutine(openRoutine.id, updater)}
              onRemove={() => removeRoutine(openRoutine.id)}
              onAddExercise={() => setPicker({ target: openRoutine.id })}
              onStart={() => startRoutine(openRoutine)}
            />
          ) : (
            <RoutinesView routines={data.routines} onOpen={setOpenRoutineId} onNew={() => setCreatorOpen(true)} onStart={startRoutine} />
          ))}

        {tab === 'history' && <HistoryView workouts={data.workouts} unit={unit} onDelete={(id) => setData((d) => ({ ...d, workouts: d.workouts.filter((w) => w.id !== id) }))} />}

        {tab === 'stats' && (
          <StatsView
            data={data}
            today={today}
            onSettings={(patch) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }))}
          />
        )}
      </div>

      {creatorOpen && (
        <RoutineCreator custom={data.customExercises} onClose={() => setCreatorOpen(false)} onCreate={addRoutine} />
      )}
      {picker && (
        <ExercisePicker
          custom={data.customExercises}
          onClose={() => setPicker(null)}
          onPick={onPickExercise}
          onAddCustom={addCustomExercise}
        />
      )}

      <p className="fp-foot">数据保存在本地浏览器（localStorage）。重量单位与 1RM 估算公式可在「统计」里调整。</p>
    </div>
  );
}

const tabCls = (cur, id) => `fp-tab ${cur === id ? 'active' : ''}`;

/* ============================ 今日（首页） ============================ */
function TodayHome({ weekCount, streak, totalVol, unit, lastWorkout, routines, onStartBlank, onStartRoutine, onNewRoutine }) {
  return (
    <div>
      <div className="fp-kpis">
        <Kpi label="本周训练" value={`${weekCount}`} unit="次" tone="hero" sub="本周已练天数" />
        <Kpi label="连续训练" value={`${streak}`} unit="周" tone="accent" sub="保持规律" />
        <Kpi label="累计容量" value={formatVolume(totalVol, unit)} tone="accent" />
        <Kpi label="上次训练" value={lastWorkout ? relDay(lastWorkout.date) : '—'} tone="good" sub={lastWorkout ? lastWorkout.name : '还没开始'} />
      </div>

      <Card title="▶ 开始一次训练" badge="选个计划，或空白自由练">
        <div className="fp-startrow">
          <button className="fp-startblank" onClick={onStartBlank}>
            <span className="fp-startblank-ic">🏋️</span>
            <span>空白训练</span>
            <small>边练边加动作</small>
          </button>
          {routines.slice(0, 6).map((r) => (
            <button key={r.id} className="fp-startroutine" onClick={() => onStartRoutine(r)}>
              <strong>{r.name}</strong>
              <small>{r.items.length} 个动作</small>
            </button>
          ))}
          {routines.length === 0 && (
            <button className="fp-startroutine fp-startroutine-new" onClick={onNewRoutine}>
              <strong>＋ 新建训练计划</strong>
              <small>推/拉/腿、全身…</small>
            </button>
          )}
        </div>
      </Card>

      {lastWorkout && (
        <Card title="🕑 上次练了什么" badge={relDay(lastWorkout.date)}>
          <WorkoutSummary workout={lastWorkout} unit={unit} />
        </Card>
      )}
    </div>
  );
}

/* ============================ 进行中训练（记录器） ============================ */
function ActiveWorkout({ active, unit, setActive, onAddExercise, onSave, onDiscard }) {
  const updateEntry = (entryId, updater) =>
    setActive((a) => ({ ...a, entries: a.entries.map((e) => (e.id === entryId ? updater(e) : e)) }));
  const addSet = (entryId) =>
    updateEntry(entryId, (e) => {
      const last = e.sets[e.sets.length - 1] || { reps: 10, weight: 0 };
      return { ...e, sets: [...e.sets, { reps: last.reps, weight: last.weight }] };
    });
  const updateSet = (entryId, idx, patch) =>
    updateEntry(entryId, (e) => ({ ...e, sets: e.sets.map((s, i) => (i === idx ? { ...s, ...patch } : s)) }));
  const removeSet = (entryId, idx) =>
    updateEntry(entryId, (e) => ({ ...e, sets: e.sets.filter((_, i) => i !== idx) }));
  const removeEntry = (entryId) => setActive((a) => ({ ...a, entries: a.entries.filter((e) => e.id !== entryId) }));

  const vol = workoutVolume(active);
  const sets = workoutSetCount(active);

  return (
    <div className="fp-active">
      <div className="fp-active-head">
        <div>
          <input
            className="fp-active-name"
            value={active.name}
            onChange={(e) => setActive((a) => ({ ...a, name: e.target.value }))}
          />
          <div className="fp-active-meta">{fmtDate(active.date)} · {active.entries.length} 动作 · {sets} 组 · 容量 {formatVolume(vol, unit)}</div>
        </div>
        <div className="fp-active-acts">
          <button className="fp-btn fp-btn-ghost" onClick={onDiscard}>放弃</button>
          <button className="fp-btn fp-btn-ok" onClick={onSave}>完成保存</button>
        </div>
      </div>

      {active.entries.length === 0 && <Empty icon="🏋️" text="点下面「添加动作」开始记录这次训练" />}

      <div className="fp-entries">
        {active.entries.map((e) => (
          <div className="fp-entry" key={e.id}>
            <div className="fp-entry-head">
              <div>
                <span className="fp-entry-name">{e.name}</span>
                <span className="fp-tag">{e.muscle}</span>
              </div>
              <button className="fp-x" onClick={() => removeEntry(e.id)}>✕</button>
            </div>
            <div className="fp-sets">
              <div className="fp-sets-row fp-sets-th">
                <span>组</span><span>次数</span><span>重量({unit})</span><span></span>
              </div>
              {e.sets.map((s, i) => (
                <div className="fp-sets-row" key={i}>
                  <span className="fp-setno">{i + 1}</span>
                  <input className="fp-numin" type="number" min="0" value={s.reps} onChange={(ev) => updateSet(e.id, i, { reps: num(ev.target.value) })} />
                  <input className="fp-numin" type="number" min="0" step="0.5" value={s.weight} onChange={(ev) => updateSet(e.id, i, { weight: num(ev.target.value) })} />
                  <button className="fp-x fp-x-sm" onClick={() => removeSet(e.id, i)}>✕</button>
                </div>
              ))}
              <button className="fp-addset" onClick={() => addSet(e.id)}>＋ 加一组</button>
            </div>
          </div>
        ))}
      </div>

      <button className="fp-addex" onClick={onAddExercise}>＋ 添加动作</button>

      <input
        className="fp-input fp-note"
        placeholder="训练备注（可选）：状态、感受…"
        value={active.note || ''}
        onChange={(e) => setActive((a) => ({ ...a, note: e.target.value }))}
      />
    </div>
  );
}

/* ============================ 训练计划 ============================ */
function RoutinesView({ routines, onOpen, onNew, onStart }) {
  if (routines.length === 0) {
    return (
      <div className="fp-emptyall">
        <div className="fp-empty-ic">📋</div>
        <h3>建一个训练计划</h3>
        <p>从「推/拉/腿、全身、上下肢」等模板一键生成，或自己从零搭。开练时按计划自动带出动作与目标组次。</p>
        <button className="fp-btn fp-btn-primary" onClick={onNew}>＋ 新建训练计划</button>
      </div>
    );
  }
  return (
    <div className="fp-routinegrid">
      {routines.map((r) => (
        <div key={r.id} className="fp-routinecard">
          <div className="fp-routinecard-main" onClick={() => onOpen(r.id)} role="button">
            <div className="fp-routine-name">{r.name}</div>
            <div className="fp-routine-sub">{r.items.length} 个动作 · {r.items.reduce((s, it) => s + (it.sets || 0), 0)} 组</div>
            <div className="fp-routine-exs">{r.items.slice(0, 5).map((it) => it.name).join(' · ')}{r.items.length > 5 ? ' …' : ''}</div>
          </div>
          <button className="fp-btn fp-btn-primary fp-btn-sm" onClick={() => onStart(r)}>▶ 开练</button>
        </div>
      ))}
      <button className="fp-routinecard fp-routinecard-new" onClick={onNew}>
        <span className="fp-newicon">＋</span>
        <span>新建训练计划</span>
      </button>
    </div>
  );
}

function RoutineDetail({ routine, unit, onBack, onUpdate, onRemove, onAddExercise, onStart }) {
  const rename = () => {
    const t = prompt('计划名称：', routine.name);
    if (t && t.trim()) onUpdate((r) => ({ ...r, name: t.trim() }));
  };
  const setItem = (itemId, patch) =>
    onUpdate((r) => ({ ...r, items: r.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) }));
  const removeItem = (itemId) => onUpdate((r) => ({ ...r, items: r.items.filter((it) => it.id !== itemId) }));
  const del = () => {
    if (confirm(`删除训练计划「${routine.name}」？`)) onRemove();
  };

  return (
    <div className="fp-detail">
      <div className="fp-detail-bar">
        <button className="fp-back" onClick={onBack}>← 返回</button>
        <div className="fp-detail-acts">
          <button className="fp-mini" onClick={rename}>重命名</button>
          <button className="fp-mini fp-mini-del" onClick={del}>删除</button>
          <button className="fp-btn fp-btn-primary fp-btn-sm" onClick={onStart}>▶ 开练</button>
        </div>
      </div>
      <h2 className="fp-detail-title">{routine.name}</h2>
      <div className="fp-itemlist">
        {routine.items.map((it) => (
          <div className="fp-item" key={it.id}>
            <div className="fp-item-main">
              <span className="fp-item-name">{it.name}</span>
              <span className="fp-tag">{it.muscle}</span>
            </div>
            <div className="fp-item-targets">
              <label>组数 <input className="fp-numin" type="number" min="1" value={it.sets} onChange={(e) => setItem(it.id, { sets: Math.max(1, num(e.target.value)) })} /></label>
              <label>次数 <input className="fp-numin" type="number" min="1" value={it.reps} onChange={(e) => setItem(it.id, { reps: Math.max(1, num(e.target.value)) })} /></label>
              <button className="fp-x" onClick={() => removeItem(it.id)}>✕</button>
            </div>
          </div>
        ))}
        {routine.items.length === 0 && <Empty icon="➕" text="还没有动作，点下面添加。" />}
      </div>
      <button className="fp-addex" onClick={onAddExercise}>＋ 添加动作</button>
    </div>
  );
}

function RoutineCreator({ custom, onClose, onCreate }) {
  const [mode, setMode] = useState('template');
  const [name, setName] = useState('');

  const fromTemplate = (tpl) => {
    // 一个模板可能含多个训练日；逐个生成 routine（带回所有以便依次创建）
    const made = tpl.routines.map((rt) => materialize(rt, custom));
    // 先创建第一个并打开；其余直接追加
    if (made.length === 1) return onCreate(made[0]);
    // 多个：创建全部，打开第一个
    onCreate(made[0]);
    // 注意：onCreate 会关闭弹窗；此处再补建其余的需要父级支持，简单起见逐个提示
    setTimeout(() => made.slice(1).forEach((r) => onCreate(r)), 0);
  };

  return (
    <Modal title="新建训练计划" onClose={onClose} wide>
      <div className="fp-modetabs">
        <button className={mode === 'template' ? 'on' : ''} onClick={() => setMode('template')}>📋 从模板</button>
        <button className={mode === 'blank' ? 'on' : ''} onClick={() => setMode('blank')}>📝 空白</button>
      </div>
      {mode === 'template' && (
        <div className="fp-tpllist">
          {ROUTINE_TEMPLATES.map((t) => (
            <button key={t.id} className="fp-tpl" onClick={() => fromTemplate(t)}>
              <div className="fp-tpl-name">{t.name}</div>
              <div className="fp-tpl-desc">{t.desc}</div>
              <div className="fp-tpl-meta">{t.routines.map((r) => r.name).join(' / ')}</div>
            </button>
          ))}
        </div>
      )}
      {mode === 'blank' && (
        <div>
          <label className="fp-flabel">计划名称</label>
          <input className="fp-input" placeholder="如：推日 / 我的腿日" value={name} onChange={(e) => setName(e.target.value)} />
          <button
            className="fp-btn fp-btn-primary fp-btn-block"
            onClick={() => onCreate({ id: uid('rt'), name: name.trim() || '我的训练计划', items: [] })}
          >
            创建并添加动作
          </button>
        </div>
      )}
    </Modal>
  );
}

function materialize(rt, custom) {
  return {
    id: uid('rt'),
    name: rt.name,
    items: (rt.items || []).map((it) => {
      const ex = findExercise(it.exId, custom);
      return { id: uid('ri'), exId: it.exId, name: ex ? ex.name : it.exId, muscle: ex ? ex.muscle : '其它', sets: it.sets, reps: it.reps };
    }),
  };
}

/* ============================ 记录 ============================ */
function HistoryView({ workouts, unit, onDelete }) {
  const sorted = useMemo(() => [...workouts].sort((a, b) => (a.date < b.date ? 1 : -1)), [workouts]);
  if (sorted.length === 0) return <Empty icon="📒" text="还没有训练记录，去「今日」开始第一次训练吧。" />;
  return (
    <div className="fp-history">
      {sorted.map((w) => (
        <HistoryCard key={w.id} workout={w} unit={unit} onDelete={() => onDelete(w.id)} />
      ))}
    </div>
  );
}

function HistoryCard({ workout, unit, onDelete }) {
  const [open, setOpen] = useState(false);
  const muscles = [...new Set((workout.entries || []).map((e) => e.muscle))];
  return (
    <div className="fp-hcard">
      <div className="fp-hcard-head" onClick={() => setOpen((o) => !o)} role="button">
        <div>
          <div className="fp-hcard-title">{workout.name} <span className="fp-hcard-date">· {relDay(workout.date)}</span></div>
          <div className="fp-hcard-sub">{workout.entries.length} 动作 · {workoutSetCount(workout)} 组 · 容量 {formatVolume(workoutVolume(workout), unit)}</div>
          <div className="fp-hcard-tags">{muscles.map((m) => <span key={m} className="fp-tag">{m}</span>)}</div>
        </div>
        <div className="fp-hcard-acts">
          <button className="fp-mini" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>{open ? '收起' : '展开'}</button>
          <button className="fp-mini fp-mini-del" onClick={(e) => { e.stopPropagation(); if (confirm('删除这条训练记录？')) onDelete(); }}>删除</button>
        </div>
      </div>
      {open && (
        <div className="fp-hcard-body">
          {workout.entries.map((e) => (
            <div className="fp-hentry" key={e.id}>
              <div className="fp-hentry-name">{e.name} <span className="fp-tag">{e.muscle}</span></div>
              <div className="fp-hentry-sets">
                {e.sets.map((s, i) => (
                  <span key={i} className="fp-hset">{s.reps}×{formatWeight(s.weight, unit)}</span>
                ))}
              </div>
            </div>
          ))}
          {workout.note && <div className="fp-hnote">📝 {workout.note}</div>}
        </div>
      )}
    </div>
  );
}

function WorkoutSummary({ workout, unit }) {
  return (
    <div className="fp-summary">
      {workout.entries.map((e) => (
        <div className="fp-summary-row" key={e.id}>
          <span className="fp-summary-name">{e.name}</span>
          <span className="fp-summary-sets">{e.sets.map((s) => `${s.reps}×${s.weight || 0}`).join(', ')}</span>
        </div>
      ))}
    </div>
  );
}

/* ============================ 统计 ============================ */
function StatsView({ data, today, onSettings }) {
  const { unit, formula } = data.settings;
  const muscleVol = useMemo(() => volumeByMuscle(data.workouts, addDays(today, -27)), [data.workouts, today]);
  const muscleRows = useMemo(
    () => Object.keys(muscleVol).map((m) => ({ muscle: m, vol: muscleVol[m] })).sort((a, b) => b.vol - a.vol),
    [muscleVol]
  );
  const maxMuscle = Math.max(1, ...muscleRows.map((r) => r.vol));
  const exs = useMemo(() => loggedExercises(data.workouts), [data.workouts]);
  const [exId, setExId] = useState('');
  const chosen = exId || (exs[0] && exs[0].exId) || '';
  const series = useMemo(() => oneRMSeries(data.workouts, chosen, formula), [data.workouts, chosen, formula]);
  const series7 = useMemo(() => activitySeries(data.workouts, today, 91), [data.workouts, today]);

  if (data.workouts.length === 0) return <Empty icon="📊" text="还没有训练数据，先去记录几次训练吧。" />;

  return (
    <div className="fp-stats">
      <div className="fp-kpis fp-kpis-4">
        <Kpi label="累计容量" value={formatVolume(totalVolume(data.workouts), unit)} tone="accent" />
        <Kpi label="训练次数" value={`${data.workouts.length}`} unit="次" tone="hero" />
        <Kpi label="连续训练" value={`${weekStreak(data.workouts, today)}`} unit="周" tone="good" />
        <Kpi label="近 4 周容量" value={formatVolume(Object.values(muscleVol).reduce((s, v) => s + v, 0), unit)} tone="accent" />
      </div>

      <Card title="🦾 各肌群容量" badge="最近 4 周">
        {muscleRows.length === 0 ? (
          <Empty icon="🦾" text="暂无数据。" />
        ) : (
          <div className="fp-musclelist">
            {muscleRows.map((r) => (
              <div className="fp-musclerow" key={r.muscle}>
                <span className="fp-musclerow-name">{r.muscle}</span>
                <div className="fp-bar"><div className="fp-bar-fill" style={{ width: `${(r.vol / maxMuscle) * 100}%` }} /></div>
                <span className="fp-musclerow-num">{formatVolume(r.vol, unit)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="📈 力量走势（估算 1RM）" badge={`${ONE_RM_FORMULAS[formula]} 公式`}>
        <div className="fp-exselect">
          <select className="fp-select" value={chosen} onChange={(e) => setExId(e.target.value)}>
            {exs.map((e) => <option key={e.exId} value={e.exId}>{e.name}</option>)}
          </select>
          <span className="fp-best">历史最佳 {formatWeight(best1RM(data.workouts, chosen, formula), unit)}</span>
        </div>
        <OneRMChart series={series} unit={unit} />
      </Card>

      <Card title="🔥 训练热力图" badge="最近 13 周">
        <Heatmap series={series7} unit={unit} />
      </Card>

      <Card title="⚙️ 设置" badge="估算口径">
        <div className="fp-setrow">
          <label className="fp-field">
            <span>重量单位</span>
            <select className="fp-select" value={unit} onChange={(e) => onSettings({ unit: e.target.value })}>
              <option value="kg">kg（千克）</option>
              <option value="lb">lb（磅）</option>
            </select>
          </label>
          <label className="fp-field">
            <span>1RM 估算公式</span>
            <select className="fp-select" value={formula} onChange={(e) => onSettings({ formula: e.target.value })}>
              {Object.keys(ONE_RM_FORMULAS).map((k) => <option key={k} value={k}>{ONE_RM_FORMULAS[k]}</option>)}
            </select>
          </label>
        </div>
      </Card>
    </div>
  );
}

/* 手写 SVG 1RM 走势折线 */
function OneRMChart({ series, unit }) {
  if (!series || series.length < 2) {
    return <Empty icon="📈" text="至少需要两次该动作的记录才能画走势。" />;
  }
  const W = 560;
  const H = 200;
  const pad = { t: 16, r: 14, b: 26, l: 44 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const vals = series.map((d) => d.value);
  const min = Math.min(...vals) * 0.95;
  const max = Math.max(...vals) * 1.05;
  const n = series.length;
  const x = (i) => pad.l + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
  const y = (v) => pad.t + innerH - ((v - min) / (max - min || 1)) * innerH;
  const line = series.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.value)}`).join(' ');
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => min + ((max - min) / ticks) * i);

  return (
    <div className="fp-chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="fp-svg">
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={pad.l} y1={y(v)} x2={W - pad.r} y2={y(v)} stroke="#ECEAE2" />
            <text x={pad.l - 7} y={y(v) + 4} textAnchor="end" className="fp-axis">{Math.round(v)}</text>
          </g>
        ))}
        <path d={line} fill="none" stroke="#CC785C" strokeWidth="2.5" />
        {series.map((d, i) => (
          <g key={d.date}>
            <circle cx={x(i)} cy={y(d.value)} r="3.5" fill="#CC785C" stroke="#fff" strokeWidth="1.5">
              <title>{`${d.date}：${formatWeight(d.value, unit)}`}</title>
            </circle>
            {(i === 0 || i === n - 1) && (
              <text x={x(i)} y={H - 9} textAnchor={i === 0 ? 'start' : 'end'} className="fp-axis">{fmtDate(d.date)}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

/* 手写 SVG 训练热力图 */
function Heatmap({ series, unit }) {
  const cell = 13;
  const gap = 3;
  const startWeekday = series.length ? series[0].weekday : 0;
  const slots = startWeekday + series.length;
  const cols = Math.ceil(slots / 7);
  const width = cols * (cell + gap);
  const height = 7 * (cell + gap);
  const max = Math.max(1, ...series.map((d) => d.volume));
  const color = (v) => {
    if (v <= 0) return '#EAE7DE';
    const t = Math.min(1, v / max);
    if (t < 0.25) return '#EBD3C6';
    if (t < 0.5) return '#DDAE96';
    if (t < 0.75) return '#CC785C';
    return '#B5654A';
  };
  const wl = ['', '一', '', '三', '', '五', ''];
  return (
    <div className="fp-heatwrap">
      <svg viewBox={`0 0 ${width + 18} ${height}`} className="fp-heat" role="img" aria-label="训练热力图">
        {wl.map((w, i) => (w ? <text key={i} x={0} y={i * (cell + gap) + cell} className="fp-heat-wl">{w}</text> : null))}
        <g transform="translate(16,0)">
          {series.map((d, i) => {
            const slot = startWeekday + i;
            return (
              <rect key={d.date} x={Math.floor(slot / 7) * (cell + gap)} y={(slot % 7) * (cell + gap)} width={cell} height={cell} rx={3} fill={color(d.volume)}>
                <title>{`${d.date}：${d.count ? formatVolume(d.volume, unit) : '未训练'}`}</title>
              </rect>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

/* ============================ 动作选择器 ============================ */
function ExercisePicker({ custom, onClose, onPick, onAddCustom }) {
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState('');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [cm, setCm] = useState(MUSCLES[0]);

  const list = [...EXERCISES, ...(custom || [])].filter(
    (e) => (!muscle || e.muscle === muscle) && (!q || e.name.includes(q))
  );
  const submitCustom = () => {
    const t = name.trim();
    if (!t) return;
    const ex = { id: uid('cx'), name: t, muscle: cm, type: '力量' };
    onAddCustom(ex);
    onPick(ex);
  };

  return (
    <Modal title="选择动作" onClose={onClose} wide>
      <div className="fp-pickbar">
        <input className="fp-input" placeholder="搜索动作…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="fp-select" value={muscle} onChange={(e) => setMuscle(e.target.value)}>
          <option value="">全部肌群</option>
          {MUSCLES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className="fp-picklist">
        {list.map((e) => (
          <button key={e.id} className="fp-pickitem" onClick={() => onPick(e)}>
            <span className="fp-pickitem-name">{e.name}</span>
            <span className="fp-tag">{e.muscle}</span>
          </button>
        ))}
        {list.length === 0 && <div className="fp-pickempty">没有匹配的动作</div>}
      </div>

      {adding ? (
        <div className="fp-addcustom">
          <input className="fp-input" placeholder="自定义动作名称" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="fp-select" value={cm} onChange={(e) => setCm(e.target.value)}>
            {MUSCLES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <button className="fp-btn fp-btn-primary" onClick={submitCustom}>添加</button>
        </div>
      ) : (
        <button className="fp-link" onClick={() => setAdding(true)}>＋ 找不到？添加自定义动作</button>
      )}
    </Modal>
  );
}

/* ============================ 通用小组件 ============================ */
function Kpi({ label, value, unit, sub, tone = 'accent' }) {
  return (
    <div className={`fp-kpi fp-kpi-${tone}`}>
      <div className="fp-kpi-label">{label}</div>
      <div className="fp-kpi-value">{value}{unit && <span className="fp-kpi-unit">{unit}</span>}</div>
      {sub && <div className="fp-kpi-sub">{sub}</div>}
    </div>
  );
}
function Card({ title, badge, children }) {
  return (
    <section className="fp-card">
      <div className="fp-card-head">
        <h3>{title}</h3>
        {badge && <span className="fp-card-badge">{badge}</span>}
      </div>
      <div className="fp-card-body">{children}</div>
    </section>
  );
}
function Empty({ icon, text }) {
  return (
    <div className="fp-empty">
      <div className="fp-empty-ic">{icon}</div>
      <div>{text}</div>
    </div>
  );
}
function Modal({ title, children, onClose, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fp-overlay" onClick={onClose}>
      <div className={`fp-modal ${wide ? 'wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="fp-modal-head">
          <h3>{title}</h3>
          <button className="fp-modal-x" onClick={onClose}>✕</button>
        </div>
        <div className="fp-modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ----------------------------- 工具 ----------------------------- */
function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

/* ============================ 样式 ============================ */
const CSS = `
.fp-root{--accent:#CC785C;--accent-2:#B5654A;--accent-soft:#F5ECE5;--g:#6E9079;--g-soft:#E7EFE8;
  --surface:#FFFFFF;--surface-2:#FBFAF6;--surface-3:#F1EFE8;--bd:#ECEAE2;--bd-2:#E3E0D7;
  --t1:#26241F;--t2:#83827A;--t3:#B0AFA5;--danger:#BC6055;--warn:#BE9356;
  --serif:'Tiempos Text',Georgia,'Songti SC','STSong','Source Han Serif SC','Noto Serif CJK SC',serif;
  --sans:ui-sans-serif,system-ui,-apple-system,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;
  --shadow:0 1px 2px rgba(40,36,30,.04);--shadow-2:0 8px 28px -10px rgba(40,36,30,.22);
  font-family:var(--sans);color:var(--t1);line-height:1.55;max-width:1080px;margin:0 auto;}
.fp-root *{box-sizing:border-box;}

.fp-header{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;margin-bottom:16px;}
.fp-brand h1{font-family:var(--serif);font-size:26px;font-weight:600;margin:0;letter-spacing:-.3px;}
.fp-brand p{margin:4px 0 0;color:var(--t2);font-size:13.5px;}
.fp-headact{display:flex;gap:9px;align-items:center;flex-wrap:wrap;}

.fp-btn{padding:9px 16px;border:1px solid var(--bd);background:var(--surface);border-radius:10px;font-size:14px;font-weight:500;cursor:pointer;transition:.15s;font-family:var(--sans);color:var(--t1);}
.fp-btn:hover{border-color:var(--bd-2);background:var(--surface-2);}
.fp-btn-primary{background:var(--accent);color:#fff;border-color:var(--accent);}
.fp-btn-primary:hover{background:var(--accent-2);border-color:var(--accent-2);}
.fp-btn-ok{background:var(--g);color:#fff;border-color:var(--g);}
.fp-btn-ghost{background:none;}
.fp-btn-sm{padding:7px 13px;font-size:13px;}
.fp-btn-block{width:100%;margin-top:12px;}

.fp-tabs{display:flex;gap:4px;border-bottom:1px solid var(--bd);margin-bottom:22px;}
.fp-tab{background:none;border:none;padding:11px 16px;font-size:14.5px;color:var(--t2);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;font-family:var(--sans);transition:.15s;display:flex;align-items:center;gap:7px;}
.fp-tab:hover{color:var(--t1);}
.fp-tab.active{color:var(--accent-2);border-bottom-color:var(--accent);font-weight:600;}
.fp-tabnum{background:var(--accent-soft);color:var(--accent-2);border-radius:999px;font-size:11px;padding:1px 7px;}
.fp-dot-live{width:8px;height:8px;border-radius:50%;background:var(--danger);display:inline-block;animation:fp-pulse 1.4s infinite;}
@keyframes fp-pulse{0%,100%{opacity:1;}50%{opacity:.3;}}

.fp-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-bottom:18px;}
.fp-kpi{background:var(--surface);border:1px solid var(--bd);border-radius:14px;padding:13px 15px;box-shadow:var(--shadow);}
.fp-kpi-label{font-size:12px;color:var(--t3);margin-bottom:5px;}
.fp-kpi-value{font-family:var(--serif);font-size:23px;font-weight:600;letter-spacing:-.4px;}
.fp-kpi-unit{font-size:13px;font-weight:500;margin-left:3px;color:var(--t2);}
.fp-kpi-sub{font-size:11.5px;color:var(--t3);margin-top:3px;}
.fp-kpi-hero{background:var(--accent);border-color:var(--accent);box-shadow:0 6px 18px -8px rgba(204,120,92,.6);}
.fp-kpi-hero .fp-kpi-label,.fp-kpi-hero .fp-kpi-sub{color:rgba(255,255,255,.82);}
.fp-kpi-hero .fp-kpi-value,.fp-kpi-hero .fp-kpi-unit{color:#fff;}
.fp-kpi-accent .fp-kpi-value{color:var(--accent-2);}
.fp-kpi-good .fp-kpi-value{color:var(--g);}

.fp-card{background:var(--surface);border:1px solid var(--bd);border-radius:16px;box-shadow:var(--shadow);overflow:hidden;margin-bottom:16px;}
.fp-card-head{display:flex;justify-content:space-between;align-items:center;padding:14px 17px;border-bottom:1px solid var(--bd);}
.fp-card-head h3{margin:0;font-size:15px;font-weight:600;}
.fp-card-badge{font-size:11.5px;color:var(--t3);background:var(--surface-2);border:1px solid var(--bd);border-radius:999px;padding:3px 10px;}
.fp-card-body{padding:16px 17px;}

.fp-startrow{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:11px;}
.fp-startblank,.fp-startroutine{display:flex;flex-direction:column;gap:3px;text-align:left;border:1px solid var(--bd);border-radius:12px;padding:14px;cursor:pointer;background:var(--surface);transition:.15s;font-family:var(--sans);}
.fp-startblank{align-items:center;text-align:center;border-style:dashed;color:var(--t2);}
.fp-startblank-ic{font-size:24px;}
.fp-startblank small,.fp-startroutine small{font-size:11.5px;color:var(--t3);}
.fp-startroutine strong{font-size:14px;}
.fp-startblank:hover,.fp-startroutine:hover{border-color:var(--accent);color:var(--accent-2);box-shadow:var(--shadow-2);}
.fp-startroutine-new{border-style:dashed;}

.fp-summary{display:flex;flex-direction:column;gap:7px;}
.fp-summary-row{display:flex;justify-content:space-between;gap:12px;font-size:13px;}
.fp-summary-name{color:var(--t1);font-weight:500;}
.fp-summary-sets{color:var(--t2);font-variant-numeric:tabular-nums;}

.fp-active-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px;flex-wrap:wrap;}
.fp-active-name{font-family:var(--serif);font-size:22px;font-weight:600;border:none;border-bottom:1px dashed var(--bd-2);background:none;padding:2px 0;color:var(--t1);max-width:100%;}
.fp-active-name:focus{outline:none;border-bottom-color:var(--accent);}
.fp-active-meta{font-size:12.5px;color:var(--t3);margin-top:5px;}
.fp-active-acts{display:flex;gap:8px;}
.fp-entries{display:flex;flex-direction:column;gap:12px;}
.fp-entry{background:var(--surface);border:1px solid var(--bd);border-radius:13px;box-shadow:var(--shadow);overflow:hidden;}
.fp-entry-head{display:flex;justify-content:space-between;align-items:center;padding:12px 15px;background:var(--surface-2);border-bottom:1px solid var(--bd);}
.fp-entry-name{font-weight:600;font-size:14.5px;margin-right:8px;}
.fp-tag{font-size:11px;padding:1px 8px;border-radius:999px;background:var(--surface-3);color:var(--t2);}
.fp-x{background:none;border:none;color:var(--t3);cursor:pointer;font-size:13px;padding:3px 7px;border-radius:6px;}
.fp-x:hover{color:var(--danger);background:#FBEEEC;}
.fp-x-sm{font-size:11px;}
.fp-sets{padding:10px 15px 13px;}
.fp-sets-row{display:grid;grid-template-columns:34px 1fr 1fr 32px;align-items:center;gap:9px;margin-bottom:7px;}
.fp-sets-th{font-size:11px;color:var(--t3);margin-bottom:8px;}
.fp-setno{font-size:13px;color:var(--t3);text-align:center;font-variant-numeric:tabular-nums;}
.fp-numin{width:100%;padding:8px 10px;border:1px solid var(--bd);border-radius:8px;font-size:14px;color:var(--t1);background:var(--surface);font-variant-numeric:tabular-nums;font-family:var(--sans);}
.fp-numin:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft);}
.fp-addset{background:none;border:1px dashed var(--bd-2);border-radius:8px;padding:7px;width:100%;color:var(--t3);cursor:pointer;font-size:12.5px;font-family:var(--sans);margin-top:3px;}
.fp-addset:hover{border-color:var(--accent);color:var(--accent-2);}
.fp-addex{background:none;border:1.5px dashed var(--bd-2);border-radius:12px;padding:13px;width:100%;color:var(--t3);cursor:pointer;font-size:14px;font-family:var(--sans);margin:14px 0;transition:.15s;}
.fp-addex:hover{border-color:var(--accent);color:var(--accent-2);}
.fp-input{width:100%;padding:10px 12px;background:var(--surface);border:1px solid var(--bd);border-radius:10px;font-size:14px;color:var(--t1);font-family:var(--sans);transition:.15s;}
.fp-input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft);}
.fp-note{margin-top:4px;}
.fp-select{width:100%;padding:10px 12px;background:var(--surface);border:1px solid var(--bd);border-radius:10px;font-size:14px;color:var(--t1);font-family:var(--sans);}
.fp-select:focus{outline:none;border-color:var(--accent);}

.fp-routinegrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;}
.fp-routinecard{background:var(--surface);border:1px solid var(--bd);border-radius:16px;padding:16px;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:10px;transition:.15s;font-family:var(--sans);text-align:left;}
.fp-routinecard:hover{border-color:var(--bd-2);box-shadow:var(--shadow-2);}
.fp-routinecard-main{cursor:pointer;display:flex;flex-direction:column;gap:4px;}
.fp-routine-name{font-family:var(--serif);font-size:17px;font-weight:600;}
.fp-routine-sub{font-size:12px;color:var(--t3);}
.fp-routine-exs{font-size:12px;color:var(--t2);line-height:1.5;}
.fp-routinecard-new{align-items:center;justify-content:center;color:var(--t3);border-style:dashed;cursor:pointer;min-height:150px;gap:6px;}
.fp-routinecard-new:hover{color:var(--accent-2);border-color:var(--accent);}
.fp-newicon{font-size:28px;}

.fp-detail-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:10px;flex-wrap:wrap;}
.fp-back{background:none;border:none;color:var(--t2);font-size:14px;cursor:pointer;font-family:var(--sans);}
.fp-back:hover{color:var(--accent-2);}
.fp-detail-acts{display:flex;gap:7px;align-items:center;flex-wrap:wrap;}
.fp-detail-title{font-family:var(--serif);font-size:24px;font-weight:600;margin:0 0 16px;}
.fp-itemlist{display:flex;flex-direction:column;gap:9px;}
.fp-item{display:flex;justify-content:space-between;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--bd);border-radius:12px;padding:12px 15px;flex-wrap:wrap;}
.fp-item-main{display:flex;align-items:center;gap:9px;}
.fp-item-name{font-weight:500;font-size:14px;}
.fp-item-targets{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--t2);}
.fp-item-targets label{display:flex;align-items:center;gap:5px;}
.fp-item-targets .fp-numin{width:62px;}

.fp-mini{border:1px solid var(--bd);background:var(--surface);border-radius:8px;padding:6px 12px;font-size:12.5px;cursor:pointer;color:var(--t2);transition:.15s;font-family:var(--sans);}
.fp-mini:hover{border-color:var(--bd-2);background:var(--surface-2);color:var(--t1);}
.fp-mini-del:hover{border-color:var(--danger);color:var(--danger);}

.fp-history{display:flex;flex-direction:column;gap:12px;}
.fp-hcard{background:var(--surface);border:1px solid var(--bd);border-radius:14px;box-shadow:var(--shadow);overflow:hidden;}
.fp-hcard-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:14px 16px;cursor:pointer;}
.fp-hcard-title{font-weight:600;font-size:15px;}
.fp-hcard-date{color:var(--t3);font-weight:400;font-size:13px;}
.fp-hcard-sub{font-size:12.5px;color:var(--t2);margin-top:3px;font-variant-numeric:tabular-nums;}
.fp-hcard-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px;}
.fp-hcard-acts{display:flex;gap:6px;flex:none;}
.fp-hcard-body{padding:0 16px 14px;border-top:1px solid var(--surface-3);}
.fp-hentry{padding:10px 0;border-bottom:1px solid var(--surface-3);}
.fp-hentry:last-child{border-bottom:none;}
.fp-hentry-name{font-size:13.5px;font-weight:500;margin-bottom:5px;}
.fp-hentry-sets{display:flex;gap:7px;flex-wrap:wrap;}
.fp-hset{font-size:12px;background:var(--surface-2);border:1px solid var(--bd);border-radius:7px;padding:3px 8px;color:var(--t2);font-variant-numeric:tabular-nums;}
.fp-hnote{font-size:12.5px;color:var(--t2);margin-top:9px;background:var(--surface-2);border-radius:8px;padding:8px 11px;}

.fp-bar{height:9px;background:var(--surface-3);border-radius:999px;overflow:hidden;}
.fp-bar-fill{height:100%;background:var(--accent);border-radius:999px;transition:width .35s;}
.fp-musclelist{display:flex;flex-direction:column;gap:11px;}
.fp-musclerow{display:grid;grid-template-columns:48px 1fr auto;align-items:center;gap:12px;font-size:13px;}
.fp-musclerow-name{color:var(--t2);}
.fp-musclerow-num{color:var(--accent-2);font-weight:600;font-variant-numeric:tabular-nums;font-size:12px;}
.fp-exselect{display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap;}
.fp-exselect .fp-select{max-width:220px;}
.fp-best{font-size:12.5px;color:var(--t2);}
.fp-chart{overflow-x:auto;}
.fp-svg{width:100%;height:auto;min-width:480px;}
.fp-axis{font-size:10px;fill:var(--t3);font-variant-numeric:tabular-nums;}
.fp-heatwrap{overflow-x:auto;}
.fp-heat{max-width:100%;height:auto;min-width:520px;}
.fp-heat-wl{font-size:9px;fill:var(--t3);}
.fp-setrow{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.fp-field{display:flex;flex-direction:column;gap:6px;font-size:12.5px;color:var(--t2);}

.fp-empty{text-align:center;padding:40px 20px;color:var(--t3);}
.fp-empty-ic{font-size:38px;margin-bottom:10px;}
.fp-emptyall{text-align:center;padding:56px 24px;}
.fp-emptyall h3{font-family:var(--serif);font-size:22px;font-weight:600;margin:6px 0 8px;}
.fp-emptyall p{color:var(--t2);font-size:14px;margin:0 auto 20px;max-width:440px;}
.fp-foot{color:var(--t3);margin-top:22px;text-align:center;border-top:1px solid var(--bd);padding-top:16px;font-size:12.5px;}

.fp-overlay{position:fixed;inset:0;background:rgba(40,36,30,.42);backdrop-filter:blur(2px);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;z-index:50;overflow-y:auto;}
.fp-modal{background:var(--surface);border-radius:18px;width:100%;max-width:480px;box-shadow:var(--shadow-2);animation:fp-pop .2s ease;}
.fp-modal.wide{max-width:640px;}
@keyframes fp-pop{from{opacity:0;transform:translateY(-8px) scale(.98);}to{opacity:1;transform:none;}}
.fp-modal-head{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid var(--bd);}
.fp-modal-head h3{margin:0;font-family:var(--serif);font-size:18px;font-weight:600;}
.fp-modal-x{background:none;border:none;font-size:16px;color:var(--t3);cursor:pointer;padding:4px 8px;border-radius:8px;}
.fp-modal-x:hover{background:var(--surface-2);color:var(--t1);}
.fp-modal-body{padding:20px 22px;}
.fp-modetabs{display:flex;gap:7px;margin-bottom:18px;}
.fp-modetabs button{flex:1;padding:10px;border:1px solid var(--bd);background:var(--surface);border-radius:10px;font-size:13.5px;cursor:pointer;color:var(--t2);font-family:var(--sans);transition:.15s;}
.fp-modetabs button.on{background:var(--accent-soft);border-color:var(--accent);color:var(--accent-2);font-weight:600;}
.fp-flabel{font-size:13px;color:var(--t2);margin:0 0 6px;display:block;font-weight:500;}
.fp-tpllist{display:flex;flex-direction:column;gap:10px;}
.fp-tpl{text-align:left;background:var(--surface);border:1px solid var(--bd);border-radius:12px;padding:14px;cursor:pointer;transition:.15s;font-family:var(--sans);}
.fp-tpl:hover{border-color:var(--accent);box-shadow:var(--shadow-2);}
.fp-tpl-name{font-weight:600;font-size:15px;}
.fp-tpl-desc{font-size:12.5px;color:var(--t2);margin:4px 0 6px;line-height:1.55;}
.fp-tpl-meta{font-size:11.5px;color:var(--t3);}
.fp-pickbar{display:flex;gap:9px;margin-bottom:14px;}
.fp-pickbar .fp-input{flex:1;}
.fp-pickbar .fp-select{max-width:130px;}
.fp-picklist{display:grid;grid-template-columns:1fr 1fr;gap:8px;max-height:300px;overflow-y:auto;margin-bottom:14px;}
.fp-pickitem{display:flex;justify-content:space-between;align-items:center;gap:8px;border:1px solid var(--bd);background:var(--surface);border-radius:10px;padding:11px 13px;cursor:pointer;font-family:var(--sans);transition:.15s;}
.fp-pickitem:hover{border-color:var(--accent);background:var(--accent-soft);}
.fp-pickitem-name{font-size:13.5px;font-weight:500;}
.fp-pickempty{grid-column:1/-1;text-align:center;color:var(--t3);font-size:13px;padding:20px;}
.fp-addcustom{display:flex;gap:8px;flex-wrap:wrap;}
.fp-addcustom .fp-input{flex:1;min-width:140px;}
.fp-addcustom .fp-select{max-width:110px;}
.fp-link{background:none;border:none;color:var(--accent-2);font-size:13px;cursor:pointer;padding:4px 0;font-family:var(--sans);}
.fp-link:hover{text-decoration:underline;}

@media(max-width:860px){
  .fp-kpis{grid-template-columns:repeat(2,1fr);}
}
@media(max-width:560px){
  .fp-picklist,.fp-setrow{grid-template-columns:1fr;}
  .fp-active-head{flex-direction:column;}
}
`;

/**
 * 项目规划 —— React 组件（函数式 + hooks）
 * ------------------------------------------------------------------
 * 一套共享任务模型，三个视图复用：
 *   · 日程：快速加任务 + 按到期日分桶（逾期/今天/近7天/以后/未排期/已完成）
 *   · 人力甘特：按负责人分行，时间轴上画起止条（手写，无图表库），可点条编辑
 *   · 番茄专注：番茄钟（专注/休息可配），把专注时段记到任务上，统计今日/连续/分布
 *
 * 计算逻辑来自 ./calc.js（纯函数，可单测）。自带样式（类名前缀 pp-），props 约定同其它规划器。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  todayStr,
  addDays,
  dayDiff,
  fmtDate,
  fmtMD,
  relDay,
  uid,
  STATUSES,
  nextStatus,
  taskDue,
  taskStats,
  scheduleBuckets,
  ganttRange,
  ganttRows,
  axisTicks,
  focusMinutesOn,
  focusCountOn,
  focusStreak,
  focusByTask,
  totalFocusMinutes,
  lastNDays,
  formatDuration,
  mmss,
} from './calc.js';
// 复用 muse-ui 子项目的创意组件（monorepo 内相对引入；planner 的 esbuild 会一起打进 dist/project.js）
import GradientText from '../../muse-ui/src/GradientText.jsx';
import CountUp from '../../muse-ui/src/CountUp.jsx';

const DEFAULT_DATA = {
  tasks: [],
  sessions: [],
  settings: { workMin: 25, breakMin: 5 },
};

function clone(o) {
  return typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o));
}
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
  if (!Array.isArray(data.tasks)) data.tasks = [];
  if (!Array.isArray(data.sessions)) data.sessions = [];
  data.settings = { ...DEFAULT_DATA.settings, ...(data.settings || {}) };
  return data;
}

const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.id, s.label]));
const BUCKETS = [
  { id: 'overdue', label: '逾期', tone: 'bad' },
  { id: 'today', label: '今天', tone: 'now' },
  { id: 'soon', label: '近 7 天', tone: 'soon' },
  { id: 'later', label: '以后', tone: 'late' },
  { id: 'someday', label: '未排期', tone: 'late' },
];

/* ============================ 主组件 ============================ */
export default function ProjectPlanner({ initialState, onChange, storageKey = 'project-planner' }) {
  const [data, setData] = useState(() => loadData(initialState, storageKey));
  const [tab, setTab] = useState('schedule'); // schedule | gantt | focus
  const [editing, setEditing] = useState(null); // 正在编辑的任务（对象）或 null
  const today = todayStr();

  // 番茄钟状态提升到顶层，切 Tab 也不中断
  const [pomoMode, setPomoMode] = useState('work'); // work | break
  const [pomoLeft, setPomoLeft] = useState(data.settings.workMin * 60);
  const [pomoRunning, setPomoRunning] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState(null);
  const [notice, setNotice] = useState('');

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

  /* ---- 任务增删改 ---- */
  const setTasks = (updater) => setData((d) => ({ ...d, tasks: updater(d.tasks) }));
  const addTask = (t) => {
    const task = {
      id: uid('task'),
      title: t.title.trim(),
      status: t.status || 'todo',
      start: t.start || '',
      end: t.end || '',
      assignee: (t.assignee || '').trim(),
      notes: t.notes || '',
      createdAt: today,
    };
    setTasks((ts) => [...ts, task]);
    return task;
  };
  const updateTask = (id, patch) => setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const removeTask = (id) => {
    setTasks((ts) => ts.filter((t) => t.id !== id));
    if (focusTaskId === id) setFocusTaskId(null);
  };
  const cycleStatus = (id) => setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status: nextStatus(t.status) } : t)));

  /* ---- 番茄：记录一段专注 ---- */
  const logSession = (minutes, taskId) => {
    setData((d) => ({
      ...d,
      sessions: [...d.sessions, { id: uid('s'), date: todayStr(), minutes, taskId: taskId || null }],
    }));
  };
  const setSettings = (patch) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));

  /* ---- 番茄倒计时 ---- */
  const fullSec = (mode) => (mode === 'work' ? data.settings.workMin : data.settings.breakMin) * 60;
  // 设置变化且暂停时，刷新剩余时间
  useEffect(() => {
    if (!pomoRunning) setPomoLeft(fullSec(pomoMode));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.settings.workMin, data.settings.breakMin, pomoMode]);

  const tickRef = useRef(null);
  useEffect(() => {
    if (!pomoRunning) return undefined;
    tickRef.current = setInterval(() => setPomoLeft((s) => s - 1), 1000);
    return () => clearInterval(tickRef.current);
  }, [pomoRunning]);

  useEffect(() => {
    if (pomoLeft > 0) return;
    // 一段结束
    setPomoRunning(false);
    if (pomoMode === 'work') {
      logSession(data.settings.workMin, focusTaskId);
      const t = focusTaskId && data.tasks.find((x) => x.id === focusTaskId);
      setNotice(`🍅 专注完成 +${data.settings.workMin} 分钟${t ? ' · ' + t.title : ''}，休息一下`);
      setPomoMode('break');
      setPomoLeft(data.settings.breakMin * 60);
    } else {
      setNotice('☕ 休息结束，开始下一个番茄');
      setPomoMode('work');
      setPomoLeft(data.settings.workMin * 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomoLeft]);

  // 运行时把倒计时写进标题，方便切走也能看到
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const base = document.title;
    if (pomoRunning) document.title = `${mmss(pomoLeft)} · ${pomoMode === 'work' ? '专注' : '休息'}`;
    return () => {
      document.title = base;
    };
  }, [pomoRunning, pomoLeft, pomoMode]);

  const startFocusOn = (taskId) => {
    setFocusTaskId(taskId);
    setPomoMode('work');
    setPomoLeft(data.settings.workMin * 60);
    setPomoRunning(true);
    setTab('focus');
  };

  /* ---- 派生 ---- */
  const stats = useMemo(() => taskStats(data.tasks), [data.tasks]);
  const assignees = useMemo(
    () => [...new Set(data.tasks.map((t) => (t.assignee || '').trim()).filter(Boolean))],
    [data.tasks]
  );
  const todayFocusMin = focusMinutesOn(data.sessions, today);
  const todayFocusCnt = focusCountOn(data.sessions, today);

  return (
    <div className="pp-root">
      <style>{CSS}</style>

      <header className="pp-header">
        <div className="pp-brand">
          <h1>📋 <GradientText colors={['#CC785C', '#B5654A', '#C9A14A']}>项目规划</GradientText></h1>
          <p>一套任务，三种看法 · 日程 / 人力甘特 / 番茄专注</p>
        </div>
        <div className="pp-tabs">
          {[
            ['schedule', '🗓 日程'],
            ['gantt', '📊 甘特'],
            ['focus', '🍅 专注'],
          ].map(([id, label]) => (
            <button key={id} className={`pp-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="pp-kpis">
        <Kpi label="总任务" value={stats.total} />
        <Kpi label="进行中" value={stats.doing} tone="accent" />
        <Kpi label="已完成" value={`${stats.done}`} sub={`${stats.donePct}%`} tone="good" />
        <Kpi label="今日专注" value={todayFocusCnt ? `${todayFocusCnt} 次` : '—'} sub={todayFocusMin ? formatDuration(todayFocusMin) : ''} />
      </div>

      {notice && (
        <div className="pp-notice" onClick={() => setNotice('')}>
          {notice} <span className="pp-notice-x">×</span>
        </div>
      )}

      {tab === 'schedule' && (
        <Schedule
          data={data}
          today={today}
          assignees={assignees}
          onAdd={addTask}
          onCycle={cycleStatus}
          onEdit={setEditing}
          onDelete={removeTask}
          onFocus={startFocusOn}
        />
      )}
      {tab === 'gantt' && <Gantt tasks={data.tasks} today={today} onEdit={setEditing} />}
      {tab === 'focus' && (
        <Focus
          data={data}
          today={today}
          mode={pomoMode}
          left={pomoLeft}
          running={pomoRunning}
          focusTaskId={focusTaskId}
          fullSec={fullSec(pomoMode)}
          onToggle={() => setPomoRunning((r) => !r)}
          onReset={() => {
            setPomoRunning(false);
            setPomoLeft(fullSec(pomoMode));
          }}
          onSkip={() => {
            setPomoRunning(false);
            const m = pomoMode === 'work' ? 'break' : 'work';
            setPomoMode(m);
            setPomoLeft(fullSec(m));
          }}
          onSwitchMode={(m) => {
            setPomoRunning(false);
            setPomoMode(m);
            setPomoLeft(fullSec(m));
          }}
          onPickTask={setFocusTaskId}
          onSettings={setSettings}
        />
      )}

      {editing && (
        <TaskModal
          task={editing}
          assignees={assignees}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            updateTask(editing.id, patch);
            setEditing(null);
          }}
          onDelete={() => {
            removeTask(editing.id);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/* ============================ 日程视图 ============================ */
function Schedule({ data, today, assignees, onAdd, onCycle, onEdit, onDelete, onFocus }) {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [showDone, setShowDone] = useState(false);

  const buckets = useMemo(() => scheduleBuckets(data.tasks, today), [data.tasks, today]);
  const submit = () => {
    if (!title.trim()) return;
    onAdd({ title, assignee, start, end });
    setTitle('');
    setStart('');
    setEnd('');
  };
  const activeEmpty = ['overdue', 'today', 'soon', 'later', 'someday'].every((k) => buckets[k].length === 0);

  return (
    <div className="pp-pane">
      <div className="pp-add">
        <input
          className="pp-in pp-in-title"
          placeholder="加个任务，回车即建（如：完成接口联调）"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <input
          className="pp-in pp-in-who"
          placeholder="负责人"
          list="pp-assignees"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
        />
        <datalist id="pp-assignees">
          {assignees.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
        <label className="pp-datewrap" title="开始">
          <span>始</span>
          <input className="pp-in pp-in-date" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="pp-datewrap" title="截止">
          <span>止</span>
          <input className="pp-in pp-in-date" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <button className="pp-btn pp-btn-primary" onClick={submit}>
          添加
        </button>
      </div>

      {activeEmpty && buckets.done.length === 0 ? (
        <Empty icon="🗒" text="还没有任务。上面输入标题、回车，就建好第一个。" />
      ) : (
        <>
          {BUCKETS.map((b) =>
            buckets[b.id].length ? (
              <section key={b.id} className="pp-sec">
                <h3 className={`pp-sec-h tone-${b.tone}`}>
                  {b.label} <span className="pp-sec-n">{buckets[b.id].length}</span>
                </h3>
                <div className="pp-list">
                  {buckets[b.id].map((t) => (
                    <TaskRow key={t.id} t={t} today={today} onCycle={onCycle} onEdit={onEdit} onDelete={onDelete} onFocus={onFocus} />
                  ))}
                </div>
              </section>
            ) : null
          )}
          {buckets.done.length > 0 && (
            <section className="pp-sec">
              <h3 className="pp-sec-h tone-good pp-clickable" onClick={() => setShowDone((s) => !s)}>
                已完成 <span className="pp-sec-n">{buckets.done.length}</span>
                <span className="pp-caret">{showDone ? '▾' : '▸'}</span>
              </h3>
              {showDone && (
                <div className="pp-list">
                  {buckets.done.map((t) => (
                    <TaskRow key={t.id} t={t} today={today} onCycle={onCycle} onEdit={onEdit} onDelete={onDelete} onFocus={onFocus} />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function TaskRow({ t, today, onCycle, onEdit, onDelete, onFocus }) {
  const due = taskDue(t);
  const overdue = t.status !== 'done' && due && dayDiff(today, due) < 0;
  return (
    <div className={`pp-task ${t.status === 'done' ? 'is-done' : ''}`}>
      <button
        className={`pp-dot st-${t.status}`}
        title={STATUS_LABEL[t.status] + '（点击切换）'}
        onClick={() => onCycle(t.id)}
      >
        {t.status === 'done' ? '✓' : t.status === 'doing' ? '◐' : ''}
      </button>
      <div className="pp-task-main" onClick={() => onEdit(t)}>
        <div className="pp-task-title">{t.title || '（无标题）'}</div>
        <div className="pp-task-meta">
          {t.assignee && <span className="pp-chip">{t.assignee}</span>}
          {due && (
            <span className={`pp-due ${overdue ? 'overdue' : ''}`}>
              {t.start && t.end && t.start !== t.end ? `${fmtMD(t.start)}–${fmtMD(t.end)}` : relDay(due, today)}
            </span>
          )}
          {!due && <span className="pp-due muted">未排期</span>}
        </div>
      </div>
      <div className="pp-task-act">
        {t.status !== 'done' && (
          <button className="pp-ico" title="对这个任务开始番茄专注" onClick={() => onFocus(t.id)}>
            ▶
          </button>
        )}
        <button className="pp-ico" title="编辑" onClick={() => onEdit(t)}>
          ✎
        </button>
        <button className="pp-ico danger" title="删除" onClick={() => onDelete(t.id)}>
          ✕
        </button>
      </div>
    </div>
  );
}

/* ============================ 甘特视图 ============================ */
const DAY_W = 34; // px / 天
const STATUS_BAR = { todo: 'bar-todo', doing: 'bar-doing', done: 'bar-done' };
function Gantt({ tasks, today, onEdit }) {
  const [weeks, setWeeks] = useState(4);
  const range = useMemo(() => ganttRange(tasks, today, weeks * 7), [tasks, today, weeks]);
  const rows = useMemo(() => ganttRows(tasks, range), [tasks, range]);
  const ticks = useMemo(() => axisTicks(range, 7), [range]);
  const trackW = range.days * DAY_W;
  const todayLeft = dayDiff(range.start, today) * DAY_W;
  const showToday = today >= range.start && today <= range.end;

  if (!rows.length) {
    return (
      <div className="pp-pane">
        <Empty icon="📊" text="甘特图按「负责人 + 起止日期」绘制。给任务填上开始/截止日期，就会出现在这里。" />
      </div>
    );
  }

  return (
    <div className="pp-pane">
      <div className="pp-gantt-bar">
        <div className="pp-legend">
          <span className="lg bar-todo" /> 待办
          <span className="lg bar-doing" /> 进行中
          <span className="lg bar-done" /> 已完成
        </div>
        <label className="pp-winsel">
          时间窗
          <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
            <option value={2}>2 周</option>
            <option value={4}>4 周</option>
            <option value={8}>8 周</option>
            <option value={12}>12 周</option>
          </select>
        </label>
      </div>

      <div className="pp-gantt">
        <div className="pp-gantt-side">
          <div className="pp-gantt-corner">负责人</div>
          {rows.map((r) => (
            <div key={r.assignee} className="pp-gantt-name" title={r.assignee}>
              {r.assignee}
              <span className="pp-gantt-name-n">{r.items.length}</span>
            </div>
          ))}
        </div>
        <div className="pp-gantt-scroll">
          <div className="pp-gantt-track" style={{ width: trackW }}>
            <div className="pp-axis">
              {ticks.map((tk) => (
                <div key={tk.date} className="pp-axis-tick" style={{ left: tk.leftPct + '%' }}>
                  {fmtMD(tk.date)}
                </div>
              ))}
            </div>
            {showToday && <div className="pp-today-line" style={{ left: todayLeft }} title={'今天 ' + today} />}
            {rows.map((r) => (
              <div key={r.assignee} className="pp-gantt-row">
                {r.items.map(({ task, leftPct, widthPct }) => (
                  <button
                    key={task.id}
                    className={`pp-bar ${STATUS_BAR[task.status]}`}
                    style={{ left: leftPct + '%', width: `calc(${widthPct}% - 2px)` }}
                    title={`${task.title}\n${task.start || '?'} → ${task.end || task.start || '?'}\n${STATUS_LABEL[task.status]}`}
                    onClick={() => onEdit(task)}
                  >
                    <span className="pp-bar-label">{task.title}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="pp-hint">提示：点击色条可编辑任务；横向可滚动查看更长的时间窗。</p>
    </div>
  );
}

/* ============================ 番茄专注视图 ============================ */
function Focus({ data, today, mode, left, running, focusTaskId, fullSec, onToggle, onReset, onSkip, onSwitchMode, onPickTask, onSettings }) {
  const tasks = data.tasks;
  const openTasks = tasks.filter((t) => t.status !== 'done');
  const focusTask = tasks.find((t) => t.id === focusTaskId) || null;
  const pct = fullSec ? Math.max(0, Math.min(100, (1 - left / fullSec) * 100)) : 0;

  const streak = focusStreak(data.sessions, today);
  const totalMin = totalFocusMinutes(data.sessions);
  const series = lastNDays(data.sessions, 7, today);
  const maxMin = Math.max(25, ...series.map((s) => s.minutes));
  const byTask = focusByTask(data.sessions);
  const recent = [...data.sessions].slice(-8).reverse();
  const taskName = (id) => (id ? (tasks.find((t) => t.id === id) || {}).title || '（已删除任务）' : '自由专注');

  return (
    <div className="pp-pane pp-focus">
      <div className="pp-timer-card">
        <div className="pp-mode">
          <button className={`pp-modebtn ${mode === 'work' ? 'active' : ''}`} onClick={() => onSwitchMode('work')}>
            专注
          </button>
          <button className={`pp-modebtn ${mode === 'break' ? 'active' : ''}`} onClick={() => onSwitchMode('break')}>
            休息
          </button>
        </div>
        <div className={`pp-clock ${mode}`}>{mmss(Math.max(0, left))}</div>
        <div className="pp-prog">
          <div className="pp-prog-fill" style={{ width: pct + '%' }} />
        </div>

        <div className="pp-focus-on">
          {mode === 'work' ? (
            <>
              专注于：
              <select value={focusTaskId || ''} onChange={(e) => onPickTask(e.target.value || null)}>
                <option value="">自由专注（不绑定任务）</option>
                {openTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <span className="muted">休息时间，放松一下 ☕</span>
          )}
        </div>

        <div className="pp-timer-act">
          <button className="pp-btn pp-btn-primary pp-btn-lg" onClick={onToggle}>
            {running ? '⏸ 暂停' : '▶ 开始'}
          </button>
          <button className="pp-btn" onClick={onReset}>
            ↺ 重置
          </button>
          <button className="pp-btn" onClick={onSkip}>
            ⏭ 跳过
          </button>
        </div>

        <div className="pp-setrow">
          <label>
            专注
            <input
              type="number"
              min="1"
              max="120"
              value={data.settings.workMin}
              onChange={(e) => onSettings({ workMin: Math.max(1, Math.min(120, Number(e.target.value) || 25)) })}
            />
            分
          </label>
          <label>
            休息
            <input
              type="number"
              min="1"
              max="60"
              value={data.settings.breakMin}
              onChange={(e) => onSettings({ breakMin: Math.max(1, Math.min(60, Number(e.target.value) || 5)) })}
            />
            分
          </label>
        </div>
      </div>

      <div className="pp-focus-side">
        <div className="pp-mini-kpis">
          <Kpi label="连续专注" value={streak ? `${streak} 天` : '—'} tone="accent" />
          <Kpi label="累计" value={formatDuration(totalMin)} />
        </div>

        <div className="pp-card">
          <div className="pp-card-h">近 7 天专注</div>
          <div className="pp-spark">
            {series.map((s) => (
              <div key={s.date} className="pp-spark-col" title={`${fmtMD(s.date)} · ${formatDuration(s.minutes)}`}>
                <div className="pp-spark-bar" style={{ height: Math.round((s.minutes / maxMin) * 64) + 'px' }} />
                <div className="pp-spark-x">{fmtMD(s.date)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="pp-card">
          <div className="pp-card-h">最近专注</div>
          {recent.length ? (
            <ul className="pp-sess">
              {recent.map((s) => (
                <li key={s.id}>
                  <span className="pp-sess-min">{s.minutes}′</span>
                  <span className="pp-sess-task">{taskName(s.taskId)}</span>
                  <span className="pp-sess-date">{fmtMD(s.date)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pp-empty-sm">完成一个番茄后，这里会记录下来。</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================ 编辑弹窗 ============================ */
function TaskModal({ task, assignees, onClose, onSave, onDelete }) {
  const [f, setF] = useState({
    title: task.title || '',
    status: task.status || 'todo',
    assignee: task.assignee || '',
    start: task.start || '',
    end: task.end || '',
    notes: task.notes || '',
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const save = () => {
    if (!f.title.trim()) return;
    onSave({ ...f, title: f.title.trim(), assignee: f.assignee.trim() });
  };
  return (
    <div className="pp-modal-mask" onClick={onClose}>
      <div className="pp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pp-modal-h">
          编辑任务
          <button className="pp-ico" onClick={onClose}>
            ✕
          </button>
        </div>
        <label className="pp-fld">
          标题
          <input className="pp-in" value={f.title} onChange={(e) => set('title', e.target.value)} autoFocus />
        </label>
        <div className="pp-fld-2">
          <label className="pp-fld">
            状态
            <select className="pp-in" value={f.status} onChange={(e) => set('status', e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="pp-fld">
            负责人
            <input className="pp-in" list="pp-assignees-m" value={f.assignee} onChange={(e) => set('assignee', e.target.value)} />
            <datalist id="pp-assignees-m">
              {assignees.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </label>
        </div>
        <div className="pp-fld-2">
          <label className="pp-fld">
            开始
            <input className="pp-in" type="date" value={f.start} onChange={(e) => set('start', e.target.value)} />
          </label>
          <label className="pp-fld">
            截止
            <input className="pp-in" type="date" value={f.end} onChange={(e) => set('end', e.target.value)} />
          </label>
        </div>
        <label className="pp-fld">
          备注
          <textarea className="pp-in" rows={3} value={f.notes} onChange={(e) => set('notes', e.target.value)} />
        </label>
        <div className="pp-modal-foot">
          <button className="pp-btn danger" onClick={onDelete}>
            删除
          </button>
          <div style={{ flex: 1 }} />
          <button className="pp-btn" onClick={onClose}>
            取消
          </button>
          <button className="pp-btn pp-btn-primary" onClick={save}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================ 小组件 ============================ */
function Kpi({ label, value, sub, tone }) {
  return (
    <div className={`pp-kpi ${tone ? 'tone-' + tone : ''}`}>
      <div className="pp-kpi-v">
        {typeof value === 'number' ? <CountUp value={value} duration={0.7} /> : value}
        {sub ? <span className="pp-kpi-sub">{sub}</span> : null}
      </div>
      <div className="pp-kpi-l">{label}</div>
    </div>
  );
}
function Empty({ icon, text }) {
  return (
    <div className="pp-empty">
      <div className="pp-empty-ic">{icon}</div>
      <div>{text}</div>
    </div>
  );
}

/* ============================ 样式 ============================ */
const CSS = `
.pp-root{--accent:#CC785C;--accent-2:#B5654A;--accent-soft:#F5ECE5;--g:#6E9079;--g-soft:#E7EFE8;
  --bad:#BC6055;--bad-soft:#F7E7E3;--bg:#F6F5F0;--surface:#FFFFFF;--surface-2:#F1EFE8;
  --t1:#26241F;--t2:#83827A;--t3:#B0AFA5;--bd:#ECEAE2;--bd-2:#E3E0D7;
  --serif:'Tiempos Text',Georgia,'Songti SC','STSong','Source Han Serif SC','Noto Serif CJK SC',serif;--sans:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC',sans-serif;
  font-family:var(--sans);color:var(--t1);max-width:1120px;margin:0 auto;}
.pp-root *{box-sizing:border-box;}
.pp-header{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;margin-bottom:16px;}
.pp-brand h1{font-family:var(--serif);font-size:26px;font-weight:600;margin:0;letter-spacing:-.3px;}
.pp-brand p{margin:4px 0 0;color:var(--t2);font-size:13.5px;}
.pp-tabs{display:flex;gap:6px;background:var(--surface-2);padding:4px;border-radius:11px;}
.pp-tab{border:none;background:none;padding:8px 15px;border-radius:8px;font-size:14px;cursor:pointer;color:var(--t2);font-family:var(--sans);transition:.15s;}
.pp-tab:hover{color:var(--t1);}
.pp-tab.active{background:var(--surface);color:var(--t1);box-shadow:0 1px 3px rgba(0,0,0,.08);font-weight:600;}

.pp-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;}
.pp-kpi{background:var(--surface);border:1px solid var(--bd);border-radius:12px;padding:12px 14px;}
.pp-kpi-v{font-family:var(--serif);font-size:23px;font-weight:600;display:flex;align-items:baseline;gap:7px;}
.pp-kpi-sub{font-family:var(--sans);font-size:12.5px;color:var(--t3);font-weight:500;}
.pp-kpi-l{font-size:12px;color:var(--t3);margin-top:3px;}
.pp-kpi.tone-accent .pp-kpi-v{color:var(--accent);}
.pp-kpi.tone-good .pp-kpi-v{color:var(--g);}

.pp-notice{background:var(--accent-soft);border:1px solid #E6C8B9;color:var(--accent-2);padding:9px 14px;border-radius:10px;font-size:13.5px;margin-bottom:12px;cursor:pointer;}
.pp-notice-x{float:right;opacity:.6;}

.pp-pane{background:var(--surface);border:1px solid var(--bd);border-radius:14px;padding:16px;}
.pp-btn{padding:9px 16px;border:1px solid var(--bd);background:var(--surface);border-radius:10px;font-size:14px;font-weight:500;cursor:pointer;transition:.15s;font-family:var(--sans);color:var(--t1);}
.pp-btn:hover{border-color:var(--bd-2);background:var(--surface-2);}
.pp-btn-primary{background:var(--accent);color:#fff;border-color:var(--accent);}
.pp-btn-primary:hover{background:var(--accent-2);border-color:var(--accent-2);}
.pp-btn.danger{color:var(--bad);}
.pp-btn-lg{padding:11px 26px;font-size:15px;}
.pp-in{padding:9px 11px;border:1px solid var(--bd);border-radius:9px;font-size:14px;font-family:var(--sans);background:var(--surface);color:var(--t1);width:100%;}
.pp-in:focus{outline:none;border-color:var(--accent);}

.pp-add{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:16px;}
.pp-in-title{flex:1;min-width:200px;}
.pp-in-who{width:110px;}
.pp-datewrap{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--t3);}
.pp-in-date{width:148px;}

.pp-sec{margin-bottom:16px;}
.pp-sec-h{font-size:13px;font-weight:600;margin:0 0 8px;display:flex;align-items:center;gap:8px;color:var(--t2);text-transform:none;}
.pp-sec-h.tone-bad{color:var(--bad);}
.pp-sec-h.tone-now{color:var(--accent);}
.pp-sec-n{background:var(--surface-2);color:var(--t3);font-size:11.5px;border-radius:20px;padding:1px 8px;font-weight:600;}
.pp-clickable{cursor:pointer;}
.pp-caret{color:var(--t3);}
.pp-list{display:flex;flex-direction:column;gap:7px;}
.pp-task{display:flex;align-items:center;gap:11px;background:var(--surface);border:1px solid var(--bd);border-radius:11px;padding:9px 11px;transition:.12s;}
.pp-task:hover{border-color:var(--bd-2);}
.pp-task.is-done{opacity:.62;}
.pp-task.is-done .pp-task-title{text-decoration:line-through;}
.pp-dot{flex:none;width:22px;height:22px;border-radius:50%;border:2px solid var(--bd-2);background:var(--surface);cursor:pointer;font-size:12px;line-height:1;display:flex;align-items:center;justify-content:center;color:#fff;padding:0;}
.pp-dot.st-doing{border-color:var(--accent);color:var(--accent);}
.pp-dot.st-done{border-color:var(--g);background:var(--g);}
.pp-task-main{flex:1;min-width:0;cursor:pointer;}
.pp-task-title{font-size:14.5px;line-height:1.35;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.pp-task-meta{display:flex;align-items:center;gap:8px;margin-top:3px;}
.pp-chip{font-size:11.5px;background:var(--accent-soft);color:var(--accent-2);border-radius:6px;padding:1px 7px;}
.pp-due{font-size:12px;color:var(--t3);}
.pp-due.overdue{color:var(--bad);font-weight:600;}
.pp-due.muted{color:var(--t3);}
.pp-task-act{display:flex;gap:2px;flex:none;}
.pp-ico{border:none;background:none;cursor:pointer;color:var(--t3);font-size:14px;padding:5px 7px;border-radius:7px;transition:.12s;}
.pp-ico:hover{background:var(--surface-2);color:var(--t1);}
.pp-ico.danger:hover{color:var(--bad);background:var(--bad-soft);}

.pp-empty{text-align:center;color:var(--t3);padding:54px 16px;font-size:14px;line-height:1.7;}
.pp-empty-ic{font-size:34px;margin-bottom:8px;}
.pp-empty-sm{color:var(--t3);font-size:13px;margin:6px 0 0;}

/* 甘特 */
.pp-gantt-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px;}
.pp-legend{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--t2);}
.pp-legend .lg{display:inline-block;width:16px;height:11px;border-radius:3px;margin-left:8px;}
.pp-winsel{font-size:12.5px;color:var(--t2);display:flex;align-items:center;gap:6px;}
.pp-winsel select{padding:5px 8px;border:1px solid var(--bd);border-radius:8px;font-family:var(--sans);background:var(--surface);}
.pp-gantt{display:flex;border:1px solid var(--bd);border-radius:11px;overflow:hidden;}
.pp-gantt-side{flex:none;width:108px;border-right:1px solid var(--bd);background:var(--surface-2);}
.pp-gantt-corner{height:30px;display:flex;align-items:center;padding:0 12px;font-size:11.5px;color:var(--t3);border-bottom:1px solid var(--bd);}
.pp-gantt-name{height:40px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;font-size:13px;border-bottom:1px solid var(--bd);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.pp-gantt-name:last-child{border-bottom:none;}
.pp-gantt-name-n{color:var(--t3);font-size:11px;}
.pp-gantt-scroll{flex:1;overflow-x:auto;}
.pp-gantt-track{position:relative;min-width:100%;}
.pp-axis{height:30px;position:relative;border-bottom:1px solid var(--bd);}
.pp-axis-tick{position:absolute;top:0;height:100%;display:flex;align-items:center;font-size:11px;color:var(--t3);padding-left:4px;border-left:1px solid var(--bd);}
.pp-today-line{position:absolute;top:30px;bottom:0;width:2px;background:var(--accent);opacity:.65;z-index:3;}
.pp-gantt-row{height:40px;position:relative;border-bottom:1px solid var(--bd);}
.pp-gantt-row:last-child{border-bottom:none;}
.pp-bar{position:absolute;top:7px;height:26px;border:none;border-radius:7px;cursor:pointer;display:flex;align-items:center;padding:0 8px;font-size:12px;color:#fff;overflow:hidden;font-family:var(--sans);min-width:8px;}
.pp-bar-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.bar-todo{background:#B9B3A6;}
.bar-doing{background:var(--accent);}
.bar-done{background:var(--g);}
.pp-hint{font-size:12px;color:var(--t3);margin:10px 2px 0;}

/* 番茄 */
.pp-focus{display:grid;grid-template-columns:1.1fr .9fr;gap:14px;align-items:start;}
.pp-timer-card{background:var(--surface-2);border:1px solid var(--bd);border-radius:14px;padding:22px;text-align:center;}
.pp-mode{display:inline-flex;gap:4px;background:var(--surface);padding:4px;border-radius:9px;margin-bottom:14px;}
.pp-modebtn{border:none;background:none;padding:6px 18px;border-radius:7px;cursor:pointer;font-size:13.5px;color:var(--t2);font-family:var(--sans);}
.pp-modebtn.active{background:var(--accent);color:#fff;font-weight:600;}
.pp-clock{font-family:var(--serif);font-size:62px;font-weight:600;letter-spacing:1px;line-height:1.1;color:var(--accent);}
.pp-clock.break{color:var(--g);}
.pp-prog{height:6px;background:var(--surface);border-radius:6px;overflow:hidden;margin:14px 0;}
.pp-prog-fill{height:100%;background:var(--accent);transition:width 1s linear;}
.pp-focus-on{font-size:13.5px;color:var(--t2);margin-bottom:16px;}
.pp-focus-on select{margin-left:6px;padding:6px 9px;border:1px solid var(--bd);border-radius:8px;font-family:var(--sans);max-width:230px;background:var(--surface);}
.pp-timer-act{display:flex;gap:9px;justify-content:center;}
.pp-setrow{display:flex;gap:18px;justify-content:center;margin-top:16px;font-size:13px;color:var(--t2);}
.pp-setrow input{width:54px;margin:0 6px;padding:5px 7px;border:1px solid var(--bd);border-radius:7px;text-align:center;font-family:var(--sans);}
.pp-focus-side{display:flex;flex-direction:column;gap:12px;}
.pp-mini-kpis{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.pp-card{background:var(--surface);border:1px solid var(--bd);border-radius:12px;padding:14px;}
.pp-card-h{font-size:12.5px;color:var(--t2);font-weight:600;margin-bottom:12px;}
.pp-spark{display:flex;align-items:flex-end;justify-content:space-between;gap:5px;height:84px;}
.pp-spark-col{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:5px;height:100%;}
.pp-spark-bar{width:70%;min-height:3px;background:var(--accent);border-radius:4px 4px 0 0;}
.pp-spark-x{font-size:10px;color:var(--t3);}
.pp-sess{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;}
.pp-sess li{display:flex;align-items:center;gap:9px;font-size:12.5px;}
.pp-sess-min{flex:none;font-weight:600;color:var(--accent);width:34px;}
.pp-sess-task{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--t1);}
.pp-sess-date{flex:none;color:var(--t3);}
.muted{color:var(--t3);}

/* 弹窗 */
.pp-modal-mask{position:fixed;inset:0;background:rgba(40,38,34,.42);display:flex;align-items:center;justify-content:center;z-index:50;padding:18px;}
.pp-modal{background:var(--surface);border-radius:15px;padding:18px;width:100%;max-width:440px;box-shadow:0 18px 50px rgba(0,0,0,.22);}
.pp-modal-h{display:flex;justify-content:space-between;align-items:center;font-family:var(--serif);font-size:18px;font-weight:600;margin-bottom:14px;}
.pp-fld{display:flex;flex-direction:column;gap:5px;font-size:12.5px;color:var(--t2);margin-bottom:11px;}
.pp-fld-2{display:grid;grid-template-columns:1fr 1fr;gap:11px;}
.pp-modal-foot{display:flex;gap:9px;align-items:center;margin-top:6px;}

@media(max-width:760px){
  .pp-kpis{grid-template-columns:repeat(2,1fr);}
  .pp-focus{grid-template-columns:1fr;}
  .pp-header{flex-direction:column;}
  .pp-tabs{width:100%;}
  .pp-tab{flex:1;}
}
`;

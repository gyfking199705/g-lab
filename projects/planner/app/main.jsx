/**
 * 个人成长规划系统 —— React 单页应用外壳
 * ------------------------------------------------------------------
 * 统一外壳：左侧导航 + 主内容区。四个模块共用一致的设计语言：
 *   · 个人规划 / 学习规划 / 健身规划 —— 通用「清单」模块 (TaskModule)
 *   · 财富规划 —— 复用 savings/SavingsPlanner.jsx (税务/投资/复利预测 + SVG 图表)
 *
 * 数据沿用 localStorage 键 `planning_<id>`，与旧版本兼容（旧数据不丢）。
 * 全局样式见根 index.html；本文件只做结构与交互。
 */
import React, { useEffect, useRef, useState } from 'react';
import SavingsPlanner from '../savings/SavingsPlanner.jsx';
import LearningPlanner from '../learning/LearningPlanner.jsx';
import AIMapPlanner from '../aimap/AIMapPlanner.jsx';
import FitnessPlanner from '../fitness/FitnessPlanner.jsx';
import ProjectPlanner from '../project/ProjectPlanner.jsx';
import StockWatch from '../stocks/StockWatch.jsx';
import Dashboard from './Dashboard.jsx';
import BigBoard from './BigBoard.jsx';
import { hasBoard, BOARD_ORDER, buildAnalytics } from './analytics.js';
import SchedulePlanner from '../schedule/SchedulePlanner.jsx';
import GoalsPlanner from '../goals/GoalsPlanner.jsx';
import HabitsPlanner from '../habits/HabitsPlanner.jsx';
import CutPlanner from '../cut/CutPlanner.jsx';
import PapersReader from '../papers/PapersReader.jsx';
import LedgerPlanner from '../ledger/LedgerPlanner.jsx';
import CompareTool from '../compare/CompareTool.jsx';
import SalaryEstimator from '../salary/SalaryEstimator.jsx';
import { readModule } from '../core/store.js';
import { LINK_OPTIONS, computeLink } from './links.js';
import { BodyPortal } from '../core/ui.jsx';
import { AISettingsButton } from '../core/AISettings.jsx';
import { seedMissing } from './seed.js';
import { todayStr } from '../core/date.js';
import { overdueCount, todayView } from '../schedule/calc.js';
import { overallStats } from '../goals/calc.js';
import { todayBoard, fitnessWorkoutDates } from '../habits/calc.js';
import { summary as cutSummary } from '../cut/calc.js';
import { statusCounts as papersCounts } from '../papers/calc.js';
import { monthTotals } from '../ledger/calc.js';
import { formatMoney } from '../savings/calc.js';
import { gatherBackup, extractModules, applyBackup, signatureOf, perKeySig, filesToModules, fileForKey, buildReadme, SYNC_FOLDER, READMEFILE } from '../sync/backup.js';
import { requestToken, findOrCreateFolder, listChildren, downloadText, uploadFile } from '../sync/drive.js';

/* ----------------------------- 模块定义 ----------------------------- */
/* 通用「清单」模块（个人规划）；学习 / 健身 / 财富为各自的富模块。 */
const TASK_MODULES = [
  {
    id: 'personal',
    icon: '📝',
    label: '个人规划',
    title: '个人规划',
    subtitle: '管理你的待办事项、日志和里程碑',
    placeholder: '添加新的待办事项…',
    empty: '还没有待办事项',
  },
];

/* 侧边栏导航：日常核心四块置顶（看板 / 日程 / 目标 / 习惯），其后为领域规划器。
   kind 决定渲染哪种主内容；group 用于在侧栏分区。 */
const NAV_ITEMS = [
  { id: 'home', icon: '🏠', label: '首页看板', kind: 'home', group: 'core' },
  { id: 'schedule', icon: '📅', label: '日程安排', kind: 'schedule', group: 'core' },
  { id: 'goals', icon: '🎯', label: '目标进度', kind: 'goals', group: 'core' },
  { id: 'habits', icon: '🔥', label: '习惯打卡', kind: 'habits', group: 'core' },
  { id: 'personal', icon: '📝', label: '个人规划', kind: 'task', group: 'core' },
  { id: 'project', icon: '📋', label: '项目规划', kind: 'project', group: 'core' },
  { id: 'aimap', icon: '🗺️', label: '学习地图', kind: 'aimap', group: 'learn' },
  { id: 'learning', icon: '📚', label: '学习计划', kind: 'learning', group: 'learn' },
  { id: 'papers', icon: '📄', label: '论文阅读', kind: 'papers', group: 'learn' },
  { id: 'cut', icon: '📉', label: '减脂计划', kind: 'cut', group: 'health' },
  { id: 'fitness', icon: '💪', label: '健身规划', kind: 'fitness', group: 'health' },
  { id: 'wealth', icon: '💰', label: '财富规划', kind: 'wealth', group: 'money' },
  { id: 'ledger', icon: '🧾', label: '记账', kind: 'ledger', group: 'money' },
  { id: 'stocks', icon: '📈', label: '股市观测', kind: 'stocks', group: 'money' },
  { id: 'salary', icon: '💵', label: '薪资到手', kind: 'salary', group: 'money' },
  { id: 'compare', icon: '🧮', label: '比价助手', kind: 'compare', group: 'money' },
];

/* 参与备份 / 云同步的 localStorage 键集中在 ../sync/backup.js（BACKUP_KEYS）；
   AI Key（learning-ai）等敏感键不在其中，既不进文件备份、也不进云同步。 */

/* ----------------------------- 本地存储 hook ----------------------------- */
function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch (e) {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* localStorage 不可用时静默 */
    }
  }, [key, value]);
  return [value, setValue];
}

/* 仅用于侧边栏计数（不触发持久化） */
function readCount(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const items = data.items || [];
    if (!items.length) return null;
    const done = items.filter((i) => i.completed).length;
    return `${done}/${items.length}`;
  } catch (e) {
    return null;
  }
}

/* 学习规划的侧边栏徽章：已掌握/总知识点；无知识点时退化为计划数。 */
function readAimapBadge() {
  try {
    const raw = localStorage.getItem('aimap-planner');
    if (!raw) return null;
    const s = JSON.parse(raw);
    let total = 0, done = 0;
    for (const tr of s.tracks || []) for (const cl of tr.clusters || []) for (const t of cl.topics || []) { total++; if (t.status === 'done') done++; }
    return total ? `${done}/${total}` : null;
  } catch (e) { return null; }
}

function readLearningBadge() {
  try {
    const raw = localStorage.getItem('learning-planner');
    if (!raw) return null;
    const plans = (JSON.parse(raw).plans) || [];
    let total = 0;
    let mastered = 0;
    for (const p of plans) {
      for (const m of p.modules || []) {
        for (const l of m.lessons || []) {
          total += 1;
          if (l.status === 'mastered') mastered += 1;
        }
      }
    }
    if (!total) return plans.length ? `${plans.length} 计划` : null;
    return `${mastered}/${total}`;
  } catch (e) {
    return null;
  }
}

/* 健身规划的侧边栏徽章：训练记录次数。 */
function readFitnessBadge() {
  try {
    const raw = localStorage.getItem('fitness-planner');
    if (!raw) return null;
    const workouts = (JSON.parse(raw).workouts) || [];
    return workouts.length ? `${workouts.length} 次` : null;
  } catch (e) {
    return null;
  }
}

/* 项目规划的侧边栏徽章：已完成/总任务。 */
function readProjectBadge() {
  try {
    const raw = localStorage.getItem('project-planner');
    if (!raw) return null;
    const tasks = (JSON.parse(raw).tasks) || [];
    if (!tasks.length) return null;
    const done = tasks.filter((t) => t.status === 'done').length;
    return `${done}/${tasks.length}`;
  } catch (e) {
    return null;
  }
}

/* 日程徽章：今天 已完成/总数；有逾期时优先提示逾期数。 */
function readScheduleBadge() {
  const items = (readModule('schedule-planner') || {}).items || [];
  if (!items.length) return null;
  const od = overdueCount(items);
  if (od) return `⚠${od}`;
  const v = todayView(items);
  const total = v.pending.length + v.done.length;
  return total ? `${v.done.length}/${total}` : null;
}

/* 目标徽章：已达成/进行中。 */
function readGoalsBadge() {
  const goals = (readModule('goals-planner') || {}).goals || [];
  const s = overallStats(goals);
  return s.total ? `${s.achieved}/${s.total}` : null;
}

/* 习惯徽章：今日 已打卡/总数。 */
function readHabitsBadge() {
  const d = readModule('habits-planner') || {};
  const habits = d.habits || [];
  if (!habits.filter((h) => !h.archived).length) return null;
  const fit = fitnessWorkoutDates(readModule('fitness-planner'));
  const b = todayBoard(habits, d.checkins || {}, todayStr(), fit);
  return b.total ? `${b.doneCount}/${b.total}` : null;
}

/* 减脂徽章：当前进度百分比。 */
function readCutBadge() {
  const d = readModule('cut-planner');
  if (!d || !d.profile) return null;
  const s = cutSummary(d.profile, d.logs || [], todayStr());
  return s ? `${s.progressPct}%` : null;
}

/* 论文徽章：在读篇数（无则想读篇数）。 */
function readPapersBadge() {
  const d = readModule('papers-planner');
  if (!d || !(d.items || []).length) return null;
  const c = papersCounts(d.items);
  if (c.reading) return `${c.reading} 在读`;
  if (c.want) return `${c.want} 想读`;
  return c.done ? `${c.done} 已读` : null;
}

/* 记账徽章：本月支出。 */
function readLedgerBadge() {
  const d = readModule('ledger-planner');
  if (!d || !(d.entries || []).length) return null;
  const t = monthTotals(d.entries, todayStr().slice(0, 7));
  return t.expense ? formatMoney(t.expense) : null;
}

function badgeFor(kind, id) {
  switch (kind) {
    case 'task': return readCount(`planning_${id}`);
    case 'learning': return readLearningBadge();
    case 'aimap': return readAimapBadge();
    case 'fitness': return readFitnessBadge();
    case 'project': return readProjectBadge();
    case 'schedule': return readScheduleBadge();
    case 'goals': return readGoalsBadge();
    case 'habits': return readHabitsBadge();
    case 'cut': return readCutBadge();
    case 'papers': return readPapersBadge();
    case 'ledger': return readLedgerBadge();
    default: return null;
  }
}

const GROUP_LABEL = { core: '日常', learn: '学习', health: '健康', money: '财务', more: '其他' };

/* ----------------------------- URL hash 路由（静态托管用 hash 最稳） ----------------------------- */
const NAV_IDS = new Set(['home', ...NAV_ITEMS.map((m) => m.id)]);
function parseHash() {
  let h = (typeof location !== 'undefined' ? location.hash : '') || '';
  h = h.replace(/^#\/?/, '').trim();
  if (h.startsWith('board/')) {
    const id = h.slice(6);
    return { active: 'home', board: hasBoard(id) ? id : null };
  }
  if (h && NAV_IDS.has(h)) return { active: h, board: null };
  return { active: 'home', board: null };
}
function hashFor(active, board) {
  return board ? `#/board/${board}` : `#/${active}`;
}

/* ============================ 主应用 ============================ */
export default function App() {
  const _init = parseHash();
  const [active, setActive] = useState(_init.active);
  const [board, setBoard] = useState(_init.board);
  // 登录优先：首访（没设过同步、也没本地数据）先请登录；登录触发信号传给 CloudSync
  const [showWelcome, setShowWelcome] = useState(() => {
    try { return !localStorage.getItem('welcome-seen') && !localStorage.getItem('sync-client-id'); } catch (e) { return false; }
  });
  const [loginSignal, setLoginSignal] = useState(0);
  const dismissWelcome = () => { try { localStorage.setItem('welcome-seen', '1'); } catch (e) { /* 静默 */ } setShowWelcome(false); };
  const startLogin = () => { dismissWelcome(); setLoginSignal((n) => n + 1); };
  // 用一个计数器在数据变化后刷新侧边栏徽章
  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);
  const go = (id) => { setActive(id); setBoard(null); bump(); };
  // 看板卡片点击：有专属大盘则打开大盘，否则直接进模块
  const openBoard = (id) => { if (hasBoard(id)) setBoard(id); else go(id); bump(); };
  const doSeed = () => {
    const filled = seedMissing();
    if (!filled.length) { alert('你的各模块都已有数据，未改动任何内容——示例数据只会填充空白模块，不会覆盖你已有的数据。'); return; }
    alert(`已为 ${filled.length} 个空白模块填充示例数据（不会覆盖你已有的数据），即将刷新页面。`);
    location.reload();
  };

  // 状态 → URL（用 replaceState 改 hash，不触发 hashchange，避免回环）
  useEffect(() => {
    const want = hashFor(active, board);
    if (typeof location !== 'undefined' && location.hash !== want) {
      try { history.replaceState(null, '', want); } catch (e) { location.hash = want; }
    }
  }, [active, board]);
  // URL → 状态（用户手动改地址 / 前进后退）
  useEffect(() => {
    const onHash = () => { const s = parseHash(); setActive(s.active); setBoard(s.board); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // 按 group 分区渲染导航
  const groups = [];
  for (const m of NAV_ITEMS) {
    let g = groups.find((x) => x.id === m.group);
    if (!g) { g = { id: m.group, items: [] }; groups.push(g); }
    g.items.push(m);
  }

  return (
    <div className="app-shell">
      {showWelcome && <WelcomeGate hasClientId={!!(getLS('sync-client-id') || DEFAULT_CLIENT_ID)} onLogin={startLogin} onSkip={dismissWelcome} />}
      <aside className="app-sidebar">
        <div className="app-brand">
          <h1>🎯 成长规划</h1>
          <div className="app-brand-sub">Personal Growth Planner</div>
        </div>
        <nav className="app-nav">
          {groups.map((g) => (
            <React.Fragment key={g.id}>
              {GROUP_LABEL[g.id] && <div className="app-navgroup">{GROUP_LABEL[g.id]}</div>}
              {g.items.map((m) => {
                // 依赖 tick/active 触发的重渲染刷新徽章
                const count = badgeFor(m.kind, m.id);
                return (
                  <button
                    key={m.id}
                    className={`app-navbtn ${active === m.id && !board ? 'active' : ''}`}
                    onClick={() => { setActive(m.id); setBoard(null); }}
                  >
                    <span className="ic">{m.icon}</span>
                    {m.label}
                    {count && <span className="badge">{count}</span>}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </nav>
        <div className="app-foot">
          <AISettingsButton compact onSaved={bump} />
          <SeedButton />
          <ExportButton />
          <ImportButton />
          <CloudSync loginSignal={loginSignal} />
        </div>
      </aside>

      <main className="app-main">
        <div className="app-mainpad">
          {board ? (
            <BigBoard id={board} get={readModule} boards={BOARD_ORDER.filter((bid) => buildAnalytics(bid, readModule))}
              onNavBoard={openBoard} onBack={() => setBoard(null)} onEnter={() => go(board)} />
          ) : active === 'home' ? (
            <Dashboard onNavigate={go} onOpenBoard={openBoard} onChange={bump} onSeed={doSeed} />
          ) : active === 'schedule' ? (
            <SchedulePlanner storageKey="schedule-planner" onChange={bump} />
          ) : active === 'goals' ? (
            <GoalsPlanner storageKey="goals-planner" onChange={bump} linkOptions={LINK_OPTIONS} resolveLink={(id, goalId) => computeLink(id, readModule, undefined, { goalId })} />
          ) : active === 'habits' ? (
            <HabitsPlanner storageKey="habits-planner" onChange={bump} />
          ) : active === 'cut' ? (
            <CutPlanner storageKey="cut-planner" onChange={bump} />
          ) : active === 'papers' ? (
            <PapersReader storageKey="papers-planner" onChange={bump} />
          ) : active === 'ledger' ? (
            <LedgerPlanner storageKey="ledger-planner" onChange={bump} />
          ) : active === 'compare' ? (
            <CompareTool storageKey="compare-planner" onChange={bump} />
          ) : active === 'salary' ? (
            <SalaryEstimator storageKey="salary-planner" onChange={bump} />
          ) : active === 'wealth' ? (
            <WealthSection />
          ) : active === 'learning' ? (
            <LearningPlanner storageKey="learning-planner" onChange={bump} />
          ) : active === 'aimap' ? (
            <>
              <div className="app-modhead">
                <h2>🗺️ 学习地图</h2>
                <p>「学什么」的全景版图：把整片知识画成疆域，逐格点亮、清雾、生成学习卡。想要「怎么学」的节奏（计划+番茄+复习）见左侧「学习计划」</p>
              </div>
              <AIMapPlanner storageKey="aimap-planner" onChange={bump} />
            </>
          ) : active === 'fitness' ? (
            <FitnessPlanner storageKey="fitness-planner" onChange={bump} />
          ) : active === 'project' ? (
            <ProjectPlanner storageKey="project-planner" onChange={bump} />
          ) : active === 'stocks' ? (
            <StockSection />
          ) : (
            <TaskModule key={active} module={TASK_MODULES.find((m) => m.id === active)} onMutate={bump} />
          )}
        </div>
      </main>
    </div>
  );
}

/* ============================ 财富规划区 ============================ */
function WealthSection() {
  return (
    <>
      <div className="app-modhead">
        <h2>💰 财富规划</h2>
        <p>测算储蓄率、综合年化与达成财富目标所需年数，并预测资产增长曲线</p>
      </div>
      <SavingsPlanner storageKey="savings-planner" />
    </>
  );
}

/* ============================ 股市观测区 ============================ */
function StockSection() {
  return (
    <>
      <div className="app-modhead">
        <h2>📈 股市观测</h2>
        <p>自选股清单与实时行情观测（数据由浏览器直连行情 API，无后端）</p>
      </div>
      <StockWatch />
    </>
  );
}

/* ============================ 通用清单模块 ============================ */
function TaskModule({ module, onMutate }) {
  const [data, setData] = useLocalStorage(`planning_${module.id}`, { items: [] });
  const [input, setInput] = useState('');
  const items = data.items || [];
  const done = items.filter((i) => i.completed).length;

  const mutate = (updater) => {
    const next = { ...data, items: updater(items) };
    setData(next);
    // 同步写入 localStorage，确保侧边栏徽章在本次重渲染即读到最新计数
    try {
      localStorage.setItem(`planning_${module.id}`, JSON.stringify(next));
    } catch (e) {
      /* 静默 */
    }
    if (onMutate) onMutate();
  };

  const add = () => {
    const t = input.trim();
    if (!t) return;
    mutate((list) => [
      ...list,
      { id: Date.now(), title: t, completed: false, createdAt: new Date().toISOString() },
    ]);
    setInput('');
  };
  const toggle = (id) => mutate((list) => list.map((i) => (i.id === id ? { ...i, completed: !i.completed } : i)));
  const edit = (id) => {
    const it = items.find((i) => i.id === id);
    const t = prompt('编辑内容：', it.title);
    if (t !== null && t.trim()) mutate((list) => list.map((i) => (i.id === id ? { ...i, title: t.trim() } : i)));
  };
  const del = (id) => mutate((list) => list.filter((i) => i.id !== id));

  return (
    <>
      <div className="app-modhead">
        <h2>
          <span>{module.icon}</span> {module.title}
        </h2>
        <p>{module.subtitle}</p>
        {items.length > 0 && (
          <div className="app-stats">
            <span className="done">{done}</span> / {items.length} 已完成
          </div>
        )}
      </div>

      <div className="app-card">
        <div className="app-inputgrp">
          <input
            type="text"
            value={input}
            placeholder={module.placeholder}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button className="app-btn app-btn-primary" onClick={add}>
            添加
          </button>
        </div>

        {items.length === 0 ? (
          <div className="app-empty">
            <div className="ic">📭</div>
            <div>{module.empty}</div>
            <div style={{ fontSize: 14, marginTop: 4 }}>开始添加你的第一项吧！</div>
          </div>
        ) : (
          <div className="app-list">
            {items.map((it) => (
              <div className={`app-item ${it.completed ? 'done' : ''}`} key={it.id}>
                <div className="app-item-main">
                  <input type="checkbox" checked={it.completed} onChange={() => toggle(it.id)} />
                  <div>
                    <div className="app-item-title">{it.title}</div>
                    <div className="app-item-sub">{new Date(it.createdAt).toLocaleDateString('zh-CN')}</div>
                  </div>
                </div>
                <div className="app-item-acts">
                  <button className="app-mini app-mini-edit" onClick={() => edit(it.id)}>
                    编辑
                  </button>
                  <button className="app-mini app-mini-del" onClick={() => del(it.id)}>
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ============================ 数据导出 / 导入 ============================ */
const getLS = (k) => {
  try {
    return localStorage.getItem(k);
  } catch (e) {
    return null;
  }
};
const setLS = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch (e) {
    /* 静默 */
  }
};

function SeedButton() {
  const onSeed = () => {
    const filled = seedMissing();
    if (!filled.length) { alert('你的各模块都已有数据，未改动任何内容——示例数据只填充空白模块，不会覆盖你已有的数据。'); return; }
    alert(`已为 ${filled.length} 个空白模块填充示例数据（不覆盖已有数据），即将刷新页面。`);
    location.reload();
  };
  return (
    <button className="app-tool" onClick={onSeed} title="只为空白模块填充示例数据，不会覆盖你已有的内容">
      ✨ 填充示例数据（空白模块）
    </button>
  );
}

function ExportButton() {
  const onExport = () => {
    const backup = gatherBackup(getLS);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `growth-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button className="app-tool" onClick={onExport}>
      ⬇️ 导出备份
    </button>
  );
}

function ImportButton() {
  const onPick = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const modules = extractModules(JSON.parse(ev.target.result));
        if (!confirm('导入将覆盖当前所有数据，确定继续吗？')) {
          e.target.value = '';
          return;
        }
        applyBackup(setLS, modules);
        alert('导入成功，即将刷新页面。');
        location.reload();
      } catch (err) {
        alert('导入失败：' + err.message);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };
  return (
    <label className="app-tool" style={{ textAlign: 'center' }}>
      ⬆️ 导入备份
      <input type="file" accept="application/json" hidden onChange={onPick} />
    </label>
  );
}

/* ============================ Google Drive 云同步（自动，文件夹/多文件） ============================ */
/* 浏览器侧 OAuth（drive.file 最小权限）。数据写进你 Drive 里一个**可见文件夹**「成长规划 (g-lab)」，
   每个模块一个 JSON 文件 + 说明.txt，你可自行浏览/备份/编辑。开启「自动同步」后：连接时按内容签名
   三向对账；之后只把「变化了的文件」防抖上传；token 过期自动静默续期。Client ID/签名存本机、Key 不上云。 */
const cloudLink = { background: 'none', border: 'none', padding: 0, color: 'var(--text-3)', fontSize: 11.5, cursor: 'pointer' };

/* 默认 Google OAuth Client ID（公开值，可安全写死）。
 * —— 一次性配置：在 Google Cloud 建好 Client ID 后，把下面这行的 '' 换成你的
 *    （形如 1234567890-abcde.apps.googleusercontent.com），提交即生效。
 *    之后你所有设备打开页面都自带它，无需再粘贴；勾一次「自动同步」即近似免登录。
 *    安全：Client ID 公开是设计如此，真正的护栏是「在控制台把授权来源锁成你的域名」+ drive.file 最小权限。
 *    详细步骤见 sync/README.md。 */
const DEFAULT_CLIENT_ID = '';

function CloudSync({ loginSignal = 0 }) {
  const [clientId, setClientId] = useState(() => getLS('sync-client-id') || DEFAULT_CLIENT_ID);
  const [auto, setAuto] = useState(() => getLS('sync-auto') === '1');
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [wizard, setWizard] = useState(false);

  const tokenRef = useRef(null);
  const folderRef = useRef(null);
  const renewRef = useRef(null);
  const syncedSigRef = useRef(getLS('sync-sig') || '');
  const debRef = useRef(null);

  const localModules = () => gatherBackup(getLS).modules;
  const localSig = () => signatureOf(localModules());
  const setSigsFrom = (mods) => {
    syncedSigRef.current = signatureOf(mods);
    setLS('sync-sig', syncedSigRef.current);
    setLS('sync-filesigs', JSON.stringify(perKeySig(mods)));
  };
  const getToken = async (silent) => {
    tokenRef.current = await requestToken(clientId, { silent });
    scheduleRenew();
    return tokenRef.current;
  };
  // 主动续期：access token 约 1 小时失效，到期前 ~50 分钟静默换新，长会话也不掉线
  const scheduleRenew = () => {
    clearTimeout(renewRef.current);
    renewRef.current = setTimeout(() => {
      getToken(true).catch(() => { /* 掉登录则等下次操作触发的 401 兜底续期 */ });
    }, 50 * 60 * 1000);
  };
  // 401 时静默续期重试一次
  const withAuth = async (fn) => {
    try {
      return await fn();
    } catch (e) {
      if (/401|登录已过期/.test((e && e.message) || '')) {
        await getToken(true);
        return await fn();
      }
      throw e;
    }
  };
  const ensureFolder = async () => {
    if (!folderRef.current) folderRef.current = await findOrCreateFolder(tokenRef.current, SYNC_FOLDER);
    return folderRef.current;
  };
  // 读云端：把文件夹里的 *.json 还原成 modules
  const readCloud = async () => {
    const folderId = await ensureFolder();
    const children = await listChildren(tokenRef.current, folderId);
    const files = [];
    for (const c of children) {
      if (c.name.endsWith('.json')) files.push({ name: c.name, text: await downloadText(tokenRef.current, c.id) });
    }
    return { modules: filesToModules(files) };
  };
  // 写云端：只写「变化了的模块文件」（force=全写）；确保 说明.txt 存在
  const pushCloud = async (force) => {
    const folderId = await ensureFolder();
    const mods = localModules();
    const cur = perKeySig(mods);
    let stored = {};
    try {
      stored = JSON.parse(getLS('sync-filesigs') || '{}');
    } catch (e) {
      stored = {};
    }
    const children = await listChildren(tokenRef.current, folderId);
    const idByName = {};
    for (const c of children) idByName[c.name] = c.id;
    for (const key of Object.keys(cur)) {
      if (!force && cur[key] === stored[key]) continue;
      const name = fileForKey(key);
      await uploadFile(tokenRef.current, folderId, name, idByName[name] || null, JSON.stringify(mods[key]));
    }
    if (!idByName[READMEFILE]) await uploadFile(tokenRef.current, folderId, READMEFILE, null, buildReadme(), 'text/plain');
    setSigsFrom(mods);
    setStatus('✅ 已同步 · ' + new Date().toLocaleTimeString('zh-CN'));
  };
  const pull = (mods) => {
    applyBackup(setLS, mods);
    setSigsFrom(mods);
    alert('已从云端拉取数据，刷新页面。');
    location.reload();
  };

  /* 连接后的三向对账 */
  const reconcile = async () => {
    const { modules: cMods } = await readCloud();
    const mods = localModules();
    const lSig = signatureOf(mods);
    const cSig = signatureOf(cMods);
    if (Object.keys(cMods).length === 0) {
      await pushCloud(true);
      setStatus('已连接 · 首次上传完成');
      return;
    }
    if (cSig === lSig) {
      setSigsFrom(mods);
      setStatus('已连接 · 已是最新');
      return;
    }
    if (Object.keys(mods).length === 0) return pull(cMods); // 本机空 → 直接拉
    const last = getLS('sync-sig') || '';
    if (lSig === last) return pull(cMods); // 本机无新改动，云端更新 → 拉
    if (cSig === last) {
      await pushCloud(false); // 云端没变，本机有改动 → 推
      setStatus('已连接 · 本机改动已上传');
      return;
    }
    const useCloud = confirm('云端与本机都有改动（冲突）：\n确定 = 用云端覆盖本机；取消 = 用本机覆盖云端。');
    if (useCloud) pull(cMods);
    else {
      await pushCloud(true);
      setStatus('已连接 · 以本机为准，已上传');
    }
  };

  const connect = async (silent) => {
    if (!silent) {
      setBusy(true);
      setStatus('正在连接 Google…');
    }
    try {
      await getToken(silent);
      setConnected(true);
      await withAuth(reconcile);
    } catch (e) {
      setStatus(silent ? '点「连接」开启同步' : '❌ ' + (e.message || String(e)));
      throw e;
    } finally {
      if (!silent) setBusy(false);
    }
  };

  const uploadManual = async () => {
    setBusy(true);
    setStatus('正在上传…');
    try {
      await withAuth(() => pushCloud(false));
    } catch (e) {
      setStatus('❌ ' + (e.message || String(e)));
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    setStatus('正在读取云端…');
    try {
      await withAuth(async () => {
        const { modules } = await readCloud();
        if (Object.keys(modules).length === 0) {
          setStatus('云端还没有数据，先上传一次');
          return;
        }
        if (!confirm('从云端恢复将覆盖本机当前数据，确定继续吗？')) {
          setStatus('');
          return;
        }
        pull(modules);
      });
    } catch (e) {
      setStatus('❌ ' + (e.message || String(e)));
    } finally {
      setBusy(false);
    }
  };

  // 向导保存 Client ID：存本机 → 立即一键连接（弹 Google 授权）
  const saveClientId = (id) => {
    setLS('sync-client-id', id);
    setClientId(id || DEFAULT_CLIENT_ID);
    tokenRef.current = null;
    setConnected(false);
    setWizard(false);
    if (id || DEFAULT_CLIENT_ID) {
      setStatus('已保存，正在连接…');
      setTimeout(() => connect(false).catch(() => {}), 0);
    } else {
      setStatus('已清除 Client ID');
    }
  };
  const toggleAuto = async () => {
    const next = !auto;
    setAuto(next);
    setLS('sync-auto', next ? '1' : '0');
    if (next && !connected) await connect(false).catch(() => {});
  };
  const disconnect = () => {
    tokenRef.current = null;
    folderRef.current = null;
    clearTimeout(renewRef.current);
    setConnected(false);
    setStatus('已断开（自动同步暂停）');
  };

  /* 启动：已配置 + 开了自动 → 尝试静默连接（你登着 Google 且授权过即零点击） */
  useEffect(() => {
    if (clientId && auto) connect(true).catch(() => {});
    return () => clearTimeout(renewRef.current);
    // 仅在挂载时尝试一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 欢迎页「用 Google 登录」触发：已配 Client ID → 直接连接 + 开自动；否则打开设置向导 */
  useEffect(() => {
    if (!loginSignal) return;
    if (clientId) {
      setLS('sync-auto', '1'); setAuto(true);
      connect(false).catch(() => {});
    } else {
      setWizard(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginSignal]);

  /* 自动上传：连接 + 自动开启时，轮询内容签名，变化则防抖上传 */
  useEffect(() => {
    if (!connected || !auto) return undefined;
    const id = setInterval(() => {
      if (localSig() === syncedSigRef.current) return;
      clearTimeout(debRef.current);
      debRef.current = setTimeout(() => {
        withAuth(() => pushCloud(false)).catch((e) => setStatus('❌ ' + (e.message || e)));
      }, 1500);
    }, 4000);
    return () => {
      clearInterval(id);
      clearTimeout(debRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, auto]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {!clientId ? (
        <button className="app-tool" onClick={() => setWizard(true)}>☁️ 开启 Google 同步</button>
      ) : !connected ? (
        <button className="app-tool" style={{ borderColor: 'var(--accent)', color: 'var(--accent-2)', fontWeight: 500 }}
          onClick={() => connect(false).catch(() => {})} disabled={busy}>
          {busy ? '正在连接…' : '☁️ 一键连接 Google Drive'}
        </button>
      ) : (
        <>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={auto} onChange={toggleAuto} style={{ accentColor: 'var(--accent)' }} />
            自动同步到 Drive
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="app-tool" style={{ flex: 1 }} onClick={uploadManual} disabled={busy}>⬆️ 上传</button>
            <button className="app-tool" style={{ flex: 1 }} onClick={restore} disabled={busy}>⬇️ 恢复</button>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setWizard(true)} style={cloudLink}>改 ID</button>
            <button onClick={disconnect} style={cloudLink}>断开</button>
          </div>
        </>
      )}
      {status && <div style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.5, overflowWrap: 'anywhere' }}>{status}</div>}
      {wizard && <SetupWizard initialId={getLS('sync-client-id') || ''} onSave={saveClientId} onClose={() => setWizard(false)} />}
    </div>
  );
}

/* 应用内「云同步设置向导」：预填本站域名 + 一键复制 + 末尾粘 Client ID 即可，免去翻文档。 */
/* 登录优先的欢迎页：首访先请用 Google 登录（数据存进自己的 Drive），保留「先本地试用」逃生口。 */
function WelcomeGate({ hasClientId, onLogin, onSkip }) {
  return (
    <BodyPortal>
      <div style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(38,36,31,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5vh 16px', overflowY: 'auto' }}>
        <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--bd)', borderRadius: 18, padding: '30px 30px 24px', maxWidth: 460, width: '100%', boxShadow: '0 24px 70px rgba(38,36,31,.3)', textAlign: 'center' }}>
          <div style={{ fontSize: 42 }}>🎯</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 23, fontWeight: 500, marginTop: 10 }}>欢迎来到成长规划</h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.7, marginTop: 10 }}>
            用 <b>Google 登录</b>，你的数据存进<b>你自己的 Google Drive</b>——换设备、换浏览器都自动同步，永不丢失。
            应用只申请 <code style={{ fontSize: 12 }}>drive.file</code> 权限（仅能读写它自己创建的文件），不碰你其他文件、不经任何第三方服务器。
          </p>
          <button className="app-btn app-btn-primary" style={{ width: '100%', marginTop: 18, padding: '11px', fontSize: 14.5 }} onClick={onLogin}>
            ☁️ 用 Google 登录并同步
          </button>
          <button onClick={onSkip} style={{ border: 'none', background: 'none', color: 'var(--text-3)', fontSize: 12.5, cursor: 'pointer', marginTop: 14, textDecoration: 'underline' }}>
            先本地试用（数据只存这台设备，随时可登录）
          </button>
          {!hasClientId && (
            <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--bd-soft)' }}>
              首次需约 5 分钟一次性设置 Google 授权（点上面「登录」会引导你）。设置完成后，本设备及今后都一键登录。
            </p>
          )}
        </div>
      </div>
    </BodyPortal>
  );
}

function SetupWizard({ initialId, onSave, onClose }) {
  const [id, setId] = useState(initialId || '');
  const [copied, setCopied] = useState('');
  const origin = (typeof window !== 'undefined' && window.location && window.location.origin) || 'https://<你的用户名>.github.io';
  const copy = async (text, tag) => {
    try { await navigator.clipboard.writeText(text); } catch (e) { try { window.prompt('复制：', text); } catch (_) {} }
    setCopied(tag); setTimeout(() => setCopied(''), 1500);
  };
  const CopyBtn = ({ text, tag }) => (
    <button onClick={() => copy(text, tag)} style={{ border: '1px solid var(--bd-2)', background: 'var(--surface)', borderRadius: 7, padding: '3px 9px', fontSize: 11.5, cursor: 'pointer', color: 'var(--text-2)', flex: 'none' }}>
      {copied === tag ? '✓ 已复制' : '复制'}
    </button>
  );
  const Field = ({ text, tag }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
      <code style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere', background: 'var(--surface-3)', borderRadius: 7, padding: '5px 9px', fontSize: 12, fontFamily: 'ui-monospace,Menlo,monospace' }}>{text}</code>
      <CopyBtn text={text} tag={tag} />
    </div>
  );
  const L = ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-2)', fontWeight: 500 }}>{children}</a>;
  const stepWrap = { display: 'flex', gap: 10, padding: '11px 0', borderTop: '1px solid var(--bd-soft)' };
  const num = { flex: 'none', width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 };

  return (
    <BodyPortal>
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(38,36,31,.42)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5vh 16px', overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--bd)', borderRadius: 16, padding: 24, maxWidth: 560, width: '100%', boxShadow: '0 20px 60px rgba(38,36,31,.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500 }}>☁️ 开启 Google Drive 同步</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-3)', lineHeight: 1 }}>×</button>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.6 }}>
          一次性设置约 5 分钟。数据只存进<b>你自己的 Drive</b>，应用只申请 <code>drive.file</code>（仅能碰自己创建的文件）。设置完成后：每次<b>一键登录</b>、授权失效就再点一次，<b>数据一直在</b>。
        </p>

        <div style={{ marginTop: 8 }}>
          <div style={stepWrap}>
            <span style={num}>1</span>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>打开 <L href="https://console.cloud.google.com/projectcreate">Google Cloud Console</L> 新建一个项目（名字随意）。</div>
          </div>
          <div style={stepWrap}>
            <span style={num}>2</span>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>启用 <L href="https://console.cloud.google.com/apis/library/drive.googleapis.com">Google Drive API</L>（点 Enable / 启用）。</div>
          </div>
          <div style={stepWrap}>
            <span style={num}>3</span>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              打开 <L href="https://console.cloud.google.com/apis/credentials/consent">OAuth consent screen</L>：User Type 选 <b>External</b>，保持 <b>Testing</b>，在 <b>Test users</b> 里<b>只加你自己的 Google 邮箱</b>。
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 3 }}>🔒 这一步就是隐私锁：只有你能授权，别人连不上。</div>
            </div>
          </div>
          <div style={stepWrap}>
            <span style={num}>4</span>
            <div style={{ fontSize: 13, lineHeight: 1.6, minWidth: 0, flex: 1 }}>
              打开 <L href="https://console.cloud.google.com/apis/credentials">Credentials</L> → Create Credentials → <b>OAuth client ID</b> → 类型 <b>Web application</b>。
              在 <b>Authorized JavaScript origins</b> 里<b>逐条 Add</b> 下面两个（直接复制）：
              <Field text={origin} tag="o1" />
              <Field text="http://localhost:8000" tag="o2" />
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4 }}>🔒 第二把锁：别的域名即使拿到你的 Client ID 也用不了。</div>
            </div>
          </div>
          <div style={stepWrap}>
            <span style={num}>5</span>
            <div style={{ fontSize: 13, lineHeight: 1.6, minWidth: 0, flex: 1 }}>
              创建后复制 <b>Client ID</b>（形如 <code>1234-abcd.apps.googleusercontent.com</code>），粘到这里：
              <input value={id} onChange={(e) => setId(e.target.value)} placeholder="粘贴 Client ID" spellCheck={false}
                style={{ width: '100%', marginTop: 6, padding: '8px 11px', border: '1px solid var(--bd-2)', borderRadius: 9, fontSize: 13, fontFamily: 'ui-monospace,Menlo,monospace' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)', marginRight: 'auto' }}>想全设备免粘贴？把 ID 写进 <code>DEFAULT_CLIENT_ID</code>（见 sync/README）。</span>
          <button className="app-btn" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }} onClick={onClose}>取消</button>
          <button className="app-btn app-btn-primary" disabled={!id.trim()} style={!id.trim() ? { opacity: .5, cursor: 'not-allowed' } : {}}
            onClick={() => onSave(id.trim())}>保存并连接 →</button>
        </div>
      </div>
    </div>
    </BodyPortal>
  );
}

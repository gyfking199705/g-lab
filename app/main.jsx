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
import FitnessPlanner from '../fitness/FitnessPlanner.jsx';
import ProjectPlanner from '../project/ProjectPlanner.jsx';
import StockWatch from '../stocks/StockWatch.jsx';
import Dashboard from './Dashboard.jsx';
import BigBoard from './BigBoard.jsx';
import { hasBoard } from './analytics.js';
import SchedulePlanner from '../schedule/SchedulePlanner.jsx';
import GoalsPlanner from '../goals/GoalsPlanner.jsx';
import HabitsPlanner from '../habits/HabitsPlanner.jsx';
import CutPlanner from '../cut/CutPlanner.jsx';
import PapersReader from '../papers/PapersReader.jsx';
import LedgerPlanner from '../ledger/LedgerPlanner.jsx';
import { readModule } from '../core/store.js';
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
  { id: 'cut', icon: '📉', label: '减脂计划', kind: 'cut', group: 'core' },
  { id: 'papers', icon: '📄', label: '论文阅读', kind: 'papers', group: 'core' },
  { id: 'personal', icon: '📝', label: '个人规划', kind: 'task', group: 'more' },
  { id: 'learning', icon: '📚', label: '学习规划', kind: 'learning', group: 'more' },
  { id: 'fitness', icon: '💪', label: '健身规划', kind: 'fitness', group: 'more' },
  { id: 'project', icon: '📋', label: '项目规划', kind: 'project', group: 'more' },
  { id: 'ledger', icon: '🧾', label: '记账', kind: 'ledger', group: 'more' },
  { id: 'wealth', icon: '💰', label: '财富规划', kind: 'wealth', group: 'more' },
  { id: 'stocks', icon: '📈', label: '股市观测', kind: 'stocks', group: 'more' },
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

const GROUP_LABEL = { core: '日常', more: '规划工具' };

/* ============================ 主应用 ============================ */
export default function App() {
  const [active, setActive] = useState('home');
  // 用一个计数器在数据变化后刷新侧边栏徽章
  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);
  const [board, setBoard] = useState(null); // 当前打开的「大盘」模块 id（null=不在大盘）
  const go = (id) => { setActive(id); setBoard(null); bump(); };
  // 看板卡片点击：有专属大盘则打开大盘，否则直接进模块
  const openBoard = (id) => { if (hasBoard(id)) setBoard(id); else go(id); bump(); };

  // 按 group 分区渲染导航
  const groups = [];
  for (const m of NAV_ITEMS) {
    let g = groups.find((x) => x.id === m.group);
    if (!g) { g = { id: m.group, items: [] }; groups.push(g); }
    g.items.push(m);
  }

  return (
    <div className="app-shell">
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
          <ExportButton />
          <ImportButton />
          <CloudSync />
        </div>
      </aside>

      <main className="app-main">
        <div className="app-mainpad">
          {board ? (
            <BigBoard id={board} get={readModule} onBack={() => setBoard(null)} onEnter={() => go(board)} />
          ) : active === 'home' ? (
            <Dashboard onNavigate={go} onOpenBoard={openBoard} onChange={bump} />
          ) : active === 'schedule' ? (
            <SchedulePlanner storageKey="schedule-planner" onChange={bump} />
          ) : active === 'goals' ? (
            <GoalsPlanner storageKey="goals-planner" onChange={bump} />
          ) : active === 'habits' ? (
            <HabitsPlanner storageKey="habits-planner" onChange={bump} />
          ) : active === 'cut' ? (
            <CutPlanner storageKey="cut-planner" onChange={bump} />
          ) : active === 'papers' ? (
            <PapersReader storageKey="papers-planner" onChange={bump} />
          ) : active === 'ledger' ? (
            <LedgerPlanner storageKey="ledger-planner" onChange={bump} />
          ) : active === 'wealth' ? (
            <WealthSection />
          ) : active === 'learning' ? (
            <LearningPlanner storageKey="learning-planner" onChange={bump} />
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

function CloudSync() {
  const [clientId, setClientId] = useState(() => getLS('sync-client-id') || '');
  const [auto, setAuto] = useState(() => getLS('sync-auto') === '1');
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const tokenRef = useRef(null);
  const folderRef = useRef(null);
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
    return tokenRef.current;
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

  const editClientId = () => {
    const v = prompt('粘贴你的 Google OAuth Client ID（在 Google Cloud 创建，步骤见 sync/README.md）：', clientId);
    if (v == null) return;
    const id = v.trim();
    setLS('sync-client-id', id);
    setClientId(id);
    tokenRef.current = null;
    setConnected(false);
    setStatus(id ? '已保存 Client ID，可以连接了' : '已清除 Client ID');
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
    setConnected(false);
    setStatus('已断开（自动同步暂停）');
  };

  /* 启动：已配置 + 开了自动 → 尝试静默连接 */
  useEffect(() => {
    if (clientId && auto) connect(true).catch(() => {});
    // 仅在挂载时尝试一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <button className="app-tool" onClick={editClientId}>☁️ 设置云同步</button>
      ) : (
        <>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={auto} onChange={toggleAuto} style={{ accentColor: 'var(--accent)' }} />
            自动同步到 Drive
          </label>
          {!connected ? (
            <button className="app-tool" onClick={() => connect(false).catch(() => {})} disabled={busy}>☁️ 连接 Google Drive</button>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="app-tool" style={{ flex: 1 }} onClick={uploadManual} disabled={busy}>⬆️ 上传</button>
              <button className="app-tool" style={{ flex: 1 }} onClick={restore} disabled={busy}>⬇️ 恢复</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={editClientId} style={cloudLink}>改 ID</button>
            {connected && <button onClick={disconnect} style={cloudLink}>断开</button>}
          </div>
        </>
      )}
      {status && <div style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.5, overflowWrap: 'anywhere' }}>{status}</div>}
    </div>
  );
}

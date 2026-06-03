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
import React, { useEffect, useState } from 'react';
import SavingsPlanner from '../savings/SavingsPlanner.jsx';
import LearningPlanner from '../learning/LearningPlanner.jsx';
import FitnessPlanner from '../fitness/FitnessPlanner.jsx';
import StockWatch from '../stocks/StockWatch.jsx';

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

/* 侧边栏导航顺序（个人 → 学习 → 健身 → 财富 → 股市）。kind 决定渲染哪种主内容。 */
const NAV_ITEMS = [
  { id: 'personal', icon: '📝', label: '个人规划', kind: 'task' },
  { id: 'learning', icon: '📚', label: '学习规划', kind: 'learning' },
  { id: 'fitness', icon: '💪', label: '健身规划', kind: 'fitness' },
  { id: 'wealth', icon: '💰', label: '财富规划', kind: 'wealth' },
  { id: 'stocks', icon: '📈', label: '股市观测', kind: 'stocks' },
];

/* 参与备份的所有 localStorage 键。
   注意：AI 配置键 `learning-ai`（含 API Key）故意不纳入备份，避免随分享外泄。 */
const BACKUP_KEYS = [
  'planning_personal',
  'planning_learning', // 旧版学习待办，保留以兼容历史备份
  'planning_fitness', // 旧版健身待办，保留以兼容历史备份
  'learning-planner', // AI 学习计划站数据
  'fitness-planner', // 健身训练规划数据
  'savings-planner',
  'stocks-watch',
];

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

/* ============================ 主应用 ============================ */
export default function App() {
  const [active, setActive] = useState('personal');
  // 用一个计数器在数据变化后刷新侧边栏徽章
  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-brand">
          <h1>🎯 成长规划</h1>
          <div className="app-brand-sub">Personal Growth Planner</div>
        </div>
        <nav className="app-nav">
          {NAV_ITEMS.map((m) => {
            // 依赖 tick/active 触发的重渲染刷新徽章
            const count =
              m.kind === 'task'
                ? readCount(`planning_${m.id}`)
                : m.kind === 'learning'
                ? readLearningBadge()
                : m.kind === 'fitness'
                ? readFitnessBadge()
                : null;
            return (
              <button
                key={m.id}
                className={`app-navbtn ${active === m.id ? 'active' : ''}`}
                onClick={() => setActive(m.id)}
              >
                <span className="ic">{m.icon}</span>
                {m.label}
                {count && <span className="badge">{count}</span>}
              </button>
            );
          })}
        </nav>
        <div className="app-foot">
          <ExportButton />
          <ImportButton />
        </div>
      </aside>

      <main className="app-main">
        <div className="app-mainpad">
          {active === 'wealth' ? (
            <WealthSection />
          ) : active === 'learning' ? (
            <LearningPlanner storageKey="learning-planner" onChange={bump} />
          ) : active === 'fitness' ? (
            <FitnessPlanner storageKey="fitness-planner" onChange={bump} />
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
function ExportButton() {
  const onExport = () => {
    const modules = {};
    for (const key of BACKUP_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          modules[key] = JSON.parse(raw);
        } catch (e) {
          /* 跳过损坏数据 */
        }
      }
    }
    const backup = { app: 'growth-planner', version: 2, exportedAt: new Date().toISOString(), modules };
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
        const backup = JSON.parse(ev.target.result);
        const modules = backup.modules || backup;
        if (!modules || typeof modules !== 'object') throw new Error('备份文件格式不正确');
        if (!confirm('导入将覆盖当前所有数据，确定继续吗？')) {
          e.target.value = '';
          return;
        }
        for (const key of BACKUP_KEYS) {
          if (modules[key] != null) localStorage.setItem(key, JSON.stringify(modules[key]));
        }
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

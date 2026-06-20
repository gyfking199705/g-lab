/**
 * AI 学习计划站 —— React 组件（函数式 + hooks）
 * ------------------------------------------------------------------
 * 一个「能在上面真正学习」的学习站：
 *   · 今日：连续天数/进度概览 + 番茄计时记录 + 间隔复习队列 + 继续学习队列
 *   · 计划：从模板 / AI 生成 / 空白创建学习计划；逐知识点追踪「未开始/学习中/已掌握」、笔记、资源、AI 讲解
 *   · 统计：手写 SVG 学习热力图 + 各计划进度 + 未来复习分布
 *
 * - 计算逻辑全部来自 ./calc.js（纯函数，可单测）；模板见 ./templates.js；AI 调用见 ./ai.js。
 * - 图表为手写 SVG，不依赖任何图表库。自带样式（类名前缀 lp-），无需外部 CSS。
 * - 可通过 props 接入主应用（同 SavingsPlanner 约定）：
 *     <LearningPlanner initialState={...} onChange={(state)=>{}} storageKey="learning-planner" />
 *
 * 设计取舍：默认「离线可用」（模板+追踪+间隔复习+统计皆不依赖网络）；
 *           填入自己的 API Key 后解锁「AI 生成计划 / AI 讲解知识点」。Key 仅存本地浏览器。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import GradientText from '../../muse-ui/src/GradientText.jsx';
import {
  todayStr,
  relDay,
  fmtDate,
  planStats,
  overallStats,
  dueReviews,
  upcomingReviews,
  nextLessons,
  computeStreak,
  studyMinutes,
  minutesOn,
  activitySeries,
  suggestedDailyLessons,
  planTargetDate,
  scheduleReview,
  scaffoldPlan,
  uid,
  formatDuration,
  pctText,
  GRADES,
  STATUS_LABEL,
  encodePlanShare,
  decodePlanShare,
} from './calc.js';
import { groupedTemplates } from './templates.js';
import { PROVIDERS, defaultAIConfig, isConfigured, generatePlan, explainLesson } from './ai.js';

const AI_STORAGE_KEY = 'learning-ai';
const GRADE_ORDER = ['again', 'hard', 'good', 'easy'];

const DEFAULT_DATA = {
  plans: [],
  sessions: [],
  settings: { minutesPerLesson: 30, dailyGoalMinutes: 30 },
};

/* ----------------------------- 持久化辅助 ----------------------------- */
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
  if (!Array.isArray(data.plans)) data.plans = [];
  if (!Array.isArray(data.sessions)) data.sessions = [];
  data.settings = { ...DEFAULT_DATA.settings, ...(data.settings || {}) };
  return data;
}

function loadAIConfig() {
  try {
    const raw = localStorage.getItem(AI_STORAGE_KEY);
    if (raw) return { ...defaultAIConfig(), ...JSON.parse(raw) };
  } catch (e) {
    /* ignore */
  }
  return defaultAIConfig();
}

function clone(o) {
  return typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o));
}

/* ============================ 主组件 ============================ */
export default function LearningPlanner({ initialState, onChange, storageKey = 'learning-planner' }) {
  const [data, setData] = useState(() => loadData(initialState, storageKey));
  const [aiConfig, setAIConfig] = useState(loadAIConfig);
  const [tab, setTab] = useState('today'); // today | plans | stats
  const [openPlanId, setOpenPlanId] = useState(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [aiSettingsOpen, setAISettingsOpen] = useState(false);
  const [pendingShare, setPendingShare] = useState(null); // 从链接检测到的待导入计划
  const [sharePlan, setSharePlan] = useState(null); // 正在「分享」哪个计划

  const today = todayStr();

  // 打开页面时检测 URL 里的分享码（#share= 或 ?share=），有则提示导入
  useEffect(() => {
    if (typeof location === 'undefined') return;
    const src = location.hash || location.search;
    if (!src || src.indexOf('share=') < 0) return;
    try {
      const plan = decodePlanShare(src);
      setPendingShare(plan);
    } catch (e) {
      /* 分享码无效则忽略 */
    }
    // 清掉地址栏里的分享码，避免刷新重复弹出
    try {
      history.replaceState(null, '', location.pathname);
    } catch (e) {
      /* 忽略 */
    }
  }, []);

  // 持久化主数据 + 对外回调
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

  // 持久化 AI 配置（独立键，不进入跨模块备份，避免泄露 Key）
  useEffect(() => {
    try {
      localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(aiConfig));
    } catch (e) {
      /* 静默 */
    }
  }, [aiConfig]);

  /* ---- 派生数据 ---- */
  const stats = useMemo(() => overallStats(data.plans), [data.plans]);
  const reviews = useMemo(() => dueReviews(data.plans, today), [data.plans, today]);
  const upNext = useMemo(() => nextLessons(data.plans, 6), [data.plans]);
  const streak = useMemo(() => computeStreak(data.sessions, today), [data.sessions, today]);
  const todayMin = useMemo(() => minutesOn(data.sessions, today), [data.sessions, today]);

  /* ---- 数据变更 helpers ---- */
  const mutatePlans = (updater) => setData((d) => ({ ...d, plans: updater(d.plans) }));
  const updatePlan = (planId, updater) =>
    mutatePlans((plans) => plans.map((p) => (p.id === planId ? updater(p) : p)));
  const updateLesson = (planId, lessonId, updater) =>
    updatePlan(planId, (p) => ({
      ...p,
      modules: p.modules.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) => (l.id === lessonId ? updater(l) : l)),
      })),
    }));
  const addPlan = (plan) => {
    setData((d) => ({ ...d, plans: [...d.plans, plan] }));
    setOpenPlanId(plan.id);
    setTab('plans');
    setCreatorOpen(false);
  };
  const removePlan = (planId) => {
    mutatePlans((plans) => plans.filter((p) => p.id !== planId));
    if (openPlanId === planId) setOpenPlanId(null);
  };
  const addSession = (session) =>
    setData((d) => ({ ...d, sessions: [...d.sessions, { id: uid('ses'), date: today, ...session }] }));

  /* ---- 学习/复习动作 ---- */
  const setStatus = (planId, lessonId, status) =>
    updateLesson(planId, lessonId, (l) => {
      const next = { ...l, status };
      if (status !== 'todo' && !next.sr) next.sr = scheduleReview({ sr: null, grade: 'good', today });
      if (status === 'todo') next.sr = null;
      return next;
    });

  const grade = (planId, lessonId, g) =>
    updateLesson(planId, lessonId, (l) => {
      const sr = scheduleReview({ sr: l.sr, grade: g, today });
      const q = GRADES[g].quality;
      const status = q < 3 ? 'learning' : sr.reps >= 2 ? 'mastered' : 'learning';
      return { ...l, sr, status };
    });

  const openPlan = data.plans.find((p) => p.id === openPlanId) || null;

  return (
    <div className="lp-root">
      <style>{CSS}</style>

      {/* ===== 顶部：品牌 + 标签 + AI 状态 ===== */}
      <header className="lp-header">
        <div className="lp-brand">
          <h1>📚 <GradientText colors={['#CC785C', '#B5654A', '#C9A14A']}>AI 学习计划站</GradientText></h1>
          <p>制定计划 · 每天学一点 · 间隔复习不遗忘</p>
        </div>
        <div className="lp-headact">
          <button
            className={`lp-aichip ${isConfigured(aiConfig) ? 'on' : ''}`}
            onClick={() => setAISettingsOpen(true)}
            title="配置 AI（自带 Key）"
          >
            {isConfigured(aiConfig) ? `✨ AI 已就绪` : '✨ 配置 AI'}
          </button>
          <button className="lp-btn lp-btn-primary" onClick={() => setCreatorOpen(true)}>
            ＋ 新建计划
          </button>
        </div>
      </header>

      <nav className="lp-tabs">
        <button className={tabCls(tab, 'today')} onClick={() => setTab('today')}>今日</button>
        <button className={tabCls(tab, 'plans')} onClick={() => { setTab('plans'); }}>
          我的计划 {data.plans.length > 0 && <span className="lp-tabnum">{data.plans.length}</span>}
        </button>
        <button className={tabCls(tab, 'stats')} onClick={() => setTab('stats')}>统计</button>
      </nav>

      <div className="lp-body">
        {tab === 'today' && (
          <TodayView
            data={data}
            stats={stats}
            reviews={reviews}
            upNext={upNext}
            streak={streak}
            todayMin={todayMin}
            today={today}
            onGrade={grade}
            onSetStatus={setStatus}
            onLog={addSession}
            onOpenPlan={(pid) => { setOpenPlanId(pid); setTab('plans'); }}
            onNew={() => setCreatorOpen(true)}
          />
        )}

        {tab === 'plans' &&
          (openPlan ? (
            <PlanDetail
              plan={openPlan}
              aiConfig={aiConfig}
              today={today}
              onBack={() => setOpenPlanId(null)}
              onUpdate={(updater) => updatePlan(openPlan.id, updater)}
              onSetStatus={(lid, s) => setStatus(openPlan.id, lid, s)}
              onGrade={(lid, g) => grade(openPlan.id, lid, g)}
              onRemove={() => removePlan(openPlan.id)}
              onNeedAI={() => setAISettingsOpen(true)}
              onShare={() => setSharePlan(openPlan)}
            />
          ) : (
            <PlansView
              plans={data.plans}
              today={today}
              onOpen={setOpenPlanId}
              onNew={() => setCreatorOpen(true)}
            />
          ))}

        {tab === 'stats' && <StatsView data={data} stats={stats} streak={streak} today={today} />}
      </div>

      {creatorOpen && (
        <Creator
          aiConfig={aiConfig}
          onClose={() => setCreatorOpen(false)}
          onCreate={addPlan}
          onNeedAI={() => { setCreatorOpen(false); setAISettingsOpen(true); }}
        />
      )}
      {aiSettingsOpen && (
        <AISettings config={aiConfig} onChange={setAIConfig} onClose={() => setAISettingsOpen(false)} />
      )}
      {pendingShare && (
        <ImportShareModal
          plan={pendingShare}
          onClose={() => setPendingShare(null)}
          onImport={() => {
            addPlan(pendingShare);
            setPendingShare(null);
          }}
        />
      )}
      {sharePlan && <ShareModal plan={sharePlan} onClose={() => setSharePlan(null)} />}

      <p className="lp-foot">
        数据保存在本地浏览器（localStorage）。AI 为可选功能，API Key 仅存本地、调用直连模型厂商，
        不经过任何服务器；请勿将含 Key 的备份分享给他人。
      </p>
    </div>
  );
}

const tabCls = (cur, id) => `lp-tab ${cur === id ? 'active' : ''}`;

/* ============================ 今日 ============================ */
function TodayView({ data, stats, reviews, upNext, streak, todayMin, today, onGrade, onSetStatus, onLog, onOpenPlan, onNew }) {
  const goal = data.settings.dailyGoalMinutes || 30;
  const goalPct = Math.min(1, todayMin / goal);

  if (data.plans.length === 0) {
    return <EmptyAll onNew={onNew} />;
  }

  return (
    <div className="lp-grid2">
      <div className="lp-col">
        {/* KPI 行 */}
        <div className="lp-kpis">
          <Kpi label="连续学习" value={`${streak.current}`} unit="天" tone="hero" sub={`最长 ${streak.longest} 天`} />
          <Kpi label="今日学习" value={`${todayMin}`} unit="分钟" tone="accent" sub={`目标 ${goal} 分钟`} />
          <Kpi label="总进度" value={pctText(stats.pct)} tone="accent" sub={`${stats.mastered}/${stats.total} 已掌握`} />
          <Kpi label="待复习" value={`${reviews.length}`} unit="项" tone={reviews.length ? 'warn' : 'good'} sub="到期需巩固" />
        </div>

        {/* 今日复习 */}
        <Card title="🔁 今日复习" badge={reviews.length ? `${reviews.length} 项到期` : '已清空'}>
          {reviews.length === 0 ? (
            <Empty icon="✅" text="今天没有到期的复习，保持节奏！" />
          ) : (
            <div className="lp-list">
              {reviews.slice(0, 12).map((r) => (
                <ReviewRow key={r.lesson.id} item={r} onGrade={(g) => onGrade(r.planId, r.lesson.id, g)} />
              ))}
              {reviews.length > 12 && <div className="lp-more">还有 {reviews.length - 12} 项…</div>}
            </div>
          )}
        </Card>

        {/* 继续学习 */}
        <Card title="📖 继续学习" badge="接着上次的进度">
          {upNext.length === 0 ? (
            <Empty icon="🎉" text="所有知识点都已掌握，去开个新计划吧！" />
          ) : (
            <div className="lp-list">
              {upNext.map((x) => (
                <NextRow
                  key={x.lesson.id}
                  item={x}
                  onSetStatus={(s) => onSetStatus(x.planId, x.lesson.id, s)}
                  onOpenPlan={() => onOpenPlan(x.planId)}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="lp-col">
        <StudyTimer goal={goal} todayMin={todayMin} goalPct={goalPct} plans={data.plans} onLog={onLog} />
      </div>
    </div>
  );
}

function ReviewRow({ item, onGrade }) {
  const overdue = item.lesson.sr && item.lesson.sr.due < todayStr();
  return (
    <div className="lp-rev">
      <div className="lp-rev-main">
        <div className="lp-rev-title">{item.lesson.title}</div>
        <div className="lp-rev-sub">
          <span>{item.planIcon} {item.planTitle}</span>
          <span className={overdue ? 'lp-overdue' : ''}>· {relDay(item.lesson.sr.due)}到期</span>
        </div>
      </div>
      <div className="lp-grades">
        {GRADE_ORDER.map((g) => (
          <button key={g} className={`lp-grade lp-grade-${g}`} onClick={() => onGrade(g)} title={GRADES[g].label}>
            {GRADES[g].label}
          </button>
        ))}
      </div>
    </div>
  );
}

function NextRow({ item, onSetStatus, onOpenPlan }) {
  const s = item.lesson.status;
  return (
    <div className="lp-next">
      <div className="lp-next-main" onClick={onOpenPlan} role="button">
        <span className={`lp-statusdot s-${s}`} />
        <div>
          <div className="lp-next-title">{item.lesson.title}</div>
          <div className="lp-next-sub">{item.planIcon} {item.planTitle} · {item.moduleTitle}</div>
        </div>
      </div>
      <div className="lp-next-acts">
        {s === 'todo' && <button className="lp-mini" onClick={() => onSetStatus('learning')}>开始学</button>}
        {s !== 'mastered' && <button className="lp-mini lp-mini-ok" onClick={() => onSetStatus('mastered')}>已掌握</button>}
      </div>
    </div>
  );
}

/* ------- 番茄计时 + 手动记录 ------- */
function StudyTimer({ goal, todayMin, goalPct, plans, onLog }) {
  const [secs, setSecs] = useState(0);
  const [running, setRunning] = useState(false);
  const [planId, setPlanId] = useState('');
  const [manual, setManual] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');

  const finishTimer = () => {
    const minutes = Math.round(secs / 60);
    if (minutes >= 1) onLog({ minutes, planId: planId || undefined, note: note || '专注学习' });
    setSecs(0);
    setRunning(false);
    setNote('');
  };

  const logManual = () => {
    const m = parseInt(manual, 10);
    if (m >= 1) {
      onLog({ minutes: m, planId: planId || undefined, note: note || undefined });
      setManual('');
      setNote('');
    }
  };

  return (
    <Card title="⏱️ 学习计时" badge="专注一会儿">
      <div className="lp-goalbar">
        <div className="lp-goalbar-top">
          <span>今日 {formatDuration(todayMin)}</span>
          <span>目标 {formatDuration(goal)}</span>
        </div>
        <div className="lp-bar"><div className="lp-bar-fill" style={{ width: `${goalPct * 100}%` }} /></div>
      </div>

      <div className="lp-timer">
        <div className="lp-timer-num">{mm}:{ss}</div>
        <div className="lp-timer-acts">
          {!running && secs === 0 && <button className="lp-btn lp-btn-primary" onClick={() => setRunning(true)}>开始</button>}
          {running && <button className="lp-btn" onClick={() => setRunning(false)}>暂停</button>}
          {!running && secs > 0 && <button className="lp-btn lp-btn-primary" onClick={() => setRunning(true)}>继续</button>}
          {secs > 0 && <button className="lp-btn lp-btn-ok" onClick={finishTimer}>完成记录</button>}
          {secs > 0 && <button className="lp-btn lp-btn-ghost" onClick={() => { setSecs(0); setRunning(false); }}>清零</button>}
        </div>
      </div>

      <div className="lp-divider"><span>或手动记录</span></div>

      <div className="lp-logform">
        {plans.length > 0 && (
          <select className="lp-select" value={planId} onChange={(e) => setPlanId(e.target.value)}>
            <option value="">（不关联计划）</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.icon} {p.title}</option>
            ))}
          </select>
        )}
        <div className="lp-logrow">
          <input
            className="lp-input"
            type="number"
            min="1"
            placeholder="分钟"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && logManual()}
          />
          <button className="lp-btn lp-btn-primary" onClick={logManual}>记录</button>
        </div>
        <div className="lp-quick">
          {[15, 25, 45].map((m) => (
            <button key={m} className="lp-chip" onClick={() => onLog({ minutes: m, planId: planId || undefined })}>+{m}分</button>
          ))}
        </div>
        <input className="lp-input" placeholder="备注（可选）：今天学了什么" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Card>
  );
}

/* ============================ 我的计划（列表） ============================ */
function PlansView({ plans, today, onOpen, onNew }) {
  if (plans.length === 0) return <EmptyAll onNew={onNew} />;
  return (
    <div className="lp-plangrid">
      {plans.map((p) => {
        const s = planStats(p);
        const target = planTargetDate(p, today);
        return (
          <button key={p.id} className="lp-plancard" onClick={() => onOpen(p.id)}>
            <div className="lp-plancard-head">
              <span className="lp-plan-icon">{p.icon}</span>
              <Ring pct={s.weighted} />
            </div>
            <div className="lp-plan-title">{p.title}</div>
            <div className="lp-plan-sub">{p.subject} · {p.level}</div>
            <div className="lp-plan-meta">
              <span>{s.mastered}/{s.total} 已掌握</span>
              <span>目标 {fmtDate(target)}</span>
            </div>
            <div className="lp-bar lp-bar-sm"><div className="lp-bar-fill" style={{ width: `${s.weighted * 100}%` }} /></div>
          </button>
        );
      })}
      <button className="lp-plancard lp-plancard-new" onClick={onNew}>
        <span className="lp-newicon">＋</span>
        <span>新建学习计划</span>
      </button>
    </div>
  );
}

/* ============================ 计划详情（编辑 + 追踪） ============================ */
function PlanDetail({ plan, aiConfig, today, onBack, onUpdate, onSetStatus, onGrade, onRemove, onNeedAI, onShare }) {
  const s = planStats(plan);
  const target = planTargetDate(plan, today);
  const perDay = suggestedDailyLessons(plan, today);

  const renamePlan = () => {
    const t = prompt('计划名称：', plan.title);
    if (t && t.trim()) onUpdate((p) => ({ ...p, title: t.trim() }));
  };
  const editMeta = () => {
    const subject = prompt('学习主题：', plan.subject);
    if (subject == null) return;
    const weeks = parseInt(prompt('计划周数：', plan.weeks), 10);
    onUpdate((p) => ({ ...p, subject: subject.trim() || p.subject, weeks: weeks >= 1 ? weeks : p.weeks }));
  };
  const addModule = () => {
    const t = prompt('新模块名称：', '');
    if (t && t.trim()) onUpdate((p) => ({ ...p, modules: [...p.modules, { id: uid('mod'), title: t.trim(), lessons: [] }] }));
  };
  const exportPlan = () => exportJSON(plan, `learning-plan-${plan.subject || 'plan'}.json`);
  const del = () => {
    if (confirm(`确定删除计划「${plan.title}」吗？此操作不可撤销。`)) onRemove();
  };

  return (
    <div className="lp-detail">
      <div className="lp-detail-bar">
        <button className="lp-back" onClick={onBack}>← 返回</button>
        <div className="lp-detail-acts">
          <button className="lp-mini" onClick={renamePlan}>重命名</button>
          <button className="lp-mini" onClick={editMeta}>设置</button>
          <button className="lp-mini lp-mini-ai" onClick={onShare}>🔗 分享</button>
          <button className="lp-mini" onClick={exportPlan}>导出</button>
          <button className="lp-mini lp-mini-del" onClick={del}>删除</button>
        </div>
      </div>

      <div className="lp-detail-head">
        <div className="lp-detail-titlewrap">
          <span className="lp-detail-icon">{plan.icon}</span>
          <div>
            <h2>{plan.title}</h2>
            <div className="lp-detail-sub">{plan.subject} · {plan.level} · 计划 {plan.weeks} 周</div>
          </div>
        </div>
        {plan.summary && <p className="lp-detail-summary">{plan.summary}</p>}
        <div className="lp-detail-stats">
          <span><strong>{pctText(s.pct)}</strong> 完成</span>
          <span>{s.mastered} 已掌握 · {s.learning} 学习中 · {s.todo} 未开始</span>
          <span>目标完成 {fmtDate(target)}</span>
          {perDay > 0 && <span className="lp-pace">建议每天学 {perDay} 个知识点</span>}
        </div>
        <div className="lp-bar"><div className="lp-bar-fill" style={{ width: `${s.weighted * 100}%` }} /></div>
      </div>

      <div className="lp-modules">
        {plan.modules.map((m) => (
          <ModuleBlock
            key={m.id}
            module={m}
            plan={plan}
            aiConfig={aiConfig}
            today={today}
            onUpdate={onUpdate}
            onSetStatus={onSetStatus}
            onGrade={onGrade}
            onNeedAI={onNeedAI}
          />
        ))}
        <button className="lp-addmod" onClick={addModule}>＋ 添加模块</button>
      </div>
    </div>
  );
}

function ModuleBlock({ module, plan, aiConfig, today, onUpdate, onSetStatus, onGrade, onNeedAI }) {
  const [adding, setAdding] = useState('');
  const ms = module.lessons.length;
  const done = module.lessons.filter((l) => l.status === 'mastered').length;

  const addLesson = () => {
    const t = adding.trim();
    if (!t) return;
    onUpdate((p) => ({
      ...p,
      modules: p.modules.map((m) => (m.id === module.id ? { ...m, lessons: [...m.lessons, mkLesson(t)] } : m)),
    }));
    setAdding('');
  };
  const renameModule = () => {
    const t = prompt('模块名称：', module.title);
    if (t && t.trim()) onUpdate((p) => ({ ...p, modules: p.modules.map((m) => (m.id === module.id ? { ...m, title: t.trim() } : m)) }));
  };
  const delModule = () => {
    if (confirm(`删除模块「${module.title}」及其下所有知识点？`)) {
      onUpdate((p) => ({ ...p, modules: p.modules.filter((m) => m.id !== module.id) }));
    }
  };
  const updateLessonHere = (lessonId, updater) =>
    onUpdate((p) => ({
      ...p,
      modules: p.modules.map((m) =>
        m.id === module.id ? { ...m, lessons: m.lessons.map((l) => (l.id === lessonId ? updater(l) : l)) } : m
      ),
    }));
  const delLesson = (lessonId) =>
    onUpdate((p) => ({
      ...p,
      modules: p.modules.map((m) => (m.id === module.id ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) } : m)),
    }));

  return (
    <section className="lp-mod">
      <div className="lp-mod-head">
        <h3 onClick={renameModule} title="点击重命名">{module.title}</h3>
        <span className="lp-mod-count">{done}/{ms}</span>
        <button className="lp-mod-del" onClick={delModule} title="删除模块">✕</button>
      </div>
      <div className="lp-lessons">
        {module.lessons.map((l) => (
          <LessonRow
            key={l.id}
            lesson={l}
            planSubject={plan.subject}
            aiConfig={aiConfig}
            today={today}
            onSetStatus={(s) => onSetStatus(l.id, s)}
            onGrade={(g) => onGrade(l.id, g)}
            onUpdate={(updater) => updateLessonHere(l.id, updater)}
            onDelete={() => delLesson(l.id)}
            onNeedAI={onNeedAI}
          />
        ))}
      </div>
      <div className="lp-addles">
        <input
          className="lp-input"
          placeholder="添加知识点…"
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addLesson()}
        />
        <button className="lp-mini" onClick={addLesson}>添加</button>
      </div>
    </section>
  );
}

function LessonRow({ lesson, planSubject, aiConfig, today, onSetStatus, onGrade, onUpdate, onDelete, onNeedAI }) {
  const [open, setOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState('');
  const cycle = () => {
    const order = ['todo', 'learning', 'mastered'];
    onSetStatus(order[(order.indexOf(lesson.status) + 1) % 3]);
  };
  const editTitle = () => {
    const t = prompt('知识点：', lesson.title);
    if (t && t.trim()) onUpdate((l) => ({ ...l, title: t.trim() }));
  };
  const editNote = () => {
    const t = prompt('笔记 / 提示：', lesson.note || '');
    if (t != null) onUpdate((l) => ({ ...l, note: t }));
  };
  const addResource = () => {
    const url = prompt('资源链接（URL）：', '');
    if (!url || !url.trim()) return;
    const title = prompt('资源标题（可选）：', '') || url.trim();
    onUpdate((l) => ({ ...l, resources: [...(l.resources || []), { title: title.trim(), url: url.trim() }] }));
  };
  const explain = async () => {
    if (!isConfigured(aiConfig)) return onNeedAI();
    setAiBusy(true);
    setAiErr('');
    try {
      const text = await explainLesson({ config: aiConfig, lessonTitle: lesson.title, planSubject, note: lesson.note });
      onUpdate((l) => ({ ...l, explain: text }));
      setOpen(true);
    } catch (e) {
      setAiErr(e.message || String(e));
    } finally {
      setAiBusy(false);
    }
  };

  const due = lesson.sr && lesson.sr.due <= today && lesson.status !== 'todo';
  const hasDetail = open || lesson.note || (lesson.resources && lesson.resources.length) || lesson.explain || aiErr;

  return (
    <div className={`lp-les s-${lesson.status}`}>
      <div className="lp-les-row">
        <button className={`lp-les-status s-${lesson.status}`} onClick={cycle} title="点击切换状态">
          {lesson.status === 'mastered' ? '✓' : lesson.status === 'learning' ? '◐' : '○'}
        </button>
        <div className="lp-les-main" onClick={() => setOpen((o) => !o)}>
          <span className="lp-les-title">{lesson.title}</span>
          <span className="lp-les-tags">
            <span className={`lp-tag t-${lesson.status}`}>{STATUS_LABEL[lesson.status]}</span>
            {lesson.sr && lesson.status !== 'todo' && (
              <span className={`lp-tag t-due ${due ? 'now' : ''}`}>复习 {relDay(lesson.sr.due)}</span>
            )}
            {lesson.note && <span className="lp-tag t-note">笔记</span>}
          </span>
        </div>
        <div className="lp-les-acts">
          <button className="lp-mini lp-mini-ai" onClick={explain} disabled={aiBusy} title="让 AI 讲解这个知识点">
            {aiBusy ? '…' : '✨ 讲解'}
          </button>
          <button className="lp-mini" onClick={() => setOpen((o) => !o)}>{open ? '收起' : '展开'}</button>
        </div>
      </div>

      {hasDetail && (
        <div className="lp-les-detail">
          {due && (
            <div className="lp-les-review">
              <span>这条已到期，自测一下还记得吗：</span>
              <div className="lp-grades">
                {GRADE_ORDER.map((g) => (
                  <button key={g} className={`lp-grade lp-grade-${g}`} onClick={() => onGrade(g)}>{GRADES[g].label}</button>
                ))}
              </div>
            </div>
          )}
          {aiErr && <div className="lp-aierr">AI 调用失败：{aiErr}</div>}
          {lesson.explain && (
            <div className="lp-explain">
              <div className="lp-explain-head">✨ AI 讲解</div>
              <div className="lp-explain-body">{lesson.explain}</div>
            </div>
          )}
          {lesson.note && <div className="lp-les-note">📝 {lesson.note}</div>}
          {lesson.resources && lesson.resources.length > 0 && (
            <div className="lp-res">
              {lesson.resources.map((r, i) => (
                <a key={i} className="lp-res-link" href={r.url} target="_blank" rel="noopener noreferrer">🔗 {r.title}</a>
              ))}
            </div>
          )}
          <div className="lp-les-tools">
            <button className="lp-link" onClick={editTitle}>改标题</button>
            <button className="lp-link" onClick={editNote}>{lesson.note ? '改笔记' : '加笔记'}</button>
            <button className="lp-link" onClick={addResource}>加资源</button>
            <button className="lp-link lp-link-del" onClick={onDelete}>删除</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================ 统计 ============================ */
function StatsView({ data, stats, streak, today }) {
  const minutes = useMemo(() => studyMinutes(data.sessions), [data.sessions]);
  const series = useMemo(() => activitySeries(data.sessions, today, 91), [data.sessions, today]);
  const upcoming = useMemo(() => upcomingReviews(data.plans, today, 7), [data.plans, today]);

  if (data.plans.length === 0 && data.sessions.length === 0) {
    return <Empty icon="📊" text="还没有数据，先去新建计划、开始学习吧。" />;
  }

  return (
    <div className="lp-stats">
      <div className="lp-kpis lp-kpis-4">
        <Kpi label="累计学习" value={formatDuration(minutes)} tone="accent" />
        <Kpi label="已掌握" value={`${stats.mastered}`} unit="项" tone="good" sub={`共 ${stats.total} 个知识点`} />
        <Kpi label="连续天数" value={`${streak.current}`} unit="天" tone="hero" sub={`最长 ${streak.longest} 天`} />
        <Kpi label="计划数" value={`${data.plans.length}`} unit="个" tone="accent" />
      </div>

      <Card title="🔥 学习热力图" badge="最近 13 周">
        <Heatmap series={series} />
      </Card>

      <Card title="📈 各计划进度" badge={`${data.plans.length} 个计划`}>
        {data.plans.length === 0 ? (
          <Empty icon="📚" text="还没有计划。" />
        ) : (
          <div className="lp-progresslist">
            {data.plans.map((p) => {
              const ps = planStats(p);
              return (
                <div key={p.id} className="lp-progrow">
                  <span className="lp-progrow-name">{p.icon} {p.title}</span>
                  <div className="lp-bar lp-bar-sm"><div className="lp-bar-fill" style={{ width: `${ps.weighted * 100}%` }} /></div>
                  <span className="lp-progrow-num">{pctText(ps.pct)}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="🗓️ 未来 7 天复习" badge="间隔复习到期分布">
        <div className="lp-upcoming">
          {upcoming.map((u) => (
            <div key={u.date} className="lp-upbar">
              <div className="lp-upbar-track">
                <div className="lp-upbar-fill" style={{ height: `${Math.min(100, u.count * 18)}%` }} />
              </div>
              <span className="lp-upbar-num">{u.count}</span>
              <span className="lp-upbar-day">{u.date === today ? '今天' : fmtDate(u.date)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* 手写 SVG 学习热力图（GitHub 贡献图风格） */
function Heatmap({ series }) {
  const cell = 13;
  const gap = 3;
  const startWeekday = series.length ? series[0].weekday : 0;
  const slots = startWeekday + series.length;
  const cols = Math.ceil(slots / 7);
  const width = cols * (cell + gap);
  const height = 7 * (cell + gap) + 16;

  const max = Math.max(30, ...series.map((d) => d.minutes));
  const color = (min) => {
    if (min <= 0) return '#EAE7DE';
    const t = Math.min(1, min / max);
    if (t < 0.25) return '#EBD3C6';
    if (t < 0.5) return '#DDAE96';
    if (t < 0.75) return '#CC785C';
    return '#B5654A';
  };
  const weekLabels = ['', '一', '', '三', '', '五', ''];

  return (
    <div className="lp-heatwrap">
      <svg viewBox={`0 0 ${width + 18} ${height}`} className="lp-heat" role="img" aria-label="学习热力图">
        {weekLabels.map((w, i) =>
          w ? <text key={i} x={0} y={i * (cell + gap) + cell} className="lp-heat-wl">{w}</text> : null
        )}
        <g transform="translate(16,0)">
          {series.map((d, i) => {
            const slot = startWeekday + i;
            const col = Math.floor(slot / 7);
            const row = slot % 7;
            return (
              <rect
                key={d.date}
                x={col * (cell + gap)}
                y={row * (cell + gap)}
                width={cell}
                height={cell}
                rx={3}
                fill={color(d.minutes)}
              >
                <title>{`${d.date}：${d.minutes > 0 ? formatDuration(d.minutes) : '未学习'}`}</title>
              </rect>
            );
          })}
        </g>
      </svg>
      <div className="lp-heat-legend">
        <span>少</span>
        <i style={{ background: '#EAE7DE' }} />
        <i style={{ background: '#EBD3C6' }} />
        <i style={{ background: '#DDAE96' }} />
        <i style={{ background: '#CC785C' }} />
        <i style={{ background: '#B5654A' }} />
        <span>多</span>
      </div>
    </div>
  );
}

/* ============================ 新建计划 ============================ */
function Creator({ aiConfig, onClose, onCreate, onNeedAI }) {
  const [mode, setMode] = useState('template'); // template | ai | blank

  const tplGrid = (templates) => (
    <div className="lp-tplgrid">
      {templates.map((t) => (
        <button key={t.id} className="lp-tpl" onClick={() => onCreate(scaffoldPlan(t))}>
          <div className="lp-tpl-icon">{t.icon}</div>
          <div className="lp-tpl-title">{t.title}</div>
          <div className="lp-tpl-sum">{t.summary}</div>
          <div className="lp-tpl-meta">{t.modules.length} 模块 · 建议 {t.weeks} 周</div>
        </button>
      ))}
    </div>
  );

  return (
    <Modal title="新建学习计划" onClose={onClose} wide>
      <div className="lp-modetabs">
        <button className={mode === 'template' ? 'on' : ''} onClick={() => setMode('template')}>📚 从模板</button>
        <button className={mode === 'ai' ? 'on' : ''} onClick={() => setMode('ai')}>✨ AI 生成</button>
        <button className={mode === 'blank' ? 'on' : ''} onClick={() => setMode('blank')}>📝 空白</button>
        <button className={mode === 'import' ? 'on' : ''} onClick={() => setMode('import')}>🔗 导入</button>
      </div>

      {mode === 'template' && (
        <div className="lp-tplgroups">
          {groupedTemplates().map((g) => (
            <div className="lp-tplgroup" key={g.id}>
              <div className="lp-tplgroup-head">
                <span className="lp-tplgroup-label">{g.label}</span>
                {g.hint && <span className="lp-tplgroup-hint">{g.hint}</span>}
              </div>
              {g.subgroups
                ? g.subgroups.map((sg) => (
                    <div className="lp-tplsub" key={sg.label}>
                      <div className="lp-tplsub-label">{sg.label}</div>
                      {tplGrid(sg.templates)}
                    </div>
                  ))
                : tplGrid(g.templates)}
            </div>
          ))}
        </div>
      )}

      {mode === 'ai' && <AICreator aiConfig={aiConfig} onCreate={onCreate} onNeedAI={onNeedAI} />}

      {mode === 'blank' && <BlankCreator onCreate={onCreate} />}

      {mode === 'import' && <ImportCreator onCreate={onCreate} />}
    </Modal>
  );
}

function ImportCreator({ onCreate }) {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const doImport = () => {
    setErr('');
    try {
      onCreate(decodePlanShare(code));
    } catch (e) {
      setErr(e.message || String(e));
    }
  };
  return (
    <div className="lp-blank">
      <div className="lp-aihint">
        把别人分享给你的「分享链接」或「分享码」粘贴到这里，一键导入对方的学习计划（会重置为未开始，无需 API Key）。
      </div>
      <label className="lp-flabel">分享链接 / 分享码</label>
      <textarea
        className="lp-textarea"
        rows={4}
        placeholder="粘贴形如 https://…/learning/#share=LP1.… 的链接，或直接粘贴 LP1. 开头的分享码"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      {err && <div className="lp-aierr">{err}</div>}
      <button className="lp-btn lp-btn-primary lp-btn-block" onClick={doImport} disabled={!code.trim()}>
        导入这个计划
      </button>
    </div>
  );
}

function AICreator({ aiConfig, onCreate, onNeedAI }) {
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState('入门');
  const [weeks, setWeeks] = useState(8);
  const [hours, setHours] = useState(5);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const go = async () => {
    if (!isConfigured(aiConfig)) return onNeedAI();
    if (!goal.trim()) { setErr('请先填写你的学习目标'); return; }
    setBusy(true);
    setErr('');
    try {
      const plan = await generatePlan({ config: aiConfig, goal: goal.trim(), level, weeks: Number(weeks), hoursPerWeek: Number(hours) });
      onCreate(plan);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lp-aicreate">
      {!isConfigured(aiConfig) && (
        <div className="lp-aihint">
          AI 生成需要先配置自带的 API Key（仅存本地浏览器）。
          <button className="lp-link" onClick={onNeedAI}>去配置 →</button>
          ；不想用 AI 的话，可改用「从模板」一键开课。
        </div>
      )}
      <label className="lp-flabel">我想学会…</label>
      <textarea
        className="lp-textarea"
        rows={3}
        placeholder="例如：三个月内能用 React + TypeScript 独立做出一个中后台项目"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
      />
      <div className="lp-frow">
        <label className="lp-field">
          <span>当前水平</span>
          <select className="lp-select" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option>零基础</option>
            <option>入门</option>
            <option>进阶</option>
          </select>
        </label>
        <label className="lp-field">
          <span>计划周数</span>
          <input className="lp-input" type="number" min="1" max="52" value={weeks} onChange={(e) => setWeeks(e.target.value)} />
        </label>
        <label className="lp-field">
          <span>每周小时</span>
          <input className="lp-input" type="number" min="1" max="60" value={hours} onChange={(e) => setHours(e.target.value)} />
        </label>
      </div>
      {err && <div className="lp-aierr">{err}</div>}
      <button className="lp-btn lp-btn-primary lp-btn-block" onClick={go} disabled={busy}>
        {busy ? '✨ AI 正在生成计划…' : '✨ 生成学习计划'}
      </button>
    </div>
  );
}

function BlankCreator({ onCreate }) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const create = () => {
    const t = title.trim() || '我的学习计划';
    onCreate(
      scaffoldPlan(
        { title: t, subject: subject.trim() || t, icon: '📝', summary: '', weeks: 8, modules: [{ title: '模块一', lessons: [] }] },
        { title: t, subject: subject.trim() || t, source: 'blank' }
      )
    );
  };
  return (
    <div className="lp-blank">
      <label className="lp-flabel">计划名称</label>
      <input className="lp-input" placeholder="我的学习计划" value={title} onChange={(e) => setTitle(e.target.value)} />
      <label className="lp-flabel">学习主题</label>
      <input className="lp-input" placeholder="如：吉他 / 微观经济学 / Rust" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <button className="lp-btn lp-btn-primary lp-btn-block" onClick={create}>创建空白计划</button>
    </div>
  );
}

/* ============================ AI 设置 ============================ */
function AISettings({ config, onChange, onClose }) {
  const [local, setLocal] = useState(config);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const preset = PROVIDERS[local.provider] || PROVIDERS.anthropic;

  const set = (patch) => setLocal((c) => ({ ...c, ...patch }));
  const save = () => { onChange(local); onClose(); };
  const test = async () => {
    setTesting(true);
    setTestMsg('');
    try {
      const text = await explainLesson({ config: local, lessonTitle: '用一句话自我介绍', planSubject: '连接测试' });
      setTestMsg('✅ 连接成功：' + text.slice(0, 40) + '…');
    } catch (e) {
      setTestMsg('❌ ' + (e.message || String(e)));
    } finally {
      setTesting(false);
    }
  };

  const isProxy = local.mode === 'proxy';
  return (
    <Modal title="✨ 配置 AI" onClose={onClose}>
      <p className="lp-aiabout">AI 用于「生成学习计划 / 讲解知识点」，是<strong>可选增强</strong>——不配置也能正常学习。</p>

      <div className="lp-modetabs">
        <button className={!isProxy ? 'on' : ''} onClick={() => set({ mode: 'byok' })}>🔑 自带 Key</button>
        <button className={isProxy ? 'on' : ''} onClick={() => set({ mode: 'proxy' })}>🌐 后端代理</button>
      </div>

      {!isProxy ? (
        <>
          <p className="lp-aiabout">填你自己的 API Key，<strong>仅存本浏览器</strong>、直连模型厂商、不经任何服务器。</p>
          <label className="lp-flabel">模型厂商</label>
          <select className="lp-select" value={local.provider} onChange={(e) => set({ provider: e.target.value, model: '' })}>
            {Object.keys(PROVIDERS).map((k) => (
              <option key={k} value={k}>{PROVIDERS[k].label}</option>
            ))}
          </select>

          <label className="lp-flabel">API Key</label>
          <input
            className="lp-input"
            type="password"
            autoComplete="off"
            placeholder={preset.keyHint}
            value={local.apiKey}
            onChange={(e) => set({ apiKey: e.target.value })}
          />
          <a className="lp-getkey" href={preset.keyUrl} target="_blank" rel="noopener noreferrer">获取 {preset.label} 的 Key →</a>

          <label className="lp-flabel">模型（可留空用默认 {preset.defaultModel}）</label>
          <input
            className="lp-input"
            list="lp-models"
            placeholder={preset.defaultModel}
            value={local.model}
            onChange={(e) => set({ model: e.target.value })}
          />
          <datalist id="lp-models">
            {preset.models.map((m) => <option key={m} value={m} />)}
          </datalist>

          <label className="lp-flabel">自定义 API 地址（可选，用于代理 / 兼容接口）</label>
          <input
            className="lp-input"
            placeholder={preset.defaultBaseURL}
            value={local.baseURL}
            onChange={(e) => set({ baseURL: e.target.value })}
          />
        </>
      ) : (
        <>
          <p className="lp-aiabout">
            走你自部署的后端代理：Key 放在服务端，<strong>这里无需填 Key</strong>，适合公开让别人也来学。
            部署见 <code>learning/proxy/README.md</code>。
          </p>
          <label className="lp-flabel">代理 URL</label>
          <input
            className="lp-input"
            placeholder="https://learn-ai-proxy.xxx.workers.dev"
            value={local.proxyURL}
            onChange={(e) => set({ proxyURL: e.target.value })}
          />
          <label className="lp-flabel">访问口令（可选，代理设了 ACCESS_TOKEN 才需要）</label>
          <input
            className="lp-input"
            type="password"
            autoComplete="off"
            placeholder="代理的访问口令"
            value={local.accessToken}
            onChange={(e) => set({ accessToken: e.target.value })}
          />
        </>
      )}

      {testMsg && <div className={`lp-testmsg ${testMsg.startsWith('✅') ? 'ok' : 'bad'}`}>{testMsg}</div>}

      <div className="lp-aibtns">
        <button className="lp-btn lp-btn-ghost" onClick={test} disabled={testing || !isConfigured(local)}>
          {testing ? '测试中…' : '测试连接'}
        </button>
        <div className="lp-aibtns-right">
          {isConfigured(config) && (
            <button className="lp-btn lp-btn-ghost" onClick={() => { onChange(defaultAIConfig()); onClose(); }}>清除</button>
          )}
          <button className="lp-btn lp-btn-primary" onClick={save}>保存</button>
        </div>
      </div>
      <p className="lp-aiwarn">
        {isProxy
          ? '⚠️ 代理用的是部署者的 Key、由其付费；建议在代理上设置访问口令（ACCESS_TOKEN）防滥用。'
          : '⚠️ 纯前端调用会把 Key 暴露在浏览器端，仅建议个人使用；多用户/公开场景请改用「后端代理」。'}
      </p>
    </Modal>
  );
}

/* ============================ 分享 / 导入分享 ============================ */
function ShareModal({ plan, onClose }) {
  const code = useMemo(() => encodePlanShare(plan), [plan]);
  const link = useMemo(() => {
    if (typeof location === 'undefined') return '#share=' + code;
    return location.origin + location.pathname + '#share=' + code;
  }, [code]);
  const [copied, setCopied] = useState('');

  const copy = async (text, which) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('no clipboard');
      }
      setCopied(which);
      setTimeout(() => setCopied(''), 1800);
    } catch (e) {
      // 退化：选中文本让用户手动复制
      window.prompt('复制下面的内容：', text);
    }
  };

  const s = planStats(plan);
  return (
    <Modal title="🔗 分享这个学习计划" onClose={onClose}>
      <p className="lp-aiabout">
        把链接或分享码发给别人，对方打开链接（或在「新建计划 → 导入」里粘贴）即可一键学习同样的计划。
        分享只包含计划<strong>结构</strong>，不含你的学习进度，也无需对方配置 API Key。
      </p>
      <div className="lp-sharemeta">{plan.icon} <strong>{plan.title}</strong> · {plan.modules.length} 模块 · {s.total} 个知识点</div>

      <label className="lp-flabel">分享链接</label>
      <div className="lp-copyrow">
        <input className="lp-input" readOnly value={link} onFocus={(e) => e.target.select()} />
        <button className="lp-btn lp-btn-primary" onClick={() => copy(link, 'link')}>{copied === 'link' ? '已复制 ✓' : '复制链接'}</button>
      </div>

      <label className="lp-flabel">分享码（无法用链接时可发这个）</label>
      <div className="lp-copyrow">
        <input className="lp-input" readOnly value={code} onFocus={(e) => e.target.select()} />
        <button className="lp-btn" onClick={() => copy(code, 'code')}>{copied === 'code' ? '已复制 ✓' : '复制码'}</button>
      </div>
    </Modal>
  );
}

function ImportShareModal({ plan, onClose, onImport }) {
  const s = planStats(plan);
  return (
    <Modal title="📥 导入分享的学习计划" onClose={onClose}>
      <p className="lp-aiabout">有人给你分享了一个学习计划，是否导入到「我的计划」？</p>
      <div className="lp-sharecard">
        <div className="lp-sharecard-icon">{plan.icon}</div>
        <div>
          <div className="lp-sharecard-title">{plan.title}</div>
          <div className="lp-sharecard-sub">{plan.subject} · {plan.level} · {plan.modules.length} 模块 · {s.total} 个知识点</div>
          {plan.summary && <div className="lp-sharecard-summary">{plan.summary}</div>}
        </div>
      </div>
      <div className="lp-aibtns">
        <button className="lp-btn lp-btn-ghost" onClick={onClose}>忽略</button>
        <button className="lp-btn lp-btn-primary" onClick={onImport}>导入并开始学习</button>
      </div>
    </Modal>
  );
}

/* ============================ 通用小组件 ============================ */
function Kpi({ label, value, unit, sub, tone = 'accent' }) {
  return (
    <div className={`lp-kpi lp-kpi-${tone}`}>
      <div className="lp-kpi-label">{label}</div>
      <div className="lp-kpi-value">{value}{unit && <span className="lp-kpi-unit">{unit}</span>}</div>
      {sub && <div className="lp-kpi-sub">{sub}</div>}
    </div>
  );
}

function Card({ title, badge, children }) {
  return (
    <section className="lp-card">
      <div className="lp-card-head">
        <h3>{title}</h3>
        {badge && <span className="lp-card-badge">{badge}</span>}
      </div>
      <div className="lp-card-body">{children}</div>
    </section>
  );
}

function Empty({ icon, text }) {
  return (
    <div className="lp-empty">
      <div className="lp-empty-ic">{icon}</div>
      <div>{text}</div>
    </div>
  );
}

function EmptyAll({ onNew }) {
  return (
    <div className="lp-emptyall">
      <div className="lp-empty-ic">📚</div>
      <h3>开始你的第一个学习计划</h3>
      <p>从内置模板一键开课，或用 AI 按你的目标定制，也可以自己从零搭建。</p>
      <button className="lp-btn lp-btn-primary" onClick={onNew}>＋ 新建计划</button>
    </div>
  );
}

function Ring({ pct, size = 44 }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="lp-ring">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EAE7DE" strokeWidth="5" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#CC785C"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="lp-ring-txt">{pctText(pct)}</text>
    </svg>
  );
}

function Modal({ title, children, onClose, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="lp-overlay" onClick={onClose}>
      <div className={`lp-modal ${wide ? 'wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="lp-modal-head">
          <h3>{title}</h3>
          <button className="lp-modal-x" onClick={onClose}>✕</button>
        </div>
        <div className="lp-modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ----------------------------- 工具 ----------------------------- */
function mkLesson(title) {
  return { id: uid('les'), title, note: '', status: 'todo', resources: [], sr: null };
}

function exportJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ============================ 样式 ============================ */
const CSS = `
.lp-root{--accent:#CC785C;--accent-2:#B5654A;--accent-soft:#F5ECE5;--g:#6E9079;--g-soft:#E7EFE8;
  --surface:#FFFFFF;--surface-2:#FBFAF6;--surface-3:#F1EFE8;--bd:#ECEAE2;--bd-2:#E3E0D7;
  --t1:#26241F;--t2:#83827A;--t3:#B0AFA5;--danger:#BC6055;--warn:#BE9356;
  --serif:'Tiempos Text',Georgia,'Songti SC','STSong','Source Han Serif SC','Noto Serif CJK SC',serif;
  --sans:ui-sans-serif,system-ui,-apple-system,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;
  --shadow:0 1px 2px rgba(40,36,30,.04);--shadow-2:0 8px 28px -10px rgba(40,36,30,.22);
  font-family:var(--sans);color:var(--t1);line-height:1.55;max-width:1080px;margin:0 auto;}
.lp-root *{box-sizing:border-box;}

.lp-header{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;margin-bottom:16px;}
.lp-brand h1{font-family:var(--serif);font-size:26px;font-weight:600;margin:0;letter-spacing:-.3px;}
.lp-brand p{margin:4px 0 0;color:var(--t2);font-size:13.5px;}
.lp-headact{display:flex;gap:9px;align-items:center;flex-wrap:wrap;}
.lp-aichip{background:var(--surface);border:1px solid var(--bd);border-radius:999px;padding:8px 14px;font-size:13px;
  cursor:pointer;color:var(--t2);transition:.15s;font-family:var(--sans);}
.lp-aichip:hover{border-color:var(--bd-2);color:var(--t1);}
.lp-aichip.on{background:var(--g-soft);border-color:#C7DBCB;color:var(--g);}

.lp-btn{padding:9px 16px;border:1px solid var(--bd);background:var(--surface);border-radius:10px;font-size:14px;font-weight:500;
  cursor:pointer;transition:.15s;font-family:var(--sans);color:var(--t1);}
.lp-btn:hover{border-color:var(--bd-2);background:var(--surface-2);}
.lp-btn-primary{background:var(--accent);color:#fff;border-color:var(--accent);}
.lp-btn-primary:hover{background:var(--accent-2);border-color:var(--accent-2);}
.lp-btn-primary:disabled{opacity:.6;cursor:default;}
.lp-btn-ok{background:var(--g);color:#fff;border-color:var(--g);}
.lp-btn-ok:hover{filter:brightness(.96);background:var(--g);}
.lp-btn-ghost{background:none;}
.lp-btn-block{width:100%;margin-top:12px;justify-content:center;}

.lp-tabs{display:flex;gap:4px;border-bottom:1px solid var(--bd);margin-bottom:22px;}
.lp-tab{background:none;border:none;padding:11px 16px;font-size:14.5px;color:var(--t2);cursor:pointer;
  border-bottom:2px solid transparent;margin-bottom:-1px;font-family:var(--sans);transition:.15s;display:flex;align-items:center;gap:7px;}
.lp-tab:hover{color:var(--t1);}
.lp-tab.active{color:var(--accent-2);border-bottom-color:var(--accent);font-weight:600;}
.lp-tabnum{background:var(--accent-soft);color:var(--accent-2);border-radius:999px;font-size:11px;padding:1px 7px;}

.lp-grid2{display:grid;grid-template-columns:1.4fr 1fr;gap:18px;align-items:start;}
.lp-col{display:flex;flex-direction:column;gap:16px;min-width:0;}

.lp-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;}
.lp-kpis-4{margin-bottom:18px;}
.lp-kpi{background:var(--surface);border:1px solid var(--bd);border-radius:14px;padding:13px 15px;box-shadow:var(--shadow);}
.lp-kpi-label{font-size:12px;color:var(--t3);margin-bottom:5px;}
.lp-kpi-value{font-family:var(--serif);font-size:24px;font-weight:600;letter-spacing:-.4px;}
.lp-kpi-unit{font-size:13px;font-weight:500;margin-left:3px;color:var(--t2);}
.lp-kpi-sub{font-size:11.5px;color:var(--t3);margin-top:3px;}
.lp-kpi-hero{background:var(--accent);border-color:var(--accent);box-shadow:0 6px 18px -8px rgba(204,120,92,.6);}
.lp-kpi-hero .lp-kpi-label,.lp-kpi-hero .lp-kpi-sub{color:rgba(255,255,255,.82);}
.lp-kpi-hero .lp-kpi-value,.lp-kpi-hero .lp-kpi-unit{color:#fff;}
.lp-kpi-accent .lp-kpi-value{color:var(--accent-2);}
.lp-kpi-good .lp-kpi-value{color:var(--g);}
.lp-kpi-warn .lp-kpi-value{color:var(--warn);}

.lp-card{background:var(--surface);border:1px solid var(--bd);border-radius:16px;box-shadow:var(--shadow);overflow:hidden;}
.lp-card-head{display:flex;justify-content:space-between;align-items:center;padding:14px 17px;border-bottom:1px solid var(--bd);}
.lp-card-head h3{margin:0;font-size:15px;font-weight:600;}
.lp-card-badge{font-size:11.5px;color:var(--t3);background:var(--surface-2);border:1px solid var(--bd);border-radius:999px;padding:3px 10px;}
.lp-card-body{padding:16px 17px;}

.lp-list{display:flex;flex-direction:column;gap:9px;}
.lp-more{font-size:12px;color:var(--t3);text-align:center;padding-top:4px;}

.lp-rev{display:flex;justify-content:space-between;align-items:center;gap:12px;background:var(--surface-2);border:1px solid var(--bd);
  border-radius:11px;padding:11px 13px;flex-wrap:wrap;}
.lp-rev-main{min-width:0;flex:1;}
.lp-rev-title{font-weight:500;font-size:14px;overflow-wrap:anywhere;}
.lp-rev-sub{font-size:11.5px;color:var(--t3);margin-top:2px;display:flex;gap:6px;flex-wrap:wrap;}
.lp-overdue{color:var(--danger);}
.lp-grades{display:flex;gap:5px;flex:none;}
.lp-grade{border:1px solid var(--bd);background:var(--surface);border-radius:8px;padding:5px 9px;font-size:12px;cursor:pointer;
  color:var(--t2);transition:.12s;font-family:var(--sans);white-space:nowrap;}
.lp-grade:hover{transform:translateY(-1px);}
.lp-grade-again:hover{border-color:var(--danger);color:var(--danger);background:#FBEEEC;}
.lp-grade-hard:hover{border-color:var(--warn);color:var(--warn);background:#F6ECD9;}
.lp-grade-good:hover{border-color:var(--accent);color:var(--accent-2);background:var(--accent-soft);}
.lp-grade-easy:hover{border-color:var(--g);color:var(--g);background:var(--g-soft);}

.lp-next{display:flex;justify-content:space-between;align-items:center;gap:10px;border:1px solid var(--bd);border-radius:11px;padding:10px 13px;transition:.15s;}
.lp-next:hover{background:var(--surface-2);}
.lp-next-main{display:flex;align-items:center;gap:11px;min-width:0;flex:1;cursor:pointer;}
.lp-next-title{font-weight:500;font-size:14px;overflow-wrap:anywhere;}
.lp-next-sub{font-size:11.5px;color:var(--t3);margin-top:2px;}
.lp-next-acts{display:flex;gap:6px;flex:none;}
.lp-statusdot{width:11px;height:11px;border-radius:50%;flex:none;background:var(--bd-2);}
.lp-statusdot.s-learning{background:var(--warn);}
.lp-statusdot.s-mastered{background:var(--g);}

.lp-mini{border:1px solid var(--bd);background:var(--surface);border-radius:8px;padding:5px 11px;font-size:12.5px;cursor:pointer;
  color:var(--t2);transition:.15s;font-family:var(--sans);white-space:nowrap;}
.lp-mini:hover{border-color:var(--bd-2);background:var(--surface-2);color:var(--t1);}
.lp-mini-ok:hover{border-color:var(--g);color:var(--g);background:var(--g-soft);}
.lp-mini-del:hover{border-color:var(--danger);color:var(--danger);}
.lp-mini-ai:hover{border-color:var(--accent);color:var(--accent-2);background:var(--accent-soft);}
.lp-mini:disabled{opacity:.55;cursor:default;}

.lp-goalbar-top{display:flex;justify-content:space-between;font-size:12px;color:var(--t2);margin-bottom:6px;}
.lp-bar{height:9px;background:var(--surface-3);border-radius:999px;overflow:hidden;}
.lp-bar-sm{height:6px;}
.lp-bar-fill{height:100%;background:var(--accent);border-radius:999px;transition:width .35s;}

.lp-timer{text-align:center;margin:18px 0;}
.lp-timer-num{font-family:var(--serif);font-size:54px;font-weight:600;letter-spacing:-1px;font-variant-numeric:tabular-nums;color:var(--t1);}
.lp-timer-acts{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:10px;}
.lp-divider{display:flex;align-items:center;gap:10px;color:var(--t3);font-size:12px;margin:16px 0 12px;}
.lp-divider::before,.lp-divider::after{content:'';flex:1;height:1px;background:var(--bd);}
.lp-logform{display:flex;flex-direction:column;gap:9px;}
.lp-logrow{display:flex;gap:8px;}
.lp-logrow .lp-input{flex:1;}
.lp-quick{display:flex;gap:7px;}
.lp-chip{border:1px solid var(--bd);background:var(--surface);border-radius:999px;padding:6px 13px;font-size:12.5px;cursor:pointer;color:var(--t2);transition:.15s;font-family:var(--sans);}
.lp-chip:hover{border-color:var(--accent);color:var(--accent-2);background:var(--accent-soft);}

.lp-input,.lp-select,.lp-textarea{width:100%;padding:10px 12px;background:var(--surface);border:1px solid var(--bd);border-radius:10px;
  font-size:14px;color:var(--t1);font-family:var(--sans);transition:.15s;}
.lp-input:focus,.lp-select:focus,.lp-textarea:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft);}
.lp-textarea{resize:vertical;line-height:1.6;}

.lp-plangrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;}
.lp-plancard{text-align:left;background:var(--surface);border:1px solid var(--bd);border-radius:16px;padding:18px;cursor:pointer;
  transition:.15s;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:7px;font-family:var(--sans);}
.lp-plancard:hover{border-color:var(--bd-2);box-shadow:var(--shadow-2);transform:translateY(-2px);}
.lp-plancard-head{display:flex;justify-content:space-between;align-items:center;}
.lp-plan-icon{font-size:30px;}
.lp-plan-title{font-family:var(--serif);font-size:17px;font-weight:600;color:var(--t1);}
.lp-plan-sub{font-size:12px;color:var(--t3);}
.lp-plan-meta{display:flex;justify-content:space-between;font-size:12px;color:var(--t2);margin-top:3px;}
.lp-plancard-new{align-items:center;justify-content:center;color:var(--t3);border-style:dashed;gap:8px;min-height:160px;}
.lp-plancard-new:hover{color:var(--accent-2);border-color:var(--accent);}
.lp-newicon{font-size:30px;}

.lp-ring-txt{font-size:12px;font-weight:600;fill:var(--accent-2);font-family:var(--sans);}

.lp-detail-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:10px;flex-wrap:wrap;}
.lp-back{background:none;border:none;color:var(--t2);font-size:14px;cursor:pointer;font-family:var(--sans);padding:4px 0;}
.lp-back:hover{color:var(--accent-2);}
.lp-detail-acts{display:flex;gap:7px;flex-wrap:wrap;}
.lp-detail-head{background:var(--surface);border:1px solid var(--bd);border-radius:16px;padding:20px 22px;margin-bottom:18px;box-shadow:var(--shadow);}
.lp-detail-titlewrap{display:flex;align-items:center;gap:14px;}
.lp-detail-icon{font-size:38px;}
.lp-detail-head h2{margin:0;font-family:var(--serif);font-size:24px;font-weight:600;letter-spacing:-.3px;}
.lp-detail-sub{font-size:13px;color:var(--t3);margin-top:3px;}
.lp-detail-summary{margin:13px 0 0;font-size:14px;color:var(--t2);line-height:1.65;}
.lp-detail-stats{display:flex;gap:16px;flex-wrap:wrap;font-size:13px;color:var(--t2);margin:14px 0 12px;}
.lp-detail-stats strong{font-family:var(--serif);font-size:17px;color:var(--accent-2);margin-right:3px;}
.lp-pace{color:var(--accent-2);}

.lp-modules{display:flex;flex-direction:column;gap:14px;}
.lp-mod{background:var(--surface);border:1px solid var(--bd);border-radius:14px;overflow:hidden;box-shadow:var(--shadow);}
.lp-mod-head{display:flex;align-items:center;gap:10px;padding:13px 16px;background:var(--surface-2);border-bottom:1px solid var(--bd);}
.lp-mod-head h3{margin:0;font-size:14.5px;font-weight:600;cursor:pointer;flex:1;}
.lp-mod-head h3:hover{color:var(--accent-2);}
.lp-mod-count{font-size:12px;color:var(--t3);font-variant-numeric:tabular-nums;}
.lp-mod-del{background:none;border:none;color:var(--t3);cursor:pointer;font-size:13px;padding:2px 6px;border-radius:6px;}
.lp-mod-del:hover{color:var(--danger);background:#FBEEEC;}
.lp-lessons{display:flex;flex-direction:column;}
.lp-les{border-bottom:1px solid var(--surface-3);}
.lp-les:last-child{border-bottom:none;}
.lp-les-row{display:flex;align-items:center;gap:11px;padding:11px 16px;}
.lp-les-status{width:24px;height:24px;border-radius:50%;border:1.5px solid var(--bd-2);background:var(--surface);cursor:pointer;flex:none;
  font-size:13px;color:var(--t3);display:flex;align-items:center;justify-content:center;transition:.15s;}
.lp-les-status.s-learning{border-color:var(--warn);color:var(--warn);}
.lp-les-status.s-mastered{border-color:var(--g);background:var(--g);color:#fff;}
.lp-les-main{flex:1;min-width:0;cursor:pointer;display:flex;flex-direction:column;gap:3px;}
.lp-les-title{font-size:14px;font-weight:500;overflow-wrap:anywhere;}
.lp-les.s-mastered .lp-les-title{color:var(--t2);}
.lp-les-tags{display:flex;gap:6px;flex-wrap:wrap;}
.lp-tag{font-size:11px;padding:1px 8px;border-radius:999px;background:var(--surface-3);color:var(--t2);}
.lp-tag.t-learning{background:#F6ECD9;color:var(--warn);}
.lp-tag.t-mastered{background:var(--g-soft);color:var(--g);}
.lp-tag.t-due{background:var(--surface-3);color:var(--t3);}
.lp-tag.t-due.now{background:var(--accent-soft);color:var(--accent-2);}
.lp-tag.t-note{background:#EFEAF2;color:#7B6A86;}
.lp-les-acts{display:flex;gap:6px;flex:none;}
.lp-les-detail{padding:0 16px 14px 51px;display:flex;flex-direction:column;gap:10px;}
.lp-les-review{background:var(--accent-soft);border:1px solid #E9D5CB;border-radius:10px;padding:10px 12px;font-size:12.5px;color:var(--t2);
  display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:space-between;}
.lp-explain{background:var(--surface-2);border:1px solid var(--bd);border-radius:10px;padding:12px 14px;}
.lp-explain-head{font-size:12px;font-weight:600;color:var(--accent-2);margin-bottom:6px;}
.lp-explain-body{font-size:13.5px;color:var(--t1);line-height:1.7;white-space:pre-wrap;}
.lp-les-note{font-size:13px;color:var(--t2);background:var(--surface-2);border-radius:9px;padding:9px 12px;line-height:1.6;}
.lp-res{display:flex;flex-direction:column;gap:5px;}
.lp-res-link{font-size:13px;color:var(--accent-2);text-decoration:none;}
.lp-res-link:hover{text-decoration:underline;}
.lp-les-tools{display:flex;gap:13px;flex-wrap:wrap;}
.lp-link{background:none;border:none;color:var(--t3);font-size:12px;cursor:pointer;padding:0;font-family:var(--sans);}
.lp-link:hover{color:var(--accent-2);text-decoration:underline;}
.lp-link-del:hover{color:var(--danger);}
.lp-aierr{font-size:12.5px;color:var(--danger);background:#FBEEEC;border:1px solid #E8C9C3;border-radius:9px;padding:9px 12px;}
.lp-addles{display:flex;gap:8px;padding:11px 16px;background:var(--surface-2);}
.lp-addles .lp-input{flex:1;}
.lp-addmod{background:none;border:1.5px dashed var(--bd-2);border-radius:12px;padding:13px;color:var(--t3);cursor:pointer;
  font-size:14px;font-family:var(--sans);transition:.15s;}
.lp-addmod:hover{border-color:var(--accent);color:var(--accent-2);}

.lp-stats{display:flex;flex-direction:column;gap:16px;}
.lp-heatwrap{overflow-x:auto;}
.lp-heat{max-width:100%;height:auto;min-width:520px;}
.lp-heat-wl{font-size:9px;fill:var(--t3);}
.lp-heat-legend{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--t3);margin-top:8px;justify-content:flex-end;}
.lp-heat-legend i{width:12px;height:12px;border-radius:3px;display:inline-block;}
.lp-progresslist{display:flex;flex-direction:column;gap:11px;}
.lp-progrow{display:grid;grid-template-columns:1fr 2fr auto;align-items:center;gap:12px;font-size:13px;}
.lp-progrow-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.lp-progrow-num{color:var(--accent-2);font-weight:600;font-variant-numeric:tabular-nums;}
.lp-upcoming{display:flex;justify-content:space-between;gap:6px;align-items:end;}
.lp-upbar{display:flex;flex-direction:column;align-items:center;gap:5px;flex:1;}
.lp-upbar-track{width:100%;max-width:42px;height:70px;background:var(--surface-3);border-radius:8px;display:flex;align-items:flex-end;overflow:hidden;}
.lp-upbar-fill{width:100%;background:var(--accent);border-radius:8px 8px 0 0;min-height:2px;transition:height .35s;}
.lp-upbar-num{font-size:12px;font-weight:600;color:var(--t2);font-variant-numeric:tabular-nums;}
.lp-upbar-day{font-size:11px;color:var(--t3);}

.lp-empty{text-align:center;padding:38px 20px;color:var(--t3);}
.lp-empty-ic{font-size:38px;margin-bottom:10px;}
.lp-emptyall{text-align:center;padding:60px 24px;}
.lp-emptyall h3{font-family:var(--serif);font-size:22px;font-weight:600;margin:6px 0 8px;}
.lp-emptyall p{color:var(--t2);font-size:14px;margin:0 auto 20px;max-width:420px;}

.lp-overlay{position:fixed;inset:0;background:rgba(40,36,30,.42);backdrop-filter:blur(2px);display:flex;align-items:flex-start;
  justify-content:center;padding:40px 16px;z-index:50;overflow-y:auto;}
.lp-modal{background:var(--surface);border-radius:18px;width:100%;max-width:480px;box-shadow:var(--shadow-2);animation:lp-pop .2s ease;}
.lp-modal.wide{max-width:720px;}
@keyframes lp-pop{from{opacity:0;transform:translateY(-8px) scale(.98);}to{opacity:1;transform:none;}}
.lp-modal-head{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid var(--bd);}
.lp-modal-head h3{margin:0;font-family:var(--serif);font-size:18px;font-weight:600;}
.lp-modal-x{background:none;border:none;font-size:16px;color:var(--t3);cursor:pointer;padding:4px 8px;border-radius:8px;}
.lp-modal-x:hover{background:var(--surface-2);color:var(--t1);}
.lp-modal-body{padding:20px 22px;}

.lp-modetabs{display:flex;gap:7px;margin-bottom:18px;}
.lp-modetabs button{flex:1;padding:10px;border:1px solid var(--bd);background:var(--surface);border-radius:10px;font-size:13.5px;
  cursor:pointer;color:var(--t2);transition:.15s;font-family:var(--sans);}
.lp-modetabs button:hover{border-color:var(--bd-2);}
.lp-modetabs button.on{background:var(--accent-soft);border-color:var(--accent);color:var(--accent-2);font-weight:600;}
.lp-tplgroups{display:flex;flex-direction:column;gap:20px;}
.lp-tplsub{margin-bottom:12px;}
.lp-tplsub-label{font-size:12px;font-weight:600;color:var(--t2);margin:0 0 8px 2px;padding-left:8px;border-left:2px solid var(--accent);}
.lp-tplgroup-head{display:flex;align-items:baseline;gap:10px;margin-bottom:10px;flex-wrap:wrap;}
.lp-tplgroup-label{font-size:14px;font-weight:600;color:var(--t1);}
.lp-tplgroup-hint{font-size:12px;color:var(--t3);}
.lp-tplgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.lp-tpl{text-align:left;background:var(--surface);border:1px solid var(--bd);border-radius:13px;padding:15px;cursor:pointer;transition:.15s;font-family:var(--sans);}
.lp-tpl:hover{border-color:var(--accent);box-shadow:var(--shadow-2);transform:translateY(-2px);}
.lp-tpl-icon{font-size:26px;}
.lp-tpl-title{font-weight:600;font-size:14.5px;margin:5px 0 4px;color:var(--t1);}
.lp-tpl-sum{font-size:12px;color:var(--t2);line-height:1.55;}
.lp-tpl-meta{font-size:11px;color:var(--t3);margin-top:7px;}

.lp-aicreate,.lp-blank{display:flex;flex-direction:column;}
.lp-flabel{font-size:13px;color:var(--t2);margin:12px 0 6px;font-weight:500;}
.lp-flabel:first-child{margin-top:0;}
.lp-frow{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:4px;}
.lp-field{display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--t2);}
.lp-aihint,.lp-aiabout,.lp-aiwarn,.lp-foot{font-size:12.5px;line-height:1.6;}
.lp-aihint{background:var(--accent-soft);border:1px solid #E9D5CB;border-radius:10px;padding:11px 13px;color:var(--t2);margin-bottom:14px;}
.lp-aiabout{color:var(--t2);margin:0 0 14px;}
.lp-aiabout strong{color:var(--accent-2);}
.lp-getkey{font-size:12px;color:var(--accent-2);text-decoration:none;display:inline-block;margin:7px 0 2px;}
.lp-getkey:hover{text-decoration:underline;}
.lp-testmsg{font-size:12.5px;border-radius:9px;padding:9px 12px;margin-top:14px;line-height:1.55;overflow-wrap:anywhere;}
.lp-testmsg.ok{background:var(--g-soft);color:var(--g);}
.lp-testmsg.bad{background:#FBEEEC;color:var(--danger);}
.lp-aibtns{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:18px;flex-wrap:wrap;}
.lp-aibtns-right{display:flex;gap:8px;}
.lp-aiwarn{color:var(--t3);margin:14px 0 0;}
.lp-foot{color:var(--t3);margin-top:22px;text-align:center;border-top:1px solid var(--bd);padding-top:16px;}

.lp-sharemeta{font-size:13.5px;color:var(--t2);background:var(--surface-2);border:1px solid var(--bd);border-radius:10px;padding:10px 13px;margin-bottom:6px;}
.lp-copyrow{display:flex;gap:8px;}
.lp-copyrow .lp-input{flex:1;font-size:12.5px;color:var(--t2);}
.lp-copyrow .lp-btn{flex:none;white-space:nowrap;}
.lp-sharecard{display:flex;gap:14px;align-items:flex-start;background:var(--surface-2);border:1px solid var(--bd);border-radius:12px;padding:15px;margin:4px 0 4px;}
.lp-sharecard-icon{font-size:34px;flex:none;}
.lp-sharecard-title{font-family:var(--serif);font-size:17px;font-weight:600;}
.lp-sharecard-sub{font-size:12.5px;color:var(--t3);margin-top:3px;}
.lp-sharecard-summary{font-size:13px;color:var(--t2);margin-top:8px;line-height:1.6;}

@media(max-width:860px){
  .lp-grid2{grid-template-columns:1fr;}
  .lp-kpis{grid-template-columns:repeat(2,1fr);}
}
@media(max-width:560px){
  .lp-tplgrid,.lp-frow{grid-template-columns:1fr;}
  .lp-rev{flex-direction:column;align-items:stretch;}
  .lp-grades{justify-content:space-between;}
  .lp-detail-icon{font-size:30px;}
}
`;

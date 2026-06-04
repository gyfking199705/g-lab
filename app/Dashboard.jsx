/**
 * 首页看板 —— 聚合视图（不单独存数据，只读/写各模块的 localStorage）
 * ------------------------------------------------------------------
 * 打开即见全局：今日日程 + 今日习惯打卡 + 目标进度概览（+ 本周训练）。
 * 这是各模块的「融合层」：直接读 schedule / goals / habits / fitness 的数据，
 * 支持在看板上就地打卡 / 勾选，写回对应模块的 localStorage（模块再次进入即同步）。
 *
 * props：{ onNavigate(id), onChange() }  —— 点击卡片跳转对应模块、变更后刷新侧栏徽章
 */
import React, { useMemo, useState } from 'react';
import { readModule, saveState } from '../core/store.js';
import { SHARED_CSS, Progress, Empty } from '../core/ui.jsx';
import { todayStr, fmtDate } from '../core/date.js';
import { todayView } from '../schedule/calc.js';
import { sortGoalsForBoard, goalPercent, isAchieved } from '../goals/calc.js';
import {
  todayBoard,
  currentStreak,
  fitnessWorkoutDates,
  toggleCheck,
  bumpCount,
  isDoneOn,
} from '../habits/calc.js';
import { summary as cutSummary } from '../cut/calc.js';
import { financeSummary } from '../savings/calc.js';
import { overallStats as learningStats, computeStreak as learningStreak } from '../learning/calc.js';
import { formatMoney } from '../savings/calc.js';

const SCHEDULE_KEY = 'schedule-planner';
const GOALS_KEY = 'goals-planner';
const HABITS_KEY = 'habits-planner';
const FITNESS_KEY = 'fitness-planner';
const CUT_KEY = 'cut-planner';
const SAVINGS_KEY = 'savings-planner';
const LEARNING_KEY = 'learning-planner';

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 11) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

export default function Dashboard({ onNavigate, onChange }) {
  const [tick, setTick] = useState(0);
  const today = todayStr();

  const schedule = readModule(SCHEDULE_KEY) || { items: [] };
  const goalsData = readModule(GOALS_KEY) || { goals: [] };
  const habitsData = readModule(HABITS_KEY) || { habits: [], checkins: {} };
  const fitDates = useMemo(() => fitnessWorkoutDates(readModule(FITNESS_KEY)), [tick]);

  const sView = useMemo(() => todayView(schedule.items || [], today), [tick, today]);
  const goals = useMemo(() => sortGoalsForBoard(goalsData.goals || [], today).slice(0, 4), [tick, today]);
  const hBoard = useMemo(() => todayBoard(habitsData.habits || [], habitsData.checkins || {}, today, fitDates), [tick, today, fitDates]);

  // 进展可视化：减脂 / 理财 / 学习（只读各模块数据，存在才显示）
  const cut = useMemo(() => {
    const d = readModule(CUT_KEY);
    return d && d.profile ? cutSummary(d.profile, d.logs || [], today) : null;
  }, [tick, today]);
  const finance = useMemo(() => financeSummary(readModule(SAVINGS_KEY)), [tick]);
  const learn = useMemo(() => {
    const d = readModule(LEARNING_KEY);
    if (!d || !(d.plans || []).length) return null;
    const st = learningStats(d.plans);
    if (!st.total) return null;
    return { ...st, streak: learningStreak(d.sessions || [], today) };
  }, [tick, today]);

  const refresh = () => { setTick((t) => t + 1); if (onChange) onChange(); };

  // 就地写回各模块
  const toggleScheduleItem = (id) => {
    const items = (readModule(SCHEDULE_KEY) || { items: [] }).items || [];
    const next = items.map((it) => (it.id === id ? { ...it, done: !it.done, doneAt: !it.done ? new Date().toISOString() : null } : it));
    saveState(SCHEDULE_KEY, { ...(readModule(SCHEDULE_KEY) || { v: 1 }), items: next });
    refresh();
  };
  const writeHabits = (next) => { saveState(HABITS_KEY, { ...(readModule(HABITS_KEY) || { v: 1 }), checkins: next }); refresh(); };
  const toggleHabit = (h) => writeHabits(toggleCheck(habitsData.checkins || {}, h.id, today));
  const bumpHabit = (h, d) => writeHabits(bumpCount(habitsData.checkins || {}, h.id, today, d));

  const hasAny = (schedule.items || []).length || (goalsData.goals || []).length || (habitsData.habits || []).length || cut || finance || learn;

  return (
    <div className="gx-root">
      <style>{SHARED_CSS}</style>

      <div className="gx-head">
        <h2>🏠 {greeting()}</h2>
        <p>{fmtDate(today)} · 今天也朝着目标前进一点</p>
      </div>

      {!hasAny && (
        <div className="gx-card">
          <Empty icon="✨" title="欢迎来到你的成长看板" hint="先去「日程」「目标」「习惯」里添加一些内容，这里会自动汇总今日全局" />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 4 }}>
            <button className="gx-btn gx-btn-primary" onClick={() => onNavigate('habits')}>🔥 设置习惯</button>
            <button className="gx-btn" onClick={() => onNavigate('goals')}>🎯 添加目标</button>
            <button className="gx-btn" onClick={() => onNavigate('schedule')}>📅 安排日程</button>
          </div>
        </div>
      )}

      {hasAny && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 14, alignItems: 'start' }}>

          {/* 今日习惯 */}
          <div className="gx-card">
            <div className="gx-sechead">
              <h3 style={{ cursor: 'pointer' }} onClick={() => onNavigate('habits')}>🔥 今日习惯</h3>
              <span className="gx-sub">{hBoard.doneCount}/{hBoard.total}</span>
            </div>
            {hBoard.total === 0 ? (
              <Empty icon="🔥" title="还没有习惯" hint="去习惯页用模板开始" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {hBoard.items.map(({ habit, done, value }) => {
                  const streak = currentStreak(habit, habitsData.checkins || {}, today, fitDates);
                  const auto = habit.source === 'fitness' && done && !((habitsData.checkins || {})[habit.id] || {})[today];
                  return (
                    <div key={habit.id} className={`gx-row${done ? ' done' : ''}`} style={{ padding: '7px 10px' }}>
                      <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{habit.icon || '⭐'}</span>
                      <div className="gx-row-main">
                        <div className="gx-row-title" style={{ fontSize: 13, textDecoration: 'none', color: 'var(--text)' }}>{habit.name}</div>
                        {streak > 0 && <div className="gx-row-sub"><span style={{ color: 'var(--accent-2)' }}>🔥{streak}</span></div>}
                      </div>
                      {habit.type === 'count' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <button className="gx-btn gx-btn-sm" onClick={() => bumpHabit(habit, -1)} disabled={value <= 0}>−</button>
                          <span style={{ minWidth: 30, textAlign: 'center', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{value}/{habit.target}</span>
                          <button className="gx-btn gx-btn-sm" onClick={() => bumpHabit(habit, 1)}>＋</button>
                        </div>
                      ) : auto ? (
                        <span className="gx-tag good" style={{ fontSize: 10 }}>✓ 已训练</span>
                      ) : (
                        <button className={done ? 'gx-btn gx-btn-sm' : 'gx-btn gx-btn-primary gx-btn-sm'} onClick={() => toggleHabit(habit)}>{done ? '✓' : '打卡'}</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 今日日程 */}
          <div className="gx-card">
            <div className="gx-sechead">
              <h3 style={{ cursor: 'pointer' }} onClick={() => onNavigate('schedule')}>📅 今日日程</h3>
              <span className="gx-sub">{sView.done.length}/{sView.pending.length + sView.done.length}</span>
            </div>
            {sView.overdue.length > 0 && (
              <div className="gx-tag bad" style={{ marginBottom: 8 }}>⚠ {sView.overdue.length} 项逾期未完成</div>
            )}
            {sView.pending.length === 0 && sView.done.length === 0 ? (
              <Empty icon="🗓️" title="今天还没有安排" hint="去日程页添加" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {[...sView.pending, ...sView.done].map((it) => (
                  <div key={it.id} className={`gx-row${it.done ? ' done' : ''}`} style={{ padding: '7px 10px' }}>
                    <input type="checkbox" className="gx-check" checked={it.done} onChange={() => toggleScheduleItem(it.id)} />
                    <div className="gx-row-main">
                      <div className="gx-row-title" style={{ fontSize: 13 }}>{it.title}</div>
                      {it.time && <div className="gx-row-sub">🕑 {it.time}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 目标进度 */}
          <div className="gx-card">
            <div className="gx-sechead">
              <h3 style={{ cursor: 'pointer' }} onClick={() => onNavigate('goals')}>🎯 目标进度</h3>
              <span className="gx-sub" style={{ cursor: 'pointer' }} onClick={() => onNavigate('goals')}>查看全部 ›</span>
            </div>
            {goals.length === 0 ? (
              <Empty icon="🎯" title="还没有目标" hint="去目标页设一个" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {goals.map((g) => {
                  const pct = goalPercent(g);
                  const done = isAchieved(g);
                  return (
                    <div key={g.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</span>
                        <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', color: done ? 'var(--success)' : 'var(--accent-2)' }}>{pct}%</span>
                      </div>
                      <Progress pct={pct} good={done} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 减脂进度 */}
          {cut && (
            <div className="gx-card">
              <div className="gx-sechead">
                <h3 style={{ cursor: 'pointer' }} onClick={() => onNavigate('cut')}>📉 减脂进度</h3>
                <span className="gx-sub">{cut.startWeight}→{cut.goalWeight}kg</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--accent-2)' }}>{cut.currentTrend}</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>kg 趋势体重</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--success)' }}>已减 {cut.lost}kg</span>
              </div>
              <Progress pct={cut.progressPct} good={cut.progressPct >= 100} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                <span>{cut.weeklyRate != null ? `本周 ${cut.weeklyRate > 0 ? '+' : ''}${cut.weeklyRate}kg` : '记录中'}</span>
                <span>{cut.deficitStreak > 0 ? `🔥 缺口 ${cut.deficitStreak} 天` : ''}</span>
                <span>{cut.projectedDate ? `预计 ${cut.projectedDate.slice(5)}` : ''}</span>
              </div>
            </div>
          )}

          {/* 理财进度 */}
          {finance && (
            <div className="gx-card">
              <div className="gx-sechead">
                <h3 style={{ cursor: 'pointer' }} onClick={() => onNavigate('wealth')}>💰 财富进度</h3>
                <span className="gx-sub">净资产 / 目标</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--accent-2)' }}>{formatMoney(finance.netWorth)}</span>
                {finance.change && <span style={{ marginLeft: 'auto', fontSize: 12, color: finance.change.abs >= 0 ? 'var(--success)' : 'var(--danger)' }}>{finance.change.abs >= 0 ? '↑' : '↓'} {formatMoney(Math.abs(finance.change.abs))}</span>}
              </div>
              <Progress pct={finance.progress * 100} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                <span>{Math.round(finance.progress * 100)}% 达成</span>
                <span>目标 {formatMoney(finance.target)}</span>
              </div>
              <div className="gx-disclaim" style={{ marginTop: 6 }}>仅为长期假设估算，实际会波动，非投资建议</div>
            </div>
          )}

          {/* 学习进度 */}
          {learn && (
            <div className="gx-card">
              <div className="gx-sechead">
                <h3 style={{ cursor: 'pointer' }} onClick={() => onNavigate('learning')}>📚 学习进度</h3>
                <span className="gx-sub">已掌握 {learn.mastered}/{learn.total}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--accent-2)' }}>{Math.round(learn.pct * 100)}%</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>知识点掌握</span>
                {learn.streak > 0 && <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--accent-2)' }}>🔥 {learn.streak} 天</span>}
              </div>
              <Progress pct={learn.pct * 100} good={learn.pct >= 1} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                <span>学习中 {learn.learning}</span>
                <span>未开始 {learn.todo}</span>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

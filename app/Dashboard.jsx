/**
 * 首页看板 —— 聚合视图（不单独存数据，只读/写各模块的 localStorage）
 * ------------------------------------------------------------------
 * 三段式、信息分层，打开一屏看懂全局：
 *   1) 今日快览：习惯 / 日程 / 逾期的关键数字（chips）
 *   2) 今日行动：今日习惯 + 今日日程（可就地打卡 / 勾选）
 *   3) 进展：目标 / 减脂 / 财富 / 学习 / 论文 的统一进度卡（等高对齐）
 *
 * props：{ onNavigate(id), onChange() }
 */
import React, { useMemo, useState } from 'react';
import { readModule, saveState } from '../core/store.js';
import { SHARED_CSS, Progress, Empty } from '../core/ui.jsx';
import { todayStr, fmtDate } from '../core/date.js';
import { todayView } from '../schedule/calc.js';
import { sortGoalsForBoard, overallStats as goalsOverall } from '../goals/calc.js';
import { todayBoard, currentStreak, fitnessWorkoutDates, toggleCheck, bumpCount } from '../habits/calc.js';
import { summary as cutSummary } from '../cut/calc.js';
import { financeSummary, formatMoney } from '../savings/calc.js';
import { overallStats as learningStats, computeStreak as learningStreak } from '../learning/calc.js';
import { summary as papersSummary } from '../papers/calc.js';

const SCHEDULE_KEY = 'schedule-planner';
const GOALS_KEY = 'goals-planner';
const HABITS_KEY = 'habits-planner';
const FITNESS_KEY = 'fitness-planner';
const CUT_KEY = 'cut-planner';
const SAVINGS_KEY = 'savings-planner';
const LEARNING_KEY = 'learning-planner';
const PAPERS_KEY = 'papers-planner';

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
  const hBoard = useMemo(() => todayBoard(habitsData.habits || [], habitsData.checkins || {}, today, fitDates), [tick, today, fitDates]);
  const goals = useMemo(() => sortGoalsForBoard(goalsData.goals || [], today), [tick, today]);
  const gStats = useMemo(() => goalsOverall(goalsData.goals || []), [tick]);

  const cut = useMemo(() => { const d = readModule(CUT_KEY); return d && d.profile ? cutSummary(d.profile, d.logs || [], today) : null; }, [tick, today]);
  const finance = useMemo(() => financeSummary(readModule(SAVINGS_KEY)), [tick]);
  const learn = useMemo(() => {
    const d = readModule(LEARNING_KEY);
    if (!d || !(d.plans || []).length) return null;
    const st = learningStats(d.plans);
    return st.total ? { ...st, streak: learningStreak(d.sessions || [], today) } : null;
  }, [tick, today]);
  const papers = useMemo(() => { const d = readModule(PAPERS_KEY); return d && (d.items || []).length ? papersSummary(d.items, today) : null; }, [tick, today]);

  const refresh = () => { setTick((t) => t + 1); if (onChange) onChange(); };
  const toggleScheduleItem = (id) => {
    const cur = readModule(SCHEDULE_KEY) || { v: 1, items: [] };
    saveState(SCHEDULE_KEY, { ...cur, items: (cur.items || []).map((it) => (it.id === id ? { ...it, done: !it.done, doneAt: !it.done ? new Date().toISOString() : null } : it)) });
    refresh();
  };
  const writeHabits = (next) => { saveState(HABITS_KEY, { ...(readModule(HABITS_KEY) || { v: 1 }), checkins: next }); refresh(); };
  const toggleHabit = (h) => writeHabits(toggleCheck(habitsData.checkins || {}, h.id, today));
  const bumpHabit = (h, d) => writeHabits(bumpCount(habitsData.checkins || {}, h.id, today, d));

  const scheduleTotal = sView.pending.length + sView.done.length;
  const hasAny = (schedule.items || []).length || (goalsData.goals || []).length || (habitsData.habits || []).length || cut || finance || learn || papers;

  // chips（仅在有数据时显示）
  const chips = [];
  if (hBoard.total) chips.push({ icon: '🔥', label: '习惯', val: `${hBoard.doneCount}/${hBoard.total}`, to: 'habits' });
  if (scheduleTotal) chips.push({ icon: '📅', label: '日程', val: `${sView.done.length}/${scheduleTotal}`, to: 'schedule' });
  if (sView.overdue.length) chips.push({ icon: '⚠', label: '逾期', val: `${sView.overdue.length}`, to: 'schedule', warn: true });
  if (gStats.total) chips.push({ icon: '🎯', label: '目标达成', val: `${gStats.achieved}/${gStats.total}`, to: 'goals' });

  return (
    <div className="gx-root">
      <style>{SHARED_CSS}{DASH_CSS}</style>

      <div className="gx-head">
        <h2>🏠 {greeting()}</h2>
        <p>{fmtDate(today)} · 今天也朝着目标前进一点</p>
      </div>

      {!hasAny ? (
        <div className="gx-card">
          <Empty icon="✨" title="欢迎来到你的成长看板" hint="先去「习惯」「目标」「日程」里添加一些内容，这里会自动汇总今日全局与各项进展" />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 4 }}>
            <button className="gx-btn gx-btn-primary" onClick={() => onNavigate('habits')}>🔥 设置习惯</button>
            <button className="gx-btn" onClick={() => onNavigate('goals')}>🎯 添加目标</button>
            <button className="gx-btn" onClick={() => onNavigate('schedule')}>📅 安排日程</button>
          </div>
        </div>
      ) : (
        <>
          {/* 1) 今日快览 */}
          {chips.length > 0 && (
            <div className="db-strip">
              {chips.map((c) => (
                <button key={c.label} className={`db-chip${c.warn ? ' warn' : ''}`} onClick={() => onNavigate(c.to)}>
                  <span className="ic">{c.icon}</span>
                  <span className="vl">{c.val}</span>
                  <span className="lb">{c.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* 2) 今日行动 */}
          {(hBoard.total > 0 || scheduleTotal > 0 || sView.overdue.length > 0) && (
            <>
              <div className="db-sectitle">今日行动</div>
              <div className="db-grid action">
                {hBoard.total > 0 && (
                  <div className="gx-card db-col">
                    <div className="gx-sechead"><h3 className="db-h" onClick={() => onNavigate('habits')}>🔥 今日习惯</h3><span className="gx-sub">{hBoard.doneCount}/{hBoard.total}</span></div>
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
                                <span style={{ minWidth: 34, textAlign: 'center', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{value}/{habit.target}</span>
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
                  </div>
                )}

                {(scheduleTotal > 0 || sView.overdue.length > 0) && (
                  <div className="gx-card db-col">
                    <div className="gx-sechead"><h3 className="db-h" onClick={() => onNavigate('schedule')}>📅 今日日程</h3><span className="gx-sub">{sView.done.length}/{scheduleTotal}</span></div>
                    {sView.overdue.length > 0 && <div className="gx-tag bad" style={{ marginBottom: 8 }}>⚠ {sView.overdue.length} 项逾期未完成</div>}
                    {scheduleTotal === 0 ? (
                      <Empty icon="🗓️" title="今天还没有安排" hint="去日程页添加" />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {[...sView.pending, ...sView.done].slice(0, 8).map((it) => (
                          <div key={it.id} className={`gx-row${it.done ? ' done' : ''}`} style={{ padding: '7px 10px' }}>
                            <input type="checkbox" className="gx-check" checked={it.done} onChange={() => toggleScheduleItem(it.id)} />
                            <div className="gx-row-main">
                              <div className="gx-row-title" style={{ fontSize: 13 }}>{it.title}</div>
                              {it.time && <div className="gx-row-sub">🕑 {it.time}</div>}
                            </div>
                          </div>
                        ))}
                        {scheduleTotal > 8 && <button className="gx-btn gx-btn-ghost gx-btn-sm" onClick={() => onNavigate('schedule')}>查看全部 {scheduleTotal} 项 ›</button>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* 3) 进展 */}
          {(gStats.total || cut || finance || learn || papers) && (
            <>
              <div className="db-sectitle">进展</div>
              <div className="db-grid prog">
                {gStats.total > 0 && (
                  <ProgressCard icon="🎯" title="目标进度" onNav={() => onNavigate('goals')} sub="查看全部 ›"
                    big={gStats.avgPercent} bigUnit="% 平均"
                    rightStat={`${gStats.achieved}/${gStats.total} 达成`} rightColor="var(--success)"
                    pct={gStats.avgPercent} good={gStats.total > 0 && gStats.achieved === gStats.total}
                    footLeft={goals[0] ? '近期：' + goals[0].title : ''} footRight="" />
                )}
                {cut && (
                  <ProgressCard icon="📉" title="减脂进度" onNav={() => onNavigate('cut')} sub={`${cut.startWeight}→${cut.goalWeight}kg`}
                    big={cut.currentTrend} bigUnit="kg 趋势"
                    rightStat={`已减 ${cut.lost}kg`} rightColor="var(--success)"
                    pct={cut.progressPct} good={cut.progressPct >= 100}
                    footLeft={cut.weeklyRate != null ? `本周 ${cut.weeklyRate > 0 ? '+' : ''}${cut.weeklyRate}kg` : '记录中'}
                    footRight={cut.projectedDate ? `预计 ${cut.projectedDate.slice(5)}` : (cut.deficitStreak > 0 ? `🔥缺口${cut.deficitStreak}天` : '')} />
                )}
                {finance && (
                  <ProgressCard icon="💰" title="财富进度" onNav={() => onNavigate('wealth')} sub="净资产/目标"
                    big={formatMoney(finance.netWorth)}
                    rightStat={finance.change ? `${finance.change.abs >= 0 ? '↑' : '↓'} ${formatMoney(Math.abs(finance.change.abs))}` : ''}
                    rightColor={finance.change && finance.change.abs < 0 ? 'var(--danger)' : 'var(--success)'}
                    pct={finance.progress * 100}
                    footLeft={`${Math.round(finance.progress * 100)}% 达成`} footRight={`目标 ${formatMoney(finance.target)}`}
                    note="长期假设估算，会波动，非投资建议" />
                )}
                {learn && (
                  <ProgressCard icon="📚" title="学习进度" onNav={() => onNavigate('learning')} sub={`掌握 ${learn.mastered}/${learn.total}`}
                    big={Math.round(learn.pct * 100)} bigUnit="% 掌握"
                    rightStat={learn.streak > 0 ? `🔥 ${learn.streak}天` : ''} rightColor="var(--accent-2)"
                    pct={learn.pct * 100} good={learn.pct >= 1}
                    footLeft={`学习中 ${learn.learning}`} footRight={`未开始 ${learn.todo}`} />
                )}
                {papers && (
                  <ProgressCard icon="📄" title="论文阅读" onNav={() => onNavigate('papers')} sub={`已读 ${papers.done}/${papers.total}`}
                    big={papers.progressPct} bigUnit="% 读完"
                    rightStat={papers.streak > 0 ? `🔥 ${papers.streak}天` : ''} rightColor="var(--accent-2)"
                    pct={papers.progressPct} good={papers.progressPct >= 100}
                    footLeft={`在读 ${papers.reading} · 想读 ${papers.want}`} footRight={`近7天 ${papers.thisWeek}`} />
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* 统一进度卡：等高、底部脚注对齐，避免错位 */
function ProgressCard({ icon, title, onNav, sub, big, bigUnit, rightStat, rightColor, pct, good, footLeft, footRight, note }) {
  return (
    <div className="gx-card db-col">
      <div className="gx-sechead">
        <h3 className="db-h" onClick={onNav}>{icon} {title}</h3>
        {sub && <span className="gx-sub db-h" onClick={onNav}>{sub}</span>}
      </div>
      <div className="db-hero">
        <span className="db-big">{big}</span>
        {bigUnit && <span className="db-unit">{bigUnit}</span>}
        {rightStat && <span className="db-right" style={{ color: rightColor || 'var(--text-2)' }}>{rightStat}</span>}
      </div>
      <Progress pct={pct} good={good} />
      <div className="db-foot">
        <span className="db-foot-l" title={footLeft}>{footLeft}</span>
        <span>{footRight}</span>
      </div>
      {note && <div className="gx-disclaim" style={{ marginTop: 6 }}>{note}</div>}
    </div>
  );
}

const DASH_CSS = `
.db-strip{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px;}
.db-chip{display:flex;align-items:center;gap:7px;background:var(--surface);border:1px solid var(--bd);border-radius:11px;padding:7px 13px;cursor:pointer;transition:.15s;font-family:var(--sans);}
.db-chip:hover{border-color:var(--bd-2);background:var(--surface-2);}
.db-chip .ic{font-size:14px;}
.db-chip .vl{font-family:var(--serif);font-size:16px;font-weight:500;color:var(--text);font-variant-numeric:tabular-nums;}
.db-chip .lb{font-size:11.5px;color:var(--text-3);}
.db-chip.warn{border-color:#E6C8B9;background:var(--accent-soft);}
.db-chip.warn .vl{color:var(--danger);}
.db-sectitle{font-size:10.5px;color:var(--text-3);letter-spacing:1.6px;text-transform:uppercase;margin:18px 2px 9px;}
.db-grid{display:grid;gap:14px;}
.db-grid.action{grid-template-columns:repeat(auto-fit,minmax(290px,1fr));align-items:start;}
.db-grid.prog{grid-template-columns:repeat(auto-fill,minmax(230px,1fr));align-items:stretch;}
.db-col{display:flex;flex-direction:column;}
.db-h{cursor:pointer;}
.db-hero{display:flex;align-items:baseline;gap:7px;margin-bottom:9px;}
.db-big{font-family:var(--serif);font-size:27px;font-weight:500;line-height:1;letter-spacing:-.5px;color:var(--accent-2);font-variant-numeric:tabular-nums;}
.db-unit{font-size:12px;color:var(--text-3);}
.db-right{margin-left:auto;font-size:12px;white-space:nowrap;}
.db-foot{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:var(--text-3);margin-top:auto;padding-top:7px;}
.db-foot-l{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
@media(max-width:560px){
  .db-grid.prog{grid-template-columns:1fr 1fr;}
}
`;

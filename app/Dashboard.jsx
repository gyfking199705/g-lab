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
import { SHARED_CSS, Progress, Empty, LineChart, MiniBars } from '../core/ui.jsx';
import { buildAnalytics } from './analytics.js';
import { todayStr, fmtDate } from '../core/date.js';
import { todayView } from '../schedule/calc.js';
import { overallStats as goalsOverall } from '../goals/calc.js';
import { todayBoard, currentStreak, fitnessWorkoutDates, toggleCheck, bumpCount } from '../habits/calc.js';
import { summary as cutSummary } from '../cut/calc.js';
import { financeForecast } from '../savings/calc.js';
import { overallStats as learningStats, computeStreak as learningStreak } from '../learning/calc.js';
import { summary as papersSummary } from '../papers/calc.js';
import { summary as ledgerSummary } from '../ledger/calc.js';
import { workoutsThisWeek, weekStreak } from '../fitness/calc.js';
import { taskStats } from '../project/calc.js';

const SCHEDULE_KEY = 'schedule-planner';
const GOALS_KEY = 'goals-planner';
const HABITS_KEY = 'habits-planner';
const FITNESS_KEY = 'fitness-planner';
const CUT_KEY = 'cut-planner';
const SAVINGS_KEY = 'savings-planner';
const LEARNING_KEY = 'learning-planner';
const PAPERS_KEY = 'papers-planner';
const LEDGER_KEY = 'ledger-planner';

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 11) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

export default function Dashboard({ onNavigate, onOpenBoard, onChange, onSeed }) {
  const open = onOpenBoard || onNavigate;
  const [tick, setTick] = useState(0);
  const today = todayStr();

  const schedule = readModule(SCHEDULE_KEY) || { items: [] };
  const goalsData = readModule(GOALS_KEY) || { goals: [] };
  const habitsData = readModule(HABITS_KEY) || { habits: [], checkins: {} };
  const fitDates = useMemo(() => fitnessWorkoutDates(readModule(FITNESS_KEY)), [tick]);

  const sView = useMemo(() => todayView(schedule.items || [], today), [tick, today]);
  const hBoard = useMemo(() => todayBoard(habitsData.habits || [], habitsData.checkins || {}, today, fitDates), [tick, today, fitDates]);
  const gStats = useMemo(() => goalsOverall(goalsData.goals || []), [tick]);

  const cut = useMemo(() => { const d = readModule(CUT_KEY); return d && d.profile ? cutSummary(d.profile, d.logs || [], today) : null; }, [tick, today]);
  const finance = useMemo(() => financeForecast(readModule(SAVINGS_KEY)), [tick]);
  const ledger = useMemo(() => { const d = readModule(LEDGER_KEY); return d && (d.entries || []).length ? ledgerSummary(d.entries, d.budget || 0, today) : null; }, [tick, today]);
  const fitness = useMemo(() => { const d = readModule('fitness-planner'); const w = (d || {}).workouts || []; return w.length ? { week: workoutsThisWeek(w, today), streak: weekStreak(w, today), total: w.length } : null; }, [tick, today]);
  const project = useMemo(() => { const d = readModule('project-planner'); const t = (d || {}).tasks || []; return t.length ? taskStats(t) : null; }, [tick]);
  const stocks = useMemo(() => { const d = readModule('stocks-watch'); const n = ((d || {}).symbols || []).length; return n ? { count: n } : null; }, [tick]);
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
  const financeShow = finance && (finance.target || finance.latest);
  const hasAny = (schedule.items || []).length || (goalsData.goals || []).length || (habitsData.habits || []).length || cut || financeShow || learn || papers || ledger || fitness || project || stocks;
  // 已有数据的模块数量（少于 3 个时提示载入示例数据，方便预览完整看板）
  const populated = [(goalsData.goals || []).length, (habitsData.habits || []).length, cut, financeShow, learn, papers, ledger, fitness, project, stocks].filter(Boolean).length;
  // 进展卡：统一由大盘引擎驱动（与大盘同源、风格一致）。习惯/日程已在「今日行动」，此处不重复。
  const boards = useMemo(() => ['wealth', 'cut', 'ledger', 'goals', 'learning', 'papers', 'fitness', 'project', 'stocks']
    .map((id) => ({ id, a: buildAnalytics(id, readModule, today, { days: 30 }) }))
    .filter((x) => x.a), [tick, today]);

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

      {hasAny && populated < 3 && onSeed && (
        <div className="gx-card" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14, background: 'var(--accent-soft)', borderColor: '#E6C8B9' }}>
          <span style={{ fontSize: 13, color: 'var(--accent-2)', flex: 1 }}>✨ 想看看完整看板（各模块趋势 + 预测 + 大盘）的效果？一键载入示例数据预览。</span>
          <button className="gx-btn gx-btn-primary gx-btn-sm" onClick={onSeed}>载入示例数据</button>
        </div>
      )}

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
                    <div className="gx-sechead"><h3 className="db-h" onClick={() => open('schedule')}>📅 今日日程</h3><span className="gx-sub">{sView.done.length}/{scheduleTotal}</span></div>
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

          {/* 3) 进展 · 趋势（统一「迷你大盘卡」，与大盘同源、风格一致；点卡进大盘） */}
          {boards.length > 0 && (
            <>
              <div className="db-sectitle">进展 · 趋势</div>
              <div className="db-grid mboards">
                {boards.map(({ id, a }) => (
                  <MiniBoardCard key={id} a={a} wide={id === 'wealth'} onOpen={() => open(id)} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* 迷你大盘卡：与大盘同源（buildAnalytics 产出），渐变英雄区 + 交互趋势图 + 预测，点卡进大盘 */
function MiniChart({ c, stroke, height = 54 }) {
  if (!c) return null;
  if (c.kind === 'line') return <LineChart values={c.values} projection={c.projection} goal={c.goal} labels={c.labels} fmt={c.fmt} stroke={stroke} height={height} />;
  if (c.kind === 'fan') return <LineChart values={c.values} band={c.band} goal={c.goal} labels={c.labels} fmt={c.fmt} stroke={stroke} height={height} />;
  if (c.kind === 'cross') return <LineChart values={c.passive} stroke={stroke} height={height} interactive={false} />;
  if (c.kind === 'bars') return <MiniBars values={c.values} single={c.single || stroke} fmt={c.fmt} labels={c.labels} height={Math.max(40, height - 6)} />;
  if (c.kind === 'goalbars') {
    const gs = (c.goals || []).slice(0, 3);
    if (!gs.length) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {gs.map((g, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 2 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</span>
              <span style={{ color: g.done ? 'var(--success)' : 'var(--accent-2)', fontVariantNumeric: 'tabular-nums' }}>{g.pct}%</span>
            </div>
            <Progress pct={g.pct} good={g.done} />
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function MiniBoardCard({ a, wide, onOpen }) {
  const chart = (a.charts || []).find((c) => ['line', 'fan', 'bars', 'cross', 'goalbars'].includes(c.kind));
  return (
    <div className={`gx-card db-mini${wide ? ' wide' : ''}`} style={{ '--bb': a.stroke || 'var(--accent)' }} onClick={onOpen} role="button" tabIndex={0}>
      <div className="db-mini-head">
        <h3>{a.icon} {a.title.replace('大盘', '').trim()}</h3>
        <span className="db-mini-go">查看大盘 ›</span>
      </div>
      <div className="db-mini-hero">
        <span className="db-mini-v">{a.hero.value}{a.hero.unit && <span className="db-mini-u">{a.hero.unit}</span>}</span>
        {a.hero.delta && <span className={`db-mini-d ${a.hero.deltaTone || ''}`}>{a.hero.delta}</span>}
      </div>
      {a.hero.caption && <div className="db-mini-c">{a.hero.caption}</div>}
      {chart && <div className="db-mini-chart"><MiniChart c={chart} stroke={a.stroke || 'var(--accent)'} height={wide ? 78 : 54} /></div>}
      {a.forecast && a.forecast.text && <div className="db-mini-fc">{a.forecast.text}</div>}
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
.db-grid.mboards{grid-template-columns:repeat(auto-fill,minmax(272px,1fr));align-items:stretch;}
.db-col{display:flex;flex-direction:column;}
.db-h{cursor:pointer;}

/* 迷你大盘卡（与「财富趋势·预测」同款：渐变 + 趋势图 + 预测） */
.db-mini{display:flex;flex-direction:column;cursor:pointer;background:linear-gradient(135deg,color-mix(in srgb,var(--bb) 14%,var(--surface)),var(--surface) 66%);border-color:color-mix(in srgb,var(--bb) 20%,var(--bd));transition:box-shadow .18s,transform .12s,border-color .18s;}
.db-mini:hover,.db-mini:focus-visible{box-shadow:0 8px 24px rgba(38,36,31,.09);transform:translateY(-2px);border-color:color-mix(in srgb,var(--bb) 40%,var(--bd));outline:none;}
.db-mini.wide{grid-column:1/-1;}
.db-mini-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;}
.db-mini-head h3{font-family:var(--serif);font-size:15px;font-weight:500;letter-spacing:-.2px;}
.db-mini-go{font-size:11px;color:var(--bb);opacity:.85;white-space:nowrap;flex:none;}
.db-mini-hero{display:flex;align-items:baseline;gap:8px;margin-top:10px;}
.db-mini-v{font-family:var(--serif);font-size:26px;font-weight:500;line-height:1;letter-spacing:-.6px;color:var(--bb);font-variant-numeric:tabular-nums;}
.db-mini-u{font-size:13px;color:var(--text-3);margin-left:2px;}
.db-mini-d{margin-left:auto;font-size:11.5px;padding:2px 9px;border-radius:999px;background:var(--surface-2);color:var(--text-2);white-space:nowrap;flex:none;}
.db-mini-d.good{color:var(--success);background:var(--success-soft);}
.db-mini-d.bad{color:var(--danger);background:var(--danger-soft);}
.db-mini-c{font-size:11.5px;color:var(--text-2);margin-top:5px;}
.db-mini-chart{margin:11px 0 2px;}
.db-mini-fc{margin-top:auto;padding-top:10px;font-size:11.5px;line-height:1.5;color:var(--accent-2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.db-mini.wide{background:linear-gradient(135deg,color-mix(in srgb,var(--bb) 18%,var(--surface)),var(--surface) 72%);}
.db-mini.wide .db-mini-v{font-size:33px;}
.db-mini.wide .db-mini-head h3{font-size:17px;}
@media(max-width:560px){
  .db-grid.mboards{grid-template-columns:1fr;}
}
`;

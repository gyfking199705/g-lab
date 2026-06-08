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
import { SHARED_CSS, Progress, Empty, LineChart, MiniBars, Ring } from '../core/ui.jsx';
import { buildAnalytics, BOARD_ORDER } from './analytics.js';
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
  const boards = useMemo(() => BOARD_ORDER
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
                {boards.map(({ id, a }, i) => (
                  <MiniBoardCard key={id} a={a} idx={i} wide={id === 'wealth'} onOpen={() => open(id)} />
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

function MiniBoardCard({ a, wide, idx = 0, onOpen }) {
  const chart = (a.charts || []).find((c) => ['line', 'fan', 'bars', 'cross', 'goalbars'].includes(c.kind));
  const kpis = (a.kpis || []).slice(0, 4);
  const stroke = a.stroke || 'var(--accent)';
  const ringStroke = a.hero.progressTone === 'bad' ? 'var(--danger)' : stroke;
  const hasRing = a.hero.progress != null && isFinite(a.hero.progress);
  return (
    <div className={`gx-card db-board${wide ? ' wide' : ''}`} style={{ '--bb': stroke, animationDelay: `${idx * 70}ms` }} onClick={onOpen} role="button" tabIndex={0}>
      <div className="db-board-head">
        <h3>{a.icon} {a.title.replace('大盘', '').trim()}</h3>
        <span className="db-board-go">查看大盘 ›</span>
      </div>

      <div className="db-board-top">
        <div className="db-board-hero">
          <div className="db-board-herorow">
            {hasRing && <Ring pct={a.hero.progress} stroke={ringStroke} size={wide ? 70 : 62} width={wide ? 7 : 6} label={a.hero.progressLabel} sub={a.hero.progressSub} />}
            <div className="db-board-herotext">
              <div className="db-board-vrow">
                <span className="db-board-v">{a.hero.value}{a.hero.unit && <span className="db-board-u">{a.hero.unit}</span>}</span>
                {a.hero.delta && <span className={`db-board-d ${a.hero.deltaTone || ''}`}>{a.hero.delta}</span>}
              </div>
              {a.hero.caption && <div className="db-board-c">{a.hero.caption}</div>}
            </div>
          </div>
          {kpis.length > 0 && (
            <div className="db-board-kpis">
              {kpis.map((k, i) => (
                <div className="db-board-kpi" key={i}>
                  <div className={`db-board-kv ${k.tone || ''}`}>{k.value}</div>
                  <div className="db-board-kl">{k.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {chart && (
          <div className="db-board-chart">
            {chart.title && <div className="db-board-ctitle">{chart.title}</div>}
            <MiniChart c={chart} stroke={stroke} height={wide ? 120 : 96} />
            {chart.captionLeft && <div className="db-board-ccap">{chart.captionLeft}</div>}
          </div>
        )}
      </div>

      {a.forecast && a.forecast.text && <div className="db-board-fc">{a.forecast.text}</div>}
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
.db-grid.mboards{grid-template-columns:repeat(auto-fill,minmax(420px,1fr));align-items:stretch;}
.db-col{display:flex;flex-direction:column;}
.db-h{cursor:pointer;}

/* 大盘预览卡（每张都是大卡：渐变英雄 + 环形进度 + KPI + 趋势/预测图 + 预测语；点卡进详情大盘） */
@keyframes dbRise{from{opacity:0;translate:0 18px;}to{opacity:1;translate:0 0;}}
.db-board{display:flex;flex-direction:column;cursor:pointer;overflow:hidden;position:relative;
  background:linear-gradient(135deg,color-mix(in srgb,var(--bb) 15%,var(--surface)),var(--surface) 62%);
  border-color:color-mix(in srgb,var(--bb) 22%,var(--bd));transition:box-shadow .2s,scale .16s,border-color .2s;
  animation:dbRise .55s cubic-bezier(.22,1,.36,1) both;}
.db-board::before{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:var(--bb);opacity:.85;}
.db-board:hover,.db-board:focus-visible{box-shadow:0 14px 34px rgba(38,36,31,.13);scale:1.014;border-color:color-mix(in srgb,var(--bb) 48%,var(--bd));outline:none;z-index:1;}
.db-board.wide{grid-column:1/-1;background:linear-gradient(135deg,color-mix(in srgb,var(--bb) 19%,var(--surface)),var(--surface) 70%);}
.db-board.wide:hover,.db-board.wide:focus-visible{scale:1.006;}
@media(prefers-reduced-motion:reduce){.db-board{animation:none;}.db-board:hover{scale:1;}}
.db-board-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:14px;}
.db-board-head h3{font-family:var(--serif);font-size:17px;font-weight:500;letter-spacing:-.2px;}
.db-board-go{font-size:11.5px;color:var(--bb);opacity:.9;white-space:nowrap;flex:none;font-weight:500;}
.db-board-top{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.5fr);gap:20px;align-items:center;}
.db-board.wide .db-board-top{grid-template-columns:minmax(0,1fr) minmax(0,1.9fr);}
.db-board-hero{min-width:0;}
.db-board-herorow{display:flex;align-items:center;gap:14px;}
.db-board-herotext{min-width:0;flex:1;}
.db-board-vrow{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap;}
.db-board-v{font-family:var(--serif);font-size:34px;font-weight:500;line-height:1;letter-spacing:-1px;color:var(--bb);font-variant-numeric:tabular-nums;}
.db-board.wide .db-board-v{font-size:40px;}
.db-board-u{font-size:15px;color:var(--text-3);margin-left:2px;}
.db-board-d{font-size:11.5px;padding:2px 9px;border-radius:999px;background:var(--surface-2);color:var(--text-2);white-space:nowrap;}
.db-board-d.good{color:var(--success);background:var(--success-soft);}
.db-board-d.bad{color:var(--danger);background:var(--danger-soft);}
.db-board-c{font-size:12px;color:var(--text-2);margin-top:7px;}
.db-board-kpis{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:13px;}
.db-board-kpi{background:color-mix(in srgb,var(--surface) 78%,transparent);border:1px solid color-mix(in srgb,var(--bb) 14%,var(--bd));border-radius:10px;padding:8px 10px;}
.db-board-kv{font-family:var(--serif);font-size:16px;font-weight:500;letter-spacing:-.2px;font-variant-numeric:tabular-nums;line-height:1.15;}
.db-board-kv.accent{color:var(--accent-2);}
.db-board-kv.good{color:var(--success);}
.db-board-kv.bad{color:var(--danger);}
.db-board-kl{font-size:10.5px;color:var(--text-3);margin-top:2px;}
.db-board-chart{min-width:0;}
.db-board-ctitle{font-size:11px;color:var(--text-2);margin-bottom:7px;font-weight:500;}
.db-board-ccap{font-size:10px;color:var(--text-3);margin-top:6px;}
.db-board-fc{margin-top:14px;background:color-mix(in srgb,var(--bb) 11%,var(--surface));border:1px solid color-mix(in srgb,var(--bb) 22%,var(--bd));color:var(--accent-2);border-radius:11px;padding:10px 13px;font-size:12px;line-height:1.55;}
@media(max-width:680px){
  .db-grid.mboards{grid-template-columns:1fr;}
  .db-board-top{grid-template-columns:1fr;gap:14px;}
  .db-board.wide .db-board-top{grid-template-columns:1fr;}
  .db-board-v{font-size:30px;}
}
@media(max-width:560px){
  .db-grid.mboards{grid-template-columns:1fr;}
}
`;

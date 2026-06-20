/**
 * 记账 —— React 组件（函数式 + hooks）
 * ------------------------------------------------------------------
 * 日常收支流水：快速记一笔、按月汇总（支出/收入/结余 + 预算进度）、
 * 分类占比、近 14 天支出趋势(手写 SVG)、流水列表。
 *
 * 计算逻辑来自 ./calc.js（纯函数，已单测）。样式复用 core/ui.jsx 的 gx- 基元。
 * 数据：localStorage 键 `ledger-planner`。props：{ storageKey?, onChange? }
 */
import React, { useMemo, useState, useEffect } from 'react';
import { loadState, saveState, uid } from '../core/store.js';
import { SHARED_CSS, Empty, Progress, Sparkline } from '../core/ui.jsx';
import { todayStr, fmtMD, weekdayCN, addDays } from '../core/date.js';
import { formatMoney } from '../savings/calc.js';
import {
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, CATEGORY_ICON,
  monthKey, entriesInMonth, monthTotals, byCategory, dailyExpense, budgetStatus,
} from './calc.js';

const STORE_KEY = 'ledger-planner';
const DEFAULTS = { v: 1, entries: [], budget: 0 };

function prevMonth(mk) { const [y, m] = mk.split('-').map(Number); const d = new Date(y, m - 2, 1); return d.toISOString().slice(0, 7); }
function nextMonth(mk) { const [y, m] = mk.split('-').map(Number); const d = new Date(y, m, 1); return d.toISOString().slice(0, 7); }
function fmtMonth(mk) { const [y, m] = mk.split('-'); return `${y} 年 ${Number(m)} 月`; }

export default function LedgerPlanner({ storageKey = STORE_KEY, onChange }) {
  const [data, setData] = useState(() => loadState(storageKey, DEFAULTS));
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('餐饮');
  const [date, setDate] = useState(() => todayStr());
  const [note, setNote] = useState('');
  const [month, setMonth] = useState(() => monthKey());

  useEffect(() => { saveState(storageKey, data); if (onChange) onChange(); }, [data, storageKey, onChange]);

  const entries = data.entries || [];
  const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const monthEntries = useMemo(() => entriesInMonth(entries, month), [entries, month]);
  const totals = useMemo(() => monthTotals(entries, month), [entries, month]);
  const catBars = useMemo(() => byCategory(entries, month, 'expense'), [entries, month]);
  const series = useMemo(() => dailyExpense(entries, 14, month === monthKey() ? todayStr() : month + '-28'), [entries, month]);
  const bud = budgetStatus(totals.expense, data.budget);

  const add = () => {
    const a = Number(amount);
    if (!a || a <= 0) return;
    setData((d) => ({ ...d, entries: [...(d.entries || []), { id: uid('tx'), date, type, amount: a, category, note: note.trim() }] }));
    setAmount(''); setNote('');
  };
  const del = (id) => setData((d) => ({ ...d, entries: (d.entries || []).filter((e) => e.id !== id) }));
  const setBudget = () => {
    const v = prompt('设置每月预算（元，0 取消）：', String(data.budget || 0));
    if (v == null) return;
    setData((d) => ({ ...d, budget: Math.max(0, Number(v) || 0) }));
  };

  // 当切换收支类型时把分类重置为该类型首项
  useEffect(() => { setCategory((type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[0].id); }, [type]);

  return (
    <div className="gx-root">
      <style>{SHARED_CSS}{LEDGER_CSS}</style>

      <div className="gx-headrow">
        <div className="gx-head"><h2>🧾 记账</h2><p>记录日常收支，看清钱花在哪、攒下多少</p></div>
        <button className="gx-btn gx-btn-sm" onClick={setBudget}>{bud.set ? `预算 ${formatMoney(bud.budget)}` : '＋ 设预算'}</button>
      </div>

      {/* 快速记一笔 */}
      <div className="gx-card" style={{ marginBottom: 14 }}>
        <div className="gx-inrow" style={{ marginBottom: 10 }}>
          <div className="gx-seg">
            <button className={type === 'expense' ? 'active' : ''} onClick={() => setType('expense')}>支出</button>
            <button className={type === 'income' ? 'active' : ''} onClick={() => setType('income')}>收入</button>
          </div>
          <input className="gx-in" style={{ flex: 1, minWidth: 120 }} type="number" inputMode="decimal" placeholder="金额"
            value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} autoFocus />
          <input className="gx-in gx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="led-cats">
          {cats.map((c) => (
            <button key={c.id} className={`led-cat ${category === c.id ? 'on' : ''}`} onClick={() => setCategory(c.id)}>
              <span>{c.icon}</span>{c.id}
            </button>
          ))}
        </div>
        <div className="gx-inrow" style={{ marginTop: 10 }}>
          <input className="gx-in" style={{ flex: 1 }} placeholder="备注（可选）" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button className="gx-btn gx-btn-primary" onClick={add}>记一笔</button>
        </div>
      </div>

      {/* 月度汇总 */}
      <div className="gx-card">
        <div className="gx-sechead">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="gx-btn gx-btn-sm" onClick={() => setMonth(prevMonth(month))}>‹</button>
            <button className="gx-btn gx-btn-sm" onClick={() => setMonth(monthKey())}>本月</button>
            <button className="gx-btn gx-btn-sm" onClick={() => setMonth(nextMonth(month))}>›</button>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 15, marginLeft: 4 }}>{fmtMonth(month)}</span>
          </div>
        </div>
        <div className="gx-kpis" style={{ marginBottom: 12 }}>
          <div className="gx-kpi"><div className="gx-kpi-v" style={{ color: 'var(--danger)' }}>{formatMoney(totals.expense)}</div><div className="gx-kpi-l">支出</div></div>
          <div className="gx-kpi"><div className="gx-kpi-v good">{formatMoney(totals.income)}</div><div className="gx-kpi-l">收入</div></div>
          <div className="gx-kpi"><div className="gx-kpi-v" style={{ color: totals.net >= 0 ? 'var(--success)' : 'var(--danger)' }}>{totals.net >= 0 ? '+' : ''}{formatMoney(totals.net)}</div><div className="gx-kpi-l">结余</div></div>
        </div>

        {bud.set && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: 'var(--text-2)' }}>预算 {formatMoney(bud.budget)}</span>
              <span style={{ color: bud.over ? 'var(--danger)' : 'var(--text-3)' }}>{bud.over ? `超支 ${formatMoney(-bud.remaining)}` : `剩 ${formatMoney(bud.remaining)}`} · {bud.pct}%</span>
            </div>
            <Progress pct={bud.pct} good={!bud.over && bud.pct < 90} />
          </div>
        )}

        {/* 近 14 天支出趋势 */}
        <div style={{ marginBottom: 6, fontSize: 12, color: 'var(--text-3)' }}>近 14 天支出趋势</div>
        <Sparkline values={series.map((d) => d.expense)} stroke="var(--danger)" height={44} />

        {/* 分类占比 */}
        {catBars.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>支出分类</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {catBars.map((c) => (
                <div key={c.category}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}>
                    <span>{CATEGORY_ICON[c.category] || '📦'} {c.category}</span>
                    <span style={{ color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(c.amount)} · {Math.round(c.share * 100)}%</span>
                  </div>
                  <Progress pct={c.share * 100} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 流水 */}
      <div className="gx-card" style={{ marginTop: 14 }}>
        <div className="gx-sechead"><h3>📒 流水</h3><span className="gx-sub">{monthEntries.length} 笔</span></div>
        {monthEntries.length === 0 ? (
          <Empty icon="🧾" title="这个月还没有记录" hint="在上方记第一笔" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {monthEntries.map((e) => (
              <div className="gx-row" key={e.id} style={{ padding: '8px 10px' }}>
                <span style={{ width: 26, textAlign: 'center', fontSize: 16 }}>{CATEGORY_ICON[e.category] || '📦'}</span>
                <div className="gx-row-main">
                  <div className="gx-row-title" style={{ fontSize: 13 }}>{e.category}{e.note ? <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> · {e.note}</span> : ''}</div>
                  <div className="gx-row-sub">{fmtMD(e.date)} {weekdayCN(e.date)}</div>
                </div>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500, color: e.type === 'income' ? 'var(--success)' : 'var(--text)' }}>
                  {e.type === 'income' ? '+' : '−'}{formatMoney(e.amount)}
                </span>
                <button className="gx-btn gx-btn-ghost gx-btn-sm danger" onClick={() => del(e.id)}>删</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="gx-disclaim">记账数据仅存本地浏览器（参与备份/云同步）。与「财富规划」的净资产是互补的两层：这里记现金流，那里记存量。</p>
    </div>
  );
}

const LEDGER_CSS = `
.led-cats{display:flex;flex-wrap:wrap;gap:6px;}
.led-cat{display:flex;align-items:center;gap:4px;padding:6px 10px;border:1px solid var(--bd);background:var(--surface-2);border-radius:9px;font-size:12.5px;cursor:pointer;color:var(--text-2);transition:.15s;font-family:var(--sans);}
.led-cat:hover{border-color:var(--bd-2);}
.led-cat.on{background:var(--accent-soft);border-color:var(--accent);color:var(--accent-2);font-weight:500;}
`;

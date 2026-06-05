/**
 * 比价小助手 —— React 组件（函数式 + hooks）
 * ------------------------------------------------------------------
 * 输入多个商品的「价格 + 规格 + 单位 + 件数」，实时算出可比单价（每 100g / 每 L / 每件…），
 * 自动标出最划算项与其它项「贵多少」。跨量纲项标记为不可比。
 *
 * 计算来自 ./calc.js（纯函数，已单测）。样式复用 core/ui.jsx 的 gx- 基元。
 * 数据：localStorage 键 `compare-planner`。props：{ storageKey?, onChange? }
 */
import React, { useEffect, useMemo, useState } from 'react';
import { loadState, saveState, uid } from '../core/store.js';
import { SHARED_CSS, Empty } from '../core/ui.jsx';
import { UNITS, GROUPS, compare } from './calc.js';

const STORE_KEY = 'compare-planner';
const GROUP_ORDER = ['weight', 'volume', 'count', 'length'];
const newItem = (unit = 'g') => ({ id: uid('cmp'), name: '', price: '', size: '', unit, count: '' });
const DEFAULTS = { v: 1, items: [newItem('g'), newItem('g')] };

const money = (v) => (v == null ? '—' : '¥' + (v >= 100 ? v.toFixed(1) : v >= 1 ? v.toFixed(2) : v.toPrecision(2).replace(/0+$/, '').replace(/\.$/, '')));

export default function CompareTool({ storageKey = STORE_KEY, onChange }) {
  const [data, setData] = useState(() => loadState(storageKey, DEFAULTS));
  useEffect(() => { saveState(storageKey, data); if (onChange) onChange(); }, [data, storageKey, onChange]);

  const items = data.items || [];
  const result = useMemo(() => compare(items), [items]);
  const byId = Object.fromEntries(result.rows.map((r) => [r.id, r]));

  const setItems = (fn) => setData((d) => ({ ...d, items: fn(d.items || []) }));
  const update = (id, patch) => setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const addRow = () => setItems((list) => [...list, newItem(list.length ? list[list.length - 1].unit : 'g')]);
  const del = (id) => setItems((list) => list.filter((it) => it.id !== id));
  const clearAll = () => { if (confirm('清空所有比价项？')) setData({ v: 1, items: [newItem('g')] }); };

  const best = result.bestId ? items.find((it) => it.id === result.bestId) : null;
  const worst = result.rows.filter((r) => r.comparable).slice(-1)[0];
  const maxSave = best && worst && worst.pctMore ? worst.pctMore : 0;

  return (
    <div className="gx-root">
      <style>{SHARED_CSS}{CMP_CSS}</style>

      <div className="gx-headrow">
        <div className="gx-head">
          <h2>🧮 比价小助手</h2>
          <p>输入不同规格的价格，自动算「单价」帮你挑最划算的（不用再手算）</p>
        </div>
        <button className="gx-btn gx-btn-sm" onClick={clearAll}>清空</button>
      </div>

      {/* 结论 */}
      {result.comparableCount >= 2 && best && (
        <div className="cmp-verdict">
          <span className="cmp-verdict-em">✅ 最划算：{best.name || '未命名'}</span>
          <span> · {money(byId[best.id].display)} / {result.displayLabel}</span>
          {maxSave > 0 && <span> · 比最贵的省 <strong>{maxSave}%</strong></span>}
        </div>
      )}

      <div className="gx-card">
        {/* 表头 */}
        <div className="cmp-row cmp-head">
          <div className="cmp-c-name">名称</div>
          <div className="cmp-c-price">价格 ¥</div>
          <div className="cmp-c-size">规格</div>
          <div className="cmp-c-unit">单位</div>
          <div className="cmp-c-count">件数</div>
          <div className="cmp-c-unitprice">单价{result.displayLabel ? ` (¥/${result.displayLabel})` : ''}</div>
          <div className="cmp-c-act" />
        </div>

        {items.map((it) => {
          const r = byId[it.id] || {};
          return (
            <div className={`cmp-row${r.isBest ? ' best' : ''}`} key={it.id}>
              <input className="gx-in cmp-c-name" placeholder="如：A 品牌" value={it.name} onChange={(e) => update(it.id, { name: e.target.value })} />
              <input className="gx-in cmp-c-price" type="number" inputMode="decimal" min="0" placeholder="价格" value={it.price} onChange={(e) => update(it.id, { price: e.target.value })} />
              <input className="gx-in cmp-c-size" type="number" inputMode="decimal" min="0" placeholder="数值" value={it.size} onChange={(e) => update(it.id, { size: e.target.value })} />
              <select className="gx-in cmp-c-unit" value={it.unit} onChange={(e) => update(it.id, { unit: e.target.value })}>
                {GROUP_ORDER.map((g) => (
                  <optgroup key={g} label={GROUPS[g].label}>
                    {UNITS.filter((u) => u.group === g).map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
                  </optgroup>
                ))}
              </select>
              <input className="gx-in cmp-c-count" type="number" inputMode="numeric" min="1" placeholder="1" value={it.count} onChange={(e) => update(it.id, { count: e.target.value })} />
              <div className="cmp-c-unitprice cmp-up">
                {r.display != null ? (
                  <>
                    <span className={r.isBest ? 'cmp-best-v' : ''}>{money(r.display)}</span>
                    {r.isBest && <span className="gx-tag good" style={{ fontSize: 10 }}>最划算</span>}
                    {!r.isBest && r.pctMore != null && r.pctMore > 0 && <span className="cmp-more">贵 {r.pctMore}%</span>}
                    {!r.comparable && r.group && <span className="gx-tag" style={{ fontSize: 10 }}>单位不可比</span>}
                  </>
                ) : <span className="cmp-na">填价格+规格</span>}
              </div>
              <div className="cmp-c-act"><button className="gx-btn gx-btn-ghost gx-btn-sm danger" onClick={() => del(it.id)}>✕</button></div>
            </div>
          );
        })}

        {items.length === 0 && <Empty icon="🧮" title="还没有比价项" hint="点下方「添加一项」开始" />}

        <div style={{ marginTop: 10 }}>
          <button className="gx-btn gx-btn-primary" onClick={addRow}>＋ 添加一项</button>
        </div>
      </div>

      <p className="gx-disclaim">
        💡 单价按所选单位归一计算：重量按「每 100g」、体积按「每 L」、数量按「每件」、长度按「每 m」。
        不同量纲（如克 vs 毫升）无法直接比较，会标「单位不可比」。数据仅存本地浏览器（参与备份/云同步）。
      </p>
    </div>
  );
}

const CMP_CSS = `
.cmp-verdict{background:var(--success-soft);border:1px solid #CBD9CC;color:var(--text);border-radius:12px;padding:11px 15px;font-size:13.5px;margin-bottom:14px;}
.cmp-verdict-em{font-weight:600;color:var(--success);}
.cmp-row{display:grid;grid-template-columns:1.4fr .8fr .8fr 1.1fr .6fr 1.3fr 32px;gap:8px;align-items:center;padding:6px 0;}
.cmp-row.best{background:var(--success-soft);border-radius:10px;padding:6px 8px;margin:0 -8px;}
.cmp-head{font-size:11px;color:var(--text-3);padding-bottom:8px;border-bottom:1px solid var(--bd-soft);margin-bottom:4px;}
.cmp-row .gx-in{padding:7px 9px;font-size:13px;}
.cmp-up{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-variant-numeric:tabular-nums;font-size:13px;}
.cmp-best-v{font-weight:600;color:var(--success);font-size:14px;}
.cmp-more{font-size:11px;color:var(--danger);}
.cmp-na{font-size:11px;color:var(--text-3);}
.cmp-c-act button{padding:5px 8px;}
@media(max-width:720px){
  .cmp-head{display:none;}
  .cmp-row{grid-template-columns:1fr 1fr;gap:6px;border:1px solid var(--bd-soft);border-radius:10px;padding:10px;margin-bottom:8px;}
  .cmp-row.best{margin:0 0 8px;}
  .cmp-c-name{grid-column:1 / -1;}
  .cmp-c-unitprice{grid-column:1 / 2;}
  .cmp-c-act{grid-column:2 / 3;justify-self:end;}
}
`;

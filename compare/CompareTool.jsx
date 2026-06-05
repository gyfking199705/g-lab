/**
 * 比价小助手 —— React 组件（函数式 + hooks）
 * ------------------------------------------------------------------
 * 按「商品」分组：每个商品一张卡，卡内放该商品的多个规格/包装；
 * 在每个商品内部实时算可比单价（每 100g / 每 L / 每件…），标出该商品「最划算的规格」与其它规格贵多少。
 *
 * 计算来自 ./calc.js（纯函数，已单测）。样式复用 core/ui.jsx 的 gx- 基元。
 * 数据：localStorage 键 `compare-planner`（v2 按商品分组；自动迁移旧 v1 扁平结构）。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { loadState, saveState, uid } from '../core/store.js';
import { SHARED_CSS, Empty } from '../core/ui.jsx';
import { UNITS, GROUPS, compare } from './calc.js';

const STORE_KEY = 'compare-planner';
const GROUP_ORDER = ['weight', 'volume', 'count', 'length'];

const newSpec = (unit = 'ml') => ({ id: uid('spec'), name: '', price: '', size: '', unit, count: '' });
const newProduct = (name = '') => ({ id: uid('prod'), name, items: [newSpec(), newSpec()] });
const DEFAULTS = { v: 2, products: [newProduct()] };
// v1（扁平 items）→ v2（包成一个商品）
const MIGRATIONS = { 1: (d) => ({ products: [{ id: uid('prod'), name: '', items: (d.items || []) }] }) };

const money = (v) => (v == null ? '—' : '¥' + (v >= 100 ? v.toFixed(1) : v >= 1 ? v.toFixed(2) : v.toPrecision(2).replace(/0+$/, '').replace(/\.$/, '')));

export default function CompareTool({ storageKey = STORE_KEY, onChange }) {
  const [data, setData] = useState(() => loadState(storageKey, DEFAULTS, MIGRATIONS));
  useEffect(() => { saveState(storageKey, data); if (onChange) onChange(); }, [data, storageKey, onChange]);

  const products = data.products || [];

  const setProducts = (fn) => setData((d) => ({ ...d, products: fn(d.products || []) }));
  const updateProduct = (pid, patch) => setProducts((ps) => ps.map((p) => (p.id === pid ? { ...p, ...patch } : p)));
  const setSpecs = (pid, fn) => setProducts((ps) => ps.map((p) => (p.id === pid ? { ...p, items: fn(p.items || []) } : p)));
  const addProduct = () => setProducts((ps) => [...ps, newProduct()]);
  const delProduct = (pid) => { if (confirm('删除这个商品及其所有规格？')) setProducts((ps) => ps.filter((p) => p.id !== pid)); };

  return (
    <div className="gx-root">
      <style>{SHARED_CSS}{CMP_CSS}</style>

      <div className="gx-headrow">
        <div className="gx-head">
          <h2>🧮 比价小助手</h2>
          <p>每个商品放它的不同规格，自动算「单价」帮你挑该商品最划算的规格</p>
        </div>
        <button className="gx-btn gx-btn-sm gx-btn-primary" onClick={addProduct}>＋ 添加商品</button>
      </div>

      {products.length === 0 ? (
        <div className="gx-card"><Empty icon="🧮" title="还没有商品" hint="点右上「＋ 添加商品」开始，比如「可乐」「卷纸」" />
          <div style={{ textAlign: 'center' }}><button className="gx-btn gx-btn-primary" onClick={addProduct}>＋ 添加商品</button></div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {products.map((p) => (
            <ProductCard key={p.id} product={p}
              onName={(name) => updateProduct(p.id, { name })}
              onDelete={() => delProduct(p.id)}
              onSpecs={(fn) => setSpecs(p.id, fn)} />
          ))}
        </div>
      )}

      <p className="gx-disclaim">
        💡 单价按所选单位归一：重量→每 100g、体积→每 L、数量→每件、长度→每 m。同一商品里不同量纲（克 vs 毫升）无法比较会标「单位不可比」。数据仅存本地浏览器（参与备份/云同步）。
      </p>
    </div>
  );
}

function ProductCard({ product, onName, onDelete, onSpecs }) {
  const items = product.items || [];
  const result = useMemo(() => compare(items), [items]);
  const byId = Object.fromEntries(result.rows.map((r) => [r.id, r]));
  const best = result.bestId ? items.find((it) => it.id === result.bestId) : null;
  const worst = result.rows.filter((r) => r.comparable).slice(-1)[0];
  const maxSave = best && worst && worst.pctMore ? worst.pctMore : 0;

  const update = (sid, patch) => onSpecs((list) => list.map((it) => (it.id === sid ? { ...it, ...patch } : it)));
  const addSpec = () => onSpecs((list) => [...list, newSpec(list.length ? list[list.length - 1].unit : 'ml')]);
  const delSpec = (sid) => onSpecs((list) => list.filter((it) => it.id !== sid));

  return (
    <div className="gx-card">
      <div className="cmp-prodhead">
        <input className="gx-in cmp-prodname" placeholder="商品名（如：可乐 / 卷纸 / 洗发水）" value={product.name} onChange={(e) => onName(e.target.value)} />
        <button className="gx-btn gx-btn-ghost gx-btn-sm danger" onClick={onDelete} title="删除商品">✕</button>
      </div>

      {result.comparableCount >= 2 && best && (
        <div className="cmp-verdict">
          <span className="cmp-verdict-em">✅ 最划算：{best.name || '该规格'}</span>
          <span> · {money(byId[best.id].display)} / {result.displayLabel}</span>
          {maxSave > 0 && <span> · 比最贵省 <strong>{maxSave}%</strong></span>}
        </div>
      )}

      <div className="cmp-row cmp-head">
        <div className="cmp-c-name">规格名</div>
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
            <input className="gx-in cmp-c-name" placeholder="如：1.5L 瓶" value={it.name} onChange={(e) => update(it.id, { name: e.target.value })} />
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
            <div className="cmp-c-act"><button className="gx-btn gx-btn-ghost gx-btn-sm danger" onClick={() => delSpec(it.id)}>✕</button></div>
          </div>
        );
      })}

      <div style={{ marginTop: 8 }}>
        <button className="gx-btn gx-btn-sm" onClick={addSpec}>＋ 添加规格</button>
      </div>
    </div>
  );
}

const CMP_CSS = `
.cmp-prodhead{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
.cmp-prodname{flex:1;font-family:var(--serif);font-size:16px;font-weight:500;padding:8px 11px;}
.cmp-verdict{background:var(--success-soft);border:1px solid #CBD9CC;color:var(--text);border-radius:10px;padding:9px 13px;font-size:13px;margin-bottom:12px;}
.cmp-verdict-em{font-weight:600;color:var(--success);}
.cmp-row{display:grid;grid-template-columns:1.3fr .8fr .8fr 1.1fr .6fr 1.3fr 30px;gap:8px;align-items:center;padding:5px 0;}
.cmp-row.best{background:var(--success-soft);border-radius:10px;padding:6px 8px;margin:0 -8px;}
.cmp-head{font-size:11px;color:var(--text-3);padding-bottom:7px;border-bottom:1px solid var(--bd-soft);margin-bottom:3px;}
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

/**
 * 范式库视图：搜索 + 类别 chips + 框架/排序下拉 + 可展开卡片 + 收藏。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { PRACTICES, CATEGORIES, FRAMEWORKS, ADOPTION_STATUS } from './data.js';
import {
  filterPractices,
  sortPractices,
  roi,
  categoryCounts,
  statusOf,
  prerequisitesOf,
  unlocksOf,
  curesOf,
} from './calc.js';

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
const FW_MAP = Object.fromEntries(FRAMEWORKS.map((f) => [f.id, f]));

function Meter({ label, value, muted }) {
  return (
    <div className="dx-meter">
      <div className="lab">{label}</div>
      <div className="dx-dots">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={'dx-dot' + (i <= value ? ' on' + (muted ? ' muted' : '') : '')} />
        ))}
      </div>
    </div>
  );
}

function StatusControl({ value, onChange }) {
  return (
    <div className="dx-status" role="group" aria-label="采纳状态">
      {ADOPTION_STATUS.map((s) => (
        <button
          key={s.id}
          aria-pressed={value === s.id}
          style={value === s.id ? { background: s.color } : undefined}
          onClick={() => onChange(s.id)}
        >
          {s.name}
        </button>
      ))}
    </div>
  );
}

function Card({ p, fav, onFav, onFramework, status, onStatus, onGotoPractice, onGotoAntipatterns }) {
  const [open, setOpen] = useState(false);
  const cat = CAT_MAP[p.category];
  const pre = prerequisitesOf(p);
  const unlocks = unlocksOf(p);
  const cures = curesOf(p.id);
  const hasRel = pre.length || unlocks.length || cures.length;
  return (
    <article className="dx-card">
      <div className="dx-card-h">
        <div style={{ display: 'flex', gap: 10 }}>
          <span className="ic">{cat?.icon}</span>
          <div>
            <h3>{p.title}</h3>
            <div className="dx-cat">{cat?.name} · 性价比 {roi(p).toFixed(1)}</div>
          </div>
        </div>
        <button
          className="dx-fav"
          aria-pressed={fav}
          title={fav ? '取消收藏' : '收藏'}
          onClick={() => onFav(p.id)}
        >
          {fav ? '★' : '☆'}
        </button>
      </div>

      <p className="sum">{p.summary}</p>

      <div className="dx-meters">
        <Meter label="影响" value={p.impact} />
        <Meter label="成本" value={p.effort} muted />
        <Meter label="采用度" value={p.adoption} />
      </div>

      <div className="dx-badges">
        {p.frameworks.map((fid) => (
          <button key={fid} className="dx-badge fw" onClick={() => onFramework(fid)} title="按此框架筛选">
            {FW_MAP[fid]?.name || fid}
          </button>
        ))}
      </div>

      <StatusControl value={status} onChange={(s) => onStatus(p.id, s)} />

      <button className="dx-more" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? '收起 ▲' : '怎么落地 / 来源 ▾'}
      </button>

      {open && (
        <div className="dx-detail">
          <h4>落地步骤</h4>
          <ul>{p.how.map((h, i) => <li key={i}>{h}</li>)}</ul>
          <h4>关注信号</h4>
          <ul>{p.signals.map((s, i) => <li key={i}>{s}</li>)}</ul>
          {hasRel && (
            <>
              <h4>关系</h4>
              <div className="dx-rel">
                {pre.length > 0 && (
                  <div className="dx-rel-row">
                    <span className="rl">前置</span>
                    <span className="rc">
                      {pre.map((x) => (
                        <button key={x.id} className="dx-rel-chip" onClick={() => onGotoPractice(x.title)}>
                          {CAT_MAP[x.category]?.icon} {x.title}
                        </button>
                      ))}
                    </span>
                  </div>
                )}
                {unlocks.length > 0 && (
                  <div className="dx-rel-row">
                    <span className="rl">解锁</span>
                    <span className="rc">
                      {unlocks.map((x) => (
                        <button key={x.id} className="dx-rel-chip" onClick={() => onGotoPractice(x.title)}>
                          {CAT_MAP[x.category]?.icon} {x.title}
                        </button>
                      ))}
                    </span>
                  </div>
                )}
                {cures.length > 0 && (
                  <div className="dx-rel-row">
                    <span className="rl">对治</span>
                    <span className="rc">
                      {cures.map((a) => (
                        <button key={a.id} className="dx-rel-chip cure" onClick={onGotoAntipatterns}>
                          ⚠️ {a.name}
                        </button>
                      ))}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
          <h4>来源</h4>
          <div className="dx-src">
            {p.sources.map((s, i) => (
              <span key={i}>
                {i > 0 && ' · '}
                <a href={s.url} target="_blank" rel="noreferrer noopener">{s.label} ↗</a>
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

export default function Practices({ favs, onToggleFav, statuses, onSetStatus, focus, onGotoAntipatterns }) {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [frameworks, setFrameworks] = useState([]);
  const [quickWin, setQuickWin] = useState(false);
  const [sort, setSort] = useState('impact');
  const [favOnly, setFavOnly] = useState(false);
  const [status, setStatus] = useState('all');

  function resetFilters() {
    setCategory('all');
    setFrameworks([]);
    setQuickWin(false);
    setStatus('all');
    setFavOnly(false);
  }

  function toggleFramework(fid) {
    setFrameworks((prev) => (prev.includes(fid) ? prev.filter((x) => x !== fid) : [...prev, fid]));
  }

  // 从「落地路线」跳转过来：用范式标题作搜索，并清掉其它筛选以确保命中
  useEffect(() => {
    if (!focus) return;
    setQ(focus.q);
    resetFilters();
  }, [focus && focus.nonce]);

  // 卡片关系网内就地跳转：用标题搜索并清掉其它筛选
  function gotoLocal(title) {
    setQ(title);
    resetFilters();
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const counts = useMemo(() => categoryCounts(PRACTICES), []);

  const list = useMemo(() => {
    let r = filterPractices(PRACTICES, { q, category, frameworks, quickWin });
    if (favOnly) r = r.filter((p) => favs.includes(p.id));
    if (status !== 'all') r = r.filter((p) => statusOf(statuses, p.id) === status);
    return sortPractices(r, sort);
  }, [q, category, frameworks, quickWin, sort, favOnly, favs, status, statuses]);

  return (
    <div>
      <div className="dx-toolbar">
        <div className="dx-search">
          <input
            className="dx-input"
            placeholder="搜索范式、信号或做法…（如：评审、回滚、心流）"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select className="dx-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">全部状态</option>
          {ADOPTION_STATUS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="dx-select" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="impact">按影响</option>
          <option value="roi">按性价比</option>
          <option value="adoption">按采用度</option>
          <option value="effort">按成本</option>
          <option value="title">按名称</option>
        </select>
        <button
          className="dx-chip"
          aria-pressed={quickWin}
          onClick={() => setQuickWin((v) => !v)}
          title="只看高性价比（影响÷成本 ≥ 2）"
        >
          ⚡ 高性价比
        </button>
        <button
          className="dx-chip"
          aria-pressed={favOnly}
          onClick={() => setFavOnly((v) => !v)}
          title="只看收藏"
        >
          ★ 收藏 <span className="c">{favs.length}</span>
        </button>
      </div>

      <div className="dx-chips">
        <button className="dx-chip" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>
          全部 <span className="c">{PRACTICES.length}</span>
        </button>
        {counts.map((c) => (
          <button
            key={c.id}
            className="dx-chip"
            aria-pressed={category === c.id}
            onClick={() => setCategory(category === c.id ? 'all' : c.id)}
          >
            {c.icon} {c.name} <span className="c">{c.count}</span>
          </button>
        ))}
      </div>

      <div className="dx-chips dx-fwchips">
        <span className="dx-fwlab">框架对齐</span>
        {FRAMEWORKS.map((f) => (
          <button
            key={f.id}
            className="dx-chip sm"
            aria-pressed={frameworks.includes(f.id)}
            onClick={() => toggleFramework(f.id)}
          >
            {f.name}
          </button>
        ))}
        {frameworks.length > 0 && (
          <button className="dx-chip sm clear" onClick={() => setFrameworks([])}>清空 ✕</button>
        )}
      </div>

      {list.length ? (
        <div className="dx-grid">
          {list.map((p) => (
            <Card
              key={p.id}
              p={p}
              fav={favs.includes(p.id)}
              onFav={onToggleFav}
              onFramework={(fid) => setFrameworks([fid])}
              status={statusOf(statuses, p.id)}
              onStatus={onSetStatus}
              onGotoPractice={gotoLocal}
              onGotoAntipatterns={onGotoAntipatterns}
            />
          ))}
        </div>
      ) : (
        <div className="dx-empty">没有匹配的范式，换个关键词或清空筛选试试。</div>
      )}
    </div>
  );
}

/**
 * 范式库视图：搜索 + 类别 chips + 框架/排序下拉 + 可展开卡片 + 收藏。
 */
import React, { useMemo, useState } from 'react';
import { PRACTICES, CATEGORIES, FRAMEWORKS } from './data.js';
import { filterPractices, sortPractices, roi, categoryCounts } from './calc.js';

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

function Card({ p, fav, onFav, onFramework }) {
  const [open, setOpen] = useState(false);
  const cat = CAT_MAP[p.category];
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

      <button className="dx-more" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? '收起 ▲' : '怎么落地 / 来源 ▾'}
      </button>

      {open && (
        <div className="dx-detail">
          <h4>落地步骤</h4>
          <ul>{p.how.map((h, i) => <li key={i}>{h}</li>)}</ul>
          <h4>关注信号</h4>
          <ul>{p.signals.map((s, i) => <li key={i}>{s}</li>)}</ul>
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

export default function Practices({ favs, onToggleFav }) {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [framework, setFramework] = useState('all');
  const [sort, setSort] = useState('impact');
  const [favOnly, setFavOnly] = useState(false);

  const counts = useMemo(() => categoryCounts(PRACTICES), []);

  const list = useMemo(() => {
    let r = filterPractices(PRACTICES, { q, category, framework });
    if (favOnly) r = r.filter((p) => favs.includes(p.id));
    return sortPractices(r, sort);
  }, [q, category, framework, sort, favOnly, favs]);

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
        <select className="dx-select" value={framework} onChange={(e) => setFramework(e.target.value)}>
          <option value="all">全部框架</option>
          {FRAMEWORKS.map((f) => <option key={f.id} value={f.id}>对齐 {f.name}</option>)}
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

      {list.length ? (
        <div className="dx-grid">
          {list.map((p) => (
            <Card
              key={p.id}
              p={p}
              fav={favs.includes(p.id)}
              onFav={onToggleFav}
              onFramework={(fid) => setFramework(fid)}
            />
          ))}
        </div>
      ) : (
        <div className="dx-empty">没有匹配的范式，换个关键词或清空筛选试试。</div>
      )}
    </div>
  );
}

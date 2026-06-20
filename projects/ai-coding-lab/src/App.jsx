/**
 * AI Coding 研究室 · 主界面。
 * 收集并展示业界正在用的 AI Coding 范式 / 工作流 / 提效技巧 / 工具 / 护栏。
 * 视觉遵循仓库共享设计规范（暖纸色 + 陶土橙、衬线标题、手写 SVG、克制留白）。
 */
import React, { useMemo, useState, useEffect } from 'react';
import { ITEMS, CATEGORIES, MATURITY, LEVEL } from '../data/practices.js';
import { filterItems, sortItems, collectTags, summarize } from './filter.js';
import MatrixChart from './MatrixChart.jsx';
import { STYLE } from './style.js';

const CAT_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
const SORTS = [
  { id: 'roi', label: '性价比' },
  { id: 'impact', label: '影响力' },
  { id: 'maturity', label: '成熟度' },
  { id: 'title', label: '名称' },
];

function Pill({ active, onClick, children, title }) {
  return (
    <button type="button" className={`acl-pill${active ? ' on' : ''}`} onClick={onClick} title={title}>
      {children}
    </button>
  );
}

function Meter({ kind, value }) {
  const map = kind === 'maturity' ? MATURITY : LEVEL;
  const order = (map[value] && map[value].order) || 0;
  return (
    <span className="acl-meter" aria-label={`${value} ${order}/3`}>
      {[1, 2, 3].map((i) => (
        <i key={i} className={i <= order ? 'f' : ''} />
      ))}
    </span>
  );
}

function Card({ item, onOpen }) {
  const cat = CAT_BY_ID[item.category];
  return (
    <button type="button" className="acl-card" onClick={() => onOpen(item)}>
      <div className="acl-card-top">
        <span className="acl-cat" data-cat={item.category}>{cat.icon} {cat.label}</span>
        <span className="acl-mat">{MATURITY[item.maturity].label}</span>
      </div>
      <div className="acl-card-title">{item.title}</div>
      <div className="acl-card-sum">{item.summary}</div>
      <div className="acl-card-foot">
        <span className="acl-kv">影响力 <Meter kind="level" value={item.impact} /></span>
        <span className="acl-kv">成本 <Meter kind="level" value={item.effort} /></span>
      </div>
      <div className="acl-tags">
        {(item.tags || []).slice(0, 4).map((t) => <span key={t} className="acl-tag">#{t}</span>)}
      </div>
    </button>
  );
}

function Drawer({ item, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!item) return null;
  const cat = CAT_BY_ID[item.category];
  return (
    <div className="acl-scrim" onClick={onClose}>
      <aside className="acl-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={item.title}>
        <button type="button" className="acl-x" onClick={onClose} aria-label="关闭">✕</button>
        <div className="acl-d-cat" data-cat={item.category}>{cat.icon} {cat.label}</div>
        <h2 className="acl-d-title">{item.title}</h2>
        <p className="acl-d-sum">{item.summary}</p>

        <div className="acl-d-meters">
          <div><span>成熟度</span><Meter kind="maturity" value={item.maturity} /><em>{MATURITY[item.maturity].label}</em></div>
          <div><span>影响力</span><Meter kind="level" value={item.impact} /><em>{LEVEL[item.impact].label}</em></div>
          <div><span>落地成本</span><Meter kind="level" value={item.effort} /><em>{LEVEL[item.effort].label}</em></div>
        </div>

        <Section title="为什么有效"><p>{item.why}</p></Section>
        <Section title="怎么落地">
          <ol className="acl-steps">{item.how.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </Section>
        {item.whenToUse && <Section title="何时使用"><p>{item.whenToUse}</p></Section>}
        {item.pitfalls && item.pitfalls.length > 0 && (
          <Section title="常见坑">
            <ul className="acl-pit">{item.pitfalls.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </Section>
        )}
        <Section title="标签">
          <div className="acl-tags">{(item.tags || []).map((t) => <span key={t} className="acl-tag">#{t}</span>)}</div>
        </Section>
        {item.refs && item.refs.length > 0 && (
          <Section title="延伸阅读 / 出处">
            <ul className="acl-refs">
              {item.refs.map((r, i) => (
                <li key={i}><a href={r.url} target="_blank" rel="noreferrer noopener">{r.label} ↗</a></li>
              ))}
            </ul>
          </Section>
        )}
      </aside>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="acl-sec">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export default function App() {
  const [query, setQuery] = useState('');
  const [cats, setCats] = useState([]);
  const [mats, setMats] = useState([]);
  const [tags, setTags] = useState([]);
  const [sort, setSort] = useState('roi');
  const [view, setView] = useState('cards'); // cards | matrix
  const [active, setActive] = useState(null);

  const stats = useMemo(() => summarize(ITEMS), []);
  const allTags = useMemo(() => collectTags(ITEMS).slice(0, 16), []);

  const result = useMemo(() => {
    const f = filterItems(ITEMS, { query, categories: cats, maturities: mats, tags });
    return sortItems(f, sort);
  }, [query, cats, mats, tags, sort]);

  const toggle = (list, set, v) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const clearAll = () => { setQuery(''); setCats([]); setMats([]); setTags([]); };
  const anyFilter = query || cats.length || mats.length || tags.length;

  return (
    <div className="acl-root">
      <style>{STYLE}</style>

      <header className="acl-hero">
        <div className="acl-kicker">AI CODING LAB · 研究室</div>
        <h1>AI Coding 研究室</h1>
        <p className="acl-lede">
          收集、提炼并展示业界正在用的 <b>AI 编程范式</b>与<b>提效方式</b>。
          每条都给出「为什么有效 / 怎么落地 / 何时用 / 常见坑」，并标注成熟度、影响力与落地成本——
          帮你按性价比挑选，少踩坑、快上手。
        </p>
        <div className="acl-statline">
          <span><b>{stats.total}</b> 条实践</span>
          <span><b>{CATEGORIES.length}</b> 大类</span>
          <span><b>{stats.byMaturity.established || 0}</b> 项已成熟</span>
          <span><b>{stats.tagCount}</b> 个标签</span>
        </div>
      </header>

      <div className="acl-cats">
        {CATEGORIES.map((c) => (
          <button key={c.id} type="button"
            className={`acl-catcard${cats.includes(c.id) ? ' on' : ''}`}
            onClick={() => toggle(cats, setCats, c.id)}>
            <div className="acl-catcard-h"><span className="acl-catcard-ic">{c.icon}</span>{c.label}
              <em>{stats.byCategory[c.id] || 0}</em></div>
            <div className="acl-catcard-d">{c.desc}</div>
          </button>
        ))}
      </div>

      <div className="acl-toolbar">
        <div className="acl-search">
          <span className="acl-search-ic">🔍</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索范式、技巧、标签…（空格分词）" aria-label="搜索" />
          {query && <button type="button" className="acl-clearq" onClick={() => setQuery('')} aria-label="清空">✕</button>}
        </div>
        <div className="acl-sortrow">
          <span className="acl-lbl">成熟度</span>
          {Object.entries(MATURITY).map(([k, v]) => (
            <Pill key={k} active={mats.includes(k)} onClick={() => toggle(mats, setMats, k)}>{v.label}</Pill>
          ))}
          <span className="acl-sep" />
          <span className="acl-lbl">排序</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="acl-select">
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <span className="acl-sep" />
          <div className="acl-viewtog">
            <button type="button" className={view === 'cards' ? 'on' : ''} onClick={() => setView('cards')}>卡片</button>
            <button type="button" className={view === 'matrix' ? 'on' : ''} onClick={() => setView('matrix')}>矩阵图</button>
          </div>
        </div>
      </div>

      <div className="acl-tagbar">
        {allTags.map(({ tag, count }) => (
          <Pill key={tag} active={tags.includes(tag)} onClick={() => toggle(tags, setTags, tag)}
            title={`${count} 条`}>#{tag}</Pill>
        ))}
        {anyFilter ? <button type="button" className="acl-reset" onClick={clearAll}>清除筛选 ✕</button> : null}
      </div>

      <div className="acl-count">
        共 <b>{result.length}</b> 条{anyFilter ? '（已筛选）' : ''}
      </div>

      {view === 'matrix' ? (
        result.length
          ? <MatrixChart items={result} onPick={setActive} activeId={active && active.id} />
          : <Empty onReset={clearAll} />
      ) : result.length ? (
        <div className="acl-grid">
          {result.map((it) => <Card key={it.id} item={it} onOpen={setActive} />)}
        </div>
      ) : <Empty onReset={clearAll} />}

      <footer className="acl-foot">
        <p>
          内容为社区与厂商工程实践的中文提炼，附权威出处链接，仅供参考——AI Coding 领域演进极快，请以最新实践为准。
          本页纯静态、无后端、不收集数据。
        </p>
        <p className="acl-foot-dim">g-lab · AI Coding 研究室 · 设计遵循仓库共享 DESIGN.md</p>
      </footer>

      <Drawer item={active} onClose={() => setActive(null)} />
    </div>
  );
}

function Empty({ onReset }) {
  return (
    <div className="acl-empty">
      <div className="acl-empty-ic">🗒️</div>
      <p>没有匹配的实践。试试放宽筛选条件。</p>
      <button type="button" className="acl-reset" onClick={onReset}>清除筛选</button>
    </div>
  );
}

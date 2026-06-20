/**
 * Mock 研究室 · 主界面。
 * 两块：①「研究室」收集并展示业界优秀 mock 系统与提效方式；②「配置工坊」把定义一键生成可植入产物。
 * 视觉遵循仓库共享设计规范（暖纸色 + 陶土橙、衬线标题、手写 SVG、克制留白）。
 */
import React, { useMemo, useState, useEffect } from 'react';
import { ITEMS, CATEGORIES, MATURITY, LEVEL } from '../data/systems.js';
import { filterItems, sortItems, collectTags, summarize } from './filter.js';
import MatrixChart from './MatrixChart.jsx';
import Workshop from './Workshop.jsx';
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
    <button type="button" className={`mkl-pill${active ? ' on' : ''}`} onClick={onClick} title={title}>
      {children}
    </button>
  );
}

function Meter({ kind, value }) {
  const map = kind === 'maturity' ? MATURITY : LEVEL;
  const order = (map[value] && map[value].order) || 0;
  return (
    <span className="mkl-meter" aria-label={`${value} ${order}/3`}>
      {[1, 2, 3].map((i) => (
        <i key={i} className={i <= order ? 'f' : ''} />
      ))}
    </span>
  );
}

function Card({ item, onOpen }) {
  const cat = CAT_BY_ID[item.category];
  return (
    <button type="button" className="mkl-card" onClick={() => onOpen(item)}>
      <div className="mkl-card-top">
        <span className="mkl-cat" data-cat={item.category}>{cat.icon} {cat.label}</span>
        <span className="mkl-mat">{MATURITY[item.maturity].label}</span>
      </div>
      <div className="mkl-card-title">{item.title}</div>
      <div className="mkl-card-sum">{item.summary}</div>
      <div className="mkl-card-foot">
        <span className="mkl-kv">影响力 <Meter kind="level" value={item.impact} /></span>
        <span className="mkl-kv">成本 <Meter kind="level" value={item.effort} /></span>
      </div>
      <div className="mkl-tags">
        {(item.tags || []).slice(0, 4).map((t) => <span key={t} className="mkl-tag">#{t}</span>)}
      </div>
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div className="mkl-sec">
      <h3>{title}</h3>
      {children}
    </div>
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
    <div className="mkl-scrim" onClick={onClose}>
      <aside className="mkl-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={item.title}>
        <button type="button" className="mkl-x" onClick={onClose} aria-label="关闭">✕</button>
        <div className="mkl-d-cat" data-cat={item.category}>{cat.icon} {cat.label}</div>
        <h2 className="mkl-d-title">{item.title}</h2>
        <p className="mkl-d-sum">{item.summary}</p>

        <div className="mkl-d-meters">
          <div><span>成熟度</span><Meter kind="maturity" value={item.maturity} /><em>{MATURITY[item.maturity].label}</em></div>
          <div><span>影响力</span><Meter kind="level" value={item.impact} /><em>{LEVEL[item.impact].label}</em></div>
          <div><span>落地成本</span><Meter kind="level" value={item.effort} /><em>{LEVEL[item.effort].label}</em></div>
        </div>

        <Section title="为什么有效"><p>{item.why}</p></Section>
        <Section title="怎么落地">
          <ol className="mkl-steps">{item.how.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </Section>
        {item.whenToUse && <Section title="何时使用"><p>{item.whenToUse}</p></Section>}
        {item.pitfalls && item.pitfalls.length > 0 && (
          <Section title="常见坑">
            <ul className="mkl-pit">{item.pitfalls.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </Section>
        )}
        <Section title="标签">
          <div className="mkl-tags">{(item.tags || []).map((t) => <span key={t} className="mkl-tag">#{t}</span>)}</div>
        </Section>
        {item.refs && item.refs.length > 0 && (
          <Section title="延伸阅读 / 出处">
            <ul className="mkl-refs">
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

function Empty({ onReset }) {
  return (
    <div className="mkl-empty">
      <div className="mkl-empty-ic">🗒️</div>
      <p>没有匹配的条目。试试放宽筛选条件。</p>
      <button type="button" className="mkl-reset" onClick={onReset}>清除筛选</button>
    </div>
  );
}

function Gallery() {
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
    <div>
      <div className="mkl-cats">
        {CATEGORIES.map((c) => (
          <button key={c.id} type="button"
            className={`mkl-catcard${cats.includes(c.id) ? ' on' : ''}`}
            onClick={() => toggle(cats, setCats, c.id)}>
            <div className="mkl-catcard-h"><span className="mkl-catcard-ic">{c.icon}</span>{c.label}
              <em>{stats.byCategory[c.id] || 0}</em></div>
            <div className="mkl-catcard-d">{c.desc}</div>
          </button>
        ))}
      </div>

      <div className="mkl-toolbar">
        <div className="mkl-search">
          <span className="mkl-search-ic">🔍</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索 mock 系统、库、技巧、标签…（空格分词）" aria-label="搜索" />
          {query && <button type="button" className="mkl-clearq" onClick={() => setQuery('')} aria-label="清空">✕</button>}
        </div>
        <div className="mkl-sortrow">
          <span className="mkl-lbl">成熟度</span>
          {Object.entries(MATURITY).map(([k, v]) => (
            <Pill key={k} active={mats.includes(k)} onClick={() => toggle(mats, setMats, k)}>{v.label}</Pill>
          ))}
          <span className="mkl-sep" />
          <span className="mkl-lbl">排序</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="mkl-select">
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <span className="mkl-sep" />
          <div className="mkl-viewtog">
            <button type="button" className={view === 'cards' ? 'on' : ''} onClick={() => setView('cards')}>卡片</button>
            <button type="button" className={view === 'matrix' ? 'on' : ''} onClick={() => setView('matrix')}>矩阵图</button>
          </div>
        </div>
      </div>

      <div className="mkl-tagbar">
        {allTags.map(({ tag, count }) => (
          <Pill key={tag} active={tags.includes(tag)} onClick={() => toggle(tags, setTags, tag)}
            title={`${count} 条`}>#{tag}</Pill>
        ))}
        {anyFilter ? <button type="button" className="mkl-reset" onClick={clearAll}>清除筛选 ✕</button> : null}
      </div>

      <div className="mkl-count">
        共 <b>{result.length}</b> 条{anyFilter ? '（已筛选）' : ''}
      </div>

      {view === 'matrix' ? (
        result.length
          ? <MatrixChart items={result} onPick={setActive} activeId={active && active.id} />
          : <Empty onReset={clearAll} />
      ) : result.length ? (
        <div className="mkl-grid">
          {result.map((it) => <Card key={it.id} item={it} onOpen={setActive} />)}
        </div>
      ) : <Empty onReset={clearAll} />}

      <Drawer item={active} onClose={() => setActive(null)} />
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('gallery'); // gallery | workshop
  const stats = useMemo(() => summarize(ITEMS), []);

  return (
    <div className="mkl-root">
      <style>{STYLE}</style>

      <header className="mkl-hero">
        <div className="mkl-kicker">MOCK LAB · 研究室</div>
        <h1>Mock 研究室</h1>
        <p className="mkl-lede">
          收集、提炼并展示业界优秀的 <b>Mock 系统</b>与<b>提效方式</b>，并配一个
          <b>配置工坊</b>：定义一次，即取即用地生成 <b>可快速接入、可植入</b> 的 mock 配置与代码——
          尤其是 <b>Python</b>，支持<b>本地或远端配置</b>灵活切换 mock 与真实。
        </p>
        <div className="mkl-statline">
          <span><b>{stats.total}</b> 条沉淀</span>
          <span><b>{CATEGORIES.length}</b> 大类</span>
          <span><b>9</b> 种产物格式</span>
          <span><b>{stats.byMaturity.established || 0}</b> 项已成熟</span>
        </div>
      </header>

      <div className="mkl-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'gallery'}
          className={`mkl-tab${tab === 'gallery' ? ' on' : ''}`} onClick={() => setTab('gallery')}>📚 研究室</button>
        <button type="button" role="tab" aria-selected={tab === 'workshop'}
          className={`mkl-tab${tab === 'workshop' ? ' on' : ''}`} onClick={() => setTab('workshop')}>🛠️ 配置工坊</button>
      </div>

      {tab === 'gallery' ? <Gallery /> : <Workshop />}

      <footer className="mkl-foot">
        <p>
          研究室内容为社区与厂商工程实践的中文提炼，附权威出处链接，仅供参考——mock 工具演进快，请以最新实践为准。
          配置工坊在浏览器本地生成代码，纯静态、无后端、不收集数据；可植入适配器见仓库 <code>adapters/g_mock.py</code>。
        </p>
        <p className="mkl-foot-dim">g-lab · Mock 研究室 · 设计遵循仓库共享 DESIGN.md</p>
      </footer>
    </div>
  );
}

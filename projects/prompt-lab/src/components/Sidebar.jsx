import React from 'react';
import { CATEGORIES, TECHNIQUES, categoryLabel } from '../schema.js';

/** 左侧导航：收藏、分类、技巧过滤。计数随当前数据实时变化。 */
export default function Sidebar({ prompts, filter, setFilter }) {
  const catCount = (id) => prompts.filter((p) => p.category === id).length;
  const techCount = (id) => prompts.filter((p) => (p.techniques || []).includes(id)).length;
  const favCount = prompts.filter((p) => p.favorite).length;

  const usedCats = CATEGORIES.filter((c) => catCount(c.id) > 0);
  const usedTechs = TECHNIQUES.filter((t) => techCount(t.id) > 0);

  const set = (patch) => setFilter((f) => ({ ...f, ...patch }));

  return (
    <aside className="pl-side">
      <div>
        <h4>浏览</h4>
        <div className="pl-navlist">
          <button
            className={'pl-nav' + (filter.category === 'all' && !filter.favorite ? ' pl-on' : '')}
            onClick={() => set({ category: 'all', favorite: false })}
          >
            <span>全部</span>
            <span className="pl-count">{prompts.length}</span>
          </button>
          <button
            className={'pl-nav' + (filter.favorite ? ' pl-on' : '')}
            onClick={() => set({ favorite: !filter.favorite })}
          >
            <span>★ 收藏</span>
            <span className="pl-count">{favCount}</span>
          </button>
        </div>
      </div>

      {usedCats.length ? (
        <div>
          <h4>分类</h4>
          <div className="pl-navlist">
            {usedCats.map((c) => (
              <button
                key={c.id}
                className={'pl-nav' + (filter.category === c.id ? ' pl-on' : '')}
                onClick={() => set({ category: filter.category === c.id ? 'all' : c.id })}
              >
                <span>{c.label}</span>
                <span className="pl-count">{catCount(c.id)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {usedTechs.length ? (
        <div>
          <h4>技巧</h4>
          <div className="pl-navlist pl-wrap">
            {usedTechs.map((t) => (
              <button
                key={t.id}
                className={'pl-chip' + (filter.technique === t.id ? ' pl-on' : '')}
                onClick={() => set({ technique: filter.technique === t.id ? 'all' : t.id })}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

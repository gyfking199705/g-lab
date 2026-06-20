/**
 * devx-lab 主壳：hero + 三个标签页（范式库 / 业界框架 / DORA 自评）。
 * 收藏与自评档位持久化在 localStorage（仅本地）。
 */
import React, { useState } from 'react';
import { CSS } from './styles.js';
import { PRACTICES, FRAMEWORKS } from './data.js';
import { summaryStats, adoptionStats } from './calc.js';
import { load, save } from './store.js';
import Practices from './Practices.jsx';
import Frameworks from './Frameworks.jsx';
import Assessment from './Assessment.jsx';

const TABS = [
  { id: 'practices', name: '提效范式库' },
  { id: 'frameworks', name: '业界框架' },
  { id: 'assess', name: 'DORA 自评' },
];

export default function DevxLab() {
  const [tab, setTab] = useState('practices');
  const [favs, setFavs] = useState(() => load('favs', []));
  const [bands, setBands] = useState(() => load('dora', {}));
  const [statuses, setStatuses] = useState(() => load('status', {}));

  const stats = summaryStats(PRACTICES);
  const adoption = adoptionStats(PRACTICES, statuses);

  function toggleFav(id) {
    setFavs((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      save('favs', next);
      return next;
    });
  }

  function setBand(key, idx) {
    setBands((prev) => {
      const next = { ...prev };
      if (idx == null) delete next[key];
      else next[key] = idx;
      save('dora', next);
      return next;
    });
  }

  function setStatus(id, status) {
    setStatuses((prev) => {
      const next = { ...prev };
      if (!status || status === 'todo') delete next[id];
      else next[id] = status;
      save('status', next);
      return next;
    });
  }

  return (
    <div className="dx">
      <style>{CSS}</style>

      <header className="dx-hero">
        <div className="dx-kicker">研发提效研究室 · Engineering Efficiency Lab</div>
        <h1>提效范式库 🔬</h1>
        <p>
          收集业界都在用、且被研究验证有效的研发提效范式，并对齐 DORA / SPACE / DevEx 等公认框架——
          可检索、可对标、可自评。只看「怎么更快更稳，还让开发者更顺手」。
        </p>
        <div className="dx-stats">
          <div className="dx-stat"><b>{stats.total}</b><span>条提效范式</span></div>
          <div className="dx-stat"><b>{FRAMEWORKS.length}</b><span>个业界框架</span></div>
          <div className="dx-stat"><b>{stats.quickWins}</b><span>个高性价比</span></div>
          <div className="dx-stat"><b>{stats.avgImpact}</b><span>平均影响 / 5</span></div>
        </div>
        <div className="dx-prog">
          <div className="dx-prog-bar"><i style={{ width: adoption.percent + '%' }} /></div>
          <div className="dx-prog-cap">
            <span>团队落地进度</span>
            <span>
              已落地 <b>{adoption.done}</b> · 进行中 <b>{adoption.doing}</b> · 共 {adoption.total}
              （<b>{adoption.percent}%</b>）
            </span>
          </div>
        </div>
      </header>

      <nav className="dx-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            className="dx-tab"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.name}
          </button>
        ))}
      </nav>

      {tab === 'practices' && (
        <Practices favs={favs} onToggleFav={toggleFav} statuses={statuses} onSetStatus={setStatus} />
      )}
      {tab === 'frameworks' && <Frameworks />}
      {tab === 'assess' && <Assessment bands={bands} onSet={setBand} />}

      <footer style={{ color: 'var(--t3)', fontSize: 12.5, margin: '40px 0 8px', lineHeight: 1.8 }}>
        数据为公开权威资料的整理（DORA · ACM Queue · CNCF · 经典著作），范式卡片内附原始来源链接。
        收藏与自评仅存于本地浏览器，不上传。 · g-lab 子项目
      </footer>
    </div>
  );
}

/**
 * devx-lab 主壳：hero + 三个标签页（范式库 / 业界框架 / DORA 自评）。
 * 收藏与自评档位持久化在 localStorage（仅本地）。
 */
import React, { useRef, useState } from 'react';
import { CSS } from './styles.js';
import { PRACTICES, FRAMEWORKS } from './data.js';
import { summaryStats, adoptionStats, buildExport, parseImport, buildSnapshot, upsertSnapshot, adoptionChecklistMarkdown } from './calc.js';
import { load, save } from './store.js';
import Practices from './Practices.jsx';
import Frameworks from './Frameworks.jsx';
import Assessment from './Assessment.jsx';
import Roadmap from './Roadmap.jsx';
import Profile from './Profile.jsx';
import AntiPatterns from './AntiPatterns.jsx';

const TABS = [
  { id: 'practices', name: '提效范式库' },
  { id: 'antipatterns', name: '反模式' },
  { id: 'frameworks', name: '业界框架' },
  { id: 'assess', name: 'DORA 自评' },
  { id: 'roadmap', name: '落地路线' },
  { id: 'profile', name: '团队画像' },
];

export default function DevxLab() {
  const [tab, setTab] = useState('practices');
  const [favs, setFavs] = useState(() => load('favs', []));
  const [bands, setBands] = useState(() => load('dora', {}));
  const [statuses, setStatuses] = useState(() => load('status', {}));
  const [snaps, setSnaps] = useState(() => load('snaps', []));

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

  function saveSnapshot() {
    setSnaps((prev) => {
      const next = upsertSnapshot(prev, buildSnapshot(PRACTICES, statuses, bands));
      save('snaps', next);
      return next;
    });
  }

  const [focus, setFocus] = useState(null);

  function gotoPractice(id) {
    const p = PRACTICES.find((x) => x.id === id);
    setFocus({ q: p ? p.title : '', nonce: Date.now() });
    setTab('practices');
  }

  const fileRef = useRef(null);

  function exportChecklist() {
    const md = adoptionChecklistMarkdown(PRACTICES, statuses);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devx-checklist-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportData() {
    const snap = buildExport({ favs, statuses, bands, snaps });
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devx-lab-${snap.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // 允许重复选同一文件
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { favs: f, statuses: s, bands: b, snaps: sn } = parseImport(String(reader.result));
        setFavs(f); save('favs', f);
        setStatuses(s); save('status', s);
        setBands(b); save('dora', b);
        setSnaps(sn); save('snaps', sn);
      } catch (err) {
        window.alert('导入失败：' + (err && err.message ? err.message : '未知错误'));
      }
    };
    reader.readAsText(file);
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
        <Practices
          favs={favs}
          onToggleFav={toggleFav}
          statuses={statuses}
          onSetStatus={setStatus}
          focus={focus}
          onGotoAntipatterns={() => setTab('antipatterns')}
        />
      )}
      {tab === 'antipatterns' && <AntiPatterns onGoto={gotoPractice} />}
      {tab === 'frameworks' && <Frameworks statuses={statuses} />}
      {tab === 'assess' && <Assessment bands={bands} onSet={setBand} />}
      {tab === 'roadmap' && (
        <Roadmap
          bands={bands}
          statuses={statuses}
          onGoto={gotoPractice}
          onGotoAssess={() => setTab('assess')}
        />
      )}
      {tab === 'profile' && (
        <Profile bands={bands} statuses={statuses} snaps={snaps} onSnapshot={saveSnapshot} />
      )}

      <div className="dx-data">
        <span className="dx-data-h">我的数据（收藏 / 采纳状态 / 自评 / 趋势）</span>
        <button className="dx-copy" onClick={exportChecklist}>采纳清单 .md</button>
        <button className="dx-copy" onClick={exportData}>导出备份</button>
        <button className="dx-copy" onClick={() => fileRef.current && fileRef.current.click()}>导入</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={importData}
        />
      </div>

      <footer style={{ color: 'var(--t3)', fontSize: 12.5, margin: '20px 0 8px', lineHeight: 1.8 }}>
        数据为公开权威资料的整理（DORA · ACM Queue · CNCF · 经典著作），范式卡片内附原始来源链接。
        收藏 / 采纳状态 / 自评仅存于本地浏览器，可随时导出备份或在团队间共享，不上传。 · g-lab 子项目
      </footer>
    </div>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CSS } from './styles.js';
import { Icon } from './icons.jsx';
import { loadState, saveState } from './store.js';
import { SEEDS } from './seeds.js';
import {
  normalizePrompt,
  commitEdit,
  filterPrompts,
  sortPrompts,
  buildExport,
  parseImport,
  libraryToMarkdown,
} from './schema.js';
import { averageScore } from './lint.js';
import Sidebar from './components/Sidebar.jsx';
import PromptCard from './components/PromptCard.jsx';
import PromptDetail from './components/PromptDetail.jsx';
import PromptEditor from './components/PromptEditor.jsx';

let styleInjected = false;
function useStyles() {
  useEffect(() => {
    if (styleInjected) return;
    const el = document.createElement('style');
    el.textContent = CSS;
    document.head.appendChild(el);
    styleInjected = true;
  }, []);
}

const DEFAULT_FILTER = { query: '', category: 'all', technique: 'all', model: 'all', tag: 'all', favorite: false };

export default function App() {
  useStyles();
  const [prompts, setPrompts] = useState(() => loadState(SEEDS).prompts);
  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const [sort, setSort] = useState('updated');
  const [view, setView] = useState('grid');
  const [openId, setOpenId] = useState(null);
  const [editing, setEditing] = useState(null); // null=closed, {}=new, {id}=edit
  const [toast, setToast] = useState('');
  const [exportMenu, setExportMenu] = useState(false);
  const fileRef = useRef(null);
  const searchRef = useRef(null);

  // 任何变更即持久化
  useEffect(() => {
    saveState({ prompts });
  }, [prompts]);

  // 键盘快捷键： / 聚焦搜索、n 新增、Esc 关闭当前层
  useEffect(() => {
    const onKey = (e) => {
      const el = e.target;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if (e.key === 'Escape') {
        if (editing !== null) setEditing(null);
        else if (openId) setOpenId(null);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current && searchRef.current.focus();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setEditing({});
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, openId]);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToast(''), 1900);
  };

  const visible = useMemo(
    () => sortPrompts(filterPrompts(prompts, filter), sort),
    [prompts, filter, sort]
  );
  const avgScore = useMemo(() => averageScore(prompts), [prompts]);
  const open = openId ? prompts.find((p) => p.id === openId) : null;

  // CRUD ----------------------------------------------------------------
  const toggleFav = (id) =>
    setPrompts((ps) => ps.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p)));

  const save = (data) => {
    let savedId = null;
    setPrompts((ps) => {
      const prev = data.id ? ps.find((p) => p.id === data.id) : null;
      const norm = prev ? commitEdit(prev, data) : normalizePrompt(data);
      savedId = norm.id;
      return prev ? ps.map((p) => (p.id === norm.id ? norm : p)) : [norm, ...ps];
    });
    setEditing(null);
    setOpenId(savedId);
    showToast(data.id ? '已保存修改' : '已添加 Prompt');
  };

  // 从历史版本恢复：把选中快照的正文/角色写回（恢复动作本身也记一版历史）。
  const restore = (id, snapshot) => {
    setPrompts((ps) =>
      ps.map((p) => (p.id === id ? commitEdit(p, { content: snapshot.content, system: snapshot.system }) : p))
    );
    showToast(`已恢复到 ${snapshot.version || '历史版本'}`);
  };

  const remove = (p) => {
    if (!window.confirm(`删除「${p.title}」？此操作不可撤销。`)) return;
    setPrompts((ps) => ps.filter((x) => x.id !== p.id));
    setOpenId(null);
    showToast('已删除');
  };

  const clone = (p) => {
    const copy = normalizePrompt({ ...p, id: undefined, title: `${p.title} (副本)`, favorite: false, history: [] });
    setPrompts((ps) => [copy, ...ps]);
    setOpenId(copy.id);
    showToast('已克隆为副本');
  };

  // 导入 / 导出 ----------------------------------------------------------
  const download = (text, ext, mime) => {
    const blob = new Blob([text], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `prompt-lab-${new Date().toISOString().slice(0, 10)}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportJSON = () => {
    download(JSON.stringify(buildExport(prompts), null, 2), 'json', 'application/json');
    setExportMenu(false);
    showToast(`已导出 ${prompts.length} 条（JSON 备份）`);
  };

  const exportMarkdown = () => {
    download(libraryToMarkdown(prompts), 'md', 'text/markdown');
    setExportMenu(false);
    showToast(`已导出 ${prompts.length} 条（Markdown 文档）`);
  };

  const importJSON = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let parsed = [];
      try {
        parsed = parseImport(JSON.parse(reader.result));
      } catch (err) {
        parsed = [];
      }
      if (!parsed.length) {
        showToast('未识别到有效 Prompt');
        return;
      }
      setPrompts((ps) => {
        const ids = new Set(ps.map((p) => p.id));
        const fresh = parsed.filter((p) => !ids.has(p.id));
        return [...fresh, ...ps];
      });
      showToast(`已导入 ${parsed.length} 条（跳过重复 id）`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="pl-root">
      <div className="pl-app">
        <header className="pl-head">
          <div>
            <div className="pl-brand">
              <img src="./favicon.svg" alt="" /> Prompt 研究室
            </div>
            <div className="pl-tag">收集、整理、复用优秀 Prompt——本地存储，可导入导出。</div>
          </div>
          <div className="pl-head-actions">
            <button className="pl-btn" onClick={() => fileRef.current && fileRef.current.click()}>
              <Icon.upload width={15} height={15} /> 导入
            </button>
            <div className="pl-menu-wrap">
              <button className="pl-btn" onClick={() => setExportMenu((v) => !v)} disabled={!prompts.length}>
                <Icon.download width={15} height={15} /> 导出 ▾
              </button>
              {exportMenu ? (
                <>
                  <div className="pl-menu-veil" onClick={() => setExportMenu(false)} />
                  <div className="pl-menu">
                    <button onClick={exportJSON}>JSON 备份<span>可再导入</span></button>
                    <button onClick={exportMarkdown}>Markdown 文档<span>便于分享 / 归档</span></button>
                  </div>
                </>
              ) : null}
            </div>
            <button className="pl-btn pl-primary" onClick={() => setEditing({})}>
              <Icon.plus width={15} height={15} /> 新增 Prompt
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importJSON} />
          </div>
        </header>

        <div className="pl-layout">
          <Sidebar prompts={prompts} filter={filter} setFilter={setFilter} />

          <main>
            <div className="pl-toolbar">
              <div className="pl-search">
                <Icon.search />
                <input
                  ref={searchRef}
                  placeholder="搜索标题、正文、标签…  （按 / 聚焦）"
                  value={filter.query}
                  onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
                />
                {filter.query ? (
                  <button className="pl-btn pl-ghost pl-btn-sm" onClick={() => setFilter((f) => ({ ...f, query: '' }))}>
                    <Icon.close width={13} height={13} />
                  </button>
                ) : null}
              </div>
              <select className="pl-select" value={sort} onChange={(e) => setSort(e.target.value)} title="排序">
                <option value="updated">最近更新</option>
                <option value="created">最近添加</option>
                <option value="title">标题</option>
              </select>
              <button
                className="pl-btn pl-btn-sm"
                title={view === 'grid' ? '切换为列表' : '切换为网格'}
                onClick={() => setView((v) => (v === 'grid' ? 'list' : 'grid'))}
              >
                <Icon.grid width={15} height={15} />
              </button>
            </div>

            <div className="pl-meta" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span>
                共 {visible.length} 条{visible.length !== prompts.length ? `（全部 ${prompts.length}）` : ''}
              </span>
              {prompts.length ? <span>· 平均质量 {avgScore}</span> : null}
              {filter.tag && filter.tag !== 'all' ? (
                <button className="pl-chip pl-on" onClick={() => setFilter((f) => ({ ...f, tag: 'all' }))}>
                  #{filter.tag} ✕
                </button>
              ) : null}
            </div>

            {visible.length ? (
              <div className={'pl-grid' + (view === 'list' ? ' pl-list' : '')}>
                {visible.map((p) => (
                  <PromptCard key={p.id} prompt={p} onOpen={(x) => setOpenId(x.id)} onToggleFav={toggleFav} />
                ))}
              </div>
            ) : (
              <div className="pl-empty">
                没有匹配的 Prompt。
                <br />
                试试调整筛选，或
                <button className="pl-btn pl-ghost" onClick={() => setEditing({})}>新增一条</button>
              </div>
            )}
          </main>
        </div>
      </div>

      {open ? (
        <PromptDetail
          prompt={open}
          onClose={() => setOpenId(null)}
          onEdit={(p) => {
            setOpenId(null);
            setEditing(p);
          }}
          onDelete={remove}
          onClone={clone}
          onToggleFav={toggleFav}
          onRestore={restore}
          onToast={showToast}
        />
      ) : null}

      {editing !== null ? (
        <PromptEditor initial={editing.id ? editing : null} onSave={save} onClose={() => setEditing(null)} />
      ) : null}

      {toast ? (
        <div className="pl-toast">
          <Icon.check width={15} height={15} /> {toast}
        </div>
      ) : null}
    </div>
  );
}

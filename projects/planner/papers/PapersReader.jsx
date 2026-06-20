/**
 * 论文推荐阅读器 —— React 组件（函数式 + hooks）
 * ------------------------------------------------------------------
 * · 推荐：按 arXiv 分类 + 关键词订阅，拉取最新论文；也可关键词 / arXiv ID 搜索
 * · AI 总结：复用学习站的 BYOK AI 客户端（learning-ai），基于摘要解读「讲了什么」
 * · 进度：阅读清单(想读/在读/已读) + 评分 + 笔记 + 已读连续天数 + 分类分布
 *
 * 计算逻辑来自 ./calc.js（纯函数，已单测），数据获取来自 ./arxiv.js。
 * 样式复用 core/ui.jsx 的 gx- 基元。数据：localStorage 键 `papers-planner`。
 * props：{ storageKey?, onChange? }
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { loadState, saveState } from '../core/store.js';
import { SHARED_CSS, Empty, Segmented, Progress } from '../core/ui.jsx';
import { todayStr, relDay, fmtMD } from '../core/date.js';
import { ARXIV_CATEGORIES, fetchArxiv } from './arxiv.js';
import {
  STATUSES, STATUS_LABEL, statusCounts, filterItems, annotateSaved,
  summary as readingSummary, byCategory, buildSummaryMessages, estimateReadMinutes, dailyPick,
} from './calc.js';
import { callChat, isConfigured } from '../learning/ai.js';
import { loadAIConfig, AISettingsButton } from '../core/AISettings.jsx';

const STORE_KEY = 'papers-planner';
const DEFAULTS = {
  v: 1,
  settings: { categories: ['cs.LG', 'cs.AI'], keywords: [], maxResults: 30, proxyUrl: '' },
  items: [],
};

export default function PapersReader({ storageKey = STORE_KEY, onChange }) {
  const [data, setData] = useState(() => loadState(storageKey, DEFAULTS));
  const [tab, setTab] = useState('recommend'); // recommend | want | reading | done
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setLoadStatus] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modal, setModal] = useState(null); // { paper, text, loading, error }
  const aiConfig = loadAIConfig();
  const abortRef = useRef(null);

  useEffect(() => { saveState(storageKey, data); if (onChange) onChange(); }, [data, storageKey, onChange]);

  const today = todayStr();
  const items = data.items || [];
  const settings = data.settings || DEFAULTS.settings;
  const counts = statusCounts(items);
  const sum = useMemo(() => readingSummary(items, today), [items, today]);

  const mutate = (fn) => setData((d) => fn(d));
  const setItems = (fn) => mutate((d) => ({ ...d, items: fn(d.items || []) }));
  const setSettings = (patch) => mutate((d) => ({ ...d, settings: { ...d.settings, ...patch } }));

  const loadFeed = async (opts) => {
    setLoading(true); setError(''); setLoadStatus('正在连接 arXiv…');
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController(); abortRef.current = ctrl;
    try {
      const papers = await fetchArxiv(opts, { proxyUrl: settings.proxyUrl, signal: ctrl.signal, onStatus: setLoadStatus });
      setFeed(papers);
      if (!papers.length) setError('没有结果，换个分类 / 关键词试试');
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message || '获取失败');
    } finally { setLoading(false); setLoadStatus(''); }
  };

  // 进入推荐页且无数据时自动拉取
  useEffect(() => {
    if (tab === 'recommend' && !feed.length && !loading && !error) {
      loadFeed({ categories: settings.categories, keywords: settings.keywords, maxResults: settings.maxResults });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const refreshRecommend = () => loadFeed({ categories: settings.categories, keywords: settings.keywords, maxResults: settings.maxResults });
  const doSearch = () => {
    const q = query.trim();
    if (!q) return refreshRecommend();
    const isId = /^\d{4}\.\d{4,5}(v\d+)?$/.test(q) || /arxiv\.org\//i.test(q);
    loadFeed(isId ? { ids: [q] } : { keywords: [q], maxResults: settings.maxResults });
  };

  const addToList = (paper, status = 'want') => setItems((list) => {
    if (list.some((it) => it.id === paper.id)) return list;
    const { saved, ...clean } = paper;
    return [{ ...clean, status, addedAt: new Date().toISOString(), doneAt: status === 'done' ? new Date().toISOString() : null }, ...list];
  });
  const setStatus = (id, status) => setItems((list) => list.map((it) => it.id === id
    ? { ...it, status, doneAt: status === 'done' ? (it.doneAt || new Date().toISOString()) : (status === 'reading' ? it.doneAt : null) } : it));
  const updateItem = (id, patch) => setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const removeItem = (id) => setItems((list) => list.filter((it) => it.id !== id));

  // AI 总结：确保入库（默认想读），调用 AI，保存到 item.aiSummary
  const summarize = async (paper) => {
    const cfg = loadAIConfig(); // 读最新配置（可能刚在别处配好）
    if (!isConfigured(cfg)) {
      setModal({ paper, text: '', error: '尚未配置 AI。点右上「✨ 配置 AI」填入你自己的 Key（Key 仅存本地，全站共用一处配置）。', loading: false });
      return;
    }
    let id = paper.id;
    setItems((list) => list.some((it) => it.id === id) ? list
      : [{ ...(({ saved, ...c }) => c)(paper), status: 'want', addedAt: new Date().toISOString(), doneAt: null }, ...list]);
    setModal({ paper, text: '', loading: true, error: '' });
    try {
      const { system, user } = buildSummaryMessages(paper);
      const text = await callChat({ config: cfg, system, user, maxTokens: 1200 });
      updateItem(id, { aiSummary: text });
      setModal({ paper, text, loading: false, error: '' });
    } catch (e) {
      setModal({ paper, text: '', loading: false, error: e.message || 'AI 调用失败' });
    }
  };
  const viewSummary = (item) => setModal({ paper: item, text: item.aiSummary || '', loading: false, error: '' });

  const listForTab = tab === 'recommend' ? [] : filterItems(items, tab);
  const annotatedFeed = useMemo(() => annotateSaved(feed, items), [feed, items]);

  return (
    <div className="gx-root">
      <style>{SHARED_CSS}{PAPERS_CSS}</style>

      <div className="gx-headrow">
        <div className="gx-head">
          <h2>📄 论文阅读器</h2>
          <p>arXiv 优先 · 订阅推荐 + AI 解读 + 阅读进度</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <AISettingsButton onSaved={() => setData((d) => ({ ...d }))} />
          <button className="gx-btn gx-btn-sm" onClick={() => setSettingsOpen(true)}>⚙ 订阅设置</button>
        </div>
      </div>

      {/* 进度 KPI */}
      {items.length > 0 && (
        <div className="gx-kpis" style={{ marginBottom: 14 }}>
          <div className="gx-kpi"><div className="gx-kpi-v accent">{sum.done}<span style={{ fontSize: 12, color: 'var(--text-3)' }}>/{sum.total}</span></div><div className="gx-kpi-l">已读 / 清单</div></div>
          <div className="gx-kpi"><div className="gx-kpi-v">{sum.progressPct}<span style={{ fontSize: 12 }}>%</span></div><div className="gx-kpi-l">阅读进度</div></div>
          <div className="gx-kpi"><div className="gx-kpi-v good">{sum.streak}<span style={{ fontSize: 12 }}> 天</span></div><div className="gx-kpi-l">连续阅读 🔥</div></div>
          <div className="gx-kpi"><div className="gx-kpi-v">{sum.thisWeek}</div><div className="gx-kpi-l">近 7 天读完</div></div>
        </div>
      )}

      <div className="gx-card">
        <div className="gx-sechead" style={{ flexWrap: 'wrap', gap: 8 }}>
          <Segmented
            tabs={[
              { id: 'recommend', label: '推荐' },
              { id: 'want', label: `想读 ${counts.want || ''}`.trim() },
              { id: 'reading', label: `在读 ${counts.reading || ''}`.trim() },
              { id: 'done', label: `已读 ${counts.done || ''}`.trim() },
            ]}
            value={tab}
            onChange={setTab}
          />
          {tab === 'recommend' && (
            <div className="gx-inrow" style={{ flex: 1, justifyContent: 'flex-end', minWidth: 200 }}>
              <input className="gx-in" style={{ maxWidth: 240 }} placeholder="关键词 / arXiv ID 搜索…" value={query}
                onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()} />
              <button className="gx-btn gx-btn-sm" onClick={doSearch} disabled={loading}>{loading ? '…' : '搜索'}</button>
            </div>
          )}
        </div>

        {tab === 'recommend' ? (
          <RecommendFeed feed={annotatedFeed} loading={loading} status={status} error={error} settings={settings}
            onRetry={refreshRecommend} onAdd={addToList} onSummarize={summarize} onOpenSettings={() => setSettingsOpen(true)} />
        ) : (
          <ReadingList items={listForTab} status={tab} onSetStatus={setStatus} onUpdate={updateItem}
            onRemove={removeItem} onSummarize={summarize} onView={viewSummary} />
        )}
      </div>

      {/* 已读分类分布 */}
      {sum.done > 0 && (
        <div className="gx-card" style={{ marginTop: 14 }}>
          <div className="gx-sechead"><h3>📊 已读分类分布</h3><span className="gx-sub">{sum.done} 篇</span></div>
          <CategoryBars data={byCategory(items)} total={sum.done} />
        </div>
      )}

      <p className="gx-disclaim">论文数据来自 arXiv 公开 API；AI 解读由你自己配置的模型生成，可能有误，请以原文为准。</p>

      {settingsOpen && <SettingsModal settings={settings} aiOK={isConfigured(aiConfig)} onSave={setSettings}
        onClose={() => { setSettingsOpen(false); refreshRecommend(); }} />}
      {modal && <SummaryModal modal={modal} onClose={() => setModal(null)} />}
    </div>
  );
}

/* ----------------------------- 推荐 / 搜索结果 ----------------------------- */
function RecommendFeed({ feed, loading, status, error, settings, onRetry, onAdd, onSummarize, onOpenSettings }) {
  if (loading && !feed.length) return (
    <div className="gx-empty">
      <div className="ic">📡</div>
      <div className="t">{status || '正在从 arXiv 拉取…'}</div>
      <div style={{ fontSize: 11.5, marginTop: 6 }}>arXiv 需跨域，直连不行会自动转公共代理，请稍候(最多约 30 秒)</div>
    </div>
  );
  if (error && !feed.length) {
    return (
      <div className="gx-empty">
        <div className="ic">📡</div>
        <div className="t">{error}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10 }}>
          <button className="gx-btn gx-btn-sm" onClick={onRetry}>重试</button>
          <button className="gx-btn gx-btn-sm" onClick={onOpenSettings}>调整订阅 / 代理</button>
        </div>
      </div>
    );
  }
  if (!feed.length) {
    return <Empty icon="📄" title="还没有推荐" hint="去「订阅设置」选感兴趣的分类，或上方搜索关键词" />;
  }
  const pick = dailyPick(feed, todayStr());
  const rest = pick ? feed.filter((p) => p.id !== pick.id) : feed;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {pick && (
        <div className="pr-featured">
          <div className="pr-featured-tag">✨ 今日精选 · {fmtMD(todayStr())}</div>
          <PaperCard paper={pick} onAdd={onAdd} onSummarize={onSummarize} featured />
        </div>
      )}
      {rest.map((p) => <PaperCard key={p.id} paper={p} onAdd={onAdd} onSummarize={onSummarize} />)}
    </div>
  );
}

function PaperCard({ paper, onAdd, onSummarize }) {
  const [expand, setExpand] = useState(false);
  return (
    <div className="pr-card">
      <div className="pr-title">{paper.title}</div>
      <div className="pr-meta">
        <span className="gx-tag accent" style={{ fontSize: 10 }}>{paper.primary || (paper.categories || [])[0]}</span>
        <span>{(paper.authors || []).slice(0, 3).join(', ')}{(paper.authors || []).length > 3 ? ' 等' : ''}</span>
        <span>· {paper.published}</span>
        <span>· ~{estimateReadMinutes(paper)} 分钟</span>
      </div>
      <div className={`pr-abs ${expand ? 'open' : ''}`} onClick={() => setExpand((v) => !v)}>{paper.summary}</div>
      <div className="pr-acts">
        {paper.saved
          ? <span className="gx-tag good" style={{ fontSize: 11 }}>✓ 已在清单</span>
          : <button className="gx-btn gx-btn-sm gx-btn-primary" onClick={() => onAdd(paper, 'want')}>🔖 加入想读</button>}
        <button className="gx-btn gx-btn-sm" onClick={() => onSummarize(paper)}>✨ AI 总结</button>
        <a className="gx-btn gx-btn-sm" href={paper.absUrl} target="_blank" rel="noreferrer">摘要页</a>
        <a className="gx-btn gx-btn-sm" href={paper.pdfUrl} target="_blank" rel="noreferrer">PDF</a>
      </div>
    </div>
  );
}

/* ----------------------------- 阅读清单 ----------------------------- */
function ReadingList({ items, status, onSetStatus, onUpdate, onRemove, onSummarize, onView }) {
  if (!items.length) {
    const hint = { want: '从「推荐」里收藏想读的论文', reading: '把想读的论文标为在读', done: '读完的论文会出现在这里' }[status];
    return <Empty icon={STATUSES.find((s) => s.id === status)?.icon || '📄'} title={`${STATUS_LABEL[status]}清单是空的`} hint={hint} />;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((it) => <ListItem key={it.id} item={it} onSetStatus={onSetStatus} onUpdate={onUpdate} onRemove={onRemove} onSummarize={onSummarize} onView={onView} />)}
    </div>
  );
}

function ListItem({ item, onSetStatus, onUpdate, onRemove, onSummarize, onView }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="pr-card">
      <div className="pr-title">{item.title}</div>
      <div className="pr-meta">
        <span className="gx-tag accent" style={{ fontSize: 10 }}>{item.primary || (item.categories || [])[0]}</span>
        <span>{(item.authors || []).slice(0, 3).join(', ')}</span>
        <span>· {item.published}</span>
        {item.status === 'done' && item.doneAt && <span>· 读于 {relDay(item.doneAt.slice(0, 10))}</span>}
        {item.aiSummary && <span className="gx-tag good" style={{ fontSize: 10 }}>✨ 有总结</span>}
      </div>

      <div className="pr-acts">
        {/* 状态流转 */}
        <div className="gx-seg" style={{ padding: 2 }}>
          {STATUSES.map((s) => (
            <button key={s.id} className={item.status === s.id ? 'active' : ''} style={{ padding: '4px 9px', fontSize: 12 }}
              onClick={() => onSetStatus(item.id, s.id)}>{s.icon}{s.label}</button>
          ))}
        </div>
        {item.aiSummary
          ? <button className="gx-btn gx-btn-sm" onClick={() => onView(item)}>看总结</button>
          : <button className="gx-btn gx-btn-sm" onClick={() => onSummarize(item)}>✨ AI 总结</button>}
        <button className="gx-btn gx-btn-sm" onClick={() => setOpen((v) => !v)}>{open ? '收起' : '笔记/评分'}</button>
        <a className="gx-btn gx-btn-sm" href={item.absUrl} target="_blank" rel="noreferrer">摘要</a>
        <a className="gx-btn gx-btn-sm" href={item.pdfUrl} target="_blank" rel="noreferrer">PDF</a>
        <button className="gx-btn gx-btn-ghost gx-btn-sm danger" onClick={() => onRemove(item.id)}>删</button>
      </div>

      {open && (
        <div style={{ marginTop: 10, borderTop: '1px solid var(--bd-soft)', paddingTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>评分</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} onClick={() => onUpdate(item.id, { rating: item.rating === n ? 0 : n })}
                style={{ cursor: 'pointer', fontSize: 16, opacity: (item.rating || 0) >= n ? 1 : 0.25 }}>★</span>
            ))}
          </div>
          <textarea className="gx-in" rows="3" placeholder="写点笔记 / 启发…" value={item.notes || ''}
            onChange={(e) => onUpdate(item.id, { notes: e.target.value })} style={{ resize: 'vertical', fontFamily: 'var(--sans)' }} />
        </div>
      )}
    </div>
  );
}

function CategoryBars({ data, total }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {data.map((d) => (
        <div key={d.category}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
            <span>{d.category}</span><span style={{ color: 'var(--text-3)' }}>{d.count}</span>
          </div>
          <Progress pct={(d.count / total) * 100} />
        </div>
      ))}
    </div>
  );
}

/* ----------------------------- 弹窗 ----------------------------- */
function SummaryModal({ modal, onClose }) {
  const { paper, text, loading, error } = modal;
  return (
    <div onClick={onClose} className="pr-overlay">
      <div className="gx-root pr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gx-sechead"><h3 style={{ paddingRight: 24 }}>✨ {paper.title}</h3><button className="gx-btn gx-btn-ghost gx-btn-sm" onClick={onClose}>✕</button></div>
        {loading && <div className="gx-empty"><div className="t">AI 正在解读摘要…</div></div>}
        {error && <div className="gx-tag bad" style={{ display: 'block', padding: '10px 12px', whiteSpace: 'pre-wrap' }}>{error}</div>}
        {!loading && !error && <div className="pr-summary">{text}</div>}
      </div>
    </div>
  );
}

function SettingsModal({ settings, aiOK, onSave, onClose }) {
  const [cats, setCats] = useState(settings.categories || []);
  const [keywords, setKeywords] = useState((settings.keywords || []).join(', '));
  const [maxResults, setMaxResults] = useState(settings.maxResults || 30);
  const [proxyUrl, setProxyUrl] = useState(settings.proxyUrl || '');
  const toggleCat = (id) => setCats((cs) => cs.includes(id) ? cs.filter((c) => c !== id) : [...cs, id]);
  const save = () => {
    onSave({ categories: cats, keywords: keywords.split(/[,，]/).map((s) => s.trim()).filter(Boolean), maxResults: Math.max(5, Math.min(100, Number(maxResults) || 30)), proxyUrl: proxyUrl.trim() });
    onClose();
  };
  return (
    <div onClick={onClose} className="pr-overlay">
      <div className="gx-root pr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gx-sechead"><h3>订阅设置</h3><button className="gx-btn gx-btn-ghost gx-btn-sm" onClick={onClose}>✕</button></div>
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 6 }}>感兴趣的 arXiv 分类</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {ARXIV_CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => toggleCat(c.id)}
              className={`gx-btn gx-btn-sm ${cats.includes(c.id) ? 'gx-btn-primary' : ''}`}>{c.label}</button>
          ))}
        </div>
        <label className="gx-field" style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 4 }}>关键词（逗号分隔，可空）</div>
          <input className="gx-in" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="diffusion, agent, RAG" />
        </label>
        <div className="gx-inrow" style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12.5, color: 'var(--text-2)' }}>每次拉取</label>
          <input className="gx-in" type="number" style={{ width: 90 }} value={maxResults} onChange={(e) => setMaxResults(e.target.value)} />
          <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>篇</span>
        </div>
        <label className="gx-field" style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 4 }}>自建代理 URL（可选，直连被 CORS 拦时填）</div>
          <input className="gx-in" value={proxyUrl} onChange={(e) => setProxyUrl(e.target.value)} placeholder="https://your-worker.workers.dev/" />
        </label>
        <div style={{ fontSize: 11.5, color: aiOK ? 'var(--success)' : 'var(--text-3)', marginBottom: 12 }}>
          {aiOK ? '✓ AI 已就绪（全站共用配置）' : '✨ AI 总结需先配置 AI（点页面右上「✨ 配置 AI」，Key 仅存本地）'}
        </div>
        <div className="gx-inrow"><button className="gx-btn gx-btn-primary" onClick={save}>保存</button><button className="gx-btn" onClick={onClose}>取消</button></div>
      </div>
    </div>
  );
}

const PAPERS_CSS = `
.pr-card{background:var(--surface-2);border:1px solid var(--bd-soft);border-radius:12px;padding:13px 15px;transition:border-color .15s;}
.pr-card:hover{border-color:var(--bd);}
.pr-title{font-size:14px;font-weight:500;letter-spacing:-.1px;line-height:1.4;overflow-wrap:anywhere;}
.pr-meta{display:flex;flex-wrap:wrap;gap:7px;align-items:center;font-size:11.5px;color:var(--text-3);margin-top:5px;}
.pr-abs{font-size:12.5px;color:var(--text-2);line-height:1.6;margin-top:8px;cursor:pointer;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.pr-abs.open{-webkit-line-clamp:unset;}
.pr-acts{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:10px;}
.pr-acts a{text-decoration:none;}
.pr-overlay{position:fixed;inset:0;background:rgba(38,36,31,.32);display:flex;align-items:center;justify-content:center;z-index:50;padding:16px;}
.pr-modal{background:var(--surface);border-radius:16px;padding:20px;max-width:600px;width:100%;max-height:88vh;overflow:auto;}
.pr-summary{font-size:13.5px;line-height:1.75;white-space:pre-wrap;color:var(--text);}
.pr-featured{background:linear-gradient(180deg,var(--accent-soft),var(--surface));border:1px solid #E6C8B9;border-radius:13px;padding:10px;margin-bottom:6px;}
.pr-featured-tag{font-size:11px;color:var(--accent-2);font-weight:500;letter-spacing:.3px;padding:2px 4px 8px;}
.pr-featured .pr-card{background:var(--surface);border-color:transparent;}
`;

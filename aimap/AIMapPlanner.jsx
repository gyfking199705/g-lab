/**
 * AI 学习地图 —— React 组件
 * ------------------------------------------------------------------
 * 知识疆域式学习追踪（理念：把「学到哪了」画成一张地图）：
 *   · 轨道 → 分组 → 知识点，四态：已掌握 / 进行中 / 迷雾 / 未开始
 *   · 「迷雾」必须挂一句**解锁问题**——把模糊的不会变成可回答的具体问题，
 *     迷雾区自动汇总成清扫清单（按出现顺序 = 阻塞优先级）
 *   · 测绘总览（每轨道分态进度条）+ 状态筛选
 *   · 下一步队列（有序行动）+ 学习足迹（会话日志）+ 暂缓区
 * 交互：点知识点的状态徽章直接轮换四态（日常手势）；
 *       右上「编辑地图」开关进入结构编辑（增删改轨道/分组/知识点/笔记/解锁问题）。
 * 与「学习规划」（计划+番茄+复习）互补：那边管执行节奏，这边管知识版图。
 * 计算逻辑在 ./calc.js（纯函数可单测）。接入约定同其他模块：
 *   <AIMapPlanner storageKey="aimap-planner" onChange={fn} />
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { STATUS_META, STATUS_CYCLE, cycleStatus, trackStats, overallCounts, donePct, fogItems, normalize, rid } from './calc.js';
import { todayStr } from '../core/date.js';

function load(initialState, key) {
  if (initialState) return normalize(initialState);
  try { return normalize(JSON.parse(localStorage.getItem(key) || 'null')); } catch (e) { return normalize(null); }
}

export default function AIMapPlanner({ initialState, onChange, storageKey = 'aimap-planner' }) {
  const [state, setState] = useState(() => load(initialState, storageKey));
  const [filter, setFilter] = useState('all');
  const [edit, setEdit] = useState(false);
  const [showLib, setShowLib] = useState(false);
  const [lib, setLib] = useState(null);
  const [libErr, setLibErr] = useState('');
  const [importing, setImporting] = useState('');
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (e) { /* 静默 */ }
    if (onChange) onChange(state);
  }, [state]);

  const counts = useMemo(() => overallCounts(state), [state]);
  const fogs = useMemo(() => fogItems(state), [state]);

  /* ---------- 不可变更新工具 ---------- */
  const up = (fn) => setState((prev) => fn(normalize(prev)));
  const upTopic = (tid, cid, pid, patch) => up((s) => ({
    ...s,
    tracks: s.tracks.map((tr) => tr.id !== tid ? tr : {
      ...tr,
      clusters: tr.clusters.map((cl) => cl.id !== cid ? cl : {
        ...cl,
        topics: typeof patch === 'function'
          ? patch(cl.topics)
          : cl.topics.map((t) => (t.id === pid ? { ...t, ...patch } : t)),
      }),
    }),
  }));

  const addTrack = () => up((s) => ({ ...s, tracks: [...s.tracks, { id: rid('tr'), tag: `TRACK ${s.tracks.length + 1}`, name: '新轨道', clusters: [{ id: rid('cl'), name: '', topics: [] }] }] }));
  const patchTrack = (tid, patch) => up((s) => ({ ...s, tracks: s.tracks.map((tr) => (tr.id === tid ? { ...tr, ...patch } : tr)) }));
  const delTrack = (tid) => up((s) => ({ ...s, tracks: s.tracks.filter((tr) => tr.id !== tid) }));
  const addCluster = (tid) => up((s) => ({ ...s, tracks: s.tracks.map((tr) => (tr.id === tid ? { ...tr, clusters: [...tr.clusters, { id: rid('cl'), name: '新分组', topics: [] }] } : tr)) }));
  const patchCluster = (tid, cid, patch) => up((s) => ({ ...s, tracks: s.tracks.map((tr) => (tr.id === tid ? { ...tr, clusters: tr.clusters.map((cl) => (cl.id === cid ? { ...cl, ...patch } : cl)) } : tr)) }));
  const delCluster = (tid, cid) => up((s) => ({ ...s, tracks: s.tracks.map((tr) => (tr.id === tid ? { ...tr, clusters: tr.clusters.filter((cl) => cl.id !== cid) } : tr)) }));
  const addTopic = (tid, cid) => upTopic(tid, cid, null, (topics) => [...topics, { id: rid('tp'), name: '新知识点', status: 'todo', note: '', unlock: '' }]);
  const delTopic = (tid, cid, pid) => upTopic(tid, cid, null, (topics) => topics.filter((t) => t.id !== pid));

  const addQueue = (title) => title.trim() && up((s) => ({ ...s, queue: [...s.queue, { id: rid('q'), title: title.trim(), desc: '' }] }));
  const patchQueue = (id, patch) => up((s) => ({ ...s, queue: s.queue.map((q) => (q.id === id ? { ...q, ...patch } : q)) }));
  const delQueue = (id) => up((s) => ({ ...s, queue: s.queue.filter((q) => q.id !== id) }));
  const moveQueue = (id, dir) => up((s) => {
    const i = s.queue.findIndex((q) => q.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= s.queue.length) return s;
    const q = [...s.queue]; [q[i], q[j]] = [q[j], q[i]];
    return { ...s, queue: q };
  });
  const addLog = (text) => text.trim() && up((s) => ({ ...s, log: [{ id: rid('lg'), date: todayStr(), text: text.trim() }, ...s.log] }));
  const delLog = (id) => up((s) => ({ ...s, log: s.log.filter((l) => l.id !== id) }));
  const addParked = (name) => name.trim() && up((s) => ({ ...s, parked: [...s.parked, { id: rid('pk'), name: name.trim() }] }));
  const delParked = (id) => up((s) => ({ ...s, parked: s.parked.filter((p) => p.id !== id) }));

  /* ---------- 地图库（仓库内置静态 JSON，按需拉取，不占应用包体） ---------- */
  const toggleLib = async () => {
    setShowLib((v) => !v);
    if (lib || showLib) return;
    try {
      const r = await fetch('aimap/maps/index.json');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      setLib(await r.json());
      setLibErr('');
    } catch (e) { setLibErr('地图库加载失败（需在线访问站点）：' + (e.message || '')); }
  };
  const hasMap = (m) => (m.trackNames || []).some((n) => state.tracks.some((tr) => tr.name === n));
  const importMap = async (m) => {
    setImporting(m.file);
    try {
      const r = await fetch('aimap/maps/' + m.file);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      const tracks = normalize({ tracks: data.tracks }).tracks;
      up((s) => ({ ...s, tracks: [...s.tracks, ...tracks] }));
      setLibErr('');
    } catch (e) { setLibErr(`导入「${m.name}」失败：` + (e.message || '')); }
    finally { setImporting(''); }
  };

  const empty = state.tracks.length === 0;

  return (
    <div className="am-root">
      <style>{CSS}</style>

      {/* 任务声明 + 锚点 */}
      <div className="am-mission">
        {edit ? (
          <>
            <input className="am-in am-in-block" placeholder="主线目标（一句话：这张图为了吃透什么）" value={state.mission} onChange={(e) => up((s) => ({ ...s, mission: e.target.value }))} />
            <input className="am-in am-in-block" placeholder="锚点（当前任务 / 锚定系统，如：DeepSeek-V3 @ H100）" value={state.anchor} onChange={(e) => up((s) => ({ ...s, anchor: e.target.value }))} />
          </>
        ) : (
          <>
            {state.mission && <p className="am-mtext">{state.mission}</p>}
            {state.anchor && <p className="am-manchor">⚓ {state.anchor}</p>}
          </>
        )}
        <span className="am-mbtns">
          <button className={`am-editbtn${showLib ? ' on' : ''}`} onClick={toggleLib}>📥 地图库</button>
          <button className={`am-editbtn${edit ? ' on' : ''}`} onClick={() => setEdit(!edit)}>{edit ? '✓ 完成编辑' : '✎ 编辑地图'}</button>
        </span>
      </div>

      {/* 地图库：内置课程图谱，一键并入（追加为新轨道，可再删） */}
      {showLib && (
        <div className="am-lib">
          <p className="am-lib-lead">内置知识地图（共 {(lib || []).reduce((s, m) => s + (m.topics || 0), 0) || '…'} 个知识点）。导入后以「未开始」并入你的地图，慢慢点亮；不需要的轨道可在编辑模式删除。</p>
          {libErr && <p className="am-lib-err">⚠ {libErr}</p>}
          {!lib && !libErr && <p className="am-lib-lead">正在加载…</p>}
          {(lib || []).map((m) => (
            <div className="am-lib-row" key={m.file}>
              <span className="am-lib-ic">{m.icon}</span>
              <div className="am-lib-body">
                <div className="am-lib-name">{m.name} <em>{m.topics} 点 · {m.tracks} 轨道</em></div>
                <div className="am-lib-desc">{m.desc}</div>
              </div>
              {hasMap(m)
                ? <span className="am-lib-done">✓ 已导入</span>
                : <button className="am-lib-btn" disabled={!!importing} onClick={() => importMap(m)}>{importing === m.file ? '导入中…' : '导入'}</button>}
            </div>
          ))}
        </div>
      )}

      {/* 测绘总览 */}
      {!empty && (
        <div className="am-survey">
          {state.tracks.map((tr) => {
            const s = trackStats(tr);
            if (!s.total) return null;
            const w = (k) => (s.total ? (s[k] / s.total) * 100 : 0);
            return (
              <div className="am-bar-card" key={tr.id}>
                <div className="am-bar-t"><span className="am-bar-name">{tr.name}</span><span className="am-bar-pct">{s.done}/{s.total} 已掌握</span></div>
                <div className="am-bar">
                  <i style={{ width: w('done') + '%', background: STATUS_META.done.color }} />
                  <i style={{ width: w('doing') + '%', background: STATUS_META.doing.color }} />
                  <i style={{ width: w('fog') + '%', background: STATUS_META.fog.color }} />
                </div>
                <div className="am-bar-sub">进行中 {s.doing} · 迷雾 {s.fog} · 未开始 {s.todo}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* 筛选 */}
      {!empty && (
        <div className="am-chips">
          <button className={`am-chip${filter === 'all' ? ' on' : ''}`} onClick={() => setFilter('all')}><i style={{ background: 'var(--accent)' }} />全部 <em>{counts.total}</em></button>
          {STATUS_CYCLE.map((k) => (
            <button key={k} className={`am-chip${filter === k ? ' on' : ''}`} onClick={() => setFilter(k)}>
              <i style={{ background: STATUS_META[k].color }} />{STATUS_META[k].label} <em>{counts[k]}</em>
            </button>
          ))}
        </div>
      )}

      {/* 轨道 → 分组 → 知识点 */}
      {empty ? (
        <div className="am-empty">
          <div className="ic">🗺️</div>
          <div>还没有学习地图</div>
          <p>点右上「✎ 编辑地图」新建轨道开始测绘；或去首页「一键填充示例」看一张完整的样例地图（LLM 推理引擎）。</p>
          {edit && <button className="am-add" onClick={addTrack}>＋ 新建轨道</button>}
        </div>
      ) : (
        state.tracks.map((tr) => (
          <section className="am-track" key={tr.id}>
            <div className="am-track-h">
              {edit ? (
                <>
                  <input className="am-in am-in-tag" value={tr.tag} placeholder="TRACK 标签" onChange={(e) => patchTrack(tr.id, { tag: e.target.value })} />
                  <input className="am-in am-in-name" value={tr.name} placeholder="轨道名" onChange={(e) => patchTrack(tr.id, { name: e.target.value })} />
                  <button className="am-link am-del" onClick={() => delTrack(tr.id)}>删除轨道</button>
                </>
              ) : (
                <><span className="am-tag">{tr.tag}</span><h3>{tr.name}</h3></>
              )}
            </div>
            {tr.clusters.map((cl) => {
              const shown = cl.topics.filter((t) => filter === 'all' || t.status === filter);
              if (!edit && cl.topics.length > 0 && shown.length === 0) return null;
              return (
                <div className="am-cluster" key={cl.id}>
                  {(cl.name || edit) && (
                    <div className="am-cluster-h">
                      {edit ? (
                        <>
                          <input className="am-in am-in-cluster" value={cl.name} placeholder="分组名（可留空）" onChange={(e) => patchCluster(tr.id, cl.id, { name: e.target.value })} />
                          <button className="am-link am-del" onClick={() => delCluster(tr.id, cl.id)}>删分组</button>
                        </>
                      ) : cl.name}
                    </div>
                  )}
                  <div className="am-grid">
                    {(edit ? cl.topics : shown).map((t) => (
                      <div className={`am-card am-s-${t.status}`} key={t.id}>
                        <div className="am-card-top">
                          {edit
                            ? <input className="am-in am-in-topic" value={t.name} onChange={(e) => upTopic(tr.id, cl.id, t.id, { name: e.target.value })} />
                            : <div className="am-card-name">{t.name}</div>}
                          <button className="am-badge" style={{ color: STATUS_META[t.status].color, background: STATUS_META[t.status].soft }}
                            title="点击轮换：未开始→进行中→已掌握→迷雾" onClick={() => upTopic(tr.id, cl.id, t.id, { status: cycleStatus(t.status) })}>
                            {STATUS_META[t.status].label}
                          </button>
                        </div>
                        {edit ? (
                          <>
                            <textarea className="am-ta" rows={2} placeholder="一句话笔记：现在理解到哪一步" value={t.note} onChange={(e) => upTopic(tr.id, cl.id, t.id, { note: e.target.value })} />
                            <textarea className="am-ta am-ta-unlock" rows={2} placeholder="解锁问题（迷雾必填）：答出它，雾就散" value={t.unlock} onChange={(e) => upTopic(tr.id, cl.id, t.id, { unlock: e.target.value })} />
                            <button className="am-link am-del" onClick={() => delTopic(tr.id, cl.id, t.id)}>删除</button>
                          </>
                        ) : (
                          <>
                            {t.note && <div className="am-card-note">{t.note}</div>}
                            {t.status === 'fog' && (
                              <div className="am-unlock"><b>解锁问题</b>{t.unlock || '（在编辑模式补一句：答出什么，雾才散？）'}</div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                    {edit && <button className="am-addcard" onClick={() => addTopic(tr.id, cl.id)}>＋ 知识点</button>}
                  </div>
                </div>
              );
            })}
            {edit && <button className="am-add" onClick={() => addCluster(tr.id)}>＋ 分组</button>}
          </section>
        ))
      )}
      {edit && !empty && <button className="am-add" onClick={addTrack}>＋ 新建轨道</button>}

      {/* 暂缓区 */}
      {(state.parked.length > 0 || edit) && (
        <section className="am-track">
          <div className="am-track-h"><span className="am-tag">暂缓区</span><h3>自然连到再碰</h3></div>
          <div className="am-parked">
            {state.parked.map((p) => (
              <span key={p.id}>{p.name}{edit && <button className="am-x" onClick={() => delParked(p.id)}>×</button>}</span>
            ))}
            {edit && <QuickAdd placeholder="暂缓主题…" onAdd={addParked} />}
          </div>
        </section>
      )}

      {/* 迷雾区 · 解锁问题清单 */}
      {fogs.length > 0 && (
        <section className="am-fogpanel">
          <h3>🌫️ 迷雾区 · 解锁问题清单</h3>
          <p className="am-fog-lead">每片雾对应一个具体问题——答出来，雾就散。按出现顺序 = 对主线的阻塞程度，优先清前几条。</p>
          {fogs.map((f) => (
            <div className="am-fogitem" key={f.topicId}>
              <div className="am-fog-n">{f.name}<span>{f.trackName}{f.clusterName ? ' · ' + f.clusterName : ''}</span></div>
              <div className="am-fog-q">{f.unlock || '（待补解锁问题）'}</div>
            </div>
          ))}
        </section>
      )}

      {/* 下一步队列 */}
      <section className="am-track">
        <div className="am-track-h"><span className="am-tag">队列</span><h3>下一步</h3></div>
        {state.queue.map((q, i) => (
          <div className="am-qitem" key={q.id}>
            <span className="am-qn">{String(i + 1).padStart(2, '0')}</span>
            <div className="am-qbody">
              {edit ? (
                <>
                  <input className="am-in am-in-block" value={q.title} onChange={(e) => patchQueue(q.id, { title: e.target.value })} />
                  <input className="am-in am-in-block am-in-sub" placeholder="为什么是它 / 怎么做" value={q.desc} onChange={(e) => patchQueue(q.id, { desc: e.target.value })} />
                </>
              ) : (
                <><div className="am-qt">{q.title}</div>{q.desc && <div className="am-qd">{q.desc}</div>}</>
              )}
            </div>
            <span className="am-qacts">
              <button className="am-link" onClick={() => moveQueue(q.id, -1)} title="上移">↑</button>
              <button className="am-link" onClick={() => moveQueue(q.id, 1)} title="下移">↓</button>
              <button className="am-link am-del" onClick={() => delQueue(q.id)}>完成/删</button>
            </span>
          </div>
        ))}
        <QuickAdd placeholder="下一步要做什么…（回车添加）" onAdd={addQueue} wide />
      </section>

      {/* 学习足迹 */}
      <section className="am-track">
        <div className="am-track-h"><span className="am-tag">足迹</span><h3>学习日志</h3></div>
        <QuickAdd placeholder="这次学了什么…（回车记一笔，自动写今天日期）" onAdd={addLog} wide />
        {state.log.map((l) => (
          <div className="am-litem" key={l.id}>
            <span className="am-ld">{l.date}</span>
            <span className="am-lt">{l.text}</span>
            <button className="am-link am-del" onClick={() => delLog(l.id)}>删</button>
          </div>
        ))}
      </section>
    </div>
  );
}

/* 轻量快速添加输入（回车提交） */
function QuickAdd({ placeholder, onAdd, wide }) {
  const [v, setV] = useState('');
  const submit = () => { if (v.trim()) { onAdd(v); setV(''); } };
  return (
    <input className={`am-in am-quickadd${wide ? ' wide' : ''}`} placeholder={placeholder} value={v}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
      onBlur={submit} />
  );
}

const CSS = `
.am-root{--fog:#8E7CC3;}
.am-mission{position:relative;background:var(--surface);border:1px solid var(--bd);border-radius:14px;padding:16px 210px 16px 18px;margin-bottom:16px;}
.am-mbtns{position:absolute;top:14px;right:14px;display:flex;gap:6px;}
.am-mbtns .am-editbtn{position:static;}
.am-lib{background:var(--surface);border:1px solid var(--bd);border-radius:14px;padding:14px 18px;margin-bottom:16px;}
.am-lib-lead{font-size:12px;color:var(--text-2);line-height:1.6;margin-bottom:6px;}
.am-lib-err{font-size:12px;color:var(--danger);margin-bottom:6px;}
.am-lib-row{display:flex;align-items:center;gap:12px;padding:10px 2px;border-top:1px solid var(--bd-soft);}
.am-lib-ic{font-size:20px;flex:none;}
.am-lib-body{flex:1;min-width:0;}
.am-lib-name{font-weight:600;font-size:13px;}
.am-lib-name em{font-style:normal;font-weight:400;font-size:11px;color:var(--text-3);margin-left:6px;font-variant-numeric:tabular-nums;}
.am-lib-desc{font-size:11.5px;color:var(--text-2);margin-top:2px;line-height:1.55;}
.am-lib-btn{flex:none;border:1px solid var(--accent);background:var(--accent-soft);color:var(--accent-2);border-radius:8px;padding:5px 14px;font-size:12px;cursor:pointer;transition:.15s;font-family:var(--sans);}
.am-lib-btn:hover:not(:disabled){background:var(--accent);color:#fff;}
.am-lib-btn:disabled{opacity:.55;cursor:default;}
.am-lib-done{flex:none;font-size:12px;color:var(--success);font-weight:500;}
.am-mtext{font-family:var(--serif);font-size:14.5px;line-height:1.7;color:var(--text);}
.am-manchor{font-size:11.5px;color:var(--text-3);margin-top:6px;font-variant-numeric:tabular-nums;}
.am-editbtn{position:absolute;top:14px;right:14px;border:1px solid var(--bd-2);background:var(--surface-2);border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer;color:var(--text-2);transition:.15s;}
.am-editbtn:hover{border-color:var(--accent);color:var(--accent-2);}
.am-editbtn.on{background:var(--accent-soft);border-color:var(--accent);color:var(--accent-2);font-weight:500;}
.am-survey{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-bottom:16px;}
.am-bar-card{background:var(--surface);border:1px solid var(--bd);border-radius:12px;padding:14px 16px;}
.am-bar-t{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:9px;gap:8px;}
.am-bar-name{font-weight:600;font-size:13px;}
.am-bar-pct{font-size:11px;color:var(--text-3);font-variant-numeric:tabular-nums;white-space:nowrap;}
.am-bar{height:7px;border-radius:99px;background:var(--surface-3);overflow:hidden;display:flex;}
.am-bar i{display:block;height:100%;}
.am-bar-sub{font-size:11px;color:var(--text-3);margin-top:7px;}
.am-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;}
.am-chip{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--bd);background:var(--surface);border-radius:999px;padding:5px 13px;font-size:12.5px;color:var(--text-2);cursor:pointer;transition:.15s;font-family:var(--sans);}
.am-chip i{width:8px;height:8px;border-radius:99px;}
.am-chip em{font-style:normal;font-size:11px;color:var(--text-3);font-variant-numeric:tabular-nums;}
.am-chip:hover{border-color:var(--bd-2);}
.am-chip.on{border-color:var(--accent);color:var(--text);background:var(--accent-soft);}
.am-track{margin-top:30px;}
.am-track-h{display:flex;align-items:baseline;gap:10px;padding-bottom:9px;border-bottom:1px solid var(--bd);flex-wrap:wrap;}
.am-track-h h3{font-family:var(--serif);font-size:18px;font-weight:500;}
.am-tag{font-size:10px;color:var(--accent-2);letter-spacing:1.6px;text-transform:uppercase;font-weight:600;}
.am-cluster{margin-top:18px;}
.am-cluster-h{display:flex;align-items:center;gap:10px;font-size:11.5px;color:var(--text-2);letter-spacing:1.2px;margin-bottom:10px;}
.am-cluster-h::after{content:"";flex:1;height:1px;background:var(--bd-soft);}
.am-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(225px,1fr));gap:10px;}
.am-card{background:var(--surface);border:1px solid var(--bd);border-left-width:3px;border-radius:11px;padding:12px 14px;transition:box-shadow .15s;}
.am-card:hover{box-shadow:0 4px 14px rgba(38,36,31,.07);}
.am-s-done{border-left-color:var(--success);}
.am-s-doing{border-left-color:var(--warn);}
.am-s-todo{border-left-color:var(--bd-2);opacity:.72;}
.am-s-fog{border-style:dashed;border-left-color:var(--fog);background:linear-gradient(rgba(142,124,195,.045),rgba(142,124,195,.045)),var(--surface);}
.am-card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;}
.am-card-name{font-weight:600;font-size:13px;line-height:1.5;}
.am-badge{flex:none;border:none;font-size:10.5px;padding:3px 9px;border-radius:999px;cursor:pointer;white-space:nowrap;font-family:var(--sans);transition:filter .15s;}
.am-badge:hover{filter:brightness(.92);}
.am-card-note{font-size:11.5px;color:var(--text-2);margin-top:7px;line-height:1.65;}
.am-unlock{font-size:11.5px;margin-top:9px;padding-top:8px;border-top:1px dashed var(--bd-2);color:var(--fog);line-height:1.6;}
.am-unlock b{display:block;font-size:9.5px;letter-spacing:1.2px;color:var(--text-3);margin-bottom:2px;font-weight:600;}
.am-fogpanel{margin-top:34px;border:1px dashed color-mix(in srgb,#8E7CC3 55%,var(--bd));border-radius:14px;padding:20px 22px;background:linear-gradient(rgba(142,124,195,.05),transparent 70%),var(--surface);}
.am-fogpanel h3{font-family:var(--serif);font-size:17px;font-weight:500;color:var(--fog);}
.am-fog-lead{font-size:12px;color:var(--text-2);margin-top:6px;line-height:1.6;}
.am-fogitem{display:grid;grid-template-columns:minmax(140px,200px) 1fr;gap:4px 18px;padding:11px 2px;border-top:1px solid color-mix(in srgb,#8E7CC3 18%,var(--bd-soft));font-size:12.5px;margin-top:2px;}
.am-fogitem:first-of-type{border-top:none;}
.am-fog-n{font-weight:600;}
.am-fog-n span{display:block;font-weight:400;font-size:10.5px;color:var(--text-3);margin-top:2px;}
.am-fog-q{color:var(--text-2);line-height:1.65;}
.am-qitem{display:flex;gap:12px;padding:11px 2px;border-bottom:1px solid var(--bd-soft);align-items:baseline;}
.am-qn{font-size:11px;color:var(--accent-2);font-variant-numeric:tabular-nums;flex:none;width:22px;font-weight:600;}
.am-qbody{flex:1;min-width:0;}
.am-qt{font-weight:600;font-size:13px;}
.am-qd{color:var(--text-2);font-size:12px;margin-top:2px;line-height:1.6;}
.am-qacts{display:flex;gap:2px;flex:none;}
.am-litem{display:flex;gap:14px;padding:10px 2px;border-bottom:1px solid var(--bd-soft);font-size:12.5px;align-items:baseline;}
.am-ld{font-size:11px;color:var(--text-3);flex:none;width:86px;font-variant-numeric:tabular-nums;}
.am-lt{flex:1;color:var(--text-2);line-height:1.65;overflow-wrap:anywhere;}
.am-parked{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;}
.am-parked>span{border:1px solid var(--bd);border-radius:8px;padding:6px 12px;color:var(--text-3);font-size:12.5px;background:var(--surface);display:inline-flex;align-items:center;gap:6px;}
.am-x{border:none;background:none;cursor:pointer;color:var(--text-3);font-size:13px;padding:0 2px;}
.am-x:hover{color:var(--danger);}
.am-link{border:none;background:none;cursor:pointer;color:var(--text-3);font-size:11.5px;padding:2px 6px;border-radius:6px;font-family:var(--sans);}
.am-link:hover{background:var(--surface-3);color:var(--text);}
.am-del:hover{color:var(--danger);}
.am-add{border:1px dashed var(--bd-2);background:none;border-radius:9px;padding:7px 14px;font-size:12px;color:var(--text-3);cursor:pointer;margin-top:12px;transition:.15s;font-family:var(--sans);}
.am-add:hover{border-color:var(--accent);color:var(--accent-2);}
.am-addcard{border:1px dashed var(--bd-2);background:none;border-radius:11px;min-height:64px;font-size:12.5px;color:var(--text-3);cursor:pointer;transition:.15s;font-family:var(--sans);}
.am-addcard:hover{border-color:var(--accent);color:var(--accent-2);}
.am-in{border:1px solid var(--bd);background:var(--surface-2);border-radius:8px;padding:6px 10px;font-size:12.5px;font-family:var(--sans);color:var(--text);}
.am-in:focus{outline:none;border-color:var(--accent);background:var(--surface);}
.am-in-block{display:block;width:100%;margin-bottom:6px;}
.am-in-sub{font-size:11.5px;}
.am-in-tag{width:110px;font-size:10.5px;text-transform:uppercase;letter-spacing:1px;}
.am-in-name{flex:1;min-width:140px;font-weight:600;}
.am-in-cluster{width:200px;font-size:11.5px;}
.am-in-topic{flex:1;min-width:0;font-weight:600;font-size:12.5px;}
.am-ta{width:100%;border:1px solid var(--bd);background:var(--surface-2);border-radius:8px;padding:6px 10px;font-size:11.5px;font-family:var(--sans);color:var(--text);margin-top:6px;resize:vertical;line-height:1.5;}
.am-ta:focus{outline:none;border-color:var(--accent);}
.am-ta-unlock{border-color:color-mix(in srgb,#8E7CC3 35%,var(--bd));}
.am-quickadd{margin-top:10px;width:260px;max-width:100%;}
.am-quickadd.wide{display:block;width:100%;}
.am-empty{text-align:center;padding:44px 20px;color:var(--text-3);background:var(--surface);border:1px dashed var(--bd-2);border-radius:14px;}
.am-empty .ic{font-size:36px;margin-bottom:10px;}
.am-empty>div:nth-child(2){font-family:var(--serif);font-size:16px;color:var(--text-2);}
.am-empty p{font-size:12.5px;margin-top:8px;line-height:1.7;max-width:420px;margin-left:auto;margin-right:auto;}
@media(max-width:640px){.am-fogitem{grid-template-columns:1fr;}.am-mission{padding-right:18px;padding-top:48px;}}
`;

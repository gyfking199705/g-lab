/**
 * AI 学习地图 —— 纯函数（便于单测）
 * ------------------------------------------------------------------
 * 知识疆域模型：轨道(track) → 分组(cluster) → 知识点(topic)。
 * 每个知识点四态：
 *   done  已掌握（点亮的领土）
 *   doing 进行中（正在推进的前线）
 *   fog   迷雾（已知的未知——必须挂一个「解锁问题」，答出来雾就散）
 *   todo  未开始（还没踏足）
 * 配套：下一步队列（有序行动）、学习足迹（会话日志）、暂缓区（自然连到再碰）。
 * 「迷雾 + 解锁问题」是整个模型的灵魂：把模糊的不会，变成一句可回答的具体问题。
 */

/** 状态元信息（UI 与统计共用）；cycle 为点击徽章的轮换顺序。 */
export const STATUS_META = {
  todo: { label: '未开始', color: 'var(--text-3)', soft: 'rgba(176,175,165,.16)' },
  doing: { label: '进行中', color: 'var(--warn)', soft: 'rgba(190,147,86,.14)' },
  done: { label: '已掌握', color: 'var(--success)', soft: 'rgba(110,144,121,.14)' },
  fog: { label: '迷雾', color: '#8E7CC3', soft: 'rgba(142,124,195,.14)' },
};
export const STATUS_CYCLE = ['todo', 'doing', 'done', 'fog'];

/** 点徽章轮换状态：todo → doing → done → fog → todo。 */
export function cycleStatus(s) {
  const i = STATUS_CYCLE.indexOf(s);
  return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
}

/** 单轨道统计 → {done,doing,fog,todo,total}。 */
export function trackStats(track) {
  const c = { done: 0, doing: 0, fog: 0, todo: 0, total: 0 };
  for (const cl of (track && track.clusters) || []) {
    for (const t of cl.topics || []) {
      if (c[t.status] != null) c[t.status]++;
      c.total++;
    }
  }
  return c;
}

/** 全图统计（含 total）。 */
export function overallCounts(state) {
  const c = { done: 0, doing: 0, fog: 0, todo: 0, total: 0 };
  for (const tr of (state && state.tracks) || []) {
    const s = trackStats(tr);
    for (const k of STATUS_CYCLE) c[k] += s[k];
    c.total += s.total;
  }
  return c;
}

/** 掌握度百分比（0-100 整数）。 */
export function donePct(counts) {
  return counts && counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
}

/** 迷雾清单：[{trackName, clusterName, name, unlock, topicId}]，按出现顺序（即阻塞优先级）。 */
export function fogItems(state) {
  const out = [];
  for (const tr of (state && state.tracks) || []) {
    for (const cl of tr.clusters || []) {
      for (const t of cl.topics || []) {
        if (t.status === 'fog') out.push({ trackName: tr.name, clusterName: cl.name || '', name: t.name, unlock: t.unlock || '', topicId: t.id });
      }
    }
  }
  return out;
}

/** 规范化状态：补全字段/数组，老数据安全升级。 */
export function normalize(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    mission: typeof s.mission === 'string' ? s.mission : '',
    anchor: typeof s.anchor === 'string' ? s.anchor : '',
    tracks: Array.isArray(s.tracks) ? s.tracks.map((tr) => ({
      id: tr.id || rid('tr'),
      tag: tr.tag || '',
      name: tr.name || '',
      domain: tr.domain || '',
      domainIcon: tr.domainIcon || '',
      clusters: (Array.isArray(tr.clusters) ? tr.clusters : []).map((cl) => ({
        id: cl.id || rid('cl'),
        name: cl.name || '',
        topics: (Array.isArray(cl.topics) ? cl.topics : []).map((t) => (typeof t === 'string'
          ? { id: rid('tp'), name: t, status: 'todo', note: '', unlock: '' }
          : {
            id: t.id || rid('tp'),
            name: t.name || '',
            status: STATUS_META[t.status] ? t.status : 'todo',
            note: t.note || '',
            unlock: t.unlock || '',
          })),
      })),
    })) : [],
    parked: Array.isArray(s.parked) ? s.parked.map((p) => (typeof p === 'string' ? { id: rid('pk'), name: p } : { id: p.id || rid('pk'), name: p.name || '' })) : [],
    queue: Array.isArray(s.queue) ? s.queue.map((q) => ({ id: q.id || rid('q'), title: q.title || '', desc: q.desc || '' })) : [],
    log: Array.isArray(s.log) ? s.log.map((l) => ({ id: l.id || rid('lg'), date: l.date || '', text: l.text || '' })) : [],
    libImported: s.libImported && typeof s.libImported === 'object' ? s.libImported : {},
  };
}

/**
 * 按领域分组轨道：[{domain, icon, tracks}]。domain 为空的（用户自建/主线图）排最前。
 * 领域 = 地图库中的一张图，自动并入时打上 domain/domainIcon 标记。
 */
export function groupByDomain(tracks) {
  const groups = [];
  const idx = {};
  for (const tr of tracks || []) {
    const key = tr.domain || '';
    if (idx[key] == null) { idx[key] = groups.length; groups.push({ domain: key, icon: tr.domainIcon || '', tracks: [] }); }
    if (!groups[idx[key]].icon && tr.domainIcon) groups[idx[key]].icon = tr.domainIcon;
    groups[idx[key]].tracks.push(tr);
  }
  groups.sort((a, b) => (a.domain === '' ? -1 : b.domain === '' ? 1 : 0));
  return groups;
}

let _seq = 0;
export function rid(prefix) {
  _seq = (_seq + 1) % 1e6;
  return `${prefix}-${Date.now().toString(36)}-${_seq}${Math.floor(Math.random() * 1e4)}`;
}

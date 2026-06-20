/**
 * 共享存储工具（纯函数，便于单测）
 * ------------------------------------------------------------------
 * 统一「带版本号 + 迁移」的 localStorage 读写约定，落实长期原则：
 *   · 数据持久化：刷新/关闭不丢失
 *   · 增量不破坏：数据结构升级时按版本号顺序迁移旧数据，不丢历史
 *
 * 约定：每个模块的数据形如 { v: <number>, ...payload }。
 * loadState 接受 defaults（含目标 v）与 migrations（{ [fromVersion]: fn }）。
 */

function clone(o) {
  return typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o));
}

/**
 * 解析 + 迁移一份原始 JSON 字符串到目标结构。
 * @param {string|null} raw           localStorage 原始字符串
 * @param {object} defaults           默认数据（含目标版本号 v）
 * @param {object} [migrations]       { [fromVersion:number]: (data)=>data } 逐版本升级
 * @returns {object} 已迁移、已补全默认字段的数据
 */
export function migrate(raw, defaults, migrations = {}) {
  const targetV = defaults.v || 1;
  let data;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch (e) {
    data = null;
  }
  if (!data || typeof data !== 'object') return clone(defaults);

  // 历史数据可能无版本号，视为 v0/v1
  let v = typeof data.v === 'number' ? data.v : 1;
  while (v < targetV) {
    const step = migrations[v];
    if (typeof step === 'function') data = step(data) || data;
    v += 1;
    data.v = v;
  }
  // 合并默认字段（浅合并顶层；深层由各模块 loadData 自行兜底）
  return { ...clone(defaults), ...data, v: targetV };
}

/** 从 localStorage 读取并迁移（浏览器环境）。失败回退默认值。 */
export function loadState(key, defaults, migrations = {}) {
  let raw = null;
  try {
    raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch (e) {
    raw = null;
  }
  return migrate(raw, defaults, migrations);
}

/** 写入 localStorage（静默失败，避免隐私模式/配额异常打断交互）。 */
export function saveState(key, data) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    /* 静默 */
  }
}

/** 只读读取某模块原始数据（供跨模块联动，如看板聚合 / 习惯读健身记录）。 */
export function readModule(key) {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/** 简短唯一 id。 */
export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

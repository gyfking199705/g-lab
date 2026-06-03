/**
 * 备份数据的「采集 / 恢复」纯逻辑 + Drive 上传体构造
 * ------------------------------------------------------------------
 * 与具体存储/网络解耦：getItem/setItem 由调用方注入（浏览器传 localStorage 的方法，
 * 测试传内存 Map），因此这些函数都可在 Node 里单测。
 *
 * 安全约定：AI 配置键 `learning-ai`（含 API Key）与同步设置 `sync-client-id`
 * 都**不在** BACKUP_KEYS 内，因此既不进文件备份、也不进云同步，避免外泄。
 */

/** 参与备份 / 云同步的所有 localStorage 键（与各模块约定一致）。 */
export const BACKUP_KEYS = [
  'planning_personal',
  'planning_learning', // 旧版学习待办，保留以兼容历史备份
  'planning_fitness', // 旧版健身待办，保留以兼容历史备份
  'learning-planner', // AI 学习计划站数据
  'fitness-planner', // 健身训练规划数据
  'savings-planner', // 财富规划（含净资产）
  'stocks-watch', // 股市观测自选与设置
];

/** 云端同步文件名（存放在 Drive 的 appDataFolder 隐藏目录内）。 */
export const SYNC_FILENAME = 'g-lab-sync.json';

/**
 * 采集一份备份对象（与「导出备份」文件结构一致）。
 * @param {(key:string)=>string|null} getItem
 * @param {string[]} [keys]
 */
export function gatherBackup(getItem, keys = BACKUP_KEYS) {
  const modules = {};
  for (const k of keys) {
    const raw = getItem(k);
    if (raw == null) continue;
    try {
      modules[k] = JSON.parse(raw);
    } catch (e) {
      /* 跳过损坏数据 */
    }
  }
  return { app: 'growth-planner', version: 2, exportedAt: new Date().toISOString(), modules };
}

/** 从备份对象（或裸 modules 对象）里取出 modules，并校验。 */
export function extractModules(blob) {
  if (!blob || typeof blob !== 'object') throw new Error('备份内容格式不正确');
  const modules = blob.modules && typeof blob.modules === 'object' ? blob.modules : blob;
  if (!modules || typeof modules !== 'object') throw new Error('备份内容格式不正确');
  return modules;
}

/**
 * 把 modules 写回存储（仅覆盖 BACKUP_KEYS 内、且备份里存在的键）。
 * @returns {number} 实际写入的键数
 */
export function applyBackup(setItem, modules, keys = BACKUP_KEYS) {
  let n = 0;
  for (const k of keys) {
    if (modules[k] != null) {
      setItem(k, JSON.stringify(modules[k]));
      n += 1;
    }
  }
  return n;
}

/** 稳定序列化（对象键排序），用于做「内容签名」时不受键顺序影响。 */
export function stableStringify(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stableStringify(v[k])).join(',') + '}';
}

/**
 * 一份 modules 的内容签名（只看 BACKUP_KEYS、与键顺序无关）。
 * 用于自动同步时判断「本机/云端是否有变化」。
 */
export function signatureOf(modules, keys = BACKUP_KEYS) {
  const norm = {};
  for (const k of keys) if (modules && modules[k] != null) norm[k] = modules[k];
  return stableStringify(norm);
}

/** 构造 Drive 「新建文件」的 multipart/related 请求体（元数据 + 媒体）。 */
export function buildMultipartBody(metadata, mediaString, boundary) {
  const nl = '\r\n';
  return (
    `--${boundary}${nl}` +
    `Content-Type: application/json; charset=UTF-8${nl}${nl}` +
    `${JSON.stringify(metadata)}${nl}` +
    `--${boundary}${nl}` +
    `Content-Type: application/json; charset=UTF-8${nl}${nl}` +
    `${mediaString}${nl}` +
    `--${boundary}--`
  );
}

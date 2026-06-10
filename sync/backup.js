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
  'aimap-planner', // AI 学习地图（知识疆域/迷雾）
  'fitness-planner', // 健身训练规划数据
  'savings-planner', // 财富规划（含净资产）
  'stocks-watch', // 股市观测自选与设置
  'project-planner', // 项目规划（任务/甘特/番茄）
  'schedule-planner', // 日程安排（按日/周事项）
  'goals-planner', // 目标进度（目标/子任务/指标）
  'habits-planner', // 习惯打卡（习惯定义/打卡记录）
  'cut-planner', // 减脂计划（档案 + 每日体重/热量记录）
  'papers-planner', // 论文阅读器（订阅设置 + 阅读清单/进度/AI总结）
  'ledger-planner', // 记账（收支流水 + 预算）
  'compare-planner', // 比价小助手（比价项）
  'salary-planner', // 薪资到手评估（输入参数）
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
export function buildMultipartBody(metadata, mediaString, boundary, mediaMime = 'application/json; charset=UTF-8') {
  const nl = '\r\n';
  return (
    `--${boundary}${nl}` +
    `Content-Type: application/json; charset=UTF-8${nl}${nl}` +
    `${JSON.stringify(metadata)}${nl}` +
    `--${boundary}${nl}` +
    `Content-Type: ${mediaMime}${nl}${nl}` +
    `${mediaString}${nl}` +
    `--${boundary}--`
  );
}

/* =============================================================
 * 文件系统布局：Drive 里一个「可见文件夹」，每个模块一个人类可读的 JSON 文件。
 * 这样你能在 Drive 里直接浏览 / 单独备份 / 编辑 / 删除某个模块的数据。
 * ============================================================= */
export const SYNC_FOLDER = '成长规划 (g-lab)';
export const READMEFILE = '说明.txt';

/** 模块键 ↔ 友好文件名（顺序同 BACKUP_KEYS）。 */
export const FILE_MAP = [
  { key: 'planning_personal', file: '个人规划.json' },
  { key: 'planning_learning', file: '学习待办(旧版).json' },
  { key: 'planning_fitness', file: '健身待办(旧版).json' },
  { key: 'learning-planner', file: '学习计划.json' },
  { key: 'aimap-planner', file: '学习地图.json' },
  { key: 'fitness-planner', file: '健身训练.json' },
  { key: 'savings-planner', file: '财富规划.json' },
  { key: 'stocks-watch', file: '股市观测.json' },
  { key: 'project-planner', file: '项目规划.json' },
  { key: 'schedule-planner', file: '日程安排.json' },
  { key: 'goals-planner', file: '目标进度.json' },
  { key: 'habits-planner', file: '习惯打卡.json' },
  { key: 'cut-planner', file: '减脂计划.json' },
  { key: 'papers-planner', file: '论文阅读.json' },
  { key: 'ledger-planner', file: '记账.json' },
  { key: 'compare-planner', file: '比价助手.json' },
  { key: 'salary-planner', file: '薪资到手.json' },
];

export function fileForKey(key) {
  const m = FILE_MAP.find((x) => x.key === key);
  return m ? m.file : `${key}.json`;
}
export function keyForFile(file) {
  const m = FILE_MAP.find((x) => x.file === file);
  return m ? m.key : null;
}

/** 把云端读到的文件列表 [{name,text}] 还原成 modules 对象。 */
export function filesToModules(files) {
  const modules = {};
  for (const f of files || []) {
    const key = keyForFile(f.name);
    if (!key) continue;
    try {
      modules[key] = JSON.parse(f.text);
    } catch (e) {
      /* 跳过损坏文件 */
    }
  }
  return modules;
}

/** 每个模块单独的内容签名（用于「只上传变化了的文件」）。 */
export function perKeySig(modules, keys = BACKUP_KEYS) {
  const out = {};
  for (const k of keys) if (modules && modules[k] != null) out[k] = stableStringify(modules[k]);
  return out;
}

/** 生成 Drive 文件夹里的「说明.txt」内容，便于你以后自己管理。 */
export function buildReadme() {
  const lines = [
    '这是「成长规划」应用的云端数据文件夹（你自己的 Google Drive）。',
    '',
    '· 每个模块一个 JSON 文件，人类可读，可单独备份 / 编辑 / 删除：',
    ...FILE_MAP.map((m) => `    ${m.file}  ←  ${m.key}`),
    '',
    '· 应用通过最小权限 drive.file 只能访问它自己创建的这些文件，看不到你 Drive 的其它内容。',
    '· 不含任何密钥（AI Key 等不会上传）。',
    '· 直接改 JSON 也可以，但请保持合法 JSON；下次打开应用「从云恢复」即可载入。',
    '',
    `最后更新：${new Date().toISOString()}`,
  ];
  return lines.join('\n');
}

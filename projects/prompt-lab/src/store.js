/**
 * prompt-lab 持久化层（localStorage，带版本号 + 迁移）
 * ------------------------------------------------------------------
 * 约定与 g-lab 其它子项目一致：数据形如 { v, prompts: [...] }，刷新不丢、
 * 结构升级时按版本号顺序迁移。纯逻辑 parse/serialize 可单测；浏览器读写
 * 静默失败（隐私模式 / 配额异常不打断交互）。
 */
import { normalizePrompt } from './schema.js';

export const STORAGE_KEY = 'g-lab:prompt-lab';
export const DATA_VERSION = 1;

/** 逐版本迁移函数表：{ [fromVersion]: (data)=>data }。 */
const MIGRATIONS = {};

function clone(o) {
  return typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o));
}

/**
 * 解析原始字符串为 { v, prompts }，并迁移到当前版本。
 * @param {string|null} raw
 * @param {object[]} seeds  无数据时的初始 prompt 列表
 */
export function parseState(raw, seeds = []) {
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch (e) {
    data = null;
  }
  if (!data || typeof data !== 'object' || !Array.isArray(data.prompts)) {
    return { v: DATA_VERSION, prompts: seeds.map((p) => normalizePrompt(p, p.createdAt)) };
  }
  let v = typeof data.v === 'number' ? data.v : 1;
  while (v < DATA_VERSION) {
    const step = MIGRATIONS[v];
    if (typeof step === 'function') data = step(data) || data;
    v += 1;
    data.v = v;
  }
  return {
    v: DATA_VERSION,
    prompts: data.prompts.map((p) => normalizePrompt(p, p.createdAt || Date.now())),
  };
}

/** 序列化（用于写入与导出快照）。 */
export function serializeState(state) {
  return JSON.stringify({ v: DATA_VERSION, prompts: state.prompts || [] });
}

/** 从 localStorage 读取并迁移；无数据时落地 seeds。 */
export function loadState(seeds = []) {
  let raw = null;
  try {
    raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  } catch (e) {
    raw = null;
  }
  return parseState(raw, seeds);
}

/** 写入 localStorage（静默失败）。 */
export function saveState(state) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, serializeState(state));
  } catch (e) {
    /* 静默 */
  }
}

/** 内部：返回新数组（不可变更新），便于 React state。 */
export { clone };

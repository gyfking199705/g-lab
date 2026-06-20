/**
 * 极简 localStorage 持久化（仅本地，无后端、不上云）。
 * 用于记住「收藏的范式」与「DORA 自评档位」。读写带容错，SSR/隐私模式下安全降级。
 */
const PREFIX = 'devx-lab:';

export function load(key, fallback) {
  try {
    const raw = globalThis.localStorage?.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    globalThis.localStorage?.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* 忽略：隐私模式/超额时静默降级 */
  }
}

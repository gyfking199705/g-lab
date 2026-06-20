/**
 * 成本预估 —— 派单前就估出「这单大概多少步 / 多少 token / 多少钱」。纯函数，便于单测。
 * ------------------------------------------------------------------
 * 业界共识：多智能体 ~15× chat 的 token、且 token 用量解释 ~80% 效果方差，
 * 所以「值不值得跑」要先算账。这里给一个**粗略但一致**的估算（非实时计费）。
 */

import { topoLayers } from './queue.js';
import { getRole } from './roles.js';

/** 价目表：USD / 1M tokens，[输入, 输出]。仅用于估算，非实时价格。 */
export const PRICING = {
  'claude-opus-4-8': [15, 75],
  'claude-sonnet-4-6': [3, 15],
  'claude-haiku-4-5-20251001': [1, 5],
  'gpt-4o': [2.5, 10],
  'gpt-4o-mini': [0.15, 0.6],
  'gpt-4.1-mini': [0.4, 1.6],
  _default: [3, 15],
};

export function priceOf(model) {
  return PRICING[model] || PRICING._default;
}

/** 粗略 token 估算：约 4 字符/token（中英混合的折中）。 */
export function estimateTokens(text) {
  return Math.ceil(String(text || '').length / 4);
}

/** 各角色一次产出的假定输出 token（用于在跑之前估算上下游规模）。 */
const OUT_TOKENS = {
  researcher: 320,
  planner: 260,
  worker: 420,
  critic: 200,
  synthesizer: 380,
  default: 300,
};
const SYSTEM_TOKENS = 90; // 每个 agent 的系统提示词粗估

function outOf(role) {
  return OUT_TOKENS[role] || OUT_TOKENS.default;
}

/**
 * 估算整单成本。
 * @param {Array<{id?:string,role:string,brief?:string,deps?:string[]}>} specs 子任务规格（带 deps id）
 * @param {object} [o]
 * @param {string} [o.requirement] 用户需求（计入每个 agent 的输入）
 * @param {string} [o.model]       用于定价的模型
 * @returns {{steps:number,waves:number,inTokens:number,outTokens:number,totalTokens:number,usd:number,model:string}}
 */
export function estimateJobCost(specs, { requirement = '', model = 'claude-sonnet-4-6' } = {}) {
  const list = Array.isArray(specs) ? specs : [];
  const outByRole = (role) => outOf(role);
  const byId = Object.fromEntries(list.map((t) => [t.id, t]));
  const reqTok = estimateTokens(requirement);

  let inTokens = 0;
  let outTokens = 0;
  for (const t of list) {
    const depsTok = (t.deps || []).reduce((s, d) => s + (byId[d] ? outByRole(byId[d].role) : 0), 0);
    inTokens += SYSTEM_TOKENS + reqTok + estimateTokens(t.brief) + depsTok;
    outTokens += outByRole(t.role);
  }
  const [pIn, pOut] = priceOf(model);
  const usd = (inTokens / 1e6) * pIn + (outTokens / 1e6) * pOut;
  // 波次：能拓扑分层就用层数，否则退化为任务数
  let waves = list.length;
  try {
    waves = topoLayers(list.map((t) => ({ ...t, deps: t.deps || [] }))).length || list.length;
  } catch {
    /* 退化 */
  }
  return {
    steps: list.length,
    waves,
    inTokens,
    outTokens,
    totalTokens: inTokens + outTokens,
    usd,
    model,
  };
}

/** 紧凑格式化金额：小于 1 美分按更细的位数显示。 */
export function formatUSD(usd) {
  if (!usd || usd <= 0) return '$0';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

/** 紧凑格式化 token 数：1.2k / 3.4M。 */
export function formatTokens(n) {
  if (n < 1000) return String(n);
  if (n < 1e6) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1e6).toFixed(2)}M`;
}

/** 给角色一个一句话的成本直觉（UI 可选用）。 */
export function roleOutHint(role) {
  return `${getRole(role).name}≈${outOf(role)} tok`;
}

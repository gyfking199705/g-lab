/**
 * 自包含 BYOK（Bring Your Own Key）AI 客户端
 * ------------------------------------------------------------------
 * 直接在浏览器里调用大模型，API Key 仅存本地 localStorage（键 `agent-cli-ai`），不经任何服务器。
 * 支持 Anthropic（Claude）与 OpenAI 兼容接口（含自定义 baseURL / 自部署代理）。
 *
 * ⚠️ 纯前端调用意味着 Key 暴露在浏览器端，仅建议个人使用；不要把含 Key 的内容分享给他人。
 */

const AI_KEY = 'agent-cli-ai';

export const PROVIDERS = {
  anthropic: {
    label: 'Anthropic（Claude）',
    defaultModel: 'claude-sonnet-4-6',
    models: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
    defaultBaseURL: 'https://api.anthropic.com',
    keyHint: 'sk-ant-...',
    keyUrl: 'https://console.anthropic.com/settings/keys',
  },
  openai: {
    label: 'OpenAI（兼容接口）',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
    defaultBaseURL: 'https://api.openai.com',
    keyHint: 'sk-...',
    keyUrl: 'https://platform.openai.com/api-keys',
  },
};

export function defaultAIConfig() {
  return {
    enabled: false,
    mode: 'byok', // 'byok'=自带 Key 直连 | 'proxy'=走自部署后端代理
    provider: 'anthropic',
    model: '',
    apiKey: '',
    baseURL: '',
    proxyURL: '',
    accessToken: '',
  };
}

export function isConfigured(config) {
  if (!config) return false;
  if (config.mode === 'proxy') return !!(config.proxyURL && config.proxyURL.trim());
  return !!(config.apiKey && config.apiKey.trim());
}

export function loadAIConfig() {
  try {
    const raw = localStorage.getItem(AI_KEY);
    return raw ? { ...defaultAIConfig(), ...JSON.parse(raw) } : defaultAIConfig();
  } catch (e) { return defaultAIConfig(); }
}

export function saveAIConfig(cfg) {
  try {
    localStorage.setItem(AI_KEY, JSON.stringify(cfg));
    window.dispatchEvent(new CustomEvent('ai-config-changed'));
  } catch (e) { /* 静默 */ }
}

export function resolveModel(config) {
  const preset = PROVIDERS[config.provider] || PROVIDERS.anthropic;
  return (config.model && config.model.trim()) || preset.defaultModel;
}

function resolveBaseURL(config) {
  const preset = PROVIDERS[config.provider] || PROVIDERS.anthropic;
  return (config.baseURL && config.baseURL.trim().replace(/\/$/, '')) || preset.defaultBaseURL;
}

/** 调用一次对话补全，返回纯文本。 */
export async function callChat({ config, system, user, maxTokens = 1500, signal }) {
  if (typeof fetch !== 'function') throw new Error('当前环境不支持 fetch');
  if (!isConfigured(config)) throw new Error('尚未配置 AI');

  if (config.mode === 'proxy') {
    return callProxy({
      proxyURL: config.proxyURL.trim(),
      accessToken: (config.accessToken || '').trim(),
      system, user, maxTokens, signal,
    });
  }

  const provider = config.provider || 'anthropic';
  const model = resolveModel(config);
  const baseURL = resolveBaseURL(config);
  if (provider === 'anthropic') {
    return callAnthropic({ baseURL, apiKey: config.apiKey.trim(), model, system, user, maxTokens, signal });
  }
  return callOpenAI({ baseURL, apiKey: config.apiKey.trim(), model, system, user, maxTokens, signal });
}

async function callProxy({ proxyURL, accessToken, system, user, maxTokens, signal }) {
  let res;
  try {
    res = await fetch(proxyURL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}) },
      body: JSON.stringify({ system, user, max_tokens: maxTokens }),
      signal,
    });
  } catch (e) { throw new Error(networkHint(e)); }
  if (!res.ok) throw new Error(await errorText(res));
  const data = await res.json();
  const text = (data.text || '').trim();
  if (!text) throw new Error('代理未返回文本内容');
  return text;
}

async function callAnthropic({ baseURL, apiKey, model, system, user, maxTokens, signal }) {
  let res;
  try {
    res = await fetch(`${baseURL}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
      signal,
    });
  } catch (e) { throw new Error(networkHint(e)); }
  if (!res.ok) throw new Error(await errorText(res));
  const data = await res.json();
  const text = (data.content || []).map((b) => b.text || '').join('').trim();
  if (!text) throw new Error('模型未返回文本内容');
  return text;
}

async function callOpenAI({ baseURL, apiKey, model, system, user, maxTokens, signal }) {
  let res;
  try {
    res = await fetch(`${baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model, max_tokens: maxTokens,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
      signal,
    });
  } catch (e) { throw new Error(networkHint(e)); }
  if (!res.ok) throw new Error(await errorText(res));
  const data = await res.json();
  const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').trim();
  if (!text) throw new Error('模型未返回文本内容');
  return text;
}

async function errorText(res) {
  let detail = '';
  try {
    const body = await res.json();
    detail = body?.error?.message || body?.error?.type || (typeof body?.error === 'string' ? body.error : '') || JSON.stringify(body).slice(0, 200);
  } catch (e) { detail = await res.text().catch(() => ''); }
  if (res.status === 401) return `认证失败（401）：API Key 不正确或无权限。${detail}`;
  if (res.status === 429) return `请求过于频繁或额度不足（429）。${detail}`;
  return `请求失败（${res.status}）：${detail || res.statusText}`;
}

function networkHint(e) {
  if (e && e.name === 'AbortError') return '已取消';
  return '网络请求失败：可能是跨域(CORS)被拦、网络不通或代理地址有误。原始信息：' + (e && e.message ? e.message : String(e));
}

/* ============================ 真实工具循环（function calling） ============================ */
import { AGENT_TOOLS, executeTool, displayToolName } from './engine.js';

/** 把工具入参压成一行，给卡片当 (arg) 显示。 */
function toolArgStr(name, input) {
  const a = input || {};
  if (name === 'read_file' || name === 'edit_file' || name === 'write_file') return a.path || '';
  if (name === 'grep') return a.pattern || '';
  if (name === 'run_bash') return a.command || '';
  return '';
}

/**
 * 真实 AI 的工具循环：模型自行决定调工具 → 在内存文件系统上执行 → 回填结果 → 继续，直到收尾。
 * 仅 BYOK 直连模式支持（代理模式回退到纯聊天，由调用方处理）。
 * 回调：
 *   onText(text)                       模型每轮产出的文字
 *   onToolStart(display, argStr) => id  工具开始（返回一个 id）
 *   onToolEnd(id, {result, ok, diff})   工具结束
 *   onApproval(display, argStr) => bool  是否放行（调用方按审批模式决定）
 * @returns {Promise<{files:object}>}
 */
export async function runRealAgent({ config, system, user, files, signal, maxSteps = 8, onText, onToolStart, onToolEnd, onApproval }) {
  if (!isConfigured(config)) throw new Error('尚未配置 AI');
  if (config.mode === 'proxy') throw new Error('代理模式暂不支持工具循环');
  const provider = config.provider || 'anthropic';
  const ctx = {
    fs: { ...files }, signal, maxSteps,
    onText: onText || (() => {}),
    onToolStart: onToolStart || (() => 'x'),
    onToolEnd: onToolEnd || (() => {}),
    onApproval: onApproval || (async () => true),
    model: resolveModel(config),
    baseURL: (config.baseURL && config.baseURL.trim().replace(/\/$/, '')) || PROVIDERS[provider].defaultBaseURL,
    apiKey: (config.apiKey || '').trim(),
  };
  if (provider === 'anthropic') return loopAnthropic(ctx);
  return loopOpenAI(ctx);
}

// 在内存文件系统上跑一个工具，并把卡片渲染交给回调；返回给模型的文本结果。
async function runOneTool(ctx, display, name, input) {
  const argStr = toolArgStr(name, input);
  const approved = await ctx.onApproval(display, argStr);
  const id = ctx.onToolStart(display, argStr);
  if (!approved) {
    ctx.onToolEnd(id, { result: '已拒绝', ok: false });
    return { text: 'User rejected this tool call.', isError: true };
  }
  const r = executeTool(name, input, ctx.fs);
  ctx.fs = r.files;
  ctx.onToolEnd(id, { result: r.result, ok: r.ok, diff: r.diff });
  const text = r.content != null ? r.content : r.result;
  return { text: String(text).slice(0, 4000), isError: r.ok === false };
}

async function loopAnthropic(ctx) {
  const tools = AGENT_TOOLS.map((t) => ({ name: t.name, description: t.desc, input_schema: t.schema }));
  const messages = [{ role: 'user', content: ctx.user }];
  let steps = 0;
  for (let step = 0; step < ctx.maxSteps; step++) {
    steps++;
    let res;
    try {
      res = await fetch(`${ctx.baseURL}/v1/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': ctx.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: ctx.model, max_tokens: 2000, system: ctx.system, tools, messages }),
        signal: ctx.signal,
      });
    } catch (e) { throw new Error(networkHint(e)); }
    if (!res.ok) throw new Error(await errorText(res));
    const data = await res.json();
    const blocks = data.content || [];
    const text = blocks.filter((b) => b.type === 'text').map((b) => b.text || '').join('').trim();
    if (text) ctx.onText(text);
    const toolUses = blocks.filter((b) => b.type === 'tool_use');
    if (!toolUses.length) break; // 收尾
    messages.push({ role: 'assistant', content: blocks });
    const results = [];
    for (const tu of toolUses) {
      const out = await runOneTool(ctx, displayToolName(tu.name), tu.name, tu.input);
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: out.text, is_error: out.isError });
    }
    messages.push({ role: 'user', content: results });
  }
  return { files: ctx.fs, steps };
}

async function loopOpenAI(ctx) {
  const tools = AGENT_TOOLS.map((t) => ({ type: 'function', function: { name: t.name, description: t.desc, parameters: t.schema } }));
  const messages = [{ role: 'system', content: ctx.system }, { role: 'user', content: ctx.user }];
  let steps = 0;
  for (let step = 0; step < ctx.maxSteps; step++) {
    steps++;
    let res;
    try {
      res = await fetch(`${ctx.baseURL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${ctx.apiKey}` },
        body: JSON.stringify({ model: ctx.model, max_tokens: 2000, messages, tools, tool_choice: 'auto' }),
        signal: ctx.signal,
      });
    } catch (e) { throw new Error(networkHint(e)); }
    if (!res.ok) throw new Error(await errorText(res));
    const data = await res.json();
    const msg = data.choices && data.choices[0] && data.choices[0].message;
    if (!msg) break;
    if (msg.content) ctx.onText(String(msg.content).trim());
    const calls = msg.tool_calls || [];
    if (!calls.length) break; // 收尾
    messages.push(msg);
    for (const c of calls) {
      let input = {};
      try { input = JSON.parse(c.function.arguments || '{}'); } catch (e) { input = {}; }
      const out = await runOneTool(ctx, displayToolName(c.function.name), c.function.name, input);
      messages.push({ role: 'tool', tool_call_id: c.id, content: out.text });
    }
  }
  return { files: ctx.fs, steps };
}

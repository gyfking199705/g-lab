/**
 * AI 客户端（BYOK：Bring Your Own Key）
 * ------------------------------------------------------------------
 * 直接在浏览器里调用大模型，API Key 仅保存在用户本地（localStorage），不经过任何服务器。
 * 适合「自托管的纯前端站点」：你自己填 Key 用 AI；别人来学时也各用各的 Key（或走离线模式）。
 *
 * - 提示词构建、计划解析等「纯函数」在 ./calc.js 里（便于测试）；本文件只负责网络与厂商差异。
 * - 支持 Anthropic（Claude）与 OpenAI 兼容接口（含自定义 baseURL 代理）。
 * - 一切失败都抛出带可读信息的 Error，交由 UI 友好提示。
 *
 * ⚠️ 安全提示：在纯前端调用大模型意味着 Key 暴露在浏览器端，仅建议个人使用；
 *    不要把含 Key 的备份分享给他人。生产/多用户场景应改为「后端代理 + 服务端密钥」。
 */
import { buildPlanMessages, buildExplainMessages, parsePlanFromText } from './calc.js';

/* ----------------------------- 厂商预设 ----------------------------- */
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

/** 默认 AI 配置（未启用、无 Key）。 */
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

/** 配置是否可用：BYOK 看是否填 Key；代理模式看是否填代理 URL。 */
export function isConfigured(config) {
  if (!config) return false;
  if (config.mode === 'proxy') return !!(config.proxyURL && config.proxyURL.trim());
  return !!(config.apiKey && config.apiKey.trim());
}

function resolveModel(config) {
  const preset = PROVIDERS[config.provider] || PROVIDERS.anthropic;
  return (config.model && config.model.trim()) || preset.defaultModel;
}

function resolveBaseURL(config) {
  const preset = PROVIDERS[config.provider] || PROVIDERS.anthropic;
  return (config.baseURL && config.baseURL.trim().replace(/\/$/, '')) || preset.defaultBaseURL;
}

/* ----------------------------- 统一调用 ----------------------------- */
/**
 * 调用一次对话补全，返回纯文本。
 * @param {{config:object, system:string, user:string, maxTokens?:number, signal?:AbortSignal}} o
 * @returns {Promise<string>}
 */
export async function callChat({ config, system, user, maxTokens = 2000, signal }) {
  if (typeof fetch !== 'function') throw new Error('当前环境不支持 fetch');
  if (!isConfigured(config)) throw new Error('尚未配置 AI');

  // 代理模式：浏览器只调自部署的后端代理，Key 在服务端
  if (config.mode === 'proxy') {
    return callProxy({
      proxyURL: config.proxyURL.trim(),
      accessToken: (config.accessToken || '').trim(),
      system,
      user,
      maxTokens,
      signal,
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
      headers: {
        'content-type': 'application/json',
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ system, user, max_tokens: maxTokens }),
      signal,
    });
  } catch (e) {
    throw new Error(networkHint(e));
  }
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
        // 允许浏览器直连（否则会被 CORS 拦截）
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
      signal,
    });
  } catch (e) {
    throw new Error(networkHint(e));
  }
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
        model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal,
    });
  } catch (e) {
    throw new Error(networkHint(e));
  }
  if (!res.ok) throw new Error(await errorText(res));
  const data = await res.json();
  const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').trim();
  if (!text) throw new Error('模型未返回文本内容');
  return text;
}

/* ----------------------------- 高层能力 ----------------------------- */
/** 让 AI 生成一份学习计划（已解析、归一化为可用的 plan 对象）。 */
export async function generatePlan({ config, goal, level, weeks, hoursPerWeek, signal }) {
  const { system, user } = buildPlanMessages({ goal, level, weeks, hoursPerWeek });
  const text = await callChat({ config, system, user, maxTokens: 3000, signal });
  return parsePlanFromText(text, { title: goal, level, weeks, hoursPerWeek });
}

/** 让 AI 讲解某个知识点，返回纯文本讲解。 */
export async function explainLesson({ config, lessonTitle, planSubject, note, signal }) {
  const { system, user } = buildExplainMessages({ lessonTitle, planSubject, note });
  return callChat({ config, system, user, maxTokens: 1200, signal });
}

/* ----------------------------- 错误信息 ----------------------------- */
async function errorText(res) {
  let detail = '';
  try {
    const body = await res.json();
    detail =
      body?.error?.message ||
      body?.error?.type ||
      (typeof body?.error === 'string' ? body.error : '') ||
      JSON.stringify(body).slice(0, 200);
  } catch (e) {
    detail = await res.text().catch(() => '');
  }
  if (res.status === 401) return `认证失败（401）：API Key 不正确或无权限。${detail}`;
  if (res.status === 429) return `请求过于频繁或额度不足（429）。${detail}`;
  return `请求失败（${res.status}）：${detail || res.statusText}`;
}

function networkHint(e) {
  if (e && e.name === 'AbortError') return '已取消';
  return (
    '网络请求失败：可能是跨域(CORS)被拦、网络不通或代理地址有误。' +
    '若用 OpenAI 兼容代理，请确认 baseURL 正确且允许浏览器跨域。原始信息：' +
    (e && e.message ? e.message : String(e))
  );
}

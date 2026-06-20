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

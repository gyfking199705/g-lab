/**
 * AI 客户端（BYOK：Bring Your Own Key）—— 浏览器直连大模型，Key 只存本地 localStorage。
 * ------------------------------------------------------------------
 * 沿用 planner/learning 里验证过的直连方式（Anthropic / OpenAI 兼容接口）。
 * ⚠️ 纯前端直连意味着 Key 暴露在浏览器，仅建议个人/演示使用；多用户场景请改后端代理。
 *
 * 不配置 Key 也能用：工作区会回落到「离线模拟引擎」跑通整个多智能体流程。
 */

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
  return { enabled: false, provider: 'anthropic', model: '', apiKey: '', baseURL: '' };
}

export function isConfigured(config) {
  return !!(config && config.apiKey && config.apiKey.trim());
}

function resolveModel(config) {
  const preset = PROVIDERS[config.provider] || PROVIDERS.anthropic;
  return (config.model && config.model.trim()) || preset.defaultModel;
}
function resolveBaseURL(config) {
  const preset = PROVIDERS[config.provider] || PROVIDERS.anthropic;
  return (config.baseURL && config.baseURL.trim().replace(/\/$/, '')) || preset.defaultBaseURL;
}

/** 调一次对话补全，返回纯文本。 */
export async function callChat({ config, system, user, maxTokens = 1500, signal }) {
  if (typeof fetch !== 'function') throw new Error('当前环境不支持 fetch');
  if (!isConfigured(config)) throw new Error('尚未配置 AI Key');
  const provider = config.provider || 'anthropic';
  const model = resolveModel(config);
  const baseURL = resolveBaseURL(config);
  const apiKey = config.apiKey.trim();
  return provider === 'anthropic'
    ? callAnthropic({ baseURL, apiKey, model, system, user, maxTokens, signal })
    : callOpenAI({ baseURL, apiKey, model, system, user, maxTokens, signal });
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
  const text = ((data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '').trim();
  if (!text) throw new Error('模型未返回文本内容');
  return text;
}

async function errorText(res) {
  let detail = '';
  try {
    const body = await res.json();
    detail = body?.error?.message || body?.error?.type || JSON.stringify(body).slice(0, 200);
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
    '网络请求失败：可能是跨域(CORS)被拦、网络不通或地址有误。原始信息：' +
    (e && e.message ? e.message : String(e))
  );
}

/* ----------------------------- 流式输出（SSE） ----------------------------- */

/**
 * 从一条 SSE `data:` 负载里抽取「本次新增的文本分片」。纯函数，便于单测。
 * @param {'anthropic'|'openai'} provider
 * @param {string} dataStr  `data:` 后面的内容
 * @returns {string} 文本分片（无内容或控制事件时返回 ''）
 */
export function extractDelta(provider, dataStr) {
  const s = String(dataStr || '').trim();
  if (!s || s === '[DONE]') return '';
  let obj;
  try {
    obj = JSON.parse(s);
  } catch {
    return '';
  }
  if (provider === 'anthropic') {
    // content_block_delta → delta.text；其余事件（message_start/ping/…）无文本
    if (obj.type === 'content_block_delta') return obj.delta?.text || '';
    return '';
  }
  // OpenAI 兼容：choices[0].delta.content
  return obj.choices?.[0]?.delta?.content || '';
}

/**
 * 读取一个 SSE 响应体（ReadableStream），逐分片回调，返回完整文本。
 * 抽成独立函数以便用假 ReadableStream 单测。
 * @param {ReadableStream<Uint8Array>} body
 * @param {'anthropic'|'openai'} provider
 * @param {(piece:string, full:string)=>void} [onToken]
 * @returns {Promise<string>}
 */
export async function streamSSE(body, provider, onToken) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  const flushLine = (line) => {
    const t = line.trim();
    if (!t || !t.startsWith('data:')) return;
    const piece = extractDelta(provider, t.slice(5));
    if (piece) {
      full += piece;
      if (onToken) onToken(piece, full);
    }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      flushLine(buffer.slice(0, nl));
      buffer = buffer.slice(nl + 1);
    }
  }
  if (buffer) flushLine(buffer);
  return full;
}

/**
 * 流式对话补全：逐分片回调 onToken，最终返回完整文本。
 * 服务端不支持流（无 body）时回退为整体读取。
 */
export async function callChatStream({ config, system, user, maxTokens = 1500, signal, onToken }) {
  if (typeof fetch !== 'function') throw new Error('当前环境不支持 fetch');
  if (!isConfigured(config)) throw new Error('尚未配置 AI Key');
  const provider = config.provider || 'anthropic';
  const model = resolveModel(config);
  const baseURL = resolveBaseURL(config);
  const apiKey = config.apiKey.trim();

  const url = provider === 'anthropic' ? `${baseURL}/v1/messages` : `${baseURL}/v1/chat/completions`;
  const headers =
    provider === 'anthropic'
      ? {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        }
      : { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` };
  const payload =
    provider === 'anthropic'
      ? { model, max_tokens: maxTokens, stream: true, system, messages: [{ role: 'user', content: user }] }
      : {
          model,
          max_tokens: maxTokens,
          stream: true,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        };

  let res;
  try {
    res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal });
  } catch (e) {
    throw new Error(networkHint(e));
  }
  if (!res.ok) throw new Error(await errorText(res));
  if (!res.body || typeof res.body.getReader !== 'function') {
    // 环境/代理不支持流式 → 回退非流式
    return callChat({ config, system, user, maxTokens, signal });
  }
  const text = (await streamSSE(res.body, provider, onToken)).trim();
  if (!text) throw new Error('模型未返回文本内容');
  return text;
}

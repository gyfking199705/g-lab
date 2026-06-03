/**
 * 学习站 AI 代理 —— Cloudflare Worker
 * ------------------------------------------------------------------
 * 作用：把大模型 API Key 放在「服务端」（Worker secret），浏览器只调这个代理，
 *      这样「别人来学」时无需各自的 Key 就能用 AI（生成计划 / 讲解知识点）。
 *      Worker 无状态、不存任何数据，只是带 Key 的安全中转 + 补 CORS。
 *
 * 请求（与厂商无关的统一契约）：
 *   POST https://<your-worker>.workers.dev/
 *   body: { "system": "...", "user": "...", "max_tokens": 2000 }
 *   可选鉴权：Header  Authorization: Bearer <ACCESS_TOKEN>
 * 返回：
 *   { "text": "模型输出的纯文本" }
 *
 * 环境变量（在 Cloudflare 控制台 / wrangler 配置；API_KEY、ACCESS_TOKEN 建议用 Secret）：
 *   PROVIDER      'anthropic'（默认）| 'openai'
 *   API_KEY       上游厂商的 API Key（必填，Secret）
 *   MODEL         模型名（可选，默认 anthropic=claude-sonnet-4-6 / openai=gpt-4o-mini）
 *   ACCESS_TOKEN  可选访问口令；设置后请求必须带 Authorization: Bearer 才放行（防被白嫖）
 *   ALLOW_ORIGIN  可选 CORS 允许来源（默认 '*'；可填你的 Pages 站点域名收紧）
 *   BASE_URL      可选上游基址（默认 anthropic=https://api.anthropic.com / openai=https://api.openai.com）
 *
 * 部署见同目录 README.md。部署后把 Worker URL 填进 App「学习站 → 配置 AI → 后端代理」。
 */

const MAX_TOKENS_CAP = 4000;

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': (env && env.ALLOW_ORIGIN) || '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function json(obj, status, env) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(env) },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(env) });
    if (request.method !== 'POST') return json({ error: 'use POST' }, 405, env);
    if (!env || !env.API_KEY) return json({ error: '代理未配置 API_KEY' }, 500, env);

    // 可选访问口令
    if (env.ACCESS_TOKEN) {
      const auth = request.headers.get('Authorization') || '';
      const token = auth.replace(/^Bearer\s+/i, '').trim();
      if (token !== env.ACCESS_TOKEN) return json({ error: '未授权（缺少或错误的访问口令）' }, 401, env);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: '请求体不是合法 JSON' }, 400, env);
    }
    const system = typeof body.system === 'string' ? body.system : '';
    const user = typeof body.user === 'string' ? body.user : '';
    if (!user.trim()) return json({ error: '缺少 user 内容' }, 400, env);
    const maxTokens = Math.min(MAX_TOKENS_CAP, Math.max(1, parseInt(body.max_tokens, 10) || 2000));

    const provider = (env.PROVIDER || 'anthropic').toLowerCase();
    try {
      const text =
        provider === 'openai'
          ? await callOpenAI(env, { system, user, maxTokens, model: body.model })
          : await callAnthropic(env, { system, user, maxTokens, model: body.model });
      return json({ text }, 200, env);
    } catch (e) {
      return json({ error: String(e && e.message ? e.message : e) }, 502, env);
    }
  },
};

async function callAnthropic(env, { system, user, maxTokens, model }) {
  const base = (env.BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '');
  const r = await fetch(`${base}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || env.MODEL || 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!r.ok) throw new Error(`上游 ${r.status}: ${await safeErr(r)}`);
  const d = await r.json();
  const text = (d.content || []).map((b) => b.text || '').join('').trim();
  if (!text) throw new Error('上游未返回文本');
  return text;
}

async function callOpenAI(env, { system, user, maxTokens, model }) {
  const base = (env.BASE_URL || 'https://api.openai.com').replace(/\/$/, '');
  const r = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.API_KEY}` },
    body: JSON.stringify({
      model: model || env.MODEL || 'gpt-4o-mini',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!r.ok) throw new Error(`上游 ${r.status}: ${await safeErr(r)}`);
  const d = await r.json();
  const text = (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content || '').trim();
  if (!text) throw new Error('上游未返回文本');
  return text;
}

async function safeErr(r) {
  try {
    const b = await r.json();
    return (b && b.error && (b.error.message || b.error.type)) || JSON.stringify(b).slice(0, 200);
  } catch (e) {
    return (await r.text().catch(() => '')).slice(0, 200);
  }
}

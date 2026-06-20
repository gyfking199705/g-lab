import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ReadableStream } from 'node:stream/web';
import { extractDelta, streamSSE, defaultAIConfig, isConfigured, PROVIDERS } from './ai.js';

test('extractDelta：Anthropic content_block_delta 取文本，其余事件为空', () => {
  assert.equal(
    extractDelta('anthropic', JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: '你好' } })),
    '你好',
  );
  assert.equal(extractDelta('anthropic', JSON.stringify({ type: 'message_start' })), '');
  assert.equal(extractDelta('anthropic', JSON.stringify({ type: 'ping' })), '');
});

test('extractDelta：OpenAI choices[0].delta.content', () => {
  assert.equal(
    extractDelta('openai', JSON.stringify({ choices: [{ delta: { content: 'Hi' } }] })),
    'Hi',
  );
  assert.equal(extractDelta('openai', JSON.stringify({ choices: [{ delta: {} }] })), '');
});

test('extractDelta：[DONE] 与非法 JSON 返回空', () => {
  assert.equal(extractDelta('openai', '[DONE]'), '');
  assert.equal(extractDelta('anthropic', '不是json'), '');
  assert.equal(extractDelta('openai', ''), '');
});

/** 用假 ReadableStream 喂 SSE 文本分片（可故意把一行切成两块，验证缓冲拼接）。 */
function streamFrom(chunks) {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      for (const ch of chunks) c.enqueue(enc.encode(ch));
      c.close();
    },
  });
}

test('streamSSE：OpenAI 流逐分片回调并拼出完整文本', async () => {
  const body = streamFrom([
    'data: {"choices":[{"delta":{"content":"Hel"}}]}\n',
    'data: {"choices":[{"delta":{"content":"lo"}}]}\n',
    'data: [DONE]\n',
  ]);
  const pieces = [];
  const full = await streamSSE(body, 'openai', (p) => pieces.push(p));
  assert.deepEqual(pieces, ['Hel', 'lo']);
  assert.equal(full, 'Hello');
});

test('streamSSE：跨 chunk 切断的一行也能正确拼接（Anthropic）', async () => {
  const evt = 'data: {"type":"content_block_delta","delta":{"text":"流式"}}\n';
  const body = streamFrom([evt.slice(0, 20), evt.slice(20), 'data: {"type":"message_stop"}\n']);
  const full = await streamSSE(body, 'anthropic');
  assert.equal(full, '流式');
});

test('默认配置未填 Key 时 isConfigured 为 false；Anthropic 预设含最新模型', () => {
  assert.equal(isConfigured(defaultAIConfig()), false);
  assert.equal(isConfigured({ apiKey: 'sk-x' }), true);
  assert.ok(PROVIDERS.anthropic.models.includes('claude-opus-4-8'));
});

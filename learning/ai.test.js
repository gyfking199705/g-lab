import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultAIConfig, isConfigured, PROVIDERS } from './ai.js';

test('defaultAIConfig：默认 BYOK、空 Key、含代理字段', () => {
  const c = defaultAIConfig();
  assert.equal(c.mode, 'byok');
  assert.equal(c.apiKey, '');
  assert.equal(c.proxyURL, '');
  assert.equal(c.provider, 'anthropic');
});

test('isConfigured：BYOK 看 Key', () => {
  assert.equal(isConfigured(null), false);
  assert.equal(isConfigured({ mode: 'byok', apiKey: '' }), false);
  assert.equal(isConfigured({ mode: 'byok', apiKey: '  ' }), false);
  assert.equal(isConfigured({ mode: 'byok', apiKey: 'sk-ant-xxx' }), true);
});

test('isConfigured：代理模式看 proxyURL（无需 Key）', () => {
  assert.equal(isConfigured({ mode: 'proxy', proxyURL: '' }), false);
  assert.equal(isConfigured({ mode: 'proxy', proxyURL: 'https://x.workers.dev', apiKey: '' }), true);
});

test('PROVIDERS：含 anthropic / openai 且有默认模型', () => {
  assert.ok(PROVIDERS.anthropic && PROVIDERS.anthropic.defaultModel);
  assert.ok(PROVIDERS.openai && PROVIDERS.openai.defaultModel);
});

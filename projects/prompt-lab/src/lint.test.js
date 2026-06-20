import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintPrompt, gradeOf } from './lint.js';
import { normalizePrompt } from './schema.js';

test('优质 prompt 得高分（满足全部检查）', () => {
  const p = normalizePrompt({
    title: 'X',
    summary: '做某事',
    category: 'coding',
    system: '你是一名资深工程师。',
    content: '请评审下面的代码 {{diff}}，只依据给定 diff，不要编造；按 JSON 格式输出。例如：{"ok":true}',
    techniques: ['structured-output', 'guardrails', 'few-shot'],
    exampleInput: 'a',
    exampleOutput: 'b',
  });
  const r = lintPrompt(p);
  assert.equal(r.passed, r.total);
  assert.equal(r.score, 100);
  assert.equal(r.grade.key, 'A');
});

test('贫瘠 prompt 得低分并给建议', () => {
  const p = normalizePrompt({ title: 'Y', content: '写点东西' });
  const r = lintPrompt(p);
  assert.ok(r.score < 50);
  assert.equal(r.grade.key, 'D');
  const role = r.checks.find((c) => c.id === 'role');
  assert.equal(role.pass, false);
  assert.ok(role.tip.length > 0);
});

test('角色检查：System 或正文角色措辞均可', () => {
  const a = lintPrompt(normalizePrompt({ content: '你是一名医生，请…………………………' }));
  assert.equal(a.checks.find((c) => c.id === 'role').pass, true);
  const b = lintPrompt(normalizePrompt({ system: '你是助手', content: '随便' }));
  assert.equal(b.checks.find((c) => c.id === 'role').pass, true);
});

test('变量检查依据 variables 派生', () => {
  const r = lintPrompt(normalizePrompt({ content: '处理 {{x}} 内容并输出列表' }));
  assert.equal(r.checks.find((c) => c.id === 'variables').pass, true);
});

test('guardrails 关键词命中', () => {
  const r = lintPrompt(normalizePrompt({ content: '仅依据上下文回答，未提及就说不知道，且内容要够长触发任务检查' }));
  assert.equal(r.checks.find((c) => c.id === 'guardrails').pass, true);
});

test('gradeOf 分段', () => {
  assert.equal(gradeOf(90).key, 'A');
  assert.equal(gradeOf(72).key, 'B');
  assert.equal(gradeOf(55).key, 'C');
  assert.equal(gradeOf(20).key, 'D');
});

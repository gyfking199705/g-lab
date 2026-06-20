import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classify, decompose, planToSpecs, parsePlan, synthesize,
  buildPlanMessages, buildAgentMessages, buildSynthesisMessages, mockRun, depOutputs,
} from './orchestrator.js';
import { makeTask } from './queue.js';

test('classify 按关键词识别需求类型', () => {
  assert.equal(classify('帮我开发一个待办应用'), 'build');
  assert.equal(classify('调研一下多智能体框架'), 'research');
  assert.equal(classify('我该不该换工作'), 'decide');
  assert.equal(classify('写一封道歉邮件'), 'write');
  assert.equal(classify('随便聊聊'), 'general');
});

test('decompose 产出含调研/规划/执行/评审/汇总的管线，且恰有一个 synthesizer', () => {
  const plan = decompose('做个待办应用');
  const roles = plan.map((p) => p.role);
  assert.ok(roles.includes('researcher'));
  assert.ok(roles.includes('planner'));
  assert.ok(roles.includes('worker'));
  assert.ok(roles.includes('critic'));
  assert.equal(roles.filter((r) => r === 'synthesizer').length, 1);
});

test('decompose：两路调研无依赖，可并行；规划依赖两路调研', () => {
  const plan = decompose('做个应用');
  const r = plan.filter((p) => p.role === 'researcher');
  assert.equal(r.length, 2);
  r.forEach((t) => assert.deepEqual(t.depKeys, []));
  const planner = plan.find((p) => p.role === 'planner');
  assert.deepEqual(planner.depKeys.sort(), ['r1', 'r2']);
});

test('planToSpecs 把 depKeys 解析成真实 id', () => {
  const plan = decompose('做个应用');
  const specs = planToSpecs(plan, (i) => `id${i}`);
  const planner = specs.find((s) => s.role === 'planner');
  // 规划依赖两路调研（id0, id1）
  assert.deepEqual(planner.deps.sort(), ['id0', 'id1']);
  // synthesizer 依赖其余全部
  const synth = specs.find((s) => s.role === 'synthesizer');
  assert.equal(synth.deps.length, specs.length - 1);
});

test('parsePlan 解析合法 JSON', () => {
  const text = '```json\n{"tasks":[{"key":"a","role":"researcher","title":"调研","depKeys":[]},{"key":"b","role":"synthesizer","title":"汇总","depKeys":["a"]}]}\n```';
  const plan = parsePlan(text, '需求');
  assert.equal(plan.length, 2);
  assert.equal(plan[0].role, 'researcher');
  assert.deepEqual(plan[1].depKeys, ['a']);
});

test('parsePlan 非法输入回退到离线 decompose', () => {
  const plan = parsePlan('这不是 JSON', '做个应用');
  assert.ok(plan.length >= 5); // 回退到完整管线
  assert.ok(plan.some((p) => p.role === 'synthesizer'));
});

test('parsePlan 把未知角色归一到合法角色', () => {
  const text = '{"tasks":[{"key":"a","role":"hacker","title":"X"},{"key":"b","role":"writer","title":"Y"}]}';
  const plan = parsePlan(text, '需求');
  // getRole 对未知 id 回落 worker
  assert.equal(plan[0].role, 'worker');
});

test('buildXxxMessages 含需求与角色约束', () => {
  const pm = buildPlanMessages('做个应用');
  assert.match(pm.user, /做个应用/);
  assert.match(pm.system, /协调者/);

  const job = { requirement: '做个应用', tasks: [] };
  const t = makeTask({ id: 'x', role: 'planner', title: '规划', brief: '排步骤' });
  const am = buildAgentMessages(t, job);
  assert.match(am.user, /做个应用/);
  assert.match(am.user, /规划/);
});

test('depOutputs 汇集依赖任务的产出', () => {
  const dep = makeTask({ id: 'a', role: 'researcher', title: 'A' });
  dep.output = '调研结论';
  dep.status = 'done';
  const t = makeTask({ id: 'b', role: 'planner', title: 'B', deps: ['a'] });
  const job = { requirement: 'x', tasks: [dep, t] };
  const ctx = depOutputs(t, job);
  assert.match(ctx, /调研结论/);
});

test('mockRun 为各角色产出确定性、可读的文本', () => {
  const job = { requirement: '做个应用', tasks: [] };
  for (const role of ['researcher', 'planner', 'worker', 'critic']) {
    const t = makeTask({ id: role, role, title: '任务', brief: '简述' });
    const out = mockRun(t, job);
    assert.ok(out.length > 10);
    assert.equal(out, mockRun(t, job)); // 确定性
  }
});

test('synthesize 产出含结论/下一步/风险的最终文本', () => {
  const tasks = [
    { id: 'a', role: 'researcher', status: 'done', output: 'x' },
    { id: 'b', role: 'worker', status: 'done', output: 'y' },
  ];
  const job = { requirement: '做个应用', tasks };
  const out = synthesize(job);
  assert.match(out, /结论/);
  assert.match(out, /下一步/);
  assert.match(out, /风险/);

  const sm = buildSynthesisMessages(job);
  assert.match(sm.user, /做个应用/);
});

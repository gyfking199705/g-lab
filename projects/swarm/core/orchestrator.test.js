import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classify, decompose, planToSpecs, parsePlan, synthesize,
  buildPlanMessages, buildAgentMessages, buildSynthesisMessages, mockRun, depOutputs,
  parseVerdict, reworkSpecs, injectRework, isRework, isSimpleIntent, routeDecompose, buildPlan,
  topologyLabel,
} from './orchestrator.js';
import { makeTask, topoLayers } from './queue.js';

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

test('general 拓扑：两路调研无依赖可并行，规划依赖两路调研', () => {
  const plan = decompose('整理一下我的想法'); // general
  const r = plan.filter((p) => p.role === 'researcher');
  assert.equal(r.length, 2);
  r.forEach((t) => assert.deepEqual(t.depKeys, []));
  const planner = plan.find((p) => p.role === 'planner');
  assert.deepEqual(planner.depKeys.sort(), ['r1', 'r2']);
});

test('planToSpecs 把 depKeys 解析成真实 id', () => {
  const plan = decompose('整理一下我的想法'); // general：2 路调研
  const specs = planToSpecs(plan, (i) => `id${i}`);
  const planner = specs.find((s) => s.role === 'planner');
  assert.deepEqual(planner.deps.sort(), ['id0', 'id1']);
  // synthesizer 依赖其余全部
  const synth = specs.find((s) => s.role === 'synthesizer');
  assert.equal(synth.deps.length, specs.length - 1);
});

test('自适应拓扑：build=单线程深链 / research=多路并行 / decide=决策框架', () => {
  // build：编码类应为单线程链——每个非汇总任务最多 1 个直接后继，无并行调研
  const build = decompose('帮我开发一个待办应用');
  assert.equal(build.filter((p) => p.role === 'researcher').length, 1);
  const bSpecs = planToSpecs(build, (i) => `b${i}`);
  const bLayers = topoLayers(bSpecs);
  // 单线程链 → 每一波只有 1 个任务
  assert.ok(bLayers.every((layer) => layer.length === 1), '单线程深链每波次只 1 个');

  // research：应有 3 路并行调研（同一波次）
  const research = decompose('调研一下多智能体框架');
  assert.equal(research.filter((p) => p.role === 'researcher').length, 3);
  const rSpecs = planToSpecs(research, (i) => `r${i}`);
  const rLayers = topoLayers(rSpecs);
  assert.equal(rLayers[0].length, 3, '三路调研并行在第一波');

  // decide：含决策框架（planner）与打分（worker）
  const decide = decompose('我该不该换工作');
  assert.ok(decide.some((p) => p.role === 'planner'));
  assert.ok(decide.some((p) => p.role === 'worker'));

  // 每种拓扑都恰有一个 synthesizer 且依赖其余全部
  for (const plan of [build, research, decide]) {
    assert.equal(plan.filter((p) => p.role === 'synthesizer').length, 1);
    const synth = plan.find((p) => p.role === 'synthesizer');
    assert.equal(synth.depKeys.length, plan.length - 1);
  }
});

test('topologyLabel 给出各拓扑中文名', () => {
  assert.equal(topologyLabel('build'), '单线程深链');
  assert.equal(topologyLabel('research'), '广度并行');
  assert.equal(topologyLabel('decide'), '决策框架');
  assert.equal(topologyLabel('xxx'), '默认编排');
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

test('parseVerdict 识别通过/未通过，未知默认通过', () => {
  assert.equal(parseVerdict('验收: 通过 ✅').pass, true);
  assert.equal(parseVerdict('验收: 未通过（72/100）').pass, false); // 「未通过」优先于「通过」
  assert.equal(parseVerdict('PASS').pass, true);
  assert.equal(parseVerdict('随便一段话').pass, true); // 无信号默认通过，避免无限返工
});

test('mockRun：首版评审未通过、返工后复评通过', () => {
  const worker = makeTask({ id: 'w', role: 'worker', title: '产出交付草案' });
  const job1 = { requirement: 'x', tasks: [worker] };
  const c1 = makeTask({ id: 'c', role: 'critic', title: '评审与挑错', deps: ['w'] });
  job1.tasks.push(c1);
  assert.equal(parseVerdict(mockRun(c1, job1)).pass, false);

  const rework = makeTask({ id: 'w2', role: 'worker', title: '按评审返工（第1轮）' });
  assert.equal(isRework(rework), true);
  const c2 = makeTask({ id: 'c2', role: 'critic', title: '复评（第1轮）', deps: ['w2'] });
  const job2 = { requirement: 'x', tasks: [rework, c2] };
  assert.equal(parseVerdict(mockRun(c2, job2)).pass, true);
});

test('reworkSpecs 产出返工执行 + 复评，依赖正确', () => {
  const [w, c] = reworkSpecs('cFail', 'wNew', 'cNew', 1);
  assert.equal(w.role, 'worker');
  assert.deepEqual(w.deps, ['cFail']);
  assert.equal(c.role, 'critic');
  assert.deepEqual(c.deps, ['wNew']);
});

test('injectRework：评审未通过时注入返工+复评，并顺延汇总者依赖', () => {
  let n = 0;
  const mk = () => `x${n++}`;
  const tasks = [
    makeTask({ id: 'w', role: 'worker', title: '产出交付草案' }),
    { ...makeTask({ id: 'c', role: 'critic', title: '评审', deps: ['w'] }), status: 'done', output: '验收: 未通过' },
    makeTask({ id: 's', role: 'synthesizer', title: '汇总', deps: ['w', 'c'] }),
  ];
  const job = injectRework({ requirement: 'x', tasks }, { maxRounds: 2, makeId: mk });
  // 新增了 2 个任务
  assert.equal(job.tasks.length, 5);
  const rework = job.tasks.find((t) => isRework(t));
  assert.ok(rework);
  const reReview = job.tasks.find((t) => t.role === 'critic' && t.deps.includes(rework.id));
  assert.ok(reReview);
  // 汇总者改为也依赖复评
  const synth = job.tasks.find((t) => t.role === 'synthesizer');
  assert.ok(synth.deps.includes(reReview.id));
});

test('injectRework：评审通过 / 已有下游 / 超轮次 时不注入', () => {
  // 通过 → 不注入
  const pass = injectRework({ tasks: [
    { ...makeTask({ id: 'c', role: 'critic', title: '评审', deps: ['w'] }), status: 'done', output: '验收: 通过' },
  ] }, { makeId: () => 'z' });
  assert.equal(pass.tasks.length, 1);

  // 失败但已有返工下游 → 不重复注入
  const handled = injectRework({ tasks: [
    { ...makeTask({ id: 'c', role: 'critic', title: '评审', deps: ['w'] }), status: 'done', output: '未通过' },
    makeTask({ id: 'w2', role: 'worker', title: '按评审返工（第1轮）', deps: ['c'] }),
  ] }, { makeId: () => 'z' });
  assert.equal(handled.tasks.length, 2);

  // 已达轮次上限 → 不注入
  const capped = injectRework({ tasks: [
    makeTask({ id: 'w2', role: 'worker', title: '按评审返工（第1轮）' }),
    { ...makeTask({ id: 'c2', role: 'critic', title: '复评（第1轮）', deps: ['w2'] }), status: 'done', output: '未通过' },
  ] }, { maxRounds: 1, makeId: () => 'z' });
  assert.equal(capped.tasks.length, 2);
});

test('isSimpleIntent：单一清晰意图为真，复杂/长需求为假', () => {
  assert.equal(isSimpleIntent('翻译这句话'), true);
  assert.equal(isSimpleIntent('什么是闭包'), true);
  assert.equal(isSimpleIntent('帮我做一个团队周报工具并对比几种方案'), false); // 含「并」「对比」
  assert.equal(isSimpleIntent('调研多智能体框架'), false); // 含「调研」
  assert.equal(isSimpleIntent(''), false);
  assert.equal(isSimpleIntent('请基于我们现有的架构设计一个完整的迁移方案和步骤'), false); // 过长+复杂
});

test('buildPlan：简单→快路径(2步)，复杂→全量', () => {
  const fast = buildPlan('翻译这句话');
  assert.equal(fast.route, 'fast');
  assert.equal(fast.plan.length, 2);
  assert.ok(fast.plan.some((p) => p.role === 'worker'));
  assert.ok(fast.plan.some((p) => p.role === 'synthesizer'));

  const full = buildPlan('做一个团队周报工具并调研同类方案');
  assert.equal(full.route, 'full');
  assert.ok(full.plan.length >= 5);
});

test('routeDecompose：汇总者依赖执行者', () => {
  const specs = planToSpecs(routeDecompose('翻译'), (n) => `r${n}`);
  const synth = specs.find((s) => s.role === 'synthesizer');
  const worker = specs.find((s) => s.role === 'worker');
  assert.deepEqual(synth.deps, [worker.id]);
});

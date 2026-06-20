/**
 * 执行引擎 —— 把队列调度（queue.js）、编排（orchestrator.js）、模型调用（ai.js）串起来。
 * ------------------------------------------------------------------
 * 这是唯一「有副作用」的模块（异步 / 计时 / 网络）；调度判断仍复用 queue.js 的纯函数。
 * 通过 onUpdate 回调把每一步状态推给 UI，实现「集群波次」的实时可视化。
 *
 * 两种执行模式自动切换：
 *   - 配了 AI Key（isConfigured）→ 真实大模型逐个角色处理。
 *   - 没配 Key → 离线模拟引擎（mockRun），同样完整跑通分工→协作→汇总。
 */

import {
  createJob, loadTasks, runnableTasks, startTask, finishTask, failTask, hasPending, isDeadlocked,
} from './queue.js';
import {
  decompose, routeDecompose, isSimpleIntent, planToSpecs, buildPlanMessages, parsePlan,
  buildAgentMessages, buildSynthesisMessages, mockRun, injectRework,
} from './orchestrator.js';
import { isConfigured, callChat, callChatStream } from './ai.js';
import { estimateJobCost } from './cost.js';

/** 估算用的定价模型：优先用户所选，否则按厂商默认。 */
function pricingModel(config) {
  if (config && config.model && config.model.trim()) return config.model.trim();
  return config && config.provider === 'openai' ? 'gpt-4o-mini' : 'claude-sonnet-4-6';
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 跑完一个需求的完整多智能体协作流程。
 * @param {object} o
 * @param {string} o.requirement   用户需求
 * @param {object} o.config        AI 配置（BYOK），未配置则走离线模拟
 * @param {(job)=>void} o.onUpdate 每次状态变化的回调（传入最新 job 快照）
 * @param {number} [o.concurrency] 集群并发上限（同一波次最多同时跑几个 agent）
 * @param {number} [o.stepDelay]   每步之间的演示延时（离线模式让过程可见）
 * @param {AbortSignal} [o.signal]
 * @returns {Promise<object>} 最终 job
 */
export async function runJob({ requirement, config, onUpdate = () => {}, concurrency = 2, stepDelay = 500, maxRounds = 2, signal }) {
  let job = createJob(requirement);
  const useLLM = isConfigured(config);

  // 1) 规划阶段：协调者拆解需求
  job = { ...job, status: 'planning' };
  onUpdate(job);
  await sleep(stepDelay);

  // 路由：单一清晰意图走快路径（省 token）；否则全量编排（LLM 规划或离线拆解）
  let plan;
  let route = 'full';
  if (isSimpleIntent(requirement)) {
    plan = routeDecompose(requirement);
    route = 'fast';
  } else if (useLLM) {
    try {
      const { system, user } = buildPlanMessages(requirement);
      const text = await callChat({ config, system, user, maxTokens: 1200, signal });
      plan = parsePlan(text, requirement);
    } catch (e) {
      plan = decompose(requirement); // 规划失败回落离线拆解
    }
  } else {
    plan = decompose(requirement);
  }

  let i = 0;
  const mkId = () => `t${job.id}_${i++}`;
  const specs = planToSpecs(plan, mkId);
  const model = pricingModel(config);
  job = loadTasks(job, specs);
  job = { ...job, route, estimate: estimateJobCost(specs, { requirement, model }) };
  onUpdate(job);

  // 2) 调度循环：每轮取出可并行的任务（集群波次），并发执行
  while (hasPending(job.tasks)) {
    if (signal?.aborted) throw new Error('已取消');
    const ready = runnableTasks(job.tasks).slice(0, concurrency);
    if (ready.length === 0) {
      if (isDeadlocked(job.tasks)) {
        job = { ...job, status: 'failed', error: '任务依赖无法满足（可能存在依赖环或上游失败）' };
        onUpdate(job);
        return job;
      }
      await sleep(50);
      continue;
    }

    // 标记本波次为 running
    ready.forEach((t) => {
      job = { ...job, tasks: startTask(job.tasks, t.id) };
    });
    if (ready.some((t) => t.role === 'synthesizer')) job = { ...job, status: 'synthesizing' };
    onUpdate(job);
    await sleep(stepDelay);

    // 流式分片：把某任务的实时产出写进它的 output 并刷新 UI（多任务并发，同步读改写安全）
    const onPartial = (id, full) => {
      job = { ...job, tasks: job.tasks.map((t) => (t.id === id ? { ...t, output: full } : t)) };
      onUpdate(job);
    };

    // 并发执行本波次
    const results = await Promise.all(
      ready.map(async (t) => {
        try {
          const output = await runTask(t, job, {
            useLLM, config, signal, onToken: (_piece, full) => onPartial(t.id, full),
          });
          return { id: t.id, output };
        } catch (e) {
          return { id: t.id, error: e?.message || String(e) };
        }
      }),
    );
    results.forEach((r) => {
      job = r.error
        ? { ...job, tasks: failTask(job.tasks, r.id, r.error) }
        : { ...job, tasks: finishTask(job.tasks, r.id, r.output) };
    });

    // 验证—返工闭环：评审未通过且未超轮次 → 注入「返工 + 复评」，汇总者顺延等待
    const expanded = injectRework(job, { maxRounds, makeId: mkId });
    if (expanded !== job) {
      job = expanded;
      if (job.status === 'synthesizing') job = { ...job, status: 'running' };
      // 返工新增了任务，预估随之上调，保持与实际待跑量一致
      job = { ...job, estimate: estimateJobCost(job.tasks, { requirement, model }) };
    }
    onUpdate(job);
  }

  // 3) 收尾：取汇总者产出作为最终结论
  const synth = job.tasks.find((t) => t.role === 'synthesizer' && t.status === 'done');
  job = {
    ...job,
    conclusion: synth ? synth.output : null,
    status: job.tasks.some((t) => t.status === 'failed') && !synth ? 'failed' : 'done',
  };
  onUpdate(job);
  return job;
}

/** 执行单个子任务：LLM 模式流式调模型，否则离线模拟。 */
async function runTask(task, job, { useLLM, config, signal, onToken }) {
  if (useLLM) {
    const isSynth = task.role === 'synthesizer';
    const { system, user } = isSynth ? buildSynthesisMessages(job) : buildAgentMessages(task, job);
    return callChatStream({ config, system, user, maxTokens: isSynth ? 1500 : 1200, signal, onToken });
  }
  return mockRun(task, job);
}

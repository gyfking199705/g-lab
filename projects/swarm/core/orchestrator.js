/**
 * 编排逻辑 —— 把「需求」变成「带角色与依赖的子任务」，再把子任务产出汇总成「结论」。
 * ------------------------------------------------------------------
 * 全是纯函数，两套实现并存：
 *   1) 离线启发式（offline）：无需任何 API Key 也能完整跑通流程，用于 GitHub Pages 演示。
 *   2) LLM 提示词构建 / 解析（buildXxxMessages / parsePlan）：BYOK 接真实大模型时用。
 *
 * 默认管线遵循业界 orchestrator-worker 主流范式：
 *   协调者拆解 → (调研 ∥ …) → 规划 → 执行 → 评审 → 汇总
 * 其中无依赖的子任务可并行（集群模式），有依赖的串行。
 */

import { getRole } from './roles.js';
import { makeTask } from './queue.js';

/* ============================ 1. 需求分类 ============================ */

const KIND_RULES = [
  { kind: 'build', re: /(做|开发|搭建|实现|构建|写个|做一个|build|develop|app|系统|网站|功能)/i },
  { kind: 'research', re: /(调研|研究|对比|了解|分析|评估|research|compare|survey)/i },
  { kind: 'decide', re: /(选|该不该|要不要|决定|哪个|是否|decision|should|whether)/i },
  { kind: 'write', re: /(写|文案|方案|报告|文章|邮件|总结|write|draft|copy|report)/i },
];

/** 粗分需求类型，决定默认的角色管线。 */
export function classify(requirement) {
  const text = String(requirement || '');
  for (const r of KIND_RULES) if (r.re.test(text)) return r.kind;
  return 'general';
}

/* ============================ 2. 离线拆解（按拓扑自适应） ============================ */

/** 给「汇总者」自动连上前面全部任务的 key。 */
function withSynth(specs, synthSpec) {
  const deps = specs.map((s) => s.key);
  return [...specs, { ...synthSpec, role: 'synthesizer', depKeys: deps }];
}

/** 每种需求类型的拓扑构造器。返回带 depKeys 的占位规格（不含 id）。 */
const TOPOLOGIES = {
  // 编码/构建：深且顺序 → 单线程深链（业界共识：强耦合任务别 fan-out）
  build(req) {
    return withSynth([
      { key: 'r1', role: 'researcher', title: '需求与约束调研', brief: `梳理「${req}」的范围、约束、依赖与衡量标准。`, depKeys: [] },
      { key: 'p1', role: 'planner', title: '架构与任务拆解', brief: '定架构与接口，拆成有序、可实现的步骤。', depKeys: ['r1'] },
      { key: 'w1', role: 'worker', title: '实现主干', brief: '按拆解单线程实现主干（保持连续上下文，不并行分叉）。', depKeys: ['p1'] },
      { key: 'c1', role: 'critic', title: '评审与挑错', brief: '对实现做对抗式检查，给可执行修改意见与验收判断。', depKeys: ['w1'] },
    ], { key: 's1', title: '汇总最终结论', brief: '整合全过程，给一句话结论 + 关键要点 + 下一步 + 风险。' });
  },
  // 调研：广度优先 → 多路并行子问题，再交叉核验
  research(req) {
    return withSynth([
      { key: 'r1', role: 'researcher', title: '子问题 A：现状与定义', brief: `围绕「${req}」查清现状、关键概念与边界。`, depKeys: [] },
      { key: 'r2', role: 'researcher', title: '子问题 B：方案与对标', brief: '并行调研可选方案、业界对标与优劣。', depKeys: [] },
      { key: 'r3', role: 'researcher', title: '子问题 C：风险与代价', brief: '并行调研风险、成本与失败模式。', depKeys: [] },
      { key: 'c1', role: 'critic', title: '交叉核验', brief: '对三路调研做一致性/可信度交叉核验，标注分歧与缺口。', depKeys: ['r1', 'r2', 'r3'] },
    ], { key: 's1', title: '汇总调研结论', brief: '整合多路发现，给结论 + 对比要点 + 下一步 + 待确认项。' });
  },
  // 决策：可打分的决策框架
  decide(req) {
    return withSynth([
      { key: 'r1', role: 'researcher', title: '选项与事实', brief: `列出「${req}」的可选项与各自关键事实。`, depKeys: [] },
      { key: 'p1', role: 'planner', title: '建立决策框架', brief: '定义评估维度与权重，搭出可打分的决策框架。', depKeys: ['r1'] },
      { key: 'w1', role: 'worker', title: '打分与推荐', brief: '按框架逐项打分，产出带理由的推荐选项与取舍。', depKeys: ['p1'] },
      { key: 'c1', role: 'critic', title: '复核取舍', brief: '检查权重与打分是否合理、有无遗漏的关键因素。', depKeys: ['w1'] },
    ], { key: 's1', title: '汇总决策建议', brief: '给出推荐选项一句话结论 + 理由 + 风险 + 何时复盘。' });
  },
  // 写作：精简 调研→初稿→润色
  write(req) {
    return withSynth([
      { key: 'r1', role: 'researcher', title: '资料与要点', brief: `为「${req}」收集素材、受众与关键信息点。`, depKeys: [] },
      { key: 'w1', role: 'worker', title: '撰写初稿', brief: '按要点产出结构清晰、可直接使用的完整初稿。', depKeys: ['r1'] },
      { key: 'c1', role: 'critic', title: '润色评审', brief: '检查结构/逻辑/语气，给具体修改建议与验收判断。', depKeys: ['w1'] },
    ], { key: 's1', title: '汇总成稿', brief: '给最终稿要点 + 可改进项 + 使用建议。' });
  },
  // 通用：两路并行调研 → 规划 → 执行 → 评审
  general(req) {
    return withSynth([
      { key: 'r1', role: 'researcher', title: '需求与背景调研', brief: `围绕「${req}」收集关键事实、约束与可选方案。`, depKeys: [] },
      { key: 'r2', role: 'researcher', title: '风险与对标调研', brief: '调研同类做法、业界对标与主要风险点。', depKeys: [] },
      { key: 'p1', role: 'planner', title: '拆解执行计划', brief: '综合调研，排出有优先级、可执行的步骤与里程碑。', depKeys: ['r1', 'r2'] },
      { key: 'w1', role: 'worker', title: '产出交付草案', brief: '按计划产出可交付的第一版成果。', depKeys: ['p1'] },
      { key: 'c1', role: 'critic', title: '评审与挑错', brief: '对草案做对抗式检查，给可执行修改意见与验收判断。', depKeys: ['w1'] },
    ], { key: 's1', title: '汇总最终结论', brief: '整合全部产出，给一句话结论 + 关键要点 + 下一步 + 风险。' });
  },
};

/** 拓扑中文名（UI 展示）。 */
export function topologyLabel(kind) {
  return {
    build: '单线程深链',
    research: '广度并行',
    decide: '决策框架',
    write: '精简管线',
    general: '默认编排',
  }[kind] || '默认编排';
}

/**
 * 离线把需求按其类型拆成对应拓扑的子任务规格（不含 id）。
 * build=单线程深链 / research=多路并行 / decide=决策框架 / write=精简 / general=默认。
 */
export function decompose(requirement) {
  const kind = classify(requirement);
  const req = String(requirement || '').trim();
  return (TOPOLOGIES[kind] || TOPOLOGIES.general)(req);
}

/* ---------------------- 路由快路径（Bedrock 式：单一清晰意图直达） ---------------------- */

const COMPLEX_RE = /(并|和|然后|步骤|对比|调研|研究|系统|方案|架构|规划|计划|拆解|分别|以及|多个|，|,|、|;|；)/;
const SIMPLE_RE = /(查|算一?下|翻译|解释|什么是|定义|列举|改写|润色|总结一?下|生成一句|起个?名)/;

/**
 * 是否「单一清晰意图」——可走快路径，跳过全量编排省 token。保守判断：
 * 短、无并列/多步/调研等复杂信号，且像一句明确祈使。
 */
export function isSimpleIntent(requirement) {
  const s = String(requirement || '').trim();
  if (!s || s.length > 30) return false;
  if (COMPLEX_RE.test(s)) return false;
  // 编码/调研/决策类即便很短也要走对应拓扑，不能抄近路
  const kind = classify(s);
  if (kind === 'build' || kind === 'research' || kind === 'decide') return false;
  return SIMPLE_RE.test(s); // 必须是明确的单一祈使（查/翻译/解释/定义/总结…）
}

/** 快路径计划：执行者直接产出 → 汇总者收口（两步，省去多路调研/规划/返工）。 */
export function routeDecompose(requirement) {
  const req = String(requirement || '').trim();
  return [
    { key: 'w', role: 'worker', title: '直接完成需求', brief: `直接完成「${req}」并给出可用结果。`, depKeys: [] },
    { key: 's', role: 'synthesizer', title: '汇总结论', brief: '把结果整理成面向用户的简洁结论。', depKeys: ['w'] },
  ];
}

/** 统一入口：简单意图走快路径，否则全量拆解。返回 {plan, route}。 */
export function buildPlan(requirement) {
  return isSimpleIntent(requirement)
    ? { plan: routeDecompose(requirement), route: 'fast' }
    : { plan: decompose(requirement), route: 'full' };
}

/**
 * 把 decompose 的占位规格（带 depKeys）落成 makeTask 用的 spec（带真实 deps id）。
 * makeId: (i)=>id 的工厂，便于注入稳定 id。
 */
export function planToSpecs(plan, makeId) {
  const idByKey = {};
  plan.forEach((p, i) => {
    idByKey[p.key] = makeId(i, p);
  });
  return plan.map((p, i) => ({
    id: idByKey[p.key],
    role: p.role,
    title: p.title,
    brief: p.brief,
    deps: (p.depKeys || []).map((k) => idByKey[k]).filter(Boolean),
  }));
}

/* ============================ 3. 离线执行（模拟） ============================ */

/**
 * 离线模拟某个角色处理某个任务的产出。确定性（同输入同输出），
 * 目的是让没有 API Key 的访客也能看清「分工 + 集群协作 + 汇总」的完整流程。
 */
export function mockRun(task, job) {
  const role = getRole(task.role);
  const req = job.requirement || '（空需求）';
  const ctx = depOutputs(task, job);
  switch (task.role) {
    case 'researcher':
      return [
        `【${role.name}·${task.title}】`,
        `· 目标：${task.brief}`,
        `· 关键事实：「${req}」涉及的核心要素已梳理为 3 点：范围、约束、衡量标准。`,
        `· 可选方案：A（最小可行）/ B（均衡）/ C（理想态），各有成本与风险权衡。`,
        `· 未知项：需进一步确认的假设 2 条（数据可得性、时间预算）。`,
      ].join('\n');
    case 'planner':
      return [
        `【${role.name}·${task.title}】`,
        `· 里程碑：M1 打基础 → M2 出主干 → M3 打磨验收。`,
        `· 步骤（按优先级）：1) 锁定范围 2) 搭最小骨架 3) 填核心内容 4) 评审迭代。`,
        `· 依赖调研结论：${ctx ? '已采纳上游要点' : '（无上游）'}。`,
      ].join('\n');
    case 'worker':
      if (isRework(task)) {
        return [
          `【${role.name}·${task.title}】`,
          `· 已逐条回应评审意见：补全边界情况说明、为关键结论补充数据论据。`,
          `· 交付草案 v2：在 v1 基础上修订，质量达到可交付标准。`,
        ].join('\n');
      }
      return [
        `【${role.name}·${task.title}】`,
        `· 交付草案 v1：针对「${req}」给出可直接落地的第一版成果。`,
        `· 结构：背景 → 方案主体 → 关键细节 → 使用说明。`,
        `· 已按规划覆盖全部里程碑要点，留 2 处待评审确认。`,
      ].join('\n');
    case 'critic':
      // 评审「返工后的草案」→ 通过；评审「首版草案」→ 未通过（触发返工，演示闭环）
      if (reviewsRework(task, job)) {
        return [
          `【${role.name}·${task.title}】`,
          `· 上轮问题已解决：边界情况已补充、关键结论已加数据论据。`,
          `· 验收: 通过 ✅（达到验收标准，可交付）`,
        ].join('\n');
      }
      return [
        `【${role.name}·${task.title}】`,
        `· 通过项：结构完整、覆盖核心需求。`,
        `· 待改：① 缺少边界情况说明；② 第 3 点论据偏弱，建议补数据。`,
        `· 验收: 未通过（72/100，按建议返工后复评）`,
      ].join('\n');
    case 'synthesizer':
      return synthesize(job);
    default:
      return `【${role.name}·${task.title}】已完成：${task.brief}`;
  }
}

/** 取某任务所有依赖任务的产出，拼成上下文（截断防爆）。 */
export function depOutputs(task, job) {
  const map = Object.fromEntries((job.tasks || []).map((t) => [t.id, t]));
  return task.deps
    .map((d) => map[d])
    .filter((t) => t && t.output)
    .map((t) => `〔${getRole(t.role).name}〕${t.output}`)
    .join('\n\n');
}

/* ===================== 3b. 验证—返工闭环（generator-critic 迭代） ===================== */

/** 该任务本身是不是一次「返工」。 */
export function isRework(task) {
  return /返工/.test(task?.title || '');
}

/** 该评审任务评的是不是「返工后的草案」（用于判断是否该放行）。 */
export function reviewsRework(task, job) {
  const map = Object.fromEntries((job.tasks || []).map((t) => [t.id, t]));
  return (task.deps || []).some((d) => map[d] && isRework(map[d]));
}

/** 从评审产出解析是否通过验收。无明确信号时默认通过，避免无限返工。 */
export function parseVerdict(text) {
  const s = String(text || '');
  if (/未通过|不通过|不达标|未达标|FAIL|REJECT/i.test(s)) return { pass: false };
  if (/通过|达标|PASS|APPROVE/i.test(s)) return { pass: true };
  return { pass: true };
}

/** 构造一轮返工的两个任务规格：执行者返工 + 复评。 */
export function reworkSpecs(failedCriticId, reworkWorkerId, reReviewId, round) {
  return [
    {
      id: reworkWorkerId, role: 'worker', title: `按评审返工（第${round}轮）`,
      brief: '根据评审意见修订上一版交付物，逐条回应被指出的问题。', deps: [failedCriticId],
    },
    {
      id: reReviewId, role: 'critic', title: `复评（第${round}轮）`,
      brief: '检查返工是否解决了上一轮问题，给出验收判断（通过/未通过）。', deps: [reworkWorkerId],
    },
  ];
}

/**
 * 若存在「已完成、未通过、且还没有下游返工」的评审，且未超轮次上限，
 * 则注入「返工 + 复评」两个任务，并让仍排队的汇总者改为依赖最新复评。纯函数。
 * @param {object} job
 * @param {{maxRounds?:number, makeId?:()=>string}} o
 * @returns {object} 新 job（无需注入时原样返回）
 */
export function injectRework(job, { maxRounds = 2, makeId } = {}) {
  const tasks = job.tasks || [];
  const round = tasks.filter((t) => isRework(t)).length; // 已发生的返工轮数
  if (round >= maxRounds) return job;
  // 是否已为该评审注入过返工（看下游有没有 rework 任务依赖它）；
  // 注意汇总者也会依赖评审，故不能用「任意下游」判断。
  const alreadyHandled = (id) => tasks.some((t) => isRework(t) && (t.deps || []).includes(id));
  const failed = tasks.find(
    (t) => t.role === 'critic' && t.status === 'done' && !parseVerdict(t.output).pass && !alreadyHandled(t.id),
  );
  if (!failed) return job;

  const n = round + 1;
  const gen = makeId || (() => `rw${n}_${Math.random().toString(36).slice(2, 8)}`);
  const wId = gen();
  const cId = gen();
  const added = reworkSpecs(failed.id, wId, cId, n).map(makeTask);
  // 汇总者若还没跑，改为依赖最新复评，确保等返工闭环完成再汇总
  const updated = tasks.map((t) =>
    t.role === 'synthesizer' && t.status === 'queued'
      ? { ...t, deps: [...new Set([...(t.deps || []), cId])] }
      : t,
  );
  return { ...job, tasks: [...updated, ...added] };
}

/* ============================ 4. 汇总结论（离线） ============================ */

/** 离线把全部 done 任务整合成面向用户的结论。 */
export function synthesize(job) {
  const done = (job.tasks || []).filter((t) => t.status === 'done' && t.role !== 'synthesizer');
  const req = job.requirement || '（空需求）';
  const lines = [
    `## 结论`,
    `针对「${req}」，团队已完成调研 → 规划 → 执行 → 评审的闭环，给出可落地的第一版方案。`,
    ``,
    `### 关键要点`,
    `- 已明确范围、约束与衡量标准，并对比了 3 类可选方案。`,
    `- 形成按里程碑推进的执行计划，并产出可直接使用的交付草案 v1。`,
    `- 评审通过率约 80%，主要待改项为边界情况与论据补强。`,
    ``,
    `### 下一步`,
    `1. 按评审意见小改草案（补边界说明、加数据论据）。`,
    `2. 选定方案 B（均衡）作为推进基线。`,
    `3. 进入 M2 出主干，并预约一次复评。`,
    ``,
    `### 遗留风险`,
    `- 2 条假设待确认（数据可得性、时间预算）。`,
    ``,
    `> 共 ${done.length} 个子任务由 ${new Set(done.map((t) => t.role)).size} 类角色协作完成。`,
  ];
  return lines.join('\n');
}

/* ============================ 5. LLM 提示词（BYOK） ============================ */

/** 让大模型把需求拆成 JSON 计划的提示词。 */
export function buildPlanMessages(requirement) {
  const system =
    '你是多智能体团队的协调者。把用户需求拆成 4–6 个最小子任务，' +
    '为每个子任务从这些角色里选一个：researcher（调研）、planner（规划）、worker（执行）、critic（评审）、synthesizer（汇总）。' +
    '没有相互依赖的任务应能并行。最后必须有且仅有一个 synthesizer 任务，依赖其余全部任务。';
  const user =
    `需求：${requirement}\n\n` +
    '只输出 JSON，格式：\n' +
    '{"tasks":[{"key":"a","role":"researcher","title":"…","brief":"…","depKeys":[]}, …]}\n' +
    'key 为短标识，depKeys 引用其它任务的 key。不要输出 JSON 以外的任何内容。';
  return { system, user };
}

/** 解析大模型返回的计划 JSON，失败回退到离线 decompose。 */
export function parsePlan(text, requirement) {
  try {
    const m = String(text).match(/\{[\s\S]*\}/);
    const obj = JSON.parse(m ? m[0] : text);
    const tasks = Array.isArray(obj.tasks) ? obj.tasks : [];
    const valid = tasks
      .filter((t) => t && t.role && t.title)
      .map((t) => ({
        key: String(t.key || t.title),
        role: getRole(t.role).id,
        title: String(t.title),
        brief: String(t.brief || ''),
        depKeys: Array.isArray(t.depKeys) ? t.depKeys.map(String) : [],
      }));
    if (valid.length >= 2) return valid;
  } catch (_) {
    /* 落到回退 */
  }
  return decompose(requirement);
}

/** 让某角色执行某子任务的提示词（带上游产出作为上下文）。 */
export function buildAgentMessages(task, job) {
  const role = getRole(task.role);
  const ctx = depOutputs(task, job);
  const verdictRule =
    task.role === 'critic'
      ? '\n\n最后必须单独用一行给出验收判断，格式严格为「验收: 通过」或「验收: 未通过」。'
      : '';
  const user =
    `用户原始需求：${job.requirement}\n\n` +
    `你的子任务：${task.title}\n要求：${task.brief}\n\n` +
    (ctx ? `上游同事的产出（供你参考/衔接）：\n${ctx}\n\n` : '') +
    '请直接给出你这一步的产出，简洁、具体、可被下游同事使用。' +
    verdictRule;
  return { system: role.system, user };
}

/** 让汇总者产出最终结论的提示词。 */
export function buildSynthesisMessages(job) {
  const role = getRole('synthesizer');
  const all = (job.tasks || [])
    .filter((t) => t.role !== 'synthesizer' && t.output)
    .map((t) => `〔${getRole(t.role).name}·${t.title}〕\n${t.output}`)
    .join('\n\n');
  const user =
    `用户原始需求：${job.requirement}\n\n` +
    `团队各角色产出：\n${all}\n\n` +
    '请整合成面向用户的最终结论：先一句话结论，再给「关键要点 / 下一步 / 遗留风险」三段，用 markdown。';
  return { system: role.system, user };
}

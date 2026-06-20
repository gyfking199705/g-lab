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

/* ============================ 2. 离线拆解 ============================ */

/**
 * 离线把需求拆成子任务规格（不含 id，调用方用 makeTask 赋 id 时会自动连依赖）。
 * 这里用「占位依赖键」描述依赖，loadPlan 会把键换成真实 id。
 */
export function decompose(requirement) {
  const kind = classify(requirement);
  const req = String(requirement || '').trim();

  // 通用骨架：调研(可并行2路) → 规划 → 执行 → 评审 → 汇总
  const base = [
    { key: 'r1', role: 'researcher', title: '需求与背景调研', brief: `围绕「${req}」收集关键事实、约束与可选方案。`, depKeys: [] },
    { key: 'r2', role: 'researcher', title: '风险与对标调研', brief: `调研同类做法、业界对标与主要风险点。`, depKeys: [] },
    { key: 'p1', role: 'planner', title: '拆解执行计划', brief: '综合调研结论，排出有优先级、可执行的步骤与里程碑。', depKeys: ['r1', 'r2'] },
    { key: 'w1', role: 'worker', title: '产出交付草案', brief: '按计划产出可交付的第一版成果（方案/草案/代码骨架）。', depKeys: ['p1'] },
    { key: 'c1', role: 'critic', title: '评审与挑错', brief: '对草案做对抗式检查，给出可执行的修改意见与验收判断。', depKeys: ['w1'] },
    { key: 's1', role: 'synthesizer', title: '汇总最终结论', brief: '整合全部产出，给用户一句话结论 + 关键要点 + 下一步 + 风险。', depKeys: ['r1', 'r2', 'p1', 'w1', 'c1'] },
  ];

  // 按类型微调措辞/侧重
  if (kind === 'research') {
    base[3].title = '撰写调研结论草案';
    base[3].brief = '把调研发现整理成结构化结论草案（含对比表/要点）。';
  } else if (kind === 'decide') {
    base[2].title = '建立决策框架';
    base[2].brief = '列出可选项、评估维度与权重，搭出可打分的决策框架。';
    base[3].title = '给出推荐选项';
    base[3].brief = '按框架打分，产出带理由的推荐选项与取舍。';
  } else if (kind === 'write') {
    base[3].title = '撰写初稿';
    base[3].brief = '按规划产出完整初稿（结构清晰、可直接使用）。';
  }
  return base;
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
      return [
        `【${role.name}·${task.title}】`,
        `· 交付草案 v1：针对「${req}」给出可直接落地的第一版成果。`,
        `· 结构：背景 → 方案主体 → 关键细节 → 使用说明。`,
        `· 已按规划覆盖全部里程碑要点，留 2 处待评审确认。`,
      ].join('\n');
    case 'critic':
      return [
        `【${role.name}·${task.title}】`,
        `· 通过项：结构完整、覆盖核心需求。`,
        `· 待改：① 缺少边界情况说明；② 第 3 点论据偏弱，建议补数据。`,
        `· 验收判断：达到 80% 验收标准，按建议小改即可交付。`,
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
  const user =
    `用户原始需求：${job.requirement}\n\n` +
    `你的子任务：${task.title}\n要求：${task.brief}\n\n` +
    (ctx ? `上游同事的产出（供你参考/衔接）：\n${ctx}\n\n` : '') +
    '请直接给出你这一步的产出，简洁、具体、可被下游同事使用。';
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

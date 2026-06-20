/**
 * 任务队列与调度 —— 纯函数状态机（无 React、无网络，便于 node --test 单测）。
 * ------------------------------------------------------------------
 * 模型：用户把「需求」提进队列形成一个 Job；协调者把 Job 拆成若干带依赖的子任务（Task）。
 * 调度器按依赖关系挑出「现在可以跑」的任务——没有未完成依赖的任务可以并行执行（集群模式）。
 *
 * 这里只描述「状态如何随事件迁移」，真正的执行（调 LLM 或离线模拟）在 engine 里。
 */

let _seq = 0;
/** 生成短 id（测试可通过 resetIds 复位以得到稳定结果）。 */
export function nextId(prefix = 't') {
  _seq += 1;
  return `${prefix}${_seq}`;
}
export function resetIds() {
  _seq = 0;
}

export const JOB_STATUS = ['queued', 'planning', 'running', 'synthesizing', 'done', 'failed'];
export const TASK_STATUS = ['queued', 'running', 'done', 'failed'];

/** 新建一个排队中的 Job（用户刚提的需求）。 */
export function createJob(requirement, now = Date.now()) {
  return {
    id: nextId('job'),
    requirement: String(requirement || '').trim(),
    status: 'queued',
    tasks: [],
    conclusion: null,
    error: null,
    createdAt: now,
  };
}

/**
 * 规范化一个任务规格为完整 Task。
 * spec: { role, title, brief, deps? }
 */
export function makeTask(spec) {
  return {
    id: spec.id || nextId('t'),
    role: spec.role || 'worker',
    title: String(spec.title || '').trim(),
    brief: String(spec.brief || '').trim(),
    deps: Array.isArray(spec.deps) ? spec.deps.slice() : [],
    status: 'queued',
    output: null,
    error: null,
    startedAt: null,
    endedAt: null,
  };
}

/** 把一组任务规格装进 Job，并切到 running。 */
export function loadTasks(job, specs) {
  const tasks = specs.map(makeTask);
  return { ...job, tasks, status: 'running' };
}

const byId = (tasks) => Object.fromEntries(tasks.map((t) => [t.id, t]));

/** 某任务的依赖是否全部完成。 */
export function depsSatisfied(task, tasks) {
  const map = byId(tasks);
  return task.deps.every((d) => map[d] && map[d].status === 'done');
}

/**
 * 现在可以开跑的任务：状态为 queued 且依赖全部 done。
 * 这是「集群模式」的核心——返回的多个任务可以同时执行。
 */
export function runnableTasks(tasks) {
  return tasks.filter((t) => t.status === 'queued' && depsSatisfied(t, tasks));
}

/** 是否还有任务在排队或执行（用于判断本轮调度是否结束）。 */
export function hasPending(tasks) {
  return tasks.some((t) => t.status === 'queued' || t.status === 'running');
}

/**
 * 死锁检测：还有 queued 任务，但没有任何可跑任务、也没有在跑的任务。
 * 通常意味着依赖指向了不存在或已失败的任务。
 */
export function isDeadlocked(tasks) {
  const stuck = tasks.some((t) => t.status === 'queued');
  return stuck && runnableTasks(tasks).length === 0 && !tasks.some((t) => t.status === 'running');
}

/* ---------------------------- 不可变状态迁移 ---------------------------- */

function patchTask(tasks, id, patch) {
  return tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
}

export function startTask(tasks, id, now = Date.now()) {
  return patchTask(tasks, id, { status: 'running', startedAt: now });
}

export function finishTask(tasks, id, output, now = Date.now()) {
  return patchTask(tasks, id, { status: 'done', output, endedAt: now });
}

export function failTask(tasks, id, error, now = Date.now()) {
  return patchTask(tasks, id, { status: 'failed', error: String(error), endedAt: now });
}

/** 进度：完成数 / 总数 / 百分比（0–100 整数）。 */
export function progress(tasks) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const failed = tasks.filter((t) => t.status === 'failed').length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, failed, total, pct };
}

/** 拓扑分层：把任务按依赖排成一层层（同层可并行），便于可视化「集群波次」。 */
export function topoLayers(tasks) {
  const map = byId(tasks);
  const layers = [];
  const placed = new Set();
  let guard = 0;
  while (placed.size < tasks.length && guard < tasks.length + 2) {
    guard += 1;
    const layer = tasks.filter(
      (t) => !placed.has(t.id) && t.deps.every((d) => !map[d] || placed.has(d)),
    );
    if (layer.length === 0) break; // 防御：依赖环
    layer.forEach((t) => placed.add(t.id));
    layers.push(layer.map((t) => t.id));
  }
  // 未能放置的（依赖环/悬空）单独成层，避免丢任务
  const rest = tasks.filter((t) => !placed.has(t.id)).map((t) => t.id);
  if (rest.length) layers.push(rest);
  return layers;
}

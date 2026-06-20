import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createJob, makeTask, loadTasks, depsSatisfied, runnableTasks, hasPending,
  isDeadlocked, startTask, finishTask, failTask, progress, topoLayers, resetIds,
} from './queue.js';

test('createJob 归一化需求并入队', () => {
  resetIds();
  const job = createJob('  做个待办应用  ', 1000);
  assert.equal(job.requirement, '做个待办应用');
  assert.equal(job.status, 'queued');
  assert.deepEqual(job.tasks, []);
  assert.equal(job.createdAt, 1000);
});

test('依赖未完成时任务不可运行；完成后变可运行', () => {
  const tasks = [
    makeTask({ id: 'a', role: 'researcher', title: 'A', deps: [] }),
    makeTask({ id: 'b', role: 'planner', title: 'B', deps: ['a'] }),
  ];
  assert.equal(depsSatisfied(tasks[1], tasks), false);
  assert.deepEqual(runnableTasks(tasks).map((t) => t.id), ['a']); // 只有 A 可跑

  const after = finishTask(tasks, 'a', 'done-A');
  assert.equal(depsSatisfied(after[1], after), true);
  assert.deepEqual(runnableTasks(after).map((t) => t.id), ['b']);
});

test('无依赖的多个任务可并行（集群波次）', () => {
  const tasks = [
    makeTask({ id: 'a', role: 'researcher', title: 'A', deps: [] }),
    makeTask({ id: 'b', role: 'researcher', title: 'B', deps: [] }),
    makeTask({ id: 'c', role: 'planner', title: 'C', deps: ['a', 'b'] }),
  ];
  assert.deepEqual(runnableTasks(tasks).map((t) => t.id).sort(), ['a', 'b']);
});

test('状态迁移：start → finish / fail 不可变更新', () => {
  const t0 = [makeTask({ id: 'a', role: 'worker', title: 'A' })];
  const running = startTask(t0, 'a', 5);
  assert.equal(running[0].status, 'running');
  assert.equal(running[0].startedAt, 5);
  assert.equal(t0[0].status, 'queued'); // 原数组未被改

  const done = finishTask(running, 'a', 'out', 9);
  assert.equal(done[0].status, 'done');
  assert.equal(done[0].output, 'out');

  const failed = failTask(running, 'a', '炸了', 9);
  assert.equal(failed[0].status, 'failed');
  assert.match(failed[0].error, /炸了/);
});

test('hasPending 与 progress 统计', () => {
  let tasks = [
    makeTask({ id: 'a', role: 'worker', title: 'A' }),
    makeTask({ id: 'b', role: 'worker', title: 'B' }),
  ];
  assert.equal(hasPending(tasks), true);
  tasks = finishTask(tasks, 'a', 'x');
  assert.deepEqual(progress(tasks), { done: 1, failed: 0, total: 2, pct: 50 });
  tasks = failTask(tasks, 'b', 'e');
  assert.equal(hasPending(tasks), false);
  assert.deepEqual(progress(tasks), { done: 1, failed: 1, total: 2, pct: 50 });
});

test('依赖指向失败任务会造成死锁，可被检测', () => {
  let tasks = [
    makeTask({ id: 'a', role: 'worker', title: 'A' }),
    makeTask({ id: 'b', role: 'worker', title: 'B', deps: ['a'] }),
  ];
  tasks = failTask(tasks, 'a', 'boom');
  assert.equal(runnableTasks(tasks).length, 0);
  assert.equal(isDeadlocked(tasks), true);
});

test('topoLayers 把任务按依赖分成可并行的波次', () => {
  const tasks = [
    makeTask({ id: 'a', role: 'researcher', title: 'A', deps: [] }),
    makeTask({ id: 'b', role: 'researcher', title: 'B', deps: [] }),
    makeTask({ id: 'c', role: 'planner', title: 'C', deps: ['a', 'b'] }),
    makeTask({ id: 'd', role: 'synthesizer', title: 'D', deps: ['c'] }),
  ];
  const layers = topoLayers(tasks);
  assert.deepEqual(layers[0].sort(), ['a', 'b']);
  assert.deepEqual(layers[1], ['c']);
  assert.deepEqual(layers[2], ['d']);
});

test('loadTasks 装载任务并切到 running', () => {
  resetIds();
  let job = createJob('需求');
  job = loadTasks(job, [{ role: 'researcher', title: 'A' }, { role: 'worker', title: 'B', deps: [] }]);
  assert.equal(job.status, 'running');
  assert.equal(job.tasks.length, 2);
  assert.ok(job.tasks[0].id);
});

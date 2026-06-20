import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jobToMarkdown, exportFilename } from './export.js';

const sampleJob = {
  requirement: '做一个团队周报工具',
  status: 'done',
  route: 'full',
  createdAt: 1718000000000,
  estimate: { steps: 6, waves: 5, totalTokens: 7000, usd: 0.05, model: 'claude-sonnet-4-6' },
  conclusion: '## 结论\n这是结论正文。',
  tasks: [
    { id: 'a', role: 'researcher', title: '需求调研', status: 'done', output: '调研要点若干' },
    { id: 'b', role: 'worker', title: '产出草案', status: 'done', output: '草案内容' },
    { id: 'c', role: 'critic', title: '评审', status: 'failed', error: '上游缺数据' },
  ],
};

test('jobToMarkdown 含标题/需求/状态/结论/角色名/过程', () => {
  const md = jobToMarkdown(sampleJob);
  assert.match(md, /# 多智能体协作结论：做一个团队周报工具/);
  assert.match(md, /状态：已完成/);
  assert.match(md, /拓扑：/); // full route 显示拓扑
  assert.match(md, /## 结论/);
  assert.match(md, /这是结论正文/);
  assert.match(md, /## 协作过程/);
  assert.match(md, /调研员 · 需求调研/);
  assert.match(md, /执行者 · 产出草案/);
  assert.match(md, /调研要点若干/);
});

test('jobToMarkdown 渲染失败任务与署名/日期', () => {
  const md = jobToMarkdown(sampleJob);
  assert.match(md, /失败：上游缺数据/);
  assert.match(md, /swarm 多智能体协作工作区生成/);
  assert.match(md, /2024-06-10/); // createdAt 的 ISO 日期（UTC）
});

test('快路径不显示拓扑行', () => {
  const md = jobToMarkdown({ ...sampleJob, route: 'fast' });
  assert.match(md, /快路径/);
  assert.ok(!/拓扑：/.test(md));
});

test('jobToMarkdown 容错：空 job / 无结论', () => {
  assert.equal(jobToMarkdown(null), '');
  const md = jobToMarkdown({ requirement: 'x', status: 'running', tasks: [] });
  assert.match(md, /# 多智能体协作结论：x/);
  assert.ok(!/## 结论/.test(md)); // 没有 conclusion 不输出结论段
});

test('exportFilename 安全且带前缀', () => {
  assert.equal(exportFilename({ requirement: '做个 app' }), 'swarm-做个 app.md');
  assert.match(exportFilename({ requirement: 'a/b:c*d?' }), /^swarm-.*\.md$/);
  assert.ok(!/[\\/:*?"<>|]/.test(exportFilename({ requirement: 'a/b:c*d?' }).replace(/\.md$/, '')));
  assert.equal(exportFilename({}), 'swarm-swarm.md');
});

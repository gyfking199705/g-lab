import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PRICING, priceOf, estimateTokens, estimateJobCost, formatUSD, formatTokens,
} from './cost.js';
import { decompose, routeDecompose, planToSpecs } from './orchestrator.js';

test('estimateTokens 约 4 字符/token', () => {
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens('abcd'), 1);
  assert.equal(estimateTokens('abcde'), 2);
});

test('priceOf 命中价目，未知回落默认', () => {
  assert.deepEqual(priceOf('claude-opus-4-8'), PRICING['claude-opus-4-8']);
  assert.deepEqual(priceOf('某未知模型'), PRICING._default);
});

test('estimateJobCost 统计步数/波次/token/金额', () => {
  const specs = planToSpecs(decompose('做一个团队周报工具'), (n) => `t${n}`);
  const est = estimateJobCost(specs, { requirement: '做一个团队周报工具', model: 'claude-sonnet-4-6' });
  assert.equal(est.steps, specs.length);
  assert.ok(est.waves >= 3 && est.waves <= specs.length); // 多波次
  assert.ok(est.inTokens > 0 && est.outTokens > 0);
  assert.equal(est.totalTokens, est.inTokens + est.outTokens);
  assert.ok(est.usd > 0);
  assert.equal(est.model, 'claude-sonnet-4-6');
});

test('快路径估算明显比全量便宜（步数与花费都更小）', () => {
  const req = '翻译这句话';
  const full = estimateJobCost(planToSpecs(decompose(req), (n) => `f${n}`), { requirement: req });
  const fast = estimateJobCost(planToSpecs(routeDecompose(req), (n) => `r${n}`), { requirement: req });
  assert.ok(fast.steps < full.steps);
  assert.ok(fast.usd < full.usd);
});

test('贵模型估价高于便宜模型', () => {
  const specs = planToSpecs(decompose('做个应用'), (n) => `t${n}`);
  const opus = estimateJobCost(specs, { model: 'claude-opus-4-8' });
  const haiku = estimateJobCost(specs, { model: 'claude-haiku-4-5-20251001' });
  assert.ok(opus.usd > haiku.usd);
});

test('formatUSD / formatTokens 紧凑可读', () => {
  assert.equal(formatUSD(0), '$0');
  assert.equal(formatUSD(0.0003), '$0.0003');
  assert.equal(formatUSD(0.123), '$0.123');
  assert.equal(formatUSD(2.5), '$2.50');
  assert.equal(formatTokens(800), '800');
  assert.equal(formatTokens(1500), '1.5k');
  assert.equal(formatTokens(2_000_000), '2.00M');
});

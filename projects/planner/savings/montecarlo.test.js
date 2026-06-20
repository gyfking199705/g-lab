import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng, simulate, VOL_PRESETS } from './montecarlo.js';

test('makeRng：同种子可重现、范围 [0,1)', () => {
  const a = makeRng(42);
  const b = makeRng(42);
  for (let i = 0; i < 5; i++) {
    const x = a();
    assert.equal(x, b()); // 同种子同序列
    assert.ok(x >= 0 && x < 1);
  }
  assert.notEqual(makeRng(1)(), makeRng(2)()); // 不同种子不同起点
});

test('零波动 → 退化为固定年化复利（与逐年递推一致）', () => {
  const args = { currentAssets: 1000000, annualSaving: 100000, mean: 0.06, vol: 0, years: 10, target: 0, runs: 30, seed: 7 };
  const r = simulate(args);
  // 手算逐年递推
  let assets = args.currentAssets;
  for (let y = 0; y < args.years; y++) assets = assets * 1.06 + args.annualSaving;
  assert.ok(Math.abs(r.bands[args.years].p50 - assets) < 1); // 中位 ≈ 确定值
  assert.equal(r.finals.min, r.finals.max); // 零波动 → 所有路径相同
});

test('百分位逐年单调 p10≤p25≤p50≤p75≤p90', () => {
  const r = simulate({ currentAssets: 2000000, annualSaving: 300000, mean: 0.06, vol: 0.15, years: 20, target: 8000000, runs: 1500, seed: 3 });
  for (const b of r.bands) {
    assert.ok(b.p10 <= b.p25 && b.p25 <= b.p50 && b.p50 <= b.p75 && b.p75 <= b.p90, `band@${b.year} 非单调`);
  }
  assert.equal(r.bands.length, 21); // years+1
});

test('达成概率落在 [0,1]；目标极低→1、极高→0', () => {
  const base = { currentAssets: 2000000, annualSaving: 300000, mean: 0.06, vol: 0.15, years: 20, runs: 800, seed: 9 };
  const easy = simulate({ ...base, target: 0 });
  const hard = simulate({ ...base, target: 1e12 });
  assert.equal(easy.successProb, 1);
  assert.equal(hard.successProb, 0);
  assert.equal(hard.medianYears, null); // 从未达成
  assert.ok(easy.successProb >= 0 && easy.successProb <= 1);
});

test('同种子可重现、不同种子结果不同', () => {
  const args = { currentAssets: 2000000, annualSaving: 300000, mean: 0.06, vol: 0.15, years: 20, target: 8000000, runs: 600 };
  const a = simulate({ ...args, seed: 11 });
  const b = simulate({ ...args, seed: 11 });
  const c = simulate({ ...args, seed: 12 });
  assert.equal(a.successProb, b.successProb);
  assert.equal(a.finals.p50, b.finals.p50);
  assert.notEqual(a.finals.mean, c.finals.mean); // 不同种子不同抽样
});

test('直方图计数之和 = 模拟次数', () => {
  const r = simulate({ currentAssets: 1000000, annualSaving: 200000, mean: 0.05, vol: 0.12, years: 15, target: 5000000, runs: 1000, seed: 4 });
  const sum = r.histogram.reduce((s, h) => s + h.count, 0);
  assert.equal(sum, 1000);
  assert.ok(VOL_PRESETS.length === 3);
});

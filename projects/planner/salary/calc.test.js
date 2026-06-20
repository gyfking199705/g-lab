import { test } from 'node:test';
import assert from 'node:assert/strict';
import { socialInsurance, monthlySchedule, bonusTaxSeparate, estimate, defaultRates } from './calc.js';

test('socialInsurance 个人五险一金（默认费率 17.5%）', () => {
  const s = socialInsurance(10000, defaultRates());
  assert.equal(s.pension, 800);
  assert.equal(s.medical, 200);
  assert.equal(s.unemployment, 50);
  assert.equal(s.housingFund, 700);
  assert.equal(s.total, 1750);
});

test('monthlySchedule 累计预扣：到手逐月递减', () => {
  // 月薪 3 万，社保按默认；专项 0
  const rows = monthlySchedule({ monthlyGross: 30000, rates: defaultRates(), specialMonthly: 0 });
  assert.equal(rows.length, 12);
  // 早月税率低、到手高；后面跨档税增、到手降
  assert.ok(rows[0].net > rows[11].net, '末月到手应低于首月');
  // 个税逐月非递减（累计预扣特性）
  for (let i = 1; i < 12; i++) assert.ok(rows[i].tax >= rows[i - 1].tax - 0.01, `第${i + 1}月税不应低于上月`);
  // 社保每月恒定
  assert.equal(rows[0].social, 5250); // 30000*17.5%
});

test('monthlySchedule 低收入不缴税（社保+起征点覆盖）', () => {
  const rows = monthlySchedule({ monthlyGross: 6000, rates: defaultRates() });
  // 6000 - 1050(社保) - 5000 < 0 → 无税
  assert.equal(rows.reduce((s, r) => s + r.tax, 0), 0);
});

test('bonusTaxSeparate 全年一次性奖金单独计税', () => {
  // 36000 / 12 = 3000 → 3% 档，速扣 0 → 税 1080
  assert.equal(bonusTaxSeparate(36000).tax, 1080);
  // 36001 / 12 ≈ 3000.08 → 跳到 10% 档（速扣 210）→ 临界陷阱
  assert.ok(bonusTaxSeparate(36001).tax > 3000);
  assert.equal(bonusTaxSeparate(0).tax, 0);
});

test('estimate 汇总：年到手 + 税负率 + 含年终奖', () => {
  const e = estimate({ monthlyGross: 20000, rates: defaultRates(), specialMonthly: 1500, annualBonus: 24000 });
  assert.ok(e.annualNet > 0);
  assert.equal(e.annualGross, 20000 * 12 + 24000);
  assert.ok(e.takeHomeRate > 0.5 && e.takeHomeRate < 1);
  assert.ok(e.bonus.tax > 0);
  // 月均到手在合理区间（税前2万，到手约 1.4~1.6 万）
  assert.ok(e.avgMonthlyNet > 12000 && e.avgMonthlyNet < 17000);
  assert.equal(e.schedule.length, 12);
});

test('estimate 缴费基数可与月薪不同', () => {
  // 月薪 5 万但社保按封顶基数 3 万计
  const e = estimate({ monthlyGross: 50000, socialBase: 30000, rates: defaultRates() });
  assert.equal(e.social.total, 5250); // 30000*17.5%
});

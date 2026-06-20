import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  todayStr,
  addDays,
  dayDiff,
  relDay,
  qualityOf,
  scheduleReview,
  planStats,
  overallStats,
  dueReviews,
  upcomingReviews,
  nextLessons,
  computeStreak,
  studyMinutes,
  minutesOn,
  activitySeries,
  suggestedDailyLessons,
  planTargetDate,
  scaffoldPlan,
  normalizePlan,
  parsePlanFromText,
  buildPlanMessages,
  buildExplainMessages,
  formatDuration,
  pctText,
  fmtDate,
  encodePlanShare,
  decodePlanShare,
  slimPlanForShare,
} from './calc.js';
import { TEMPLATES, getTemplate } from './templates.js';

const T = '2026-06-03'; // 固定「今天」便于断言

/* --------------------------- 日期工具 --------------------------- */
test('日期：addDays / dayDiff / relDay', () => {
  assert.equal(addDays(T, 1), '2026-06-04');
  assert.equal(addDays(T, -3), '2026-05-31');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(dayDiff(T, '2026-06-10'), 7);
  assert.equal(dayDiff('2026-06-10', T), -7);
  assert.equal(relDay(T, T), '今天');
  assert.equal(relDay(addDays(T, 1), T), '明天');
  assert.equal(relDay(addDays(T, 5), T), '5 天后');
  assert.equal(relDay(addDays(T, -2), T), '逾期 2 天');
});

test('todayStr 形如 YYYY-MM-DD', () => {
  assert.match(todayStr(), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(todayStr(new Date(2026, 0, 5)), '2026-01-05');
});

/* --------------------------- 间隔复习 SM-2 --------------------------- */
test('qualityOf 映射', () => {
  assert.equal(qualityOf('again'), 0);
  assert.equal(qualityOf('good'), 4);
  assert.equal(qualityOf('easy'), 5);
  assert.equal(qualityOf('unknown'), 4); // 兜底
});

test('scheduleReview：连续记得拉长间隔 1 → 6 → ×ease', () => {
  const s1 = scheduleReview({ sr: null, grade: 'good', today: T });
  assert.equal(s1.reps, 1);
  assert.equal(s1.interval, 1);
  assert.equal(s1.due, '2026-06-04');
  assert.equal(s1.ease, 2.5); // good(q4) 不改变 ease

  const s2 = scheduleReview({ sr: s1, grade: 'good', today: T });
  assert.equal(s2.reps, 2);
  assert.equal(s2.interval, 6);

  const s3 = scheduleReview({ sr: s2, grade: 'good', today: T });
  assert.equal(s3.reps, 3);
  assert.equal(s3.interval, Math.round(6 * 2.5)); // 15
});

test('scheduleReview：忘了则重置、明天再来、ease 下降但不低于 1.3', () => {
  const s = scheduleReview({ sr: { reps: 5, ease: 2.5, interval: 40, due: T }, grade: 'again', today: T });
  assert.equal(s.reps, 0);
  assert.equal(s.interval, 1);
  assert.equal(s.due, '2026-06-04');
  assert.ok(s.ease < 2.5 && s.ease >= 1.3);
  // 反复忘了，ease 触底 1.3
  let cur = s;
  for (let i = 0; i < 10; i++) cur = scheduleReview({ sr: cur, grade: 'again', today: T });
  assert.equal(cur.ease, 1.3);
});

test('scheduleReview：太简单(q5) 提升 ease', () => {
  const s = scheduleReview({ sr: null, grade: 'easy', today: T });
  assert.equal(s.ease, 2.6);
});

/* --------------------------- 进度统计 --------------------------- */
const samplePlan = () => ({
  id: 'p1',
  title: '测试计划',
  icon: '📘',
  subject: '测试',
  createdAt: T + 'T00:00:00.000Z',
  weeks: 4,
  modules: [
    {
      id: 'm1',
      title: 'M1',
      lessons: [
        { id: 'l1', title: 'a', status: 'mastered', sr: { reps: 2, ease: 2.5, interval: 6, due: addDays(T, 6) } },
        { id: 'l2', title: 'b', status: 'learning', sr: { reps: 1, ease: 2.5, interval: 1, due: T } },
        { id: 'l3', title: 'c', status: 'todo', sr: null },
      ],
    },
    {
      id: 'm2',
      title: 'M2',
      lessons: [{ id: 'l4', title: 'd', status: 'todo', sr: null }],
    },
  ],
});

test('planStats：各状态计数与完成度', () => {
  const s = planStats(samplePlan());
  assert.equal(s.total, 4);
  assert.equal(s.mastered, 1);
  assert.equal(s.learning, 1);
  assert.equal(s.todo, 2);
  assert.equal(s.pct, 0.25);
  assert.equal(s.weighted, (1 + 0.5) / 4); // 0.375
});

test('overallStats：跨计划汇总', () => {
  const o = overallStats([samplePlan(), samplePlan()]);
  assert.equal(o.total, 8);
  assert.equal(o.mastered, 2);
  assert.equal(o.pct, 0.25);
});

/* --------------------------- 队列 --------------------------- */
test('dueReviews：到期(含逾期)且非 todo 才进队列', () => {
  const due = dueReviews([samplePlan()], T);
  // l2 今天到期；l1 六天后到期不算
  assert.equal(due.length, 1);
  assert.equal(due[0].lesson.id, 'l2');
  assert.equal(due[0].planId, 'p1');
});

test('upcomingReviews：7 天分布，逾期归到今天', () => {
  const up = upcomingReviews([samplePlan()], T, 7);
  assert.equal(up.length, 7);
  assert.equal(up[0].date, T);
  assert.equal(up[0].count, 1); // l2 今天
  assert.equal(up[6].date, addDays(T, 6));
  assert.equal(up[6].count, 1); // l1 第 6 天
});

test('nextLessons：学习中优先，已掌握排除', () => {
  const nx = nextLessons([samplePlan()], 5);
  assert.equal(nx.length, 3); // 排除 1 个 mastered
  assert.equal(nx[0].lesson.id, 'l2'); // learning 优先
  assert.ok(nx.every((x) => x.lesson.status !== 'mastered'));
});

/* --------------------------- 学习记录 / 连续天数 / 活跃度 --------------------------- */
test('minutesOn / studyMinutes', () => {
  const sess = [
    { date: T, minutes: 25 },
    { date: T, minutes: 15 },
    { date: addDays(T, -1), minutes: 30 },
  ];
  assert.equal(minutesOn(sess, T), 40);
  assert.equal(studyMinutes(sess), 70);
});

test('computeStreak：连续天数（今天没学但昨天学了不立刻断）', () => {
  const sess = [
    { date: addDays(T, -1), minutes: 20 },
    { date: addDays(T, -2), minutes: 20 },
    { date: addDays(T, -3), minutes: 20 },
  ];
  const s = computeStreak(sess, T);
  assert.equal(s.current, 3); // 从昨天往前 3 天
  assert.equal(s.longest, 3);

  const withToday = computeStreak([...sess, { date: T, minutes: 10 }], T);
  assert.equal(withToday.current, 4);
});

test('computeStreak：断档后只算最近一段，longest 取历史最长', () => {
  const sess = [
    { date: T, minutes: 10 },
    // 缺 T-1
    { date: addDays(T, -2), minutes: 10 },
    { date: addDays(T, -3), minutes: 10 },
    { date: addDays(T, -4), minutes: 10 },
  ];
  const s = computeStreak(sess, T);
  assert.equal(s.current, 1);
  assert.equal(s.longest, 3);
});

test('activitySeries：长度与末位为今天', () => {
  const series = activitySeries([{ date: T, minutes: 50 }], T, 7);
  assert.equal(series.length, 7);
  assert.equal(series[6].date, T);
  assert.equal(series[6].minutes, 50);
  assert.equal(series[0].date, addDays(T, -6));
});

/* --------------------------- 节奏建议 --------------------------- */
test('planTargetDate / suggestedDailyLessons', () => {
  const plan = samplePlan(); // 4 周，剩余未掌握 3
  assert.equal(planTargetDate(plan, T), addDays(T, 28));
  const perDay = suggestedDailyLessons(plan, T);
  assert.ok(perDay >= 1);
});

/* --------------------------- 模板 & 归一化 --------------------------- */
test('内置模板：含 AI/ML 与空白，结构合法', () => {
  assert.ok(TEMPLATES.length >= 5);
  const aiml = getTemplate('tpl-aiml');
  assert.ok(aiml && aiml.modules.length >= 4);
  assert.ok(getTemplate('tpl-blank'));
  assert.equal(getTemplate('not-exist'), null);
});

test('scaffoldPlan：实例化模板，知识点带 id 且初始为 todo', () => {
  const plan = scaffoldPlan(getTemplate('tpl-aiml'));
  assert.ok(plan.id && plan.modules.length === 5);
  const first = plan.modules[0].lessons[0];
  assert.ok(first.id);
  assert.equal(first.status, 'todo');
  assert.equal(first.sr, null);
  assert.equal(plan.subject, '人工智能');
});

test('normalizePlan：补默认、裁剪异常规模、清洗资源', () => {
  const big = { modules: Array.from({ length: 100 }, (_, i) => ({ title: 'M' + i, lessons: ['x'] })) };
  const p = normalizePlan(big);
  assert.ok(p.modules.length <= 40);
  assert.ok(p.title && p.weeks >= 1 && p.weeks <= 104);

  const p2 = normalizePlan({ title: 'X', weeks: 999, hoursPerWeek: -3, modules: [{ title: 'M', lessons: [{ title: 'a', resources: [{ url: 'http://x' }, { foo: 1 }] }] }] });
  assert.equal(p2.weeks, 104); // 上限
  assert.equal(p2.hoursPerWeek, 1); // 下限
  assert.equal(p2.modules[0].lessons[0].resources.length, 1); // 过滤掉无 url 的
});

/* --------------------------- AI 提示词 & 解析 --------------------------- */
test('buildPlanMessages / buildExplainMessages 含关键信息', () => {
  const { system, user } = buildPlanMessages({ goal: '学会 React', level: '入门', weeks: 6, hoursPerWeek: 4 });
  assert.match(system, /JSON/);
  assert.match(user, /学会 React/);
  assert.match(user, /6 周/);
  const ex = buildExplainMessages({ lessonTitle: '闭包', planSubject: 'JS' });
  assert.match(ex.user, /闭包/);
});

test('parsePlanFromText：解析 ```json 代码块', () => {
  const text = '好的，这是计划：\n```json\n{"title":"X","subject":"S","modules":[{"title":"M","lessons":[{"title":"a"}]}]}\n```\n希望有用';
  const plan = parsePlanFromText(text);
  assert.equal(plan.title, 'X');
  assert.equal(plan.modules.length, 1);
  assert.equal(plan.modules[0].lessons[0].title, 'a');
  assert.equal(plan.modules[0].lessons[0].status, 'todo');
});

test('parsePlanFromText：解析裸 JSON（夹在文字中）', () => {
  const text = 'blah {"title":"Y","modules":[{"title":"M","lessons":["a","b"]}]} end';
  const plan = parsePlanFromText(text);
  assert.equal(plan.title, 'Y');
  assert.equal(plan.modules[0].lessons.length, 2);
});

test('parsePlanFromText：无 JSON 或无模块时抛错', () => {
  assert.throws(() => parsePlanFromText('完全没有 JSON 的文字'), /JSON/);
  assert.throws(() => parsePlanFromText('{"title":"Z","modules":[]}'), /模块/);
  assert.throws(() => parsePlanFromText(''), /未返回/);
});

/* --------------------------- 计划分享 编码/解码 --------------------------- */
test('encode/decodePlanShare：往返一致，含中文与资源', () => {
  const plan = scaffoldPlan(getTemplate('tpl-aiml'));
  plan.modules[0].lessons[0].note = '注意线代的几何含义';
  plan.modules[0].lessons[0].resources = [{ title: '3Blue1Brown', url: 'https://example.com/la' }];
  // 模拟已有进度，分享时应被剥离
  plan.modules[0].lessons[0].status = 'mastered';
  plan.modules[0].lessons[0].sr = { reps: 3, ease: 2.6, interval: 15, due: '2030-01-01' };

  const code = encodePlanShare(plan);
  assert.ok(code.startsWith('LP1.'));
  const decoded = decodePlanShare(code);
  assert.equal(decoded.title, plan.title);
  assert.equal(decoded.modules.length, plan.modules.length);
  assert.equal(decoded.modules[0].lessons[0].title, plan.modules[0].lessons[0].title);
  assert.equal(decoded.modules[0].lessons[0].note, '注意线代的几何含义');
  assert.equal(decoded.modules[0].lessons[0].resources[0].url, 'https://example.com/la');
  // 进度被重置、id 重新生成
  assert.equal(decoded.modules[0].lessons[0].status, 'todo');
  assert.equal(decoded.modules[0].lessons[0].sr, null);
  assert.notEqual(decoded.id, plan.id);
});

test('decodePlanShare：容忍粘贴整条链接', () => {
  const plan = scaffoldPlan(getTemplate('tpl-reading'));
  const code = encodePlanShare(plan);
  const url = 'https://user.github.io/g-lab/learning/#share=' + code;
  const decoded = decodePlanShare(url);
  assert.equal(decoded.title, plan.title);
});

test('slimPlanForShare：剥离 id/进度/AI 缓存', () => {
  const plan = scaffoldPlan(getTemplate('tpl-blank'));
  const slim = slimPlanForShare(plan);
  assert.equal(slim.id, undefined);
  assert.ok('title' in slim && Array.isArray(slim.modules));
});

test('decodePlanShare：垃圾输入抛错', () => {
  assert.throws(() => decodePlanShare(''), /分享码/);
  assert.throws(() => decodePlanShare('LP1.@@@not-base64@@@'), /解码|合法/);
});

/* --------------------------- 格式化 --------------------------- */
test('格式化：时长 / 百分比 / 日期', () => {
  assert.equal(formatDuration(45), '45 分钟');
  assert.equal(formatDuration(60), '1 小时');
  assert.equal(formatDuration(90), '1.5 小时');
  assert.equal(formatDuration(0), '0 分钟');
  assert.equal(pctText(0.25), '25%');
  assert.equal(pctText(0), '0%');
  assert.equal(pctText(null), '0%');
  assert.equal(fmtDate('2026-06-03'), '6月3日');
});

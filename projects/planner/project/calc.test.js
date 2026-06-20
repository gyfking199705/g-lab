import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  todayStr,
  addDays,
  dayDiff,
  startOfWeek,
  weekdayCN,
  fmtMD,
  relDay,
  uid,
  nextStatus,
  taskDue,
  taskStats,
  scheduleBuckets,
  ganttRange,
  barMetrics,
  ganttRows,
  axisTicks,
  focusMinutesOn,
  focusCountOn,
  focusStreak,
  focusByTask,
  lastNDays,
  formatDuration,
  mmss,
} from './calc.js';

test('日期工具：addDays / dayDiff / startOfWeek / weekday / relDay', () => {
  assert.equal(addDays('2026-01-31', 1), '2026-02-01');
  assert.equal(dayDiff('2026-01-01', '2026-01-08'), 7);
  assert.equal(startOfWeek('2026-06-03'), '2026-06-01'); // 周三 → 周一
  assert.equal(weekdayCN('2026-06-03'), '周三');
  assert.equal(fmtMD('2026-06-03'), '6/3');
  assert.equal(relDay('2026-06-03', '2026-06-01'), '2 天后');
  assert.equal(relDay('2026-05-31', '2026-06-01'), '昨天');
  assert.equal(relDay('2026-06-01', '2026-06-01'), '今天');
});

test('uid 唯一', () => {
  const s = new Set(Array.from({ length: 500 }, () => uid('t')));
  assert.equal(s.size, 500);
});

test('nextStatus 循环 / taskDue 优先 end', () => {
  assert.equal(nextStatus('todo'), 'doing');
  assert.equal(nextStatus('doing'), 'done');
  assert.equal(nextStatus('done'), 'todo');
  assert.equal(taskDue({ start: '2026-01-01', end: '2026-01-05' }), '2026-01-05');
  assert.equal(taskDue({ start: '2026-01-01' }), '2026-01-01');
  assert.equal(taskDue({}), null);
});

test('taskStats 计数与完成率', () => {
  const s = taskStats([
    { status: 'todo' },
    { status: 'doing' },
    { status: 'done' },
    { status: 'done' },
  ]);
  assert.deepEqual({ total: s.total, todo: s.todo, doing: s.doing, done: s.done }, { total: 4, todo: 1, doing: 1, done: 2 });
  assert.equal(s.donePct, 50);
  assert.equal(taskStats([]).donePct, 0);
});

test('scheduleBuckets：按到期日分桶，已完成单列，桶内按日期排序', () => {
  const today = '2026-06-03';
  const tasks = [
    { id: 'a', title: '逾期', end: '2026-06-01', status: 'todo' },
    { id: 'b', title: '今天', end: '2026-06-03', status: 'doing' },
    { id: 'c', title: '近期', end: '2026-06-06', status: 'todo' },
    { id: 'd', title: '远期', end: '2026-07-30', status: 'todo' },
    { id: 'e', title: '无期', status: 'todo' },
    { id: 'f', title: '完成', end: '2026-06-02', status: 'done' },
  ];
  const b = scheduleBuckets(tasks, today);
  assert.deepEqual(b.overdue.map((t) => t.id), ['a']);
  assert.deepEqual(b.today.map((t) => t.id), ['b']);
  assert.deepEqual(b.soon.map((t) => t.id), ['c']);
  assert.deepEqual(b.later.map((t) => t.id), ['d']);
  assert.deepEqual(b.someday.map((t) => t.id), ['e']);
  assert.deepEqual(b.done.map((t) => t.id), ['f']);
});

test('ganttRange：覆盖任务起止 + 含今天 + 至少 minDays', () => {
  const r = ganttRange([{ start: '2026-06-10', end: '2026-06-12' }], '2026-06-03', 14);
  assert.equal(r.start, '2026-06-03'); // 今天更早，纳入
  assert.ok(r.days >= 14);
  const empty = ganttRange([], '2026-06-03', 10);
  assert.equal(empty.start, '2026-06-03');
  assert.equal(empty.days, 11); // minDays=10 → 含端点 11 天
});

test('barMetrics：偏移/跨度/百分比，并裁剪到窗内', () => {
  const range = { start: '2026-06-01', end: '2026-06-10', days: 10 };
  const m = barMetrics({ start: '2026-06-03', end: '2026-06-04' }, range);
  assert.equal(m.offset, 2);
  assert.equal(m.span, 2);
  assert.equal(Math.round(m.leftPct), 20);
  assert.equal(Math.round(m.widthPct), 20);
  // 越界裁剪
  const c = barMetrics({ start: '2026-05-20', end: '2026-06-30' }, range);
  assert.equal(c.offset, 0);
  assert.equal(c.span, 10);
  // 无日期 → null
  assert.equal(barMetrics({}, range), null);
});

test('ganttRows：按负责人分组，空负责人归“未分配”，行内按 offset 排序', () => {
  const range = { start: '2026-06-01', end: '2026-06-30', days: 30 };
  const rows = ganttRows(
    [
      { id: '1', assignee: '我', start: '2026-06-10', end: '2026-06-12' },
      { id: '2', assignee: '我', start: '2026-06-02', end: '2026-06-03' },
      { id: '3', assignee: '', start: '2026-06-05', end: '2026-06-06' },
      { id: '4', title: '无日期' }, // 不进甘特
    ],
    range
  );
  const me = rows.find((r) => r.assignee === '我');
  assert.deepEqual(me.items.map((i) => i.task.id), ['2', '1']); // 按 offset
  assert.ok(rows.find((r) => r.assignee === '未分配'));
  assert.equal(rows.reduce((n, r) => n + r.items.length, 0), 3);
});

test('axisTicks：按步长产生刻度', () => {
  const ticks = axisTicks({ start: '2026-06-01', end: '2026-06-15', days: 15 }, 7);
  assert.deepEqual(ticks.map((t) => t.date), ['2026-06-01', '2026-06-08', '2026-06-15']);
});

test('番茄统计：今日分钟/次数、连续天数、按任务、近 N 天', () => {
  const today = '2026-06-03';
  const sessions = [
    { date: '2026-06-03', minutes: 25, taskId: 'a' },
    { date: '2026-06-03', minutes: 25, taskId: 'b' },
    { date: '2026-06-02', minutes: 50, taskId: 'a' },
    { date: '2026-06-01', minutes: 25, taskId: null },
  ];
  assert.equal(focusMinutesOn(sessions, today), 50);
  assert.equal(focusCountOn(sessions, today), 2);
  assert.equal(focusStreak(sessions, today), 3); // 6/1,6/2,6/3 连续
  assert.equal(focusByTask(sessions).a, 75);
  assert.equal(focusByTask(sessions).__none, 25);
  const series = lastNDays(sessions, 7, today);
  assert.equal(series.length, 7);
  assert.equal(series[series.length - 1].minutes, 50); // 末位是今天
});

test('focusStreak：今天空但昨天有 → 仍计入（不因今天未做而归零）', () => {
  const sessions = [{ date: '2026-06-02', minutes: 25 }, { date: '2026-06-01', minutes: 25 }];
  assert.equal(focusStreak(sessions, '2026-06-03'), 2);
  assert.equal(focusStreak([], '2026-06-03'), 0);
});

test('格式化：formatDuration / mmss', () => {
  assert.equal(formatDuration(45), '45 分钟');
  assert.equal(formatDuration(60), '1 小时');
  assert.equal(formatDuration(90), '1 小时 30 分');
  assert.equal(mmss(125), '02:05');
  assert.equal(mmss(0), '00:00');
});

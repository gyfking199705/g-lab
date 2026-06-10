/**
 * 示例数据 —— 一键填充各模块，让看板/大盘的趋势与预测立刻有内容可看
 * ------------------------------------------------------------------
 * buildDemoData(today) 为纯函数（便于单测）：返回 { localStorageKey: dataObject }。
 * seedDemo() 把它写进 localStorage（覆盖式），供「载入示例数据」按钮调用。
 * 所有日期相对今天生成，故连续打卡 / 趋势 / 预测都会是「最近」的。
 */
import { todayStr, addDays, lastNDays } from '../core/date.js';

const r1 = (x) => Math.round(x * 10) / 10;
// 确定性伪随机（按索引），避免每次不同
const wob = (i, amp = 1) => Math.sin(i * 1.7) * amp;

export function buildDemoData(today = todayStr()) {
  /* ---------- 减脂：体重 85 → 约 81，45 天 ---------- */
  const cutLogs = [];
  for (let i = 44; i >= 0; i--) {
    const frac = (44 - i) / 44;
    const w = frac === 0 ? 85 : r1(85 - 3.8 * frac + wob(i, 0.3));
    const log = { id: 'c' + i, date: addDays(today, -i), weight: w, intake: 1850 + (i % 3) * 130 };
    if ((44 - i) % 7 === 0) log.bodyFat = r1(24 - 4 * frac); // 每周记一次体脂
    cutLogs.push(log);
  }
  const cut = {
    v: 1,
    profile: { sex: 'male', height: 178, age: 30, activity: 'light', startDate: addDays(today, -44), startWeight: 85, goalWeight: 70, startBodyFat: 24, goalBodyFat: 12 },
    logs: cutLogs,
  };

  /* ---------- 习惯：4 个，近 30 天打卡（建立连续） ---------- */
  const days30 = lastNDays(30, today);
  const ck = { water: {}, sleep: {}, read: {} };
  days30.forEach((d, i) => {
    if (i % 9 !== 4) ck.water[d] = 6 + (i % 3); // 大多数天喝水
    if (i % 6 !== 2) ck.sleep[d] = 1;
    if (i % 4 !== 3) ck.read[d] = 1;
  });
  // 确保最近几天连续
  for (const d of days30.slice(-6)) { ck.water[d] = 8; ck.sleep[d] = 1; ck.read[d] = 1; }
  const habits = {
    v: 1,
    habits: [
      { id: 'h_train', name: '训练完成', icon: '💪', type: 'check', source: 'fitness', createdAt: addDays(today, -45), archived: false },
      { id: 'water', name: '喝水', icon: '💧', type: 'count', target: 8, unit: '杯', createdAt: addDays(today, -45), archived: false },
      { id: 'sleep', name: '早睡', icon: '😴', type: 'check', createdAt: addDays(today, -45), archived: false },
      { id: 'read', name: '阅读', icon: '📖', type: 'check', createdAt: addDays(today, -45), archived: false },
    ],
    checkins: ck,
  };

  /* ---------- 目标：3 个，子任务带完成时间 ---------- */
  const sub = (id, title, doneDaysAgo) => ({ id, title, done: doneDaysAgo != null, doneAt: doneDaysAgo != null ? addDays(today, -doneDaysAgo) + 'T10:00:00Z' : null });
  const goals = {
    v: 1,
    goals: [
      { id: 'g1', title: '12 周减脂到 70kg', note: '', category: 'fitness', deadline: addDays(today, 40), createdAt: addDays(today, -44), archived: false,
        subtasks: [sub('s1', '制定饮食计划', 40), sub('s2', '每周 3 练', 25), sub('s3', '体脂降到 18%', 8), sub('s4', '体脂降到 12%', null)] },
      { id: 'g2', title: '读完 12 本书', category: 'learn', deadline: addDays(today, 120), createdAt: addDays(today, -30), archived: false,
        metric: { current: 4, target: 12, unit: '本' }, subtasks: [] },
      { id: 'g3', title: '存够 6 个月应急金', category: 'life', deadline: addDays(today, 180), createdAt: addDays(today, -20), archived: false,
        metric: { current: 60000, target: 120000, unit: '元' }, subtasks: [] },
    ],
  };

  /* ---------- 日程：今天若干 + 最近完成 + 一个逾期 ---------- */
  const schItems = [
    { id: 'sc1', title: '晨练 30 分钟', date: today, time: '07:00', done: false, goalId: 'g1', createdAt: today },
    { id: 'sc2', title: '读论文 1 篇', date: today, time: '21:00', done: false, goalId: 'g2', createdAt: today },
    { id: 'sc3', title: '买菜备餐', date: today, time: '', done: true, doneAt: today + 'T12:00:00Z', createdAt: today },
    { id: 'sc4', title: '交季度报告', date: addDays(today, -2), time: '', done: false, createdAt: addDays(today, -3) }, // 逾期
  ];
  lastNDays(14, today).forEach((d, i) => { if (i % 2 === 0) schItems.push({ id: 'sd' + i, title: '完成事项 ' + i, date: d, done: true, doneAt: d + 'T18:00:00Z', createdAt: d }); });
  const schedule = { v: 1, items: schItems };

  /* ---------- 记账：近 3 个月工资 + 支出（含理财收入） ---------- */
  const entries = [];
  for (let m = 0; m < 3; m++) {
    const base = new Date(today.slice(0, 7) + '-01'); base.setMonth(base.getMonth() - m);
    const mk = base.toISOString().slice(0, 7);
    entries.push({ id: `inc${m}`, date: `${mk}-05`, type: 'income', amount: 22000, category: '工资' });
    entries.push({ id: `licai${m}`, date: `${mk}-15`, type: 'income', amount: 1500 + m * 100, category: '理财' });
    const exCats = [['餐饮', 2600], ['交通', 700], ['购物', 1800], ['居住', 4500], ['娱乐', 900], ['健身', 300]];
    exCats.forEach((c, j) => entries.push({ id: `ex${m}_${j}`, date: `${mk}-${String(8 + j * 3).padStart(2, '0')}`, type: 'expense', amount: c[1] + Math.round(wob(m * 6 + j, 200)), category: c[0] }));
  }
  const ledger = { v: 1, budget: 12000, entries };

  /* ---------- 财富：净资产快照（6 个月递增）+ 配置 + 目标 ---------- */
  const accounts = [
    { id: 'cash', name: '现金 / 活期', type: 'asset', category: '流动' },
    { id: 'deposit', name: '存款 / 理财', type: 'asset', category: '流动' },
    { id: 'invest', name: '基金 / 股票', type: 'asset', category: '投资' },
    { id: 'house', name: '自住房产', type: 'asset', category: '固定' },
    { id: 'mortgage', name: '房贷', type: 'liability', category: '负债' },
  ];
  const snapshots = [];
  for (let m = 5; m >= 0; m--) {
    const base = new Date(today.slice(0, 7) + '-01'); base.setMonth(base.getMonth() - m);
    const grow = (5 - m);
    snapshots.push({ date: base.toISOString().slice(0, 10), values: {
      cash: 50000 + grow * 3000, deposit: 200000 + grow * 12000, invest: 300000 + grow * 18000 + Math.round(wob(m, 8000)),
      house: 2000000, mortgage: 1200000 - grow * 6000,
    } });
  }
  const savings = {
    allocations: [
      { key: 'cash', label: '现金', weight: 10, ret: 1.5, color: '#B0AAA0' },
      { key: 'fixed', label: '固收', weight: 35, ret: 3.5, color: '#8AA1A8' },
      { key: 'equity', label: '权益', weight: 45, ret: 7, color: '#CC785C' },
      { key: 'gold', label: '黄金', weight: 10, ret: 4, color: '#C9A24B' },
    ],
    forecast: { currentAssets: 1200000, target: 5000000, years: 20, inflation: 2.5, useReal: false, rateOverride: null },
    netWorth: { accounts, snapshots },
  };

  /* ---------- 健身：近 6 周训练（约 3/周） ---------- */
  const workouts = [];
  for (let i = 41; i >= 0; i--) { if (i % 7 === 1 || i % 7 === 3 || i % 7 === 5) workouts.push({ id: 'w' + i, date: addDays(today, -i), name: ['推', '拉', '腿'][i % 3], entries: [], note: '' }); }
  const fitness = { routines: [], workouts, customExercises: [], settings: {} };

  /* ---------- 学习：1 个计划 + 近 20 天学习 ---------- */
  const lessons = (n, masteredTo) => Array.from({ length: n }, (_, i) => ({ id: 'l' + i, title: '知识点 ' + (i + 1), status: i < masteredTo ? 'mastered' : i < masteredTo + 2 ? 'learning' : 'todo' }));
  const learning = {
    plans: [{ id: 'p1', title: 'AI / 机器学习入门', icon: '🤖', createdAt: addDays(today, -30), modules: [
      { id: 'm1', title: '基础', lessons: lessons(6, 5) }, { id: 'm2', title: '进阶', lessons: lessons(6, 2) },
    ] }],
    sessions: lastNDays(20, today).filter((_, i) => i % 3 !== 0).map((d, i) => ({ id: 'se' + i, date: d, minutes: 25 + (i % 3) * 15, planId: 'p1' })),
    settings: {},
  };

  /* ---------- 项目 / 论文 / 股市 ---------- */
  const project = { v: 1, tasks: [
    { id: 't1', title: '上线看板大盘', status: 'done', createdAt: addDays(today, -10) },
    { id: 't2', title: '接入 AI 分析', status: 'doing', createdAt: addDays(today, -5) },
    { id: 't3', title: '写文档', status: 'todo', createdAt: addDays(today, -2) },
  ], sessions: lastNDays(14, today).filter((_, i) => i % 2 === 0).map((d, i) => ({ id: 'f' + i, date: d, minutes: 50, taskId: 't2' })), settings: { workMin: 25, breakMin: 5 } };

  const papers = { v: 1, settings: { categories: ['cs.LG', 'cs.AI'], keywords: [], maxResults: 30, proxyUrl: '' }, items: [
    { id: '2401.00001', title: 'Attention Is All You Need (示例)', authors: ['A. Vaswani'], primary: 'cs.LG', categories: ['cs.LG'], summary: '示例摘要。', published: '2024-01-02', status: 'done', addedAt: addDays(today, -9) + 'T0', doneAt: addDays(today, -7) + 'T0' },
    { id: '2401.00002', title: 'Scaling Laws (示例)', authors: ['J. Kaplan'], primary: 'cs.LG', categories: ['cs.LG'], summary: '示例摘要。', published: '2024-02-10', status: 'reading', addedAt: addDays(today, -3) + 'T0' },
    { id: '2401.00003', title: 'Diffusion Models (示例)', authors: ['J. Ho'], primary: 'cs.CV', categories: ['cs.CV'], summary: '示例摘要。', published: '2024-03-01', status: 'want', addedAt: addDays(today, -1) + 'T0' },
  ] };

  const syms = ['NVDA', 'AAPL', 'GOOGL', 'TSLA', 'MSFT'];
  const stocks = { symbols: syms, provider: 'yahoo', apiKey: '', proxyUrl: '', redUp: true };
  const quotes = syms.map((sym, k) => {
    const series = Array.from({ length: 24 }, (_, i) => r1(100 + k * 30 + i * (0.4 + k * 0.15) + wob(i + k * 7, 3)));
    const price = series[series.length - 1];
    const prevClose = series[series.length - 2];
    return { symbol: sym, price, prevClose, change: r1(price - prevClose), changePct: r1(((price - prevClose) / prevClose) * 100), series, demo: true };
  });
  const stocksCache = { quotes, at: today + 'T09:30:00Z' };

  // 学习地图：知识疆域示例（LLM 推理引擎）。展示四态 + 迷雾解锁问题 + 队列/足迹的用法。
  const tp = (name, status, note, unlock) => ({ id: `am-${name.slice(0, 6)}-${status}`, name, status, note: note || '', unlock: unlock || '' });
  const aimap = {
    mission: '把 vLLM / SGLang / TensorRT-LLM 级别的推理引擎吃透——算力、显存、通信、均衡，从理论建模到真机压测。',
    anchor: 'DeepSeek-V3 @ H100 SXM · 当前任务：单任务 DP/PP/EP 负载分析',
    tracks: [
      { id: 'am-tr1', tag: 'TRACK 1 · 主线', name: 'LLM 推理引擎', clusters: [
        { id: 'am-c11', name: '理论地基', topics: [
          tp('四层模型栈（架构→框架→权重→引擎）', 'done', '组织一切的骨架：优化住在哪一层，一问便知。'),
          tp('Prefill / Decode 不对称', 'done', 'prefill 算力瓶颈、decode 带宽瓶颈；一切分析先分两套。'),
          tp('Roofline · 算术强度 · ridge', 'done', 'H100 FP8 ridge≈591；MoE 含 /32 路由稀释。'),
          tp('单卡三函数成本建模', 'doing', '公式骨架已立；还没对真实多卡配置完整代入一遍。'),
        ] },
        { id: 'am-c12', name: '并行策略', topics: [
          tp('DP / TP / PP / EP：切什么·负载指纹', 'done', '没有并行是好处，全是代价，只比谁便宜。'),
          tp('PP：microbatch 与 bubble', 'done', 'bubble≈(p−1)/(m+p−1)；存在理由=装不下+穷通信扛慢网。'),
          tp('1F1B / interleaved 排程', 'doing', '知道各自目标；没手推过完整时刻表。'),
          tp('EP 负载不均衡与 EPLB', 'fog', '不均衡因子会算了；EPLB 怎么治还是黑盒。', '冗余专家放在哪、何时触发重排？重排时权重怎么搬、服务会不会抖？'),
        ] },
        { id: 'am-c13', name: '通信', topics: [
          tp('all-to-all（EP 的税）', 'done', '「换」不是「合」：token 按目的地洗牌。'),
          tp('NVLink / 带宽阶梯', 'done', 'NVLink 900 → PCIe ~128 → IB ~100 GB/s。'),
          tp('NCCL 内部（ring/tree）', 'fog', '知道它是物流公司；不知道卡车怎么排班。', 'ring all-reduce 每一步谁发谁收？为什么带宽最优？'),
          tp('通信-计算 overlap 工程', 'fog', '反复出现的「能不能藏住」；怎么藏的没拆过。', '双 microbatch 怎么把 all-to-all 压进 GEMM 底下？'),
        ] },
        { id: 'am-c14', name: '引擎核心机制', topics: [
          tp('KV cache · PagedAttention', 'doing', 'OS 分页类比已建立；block size 权衡待深入。'),
          tp('Continuous batching', 'doing', '迭代级调度概念有。'),
          tp('CUDA graph', 'fog', '只知道 decode 整图回放。', '为什么 decode 需要它？捕获时 shape 怎么固定？'),
          tp('nsys 时间线实读', 'todo', '最后一公里：认 NCCL 原语、判 overlap、找 straggler。'),
        ] },
      ] },
      { id: 'am-tr2', tag: 'TRACK 2 · 副线', name: '训练基础（够看懂被服务的模型即可）', clusters: [
        { id: 'am-c21', name: '', topics: [
          tp('Attention 变体（MHA/GQA/MLA）', 'doing', '名字与定位清楚；MLA 细节在主线迷雾。'),
          tp('训练流程概览（数据→预训练→对齐）', 'todo', '低优先；遇到再补。'),
        ] },
      ] },
    ],
    parked: [
      { id: 'am-p1', name: 'AI 战略 / 行业格局' }, { id: 'am-p2', name: '多模态' }, { id: 'am-p3', name: '强化学习 RL' },
    ],
    queue: [
      { id: 'am-q1', title: 'nsys 时间线实读演练', desc: '在真实 trace 里认出 NCCL 原语，判断 overlap 与 straggler。' },
      { id: 'am-q2', title: '把成本模型真正代入一次', desc: '16 卡 H100 放 DeepSeek-V3，几种并行配置逐个算出来对比。' },
      { id: 'am-q3', title: '迷雾区点名清扫', desc: '按阻塞度：CUDA graph → EPLB → overlap 工程，每个一次对话讲透。' },
    ],
    log: [
      { id: 'am-l1', date: today, text: '并行大扫盲：TP/DP/PP/EP 负载指纹 → microbatch 与 bubble 时空图 → 带宽阶梯。' },
      { id: 'am-l2', date: addDays(today, -3), text: '四层模型栈 · PagedAttention 与 OS 分页类比 · roofline 钉点。' },
    ],
  };

  return {
    'aimap-planner': aimap,
    'cut-planner': cut,
    'habits-planner': habits,
    'goals-planner': goals,
    'schedule-planner': schedule,
    'ledger-planner': ledger,
    'savings-planner': savings,
    'fitness-planner': fitness,
    'learning-planner': learning,
    'project-planner': project,
    'papers-planner': papers,
    'stocks-watch': stocks,
    'stocks-watch-cache': stocksCache,
  };
}

/** 写入 localStorage（覆盖式）。返回写入的键数。 */
export function seedDemo() {
  const data = buildDemoData(todayStr());
  let n = 0;
  for (const k of Object.keys(data)) {
    try { localStorage.setItem(k, JSON.stringify(data[k])); n += 1; } catch (e) { /* 静默 */ }
  }
  return n;
}

/** 判断某模块当前是否已有「真实内容」（用于决定是否跳过示例填充，避免覆盖用户数据）。 */
export function hasModuleContent(key, o) {
  if (!o || typeof o !== 'object') return false;
  const len = (a) => (Array.isArray(a) ? a.length : 0);
  switch (key) {
    case 'cut-planner': return !!o.profile || len(o.logs) > 0;
    case 'habits-planner': return len(o.habits) > 0;
    case 'goals-planner': return len(o.goals) > 0;
    case 'schedule-planner': return len(o.items) > 0;
    case 'ledger-planner': return len(o.entries) > 0;
    case 'savings-planner': { const nw = o.netWorth || {}; return len(nw.snapshots) > 0 || len(nw.accounts) > 0; }
    case 'fitness-planner': return len(o.workouts) > 0 || len(o.routines) > 0;
    case 'learning-planner': return len(o.plans) > 0;
    case 'aimap-planner': return len(o.tracks) > 0;
    case 'project-planner': return len(o.tasks) > 0;
    case 'papers-planner': return len(o.items) > 0;
    case 'stocks-watch': return len(o.symbols) > 0;
    case 'stocks-watch-cache': return false; // 缓存非用户数据，随 stocks-watch 一起处理
    default: return Object.keys(o).length > 0;
  }
}

/**
 * 只为「空白模块」填充示例数据，**绝不覆盖**已有内容。返回被填充的模块键数组。
 * 测试可注入 store（默认用浏览器 localStorage）。
 */
export function seedMissing(store) {
  const ls = store || (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!ls) return [];
  const data = buildDemoData(todayStr());
  const filled = [];
  for (const k of Object.keys(data)) {
    if (k === 'stocks-watch-cache') continue; // 跟随 stocks-watch
    let cur = null;
    try { const raw = ls.getItem(k); cur = raw ? JSON.parse(raw) : null; } catch (e) { cur = null; }
    if (hasModuleContent(k, cur)) continue; // 已有数据 → 保留，不动
    try { ls.setItem(k, JSON.stringify(data[k])); filled.push(k); } catch (e) { /* 静默 */ }
  }
  // 仅当我们刚填充了 stocks-watch 才写入示例行情缓存（否则不动用户/已有缓存）
  if (filled.includes('stocks-watch') && data['stocks-watch-cache']) {
    try { ls.setItem('stocks-watch-cache', JSON.stringify(data['stocks-watch-cache'])); } catch (e) { /* 静默 */ }
  }
  return filled;
}

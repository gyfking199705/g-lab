/**
 * 股票 AI 分析 —— 纯函数（prompt 构造 + 组合统计），不依赖 React / 网络
 * ------------------------------------------------------------------
 * 基于「自选股快照」（价格 / 涨跌幅 / 近期走势）构造给 AI 的消息，并算组合层面统计。
 * 仅供观察，不作买卖建议。可测试：node --test stocks/analysis.test.js
 */

/** 一条走势的区间涨跌幅（首→末，%）；无 series 返回 null。 */
export function seriesChangePct(series) {
  if (!Array.isArray(series) || series.length < 2) return null;
  const a = series[0], b = series[series.length - 1];
  if (!a) return null;
  return ((b - a) / a) * 100;
}

/** 组合层面统计：有效数、平均涨跌、上涨/下跌数、最强/最弱。 */
export function portfolioStats(quotes = []) {
  const valid = quotes.filter((q) => q && !q.error && isFinite(q.changePct));
  if (!valid.length) return { count: 0, avgChangePct: 0, gainers: 0, losers: 0, top: null, bottom: null };
  const sorted = [...valid].sort((a, b) => b.changePct - a.changePct);
  const avg = valid.reduce((s, q) => s + q.changePct, 0) / valid.length;
  return {
    count: valid.length,
    avgChangePct: Math.round(avg * 100) / 100,
    gainers: valid.filter((q) => q.changePct > 0).length,
    losers: valid.filter((q) => q.changePct < 0).length,
    top: sorted[0],
    bottom: sorted[sorted.length - 1],
  };
}

/** 构造让 AI 分析自选股的消息（中文、结构化、强调非投资建议）。 */
export function buildStockAnalysisMessages(quotes = []) {
  const valid = quotes.filter((q) => q && !q.error && isFinite(q.price));
  const lines = valid.map((q) => {
    const sc = seriesChangePct(q.series);
    return `- ${q.symbol}${q.name ? `（${q.name}）` : ''}：现价 ${round2(q.price)}，当日 ${fmtPct(q.changePct)}` +
      (sc != null ? `，近期走势 ${fmtPct(sc)}` : '');
  });
  const system =
    '你是严谨、中立的股票观察助手。基于用户提供的「有限快照数据」（现价、当日涨跌、近期走势），' +
    '给出客观、克制的观察，帮助用户理解自选股的近期表现与组合结构。' +
    '严禁给出买入/卖出/持有等具体投资建议或价格预测；数据有限，不要臆造基本面。用简体中文。';
  const user =
    `这是我的自选股快照（数据有限，仅价格与近期走势）：\n${lines.join('\n') || '（暂无有效数据）'}\n\n` +
    `请按以下结构输出：\n` +
    `1. 组合速览（涨跌分布、整体偏强还是偏弱、是否过度集中）\n` +
    `2. 个股观察（逐个，仅就给出的涨跌/走势做中性描述，不评估买卖）\n` +
    `3. 值得留意的风险或问题（如波动较大、过度集中等）\n` +
    `4. 一句话提醒：以上为基于有限数据的客观观察，非投资建议。`;
  return { system, user };
}

function round2(x) { return Math.round(Number(x) * 100) / 100; }
function fmtPct(p) { const v = Number(p) || 0; return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`; }

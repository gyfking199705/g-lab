/**
 * muse-ui · 命令面板的模糊匹配（纯函数，可单测）
 * 子序列匹配 + 打分：连续命中、词首命中加权；不命中所有 query 字符则 0 分。
 */

/**
 * 给 query 在 text 里的模糊匹配打分（越大越相关，0 = 不匹配）。
 * 空 query 视为弱匹配（返回 1），便于"未输入时展示全部"。
 */
export function fuzzyScore(query, text) {
  const q = String(query || '').toLowerCase().trim();
  const t = String(text || '').toLowerCase();
  if (!q) return 1;
  let qi = 0;
  let score = 0;
  let streak = 0;
  let last = -2;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      streak = last === ti - 1 ? streak + 1 : 0;
      let bonus = 1 + streak * 2; // 连续命中加权
      if (ti === 0 || /[\s\-_/.]/.test(t[ti - 1])) bonus += 3; // 词首命中加权
      score += bonus;
      last = ti;
      qi += 1;
    }
  }
  if (qi < q.length) return 0; // 还有 query 字符没匹配上
  return score + Math.max(0, 4 - t.length * 0.05); // 同分时略偏好短文本
}

/**
 * 过滤 + 排序命令。匹配 label / hint / keywords 任一即保留，按分数降序。
 * 空 query 返回原顺序的全部命令。
 */
export function filterCommands(commands, query) {
  const list = commands || [];
  const q = String(query || '').trim();
  if (!q) return list.slice();
  const scored = [];
  for (const c of list) {
    const s = Math.max(
      fuzzyScore(q, c.label || ''),
      fuzzyScore(q, c.hint || '') * 0.6,
      fuzzyScore(q, c.keywords || '') * 0.6
    );
    if (s > 0) scored.push({ c, s });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.map((x) => x.c);
}

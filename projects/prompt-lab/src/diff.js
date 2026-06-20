/**
 * 极简行级 diff（LCS），用于版本对比展示。纯函数，便于 `node --test`。
 * 返回 [{ type:'eq'|'add'|'del', text }]：
 *   eq  两侧相同行
 *   del 仅旧文本有（被删除）
 *   add 仅新文本有（新增）
 */
export function diffLines(oldStr = '', newStr = '') {
  const a = String(oldStr).split('\n');
  const b = String(newStr).split('\n');
  const n = a.length;
  const m = b.length;

  // LCS 长度表
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: 'eq', text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: 'del', text: a[i] });
      i++;
    } else {
      out.push({ type: 'add', text: b[j] });
      j++;
    }
  }
  while (i < n) out.push({ type: 'del', text: a[i++] });
  while (j < m) out.push({ type: 'add', text: b[j++] });
  return out;
}

/** 统计新增/删除行数，便于在 UI 摘要展示。 */
export function diffStat(rows = []) {
  let add = 0;
  let del = 0;
  for (const r of rows) {
    if (r.type === 'add') add++;
    else if (r.type === 'del') del++;
  }
  return { add, del };
}

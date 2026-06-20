/**
 * frontmatter.js — 解析 SKILL.md 顶部的 YAML frontmatter（纯函数，无依赖）。
 *
 * 这是一个**面向 Agent Skill 标准**的轻量解析器，而非通用 YAML：
 * 只覆盖 SKILL.md 实际用到的子集，保证可在 Node（构建期）与浏览器（运行期）共用。
 *
 * 支持：
 *   - `---` 包裹的 frontmatter 块
 *   - 顶层 `key: value`
 *   - 行内列表 `key: [a, b, c]`
 *   - 块状列表（`-` 起头，缩进 2 空格）
 *   - 一层嵌套对象（缩进 2 空格的 `key: value`，如 `metadata:`）
 *   - 单/双引号字符串，`#` 行内注释
 */

/** 拆出 frontmatter 文本块与正文。返回 { data, body, raw }。 */
export function splitFrontmatter(source) {
  const text = String(source == null ? '' : source).replace(/\r\n/g, '\n');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: text.trimStart(), raw: '' };
  return { data: parseYaml(m[1]), body: (m[2] || '').replace(/^\n+/, ''), raw: m[1] };
}

/** 解析 frontmatter 的便捷封装，仅返回元数据对象。 */
export function parseFrontmatter(source) {
  return splitFrontmatter(source).data;
}

/** 极简 YAML 子集解析。 */
export function parseYaml(text) {
  const lines = String(text == null ? '' : text).replace(/\r\n/g, '\n').split('\n');
  const root = {};
  let cursor = root; // 当前写入对象（顶层或某个嵌套对象）
  let listKey = null; // 正在收集块状列表的 key
  let listTarget = root;

  for (const rawLine of lines) {
    const line = stripComment(rawLine);
    if (!line.trim()) continue;
    const indent = line.length - line.trimStart().length;
    const content = line.trim();

    // 块状列表项：`- value`
    if (content.startsWith('- ')) {
      if (listKey == null) continue; // 没有归属的列表项，跳过
      if (!Array.isArray(listTarget[listKey])) listTarget[listKey] = [];
      listTarget[listKey].push(scalar(content.slice(2).trim()));
      continue;
    }

    const colon = content.indexOf(':');
    if (colon === -1) continue;
    const key = content.slice(0, colon).trim();
    let value = content.slice(colon + 1).trim();

    // 顶层 vs 一层嵌套：缩进>0 归到上一个开启的嵌套对象
    const target = indent > 0 ? cursor : root;
    if (indent === 0) cursor = root; // 回到顶层时复位

    if (value === '') {
      // 可能是嵌套对象或块状列表的起点
      const child = {};
      target[key] = child;
      cursor = child;
      listKey = key;
      listTarget = target;
      continue;
    }

    listKey = null;
    target[key] = scalar(value);
  }

  // 清理：空对象若其实是列表，已被覆盖为数组；保留空对象无妨
  return root;
}

function stripComment(line) {
  // 去掉非引号内的行内 # 注释
  let inS = false, inD = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (c === '#' && !inS && !inD && (i === 0 || line[i - 1] === ' ')) {
      return line.slice(0, i);
    }
  }
  return line;
}

function scalar(v) {
  if (v === '') return '';
  // 行内列表 [a, b, c]
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return splitList(inner).map((x) => scalar(x.trim()));
  }
  // 引号字符串
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null' || v === '~') return null;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

// 按逗号切分，但尊重引号
function splitList(s) {
  const out = [];
  let cur = '', inS = false, inD = false;
  for (const c of s) {
    if (c === "'" && !inD) { inS = !inS; cur += c; }
    else if (c === '"' && !inS) { inD = !inD; cur += c; }
    else if (c === ',' && !inS && !inD) { out.push(cur); cur = ''; }
    else cur += c;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

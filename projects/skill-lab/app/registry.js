/**
 * registry.js — 技能登记表的纯逻辑：归一化、检索、过滤、分类聚合、校验。
 * 不依赖 React / DOM，可单测，也供构建脚本（生成 index.json）复用。
 */

/** 把一条技能记录归一化成稳定结构，容错缺字段。 */
export function normalizeSkill(raw, slug) {
  const data = raw || {};
  const meta = data.metadata || {};
  return {
    slug: slug || data.slug || slugify(data.name || ''),
    name: data.name || slug || 'untitled',
    description: data.description || '',
    license: data.license || '',
    allowedTools: toList(data['allowed-tools'] != null ? data['allowed-tools'] : data.allowedTools),
    category: meta.category || data.category || 'Uncategorized',
    version: String(meta.version || data.version || '0.1.0'),
    author: meta.author || data.author || '',
    tags: toList(meta.tags || data.tags),
    path: data.path || ('skills/' + (slug || slugify(data.name || '')) + '/SKILL.md'),
  };
}

/** 解析 index.json（数组或 { skills: [...] }）成归一化记录数组。 */
export function parseIndex(json) {
  const arr = Array.isArray(json) ? json : (json && Array.isArray(json.skills) ? json.skills : []);
  return arr.map((s) => normalizeSkill(s, s.slug));
}

/** 关键词 + 分类过滤。query 匹配 name/description/tags/category。 */
export function filterSkills(skills, opts) {
  const { query = '', category = '' } = opts || {};
  const q = query.trim().toLowerCase();
  return (skills || []).filter((s) => {
    if (category && s.category !== category) return false;
    if (!q) return true;
    const hay = [s.name, s.description, s.category, (s.tags || []).join(' ')]
      .join(' ').toLowerCase();
    return q.split(/\s+/).every((tok) => hay.includes(tok));
  });
}

/** 聚合分类及计数，按数量倒序、同数按名升序。 */
export function categoriesOf(skills) {
  const map = new Map();
  for (const s of skills || []) map.set(s.category, (map.get(s.category) || 0) + 1);
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** 收集全部标签（去重、计数），按计数倒序。 */
export function tagsOf(skills) {
  const map = new Map();
  for (const s of skills || []) for (const t of s.tags || []) map.set(t, (map.get(t) || 0) + 1);
  return [...map.entries()].map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * 校验一条技能是否符合「业界标准」最小要求，返回问题列表（空=通过）。
 * 规则参考 Agent Skills：name 必填且为短横线小写、description 必填且足够具体。
 */
export function validateSkill(skill) {
  const issues = [];
  const name = (skill && skill.name) || '';
  const desc = (skill && skill.description) || '';
  if (!name) issues.push('缺少 name');
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) issues.push('name 应为小写短横线（kebab-case）');
  else if (name.length > 64) issues.push('name 过长（>64）');
  if (!desc) issues.push('缺少 description');
  else if (desc.length < 16) issues.push('description 过短，应说明「做什么 + 何时用」');
  else if (desc.length > 1024) issues.push('description 过长（>1024）');
  return issues;
}

export function slugify(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function toList(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return String(v).split(',').map((x) => x.trim()).filter(Boolean);
}

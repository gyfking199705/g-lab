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
    score: data.score != null ? Number(data.score) : null,
    grade: data.grade || '',
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

/**
 * 给一条技能打「质量分」（0–100），用于画廊展示与贡献者自检。
 * body 可选；缺 body 时与正文相关的检查记为未通过。返回 { score, grade, checks }。
 * 评分维度对齐 SPEC.md：触发线索是否清晰、是否有示例、元数据是否完整。
 */
export function scoreSkill(skill, body) {
  const s = skill || {};
  const name = s.name || '';
  const desc = s.description || '';
  const text = String(body || '');
  const hasWhenCue = /\b(use when|when |用于|何时|场景)\b/i.test(desc);
  const checks = [
    { label: 'name 为 kebab-case', weight: 10, ok: /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) && name.length <= 64,
      hint: 'name 用小写短横线，≤64 字符' },
    { label: 'description 长度合规', weight: 10, ok: desc.length >= 16 && desc.length <= 1024,
      hint: 'description 长度应在 16–1024' },
    { label: 'description 含触发线索', weight: 15, ok: hasWhenCue,
      hint: '在 description 里写清「何时用」（如 "Use when …"）' },
    { label: '有分类 category', weight: 5, ok: !!s.category && s.category !== 'Uncategorized',
      hint: '在 metadata.category 标注分类' },
    { label: '有标签 tags', weight: 10, ok: (s.tags || []).length > 0,
      hint: '在 metadata.tags 加 1+ 个标签' },
    { label: '声明 allowed-tools', weight: 10, ok: (s.allowedTools || []).length > 0,
      hint: '用 allowed-tools 限定可用工具' },
    { label: '正文有小标题', weight: 10, ok: /^#{1,6}\s/m.test(text),
      hint: '正文用 Markdown 小标题组织（When to use / Workflow…）' },
    { label: '正文含示例', weight: 15, ok: /```|例如|example/i.test(text),
      hint: '至少给一个正例（代码块或 Example）' },
    { label: '正文足够充实', weight: 15, ok: text.length >= 400,
      hint: '正文展开「怎么做」，≥400 字符' },
  ];
  const max = checks.reduce((n, c) => n + c.weight, 0);
  const got = checks.reduce((n, c) => n + (c.ok ? c.weight : 0), 0);
  const score = Math.round((got / max) * 100);
  return { score, grade: gradeOf(score), checks };
}

function gradeOf(score) {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

/** 生成把技能装到 agent 技能目录的安装命令（从仓库克隆拷贝到用户级目录）。 */
export function installCommand(slug, scope) {
  const safe = slugify(slug) || 'skill';
  const dest = scope === 'project' ? '.claude/skills' : '~/.claude/skills';
  return `mkdir -p ${dest} && cp -r projects/skill-lab/skills/${safe} ${dest}/${safe}`;
}

function toList(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return String(v).split(',').map((x) => x.trim()).filter(Boolean);
}

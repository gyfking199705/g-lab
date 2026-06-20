/**
 * prompt-lab 数据模型与纯函数（无 DOM / 无 React，便于 `node --test`）
 * ------------------------------------------------------------------
 * 一条 prompt 的字段对齐业界 prompt 工程的通用约定（Anthropic / OpenAI
 * 等的 prompt engineering 指南）：角色(system) + 正文(user) + 变量占位
 * + 技巧标签 + 适用模型 + 示例输入/输出 + 出处/许可 + 版本，便于复用、
 * 评审与可移植导出。
 */

/** 业界常见的能力分类（可扩展；展示用中文标签）。 */
export const CATEGORIES = [
  { id: 'writing', label: '写作 / 文案' },
  { id: 'coding', label: '编程 / 工程' },
  { id: 'analysis', label: '分析 / 推理' },
  { id: 'extraction', label: '信息抽取' },
  { id: 'agent', label: 'Agent / 工具调用' },
  { id: 'roleplay', label: '角色扮演 / 对话' },
  { id: 'creative', label: '创意 / 头脑风暴' },
  { id: 'education', label: '教学 / 解释' },
  { id: 'productivity', label: '效率 / 办公' },
  { id: 'other', label: '其它' },
];

/** 业界通用的 prompt 技巧（用于过滤与教学标注）。 */
export const TECHNIQUES = [
  { id: 'zero-shot', label: 'Zero-shot' },
  { id: 'few-shot', label: 'Few-shot' },
  { id: 'chain-of-thought', label: '思维链 CoT' },
  { id: 'role', label: '角色设定' },
  { id: 'structured-output', label: '结构化输出' },
  { id: 'xml-tags', label: 'XML 标签' },
  { id: 'react', label: 'ReAct' },
  { id: 'self-critique', label: '自我批判' },
  { id: 'rag', label: 'RAG / 上下文' },
  { id: 'guardrails', label: '边界约束' },
];

/** 常见目标模型族。 */
export const MODELS = ['Claude', 'GPT', 'Gemini', 'Llama', 'DeepSeek', 'Any'];

const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));
const TECHNIQUE_IDS = new Set(TECHNIQUES.map((t) => t.id));

/** 简短唯一 id。 */
export function uid(prefix = 'p') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** 取分类的展示标签；未知则原样返回。 */
export function categoryLabel(id) {
  const c = CATEGORIES.find((x) => x.id === id);
  return c ? c.label : id || '未分类';
}

/** 取技巧的展示标签；未知则原样返回。 */
export function techniqueLabel(id) {
  const t = TECHNIQUES.find((x) => x.id === id);
  return t ? t.label : id;
}

/**
 * 从正文中解析 {{变量}} 占位符，返回去重后的有序变量名数组。
 * 业界可移植 prompt 普遍用 {{name}} 表示模板变量。
 */
export function extractVariables(content = '') {
  const out = [];
  const seen = new Set();
  const re = /\{\{\s*([\w.-]+)\s*\}\}/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const name = m[1];
    if (!seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

/**
 * 用一组取值渲染模板。未提供的变量保留原占位符，便于人工补全。
 * @param {string} content
 * @param {Record<string,string>} values
 */
export function renderTemplate(content = '', values = {}) {
  return content.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (whole, name) => {
    const v = values[name];
    return v == null || v === '' ? whole : String(v);
  });
}

/**
 * 把任意输入规整为合法 prompt 记录（补默认、清洗类型、去空）。
 * 用于新增、编辑保存、导入校验。
 */
export function normalizePrompt(input = {}, now = Date.now()) {
  const content = typeof input.content === 'string' ? input.content : '';
  const title = (typeof input.title === 'string' ? input.title : '').trim();
  const category = CATEGORY_IDS.has(input.category) ? input.category : 'other';

  const techniques = Array.isArray(input.techniques)
    ? input.techniques.filter((t) => TECHNIQUE_IDS.has(t))
    : [];
  const tags = Array.isArray(input.tags)
    ? [...new Set(input.tags.map((t) => String(t).trim()).filter(Boolean))]
    : [];
  const models = Array.isArray(input.models)
    ? input.models.filter((m) => MODELS.includes(m))
    : [];

  // 历史版本快照（仅保留正文/角色/版本/时间），上限 20 条，最新在前。
  const history = Array.isArray(input.history)
    ? input.history
        .filter((h) => h && typeof h === 'object')
        .map((h) => ({
          version: typeof h.version === 'string' ? h.version : '',
          system: typeof h.system === 'string' ? h.system : '',
          content: typeof h.content === 'string' ? h.content : '',
          savedAt: typeof h.savedAt === 'number' ? h.savedAt : now,
        }))
        .slice(0, 20)
    : [];

  return {
    id: input.id || uid(),
    title: title || '未命名 Prompt',
    summary: (typeof input.summary === 'string' ? input.summary : '').trim(),
    category,
    tags,
    models: models.length ? models : ['Any'],
    techniques,
    system: typeof input.system === 'string' ? input.system : '',
    content,
    variables: extractVariables(content),
    exampleInput: typeof input.exampleInput === 'string' ? input.exampleInput : '',
    exampleOutput: typeof input.exampleOutput === 'string' ? input.exampleOutput : '',
    notes: typeof input.notes === 'string' ? input.notes : '',
    source: typeof input.source === 'string' ? input.source.trim() : '',
    license: typeof input.license === 'string' ? input.license.trim() : '',
    version: typeof input.version === 'string' && input.version.trim() ? input.version.trim() : '1.0.0',
    favorite: !!input.favorite,
    history,
    createdAt: typeof input.createdAt === 'number' ? input.createdAt : now,
    updatedAt: now,
  };
}

/**
 * 编辑提交：在 prev 基础上应用 nextInput，若正文或角色发生变化，则把 prev
 * 的快照压入 history（最新在前，上限 20）。返回规整后的新记录（纯函数）。
 * 用于「保存编辑」「从历史恢复」，让版本历史与对比可用。
 */
export function commitEdit(prev, nextInput, now = Date.now()) {
  const next = normalizePrompt({ ...prev, ...nextInput, history: prev?.history || [] }, now);
  const changed = !prev || prev.content !== next.content || prev.system !== next.system;
  if (prev && changed) {
    const snapshot = {
      version: prev.version,
      system: prev.system,
      content: prev.content,
      savedAt: prev.updatedAt || now,
    };
    next.history = [snapshot, ...(prev.history || [])].slice(0, 20);
  }
  return next;
}

/**
 * 搜索 + 过滤。纯函数，便于单测与复用。
 * @param {object[]} prompts
 * @param {object} f { query, category, technique, model, favorite }
 */
export function filterPrompts(prompts = [], f = {}) {
  const q = (f.query || '').trim().toLowerCase();
  return prompts.filter((p) => {
    if (f.category && f.category !== 'all' && p.category !== f.category) return false;
    if (f.technique && f.technique !== 'all' && !(p.techniques || []).includes(f.technique)) return false;
    if (f.model && f.model !== 'all' && !(p.models || []).includes(f.model)) return false;
    if (f.favorite && !p.favorite) return false;
    if (!q) return true;
    const hay = [
      p.title,
      p.summary,
      p.content,
      p.system,
      p.notes,
      (p.tags || []).join(' '),
      (p.techniques || []).join(' '),
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

/** 排序：收藏优先，其次按更新时间倒序、标题。 */
export function sortPrompts(prompts = [], by = 'updated') {
  const arr = [...prompts];
  if (by === 'title') arr.sort((a, b) => a.title.localeCompare(b.title, 'zh'));
  else if (by === 'created') arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  else arr.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return arr;
}

/** 统计各 tag 出现次数，按降序返回 [{tag,count}]。 */
export function tagCounts(prompts = []) {
  const map = new Map();
  for (const p of prompts) {
    for (const t of p.tags || []) map.set(t, (map.get(t) || 0) + 1);
  }
  return [...map.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);
}

/** 把一条 prompt 渲染成可分享的 Markdown（用于「复制为 Markdown」）。 */
export function promptToMarkdown(p = {}) {
  const lines = [];
  lines.push(`# ${p.title || '未命名 Prompt'}`);
  if (p.summary) lines.push('', `> ${p.summary}`);
  const meta = [];
  if (p.category) meta.push(`分类：${categoryLabel(p.category)}`);
  if ((p.models || []).length) meta.push(`模型：${p.models.join(' / ')}`);
  if ((p.techniques || []).length) meta.push(`技巧：${p.techniques.map(techniqueLabel).join(' / ')}`);
  if (p.version) meta.push(`版本：${p.version}`);
  if (meta.length) lines.push('', meta.join(' · '));
  if ((p.tags || []).length) lines.push('', (p.tags || []).map((t) => `\`#${t}\``).join(' '));
  if (p.system) lines.push('', '## System', '', '```text', p.system, '```');
  lines.push('', '## Prompt', '', '```text', p.content || '', '```');
  if (p.exampleInput || p.exampleOutput) {
    lines.push('', '## 示例');
    if (p.exampleInput) lines.push('', `**输入**：${p.exampleInput}`);
    if (p.exampleOutput) lines.push('', `**输出**：${p.exampleOutput}`);
  }
  if (p.notes) lines.push('', '## 笔记', '', p.notes);
  if (p.source) lines.push('', `_出处：${p.source}_`);
  return lines.join('\n');
}

/** 可移植导出格式（带 schema 版本，便于他处导入/迁移）。 */
export const EXPORT_FORMAT = 'prompt-lab/v1';

/** 组装导出对象。 */
export function buildExport(prompts = []) {
  return {
    format: EXPORT_FORMAT,
    exportedAt: new Date().toISOString(),
    count: prompts.length,
    prompts: prompts.map((p) => normalizePrompt(p, p.updatedAt || Date.now())),
  };
}

/**
 * 解析导入数据（支持本工具导出对象，或裸 prompt 数组）。
 * 返回规整后的 prompt 数组；非法输入返回 []。
 */
export function parseImport(data) {
  let list = null;
  if (Array.isArray(data)) list = data;
  else if (data && Array.isArray(data.prompts)) list = data.prompts;
  if (!list) return [];
  return list.map((p) => normalizePrompt(p, p.updatedAt || Date.now()));
}

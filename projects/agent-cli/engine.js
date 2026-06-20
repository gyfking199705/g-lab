/**
 * Agent CLI 控制台 —— 纯逻辑层（命令解析 / 斜杠命令 / 行级 diff / 离线模拟 agent / 虚拟文件系统）
 * ------------------------------------------------------------------
 * 只放「可单测的纯函数」：输入解析、斜杠补全、token 估算、行级 diff，
 * 以及一个**离线模拟 agent**——给定一句自然语言诉求，生成一串「思考 / 工具调用 / 回答」事件，
 * 由 React 组件按时间轴逐条「流式」播放，复刻 Claude Code / Codex / Gemini CLI 的交互手感。
 *
 * 不依赖 DOM / React / 网络；真实 AI 调用走同目录 ./ai.js（BYOK，Key 仅存本地）。
 */

/* ----------------------------- 斜杠命令 ----------------------------- */
export const SLASH_COMMANDS = [
  { name: '/help', desc: '显示可用命令与快捷键' },
  { name: '/clear', desc: '清空当前会话' },
  { name: '/model', desc: '查看 / 切换当前模型' },
  { name: '/login', desc: '配置你自己的 AI（BYOK，Key 仅存本地）' },
  { name: '/status', desc: '查看模型 / Key / 上下文 状态' },
  { name: '/cost', desc: '本次会话的 token 估算' },
  { name: '/init', desc: '扫描项目并生成 AGENTS.md（模拟）' },
  { name: '/diff', desc: '查看上一次改动的 diff' },
  { name: '/ls', desc: '列出虚拟项目里的文件' },
  { name: '/cat', desc: '打印某个文件内容：/cat <file>' },
  { name: '/demo', desc: '运行一个内置的 agent 演示任务' },
  { name: '/theme', desc: '切换暖色 深 / 浅 主题' },
  { name: '/reset', desc: '重置虚拟项目文件' },
  { name: '/about', desc: '关于这个 Agent CLI 控制台' },
];

/** 内置演示任务（/demo 与首屏提示共用）。 */
export const DEMO_PROMPT = '在 src/utils.js 里加一个 clamp(n, min, max) 工具函数，并跑一下测试';

/* ----------------------------- 输入解析 ----------------------------- */
/**
 * 解析一行输入。
 * @returns {{type:'empty'}|{type:'slash',name,args,argv}|{type:'prompt',text}}
 */
export function parseInput(raw) {
  const text = (raw || '').trim();
  if (!text) return { type: 'empty' };
  if (text[0] === '/') {
    const parts = text.split(/\s+/);
    const name = parts[0].toLowerCase();
    const argv = parts.slice(1);
    return { type: 'slash', name, args: argv.join(' '), argv };
  }
  return { type: 'prompt', text };
}

/** 斜杠自动补全：返回以 prefix 开头的命令（prefix 不含空格时才补全）。 */
export function matchSlash(prefix) {
  const p = (prefix || '').toLowerCase();
  if (!p.startsWith('/') || p.includes(' ')) return [];
  return SLASH_COMMANDS.filter((c) => c.name.startsWith(p));
}

/** 粗略 token 估算：CJK 约 1 字/token，其它约 0.28 token/字符。 */
export function estimateTokens(text) {
  if (!text) return 0;
  let t = 0;
  for (const ch of String(text)) t += /[一-鿿]/.test(ch) ? 1 : 0.28;
  return Math.max(1, Math.round(t));
}

/* ----------------------------- 虚拟文件系统 ----------------------------- */
/** 一个用于演示工具调用的迷你 Node 项目（纯内存，不落盘）。 */
export function seedFiles() {
  return {
    'package.json': [
      '{',
      '  "name": "demo-app",',
      '  "version": "0.1.0",',
      '  "type": "module",',
      '  "scripts": {',
      '    "start": "node src/index.js",',
      '    "test": "node --test"',
      '  }',
      '}',
      '',
    ].join('\n'),
    'src/index.js': [
      "import { greet, sum } from './utils.js';",
      '',
      "const names = ['Ada', 'Linus', 'Grace'];",
      'for (const n of names) console.log(greet(n));',
      "console.log('total:', sum([1, 2, 3, 4]));",
      '',
    ].join('\n'),
    'src/utils.js': [
      'export function greet(name) {',
      '  return `Hello, ${name}!`;',
      '}',
      '',
      'export function sum(list) {',
      '  return list.reduce((a, b) => a + b, 0);',
      '}',
      '',
    ].join('\n'),
    'README.md': [
      '# demo-app',
      '',
      '一个用于演示 Agent CLI 交互的迷你项目。',
      '',
      '## 使用',
      '- `npm start` 运行 src/index.js',
      '- `npm test` 跑测试',
      '',
    ].join('\n'),
  };
}

/* ----------------------------- 行级 diff（LCS） ----------------------------- */
/**
 * 计算两段文本的行级 diff。
 * @returns {{type:'ctx'|'add'|'del',text:string}[]}
 */
export function diffLines(aText, bText) {
  const a = String(aText == null ? '' : aText).split('\n');
  const b = String(bText == null ? '' : bText).split('\n');
  const n = a.length, m = b.length;
  // dp[i][j] = a[i:] 与 b[j:] 的最长公共子序列长度
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ type: 'ctx', text: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ type: 'del', text: a[i] }); i++; }
    else { out.push({ type: 'add', text: b[j] }); j++; }
  }
  while (i < n) out.push({ type: 'del', text: a[i++] });
  while (j < m) out.push({ type: 'add', text: b[j++] });
  return out;
}

/** 统计 diff 增删行数。 */
export function diffStat(diff) {
  let added = 0, removed = 0;
  for (const d of diff || []) {
    if (d.type === 'add') added++;
    else if (d.type === 'del') removed++;
  }
  return { added, removed };
}

/* ----------------------------- 离线模拟 agent ----------------------------- */
const lineCount = (t) => String(t == null ? '' : t).split('\n').filter((l, i, a) => i < a.length - 1 || l !== '').length;

function countMatches(files, pattern) {
  const re = new RegExp(pattern, 'g');
  let c = 0;
  for (const k of Object.keys(files)) {
    const m = String(files[k]).match(re);
    if (m) c += m.length;
  }
  return c;
}

/** 把一句诉求归类为意图，决定模拟 agent 的工作流。 */
export function classifyIntent(text) {
  const lc = String(text || '').toLowerCase();
  if (/(fix|bug|error|fail|broken|修复|修一?下|错误|报错|失败|崩)/.test(lc)) return 'fix';
  if (/(refactor|clean|simplify|tidy|重构|优化|整理|精简)/.test(lc)) return 'refactor';
  if (/(add|feature|implement|create|new |加(一|个)?|新增|实现|增加|写(一|个))/.test(lc)) return 'add';
  if (/(explain|what|how|why|where|understand|解释|讲讲?|说明|为什么|怎么|是什么|看懂|读懂)/.test(lc)) return 'explain';
  return 'plan';
}

/** 在虚拟文件里挑一个最相关的文件作为操作对象。 */
export function pickFile(prompt, files) {
  const names = Object.keys(files);
  for (const n of names) {
    if (prompt.includes(n) || prompt.includes(n.split('/').pop())) return n;
  }
  return names.find((n) => n.endsWith('utils.js')) || names.find((n) => n.endsWith('.js')) || names[0];
}

/** 从诉求里推断一个合法的标识符做函数名（兜底 helper）。 */
export function deriveName(prompt) {
  const banned = new Set(['src', 'the', 'add', 'new', 'function', 'util', 'utils', 'please', 'create', 'implement', 'feature']);
  const all = String(prompt || '').match(/\b[a-zA-Z][a-zA-Z0-9]{2,}\b/g) || [];
  for (const w of all) {
    if (!banned.has(w.toLowerCase())) return w;
  }
  return 'helper';
}

const tool = (name, arg, summary, detail, ms = 520) => ({ kind: 'tool', tool: name, arg, summary, detail, ms });

/** 对目标文件按意图做一次「改写」，返回新内容（纯函数）。 */
function applyTransform(intent, before, prompt) {
  const trimmed = before.replace(/\n*$/, '');
  if (intent === 'add') {
    if (/clamp/i.test(prompt)) {
      return trimmed + '\n\nexport function clamp(n, min, max) {\n  return Math.min(max, Math.max(min, n));\n}\n';
    }
    const fn = deriveName(prompt);
    return trimmed + `\n\nexport function ${fn}(value) {\n  // 由离线模拟 agent 生成的脚手架，按需替换实现\n  return value;\n}\n`;
  }
  if (intent === 'fix') {
    if (before.includes('return list.reduce((a, b) => a + b, 0);')) {
      return before.replace(
        '  return list.reduce((a, b) => a + b, 0);',
        '  if (!Array.isArray(list)) return 0;\n  return list.reduce((a, b) => a + b, 0);',
      );
    }
    return trimmed + '\n// guard added by agent\n';
  }
  if (intent === 'refactor') {
    if (!before.startsWith('/**')) {
      return '/**\n * 工具函数集合（由 agent 补充的文件级注释）。\n */\n' + before;
    }
    return before;
  }
  return before;
}

function explainText(prompt, files, file) {
  const exports = countMatches(files, 'export ');
  return [
    '这是一个用于演示的迷你 Node 项目：',
    '',
    '- `src/index.js` —— 入口，引入并调用工具函数后打印结果',
    `- \`${file}\` —— 工具函数（共导出约 ${exports} 个符号，如 greet / sum）`,
    '- `package.json` —— `npm start` 运行入口、`npm test` 跑测试',
    '',
    '当前是**离线模拟模式**：以上结论基于虚拟项目文件分析。配置你自己的 AI（/login）后，',
    '就能对真实问题作答；本控制台旨在把「agentic CLI 的交互方式」完整呈现出来。',
  ].join('\n');
}

/**
 * 给定一句诉求 + 当前文件，生成一串可「流式播放」的事件，并返回改写后的文件。
 * @returns {{events:object[], finalFiles:Record<string,string>}}
 */
export function planAgentRun(prompt, files) {
  const fs = { ...files };
  const intent = classifyIntent(prompt);
  const file = pickFile(prompt, fs);
  const events = [];

  if (intent === 'explain') {
    events.push({ kind: 'thinking', text: '先读关键文件、摸清结构，再组织回答。' });
    events.push(tool('Read', file, `读取 ${file}`, `Read ${lineCount(fs[file])} lines`));
    const other = Object.keys(fs).find((n) => n !== file && n.endsWith('.js'));
    if (other) events.push(tool('Read', other, `读取 ${other}`, `Read ${lineCount(fs[other])} lines`));
    events.push(tool('Grep', 'export', '搜索导出符号', `${countMatches(fs, 'export ')} matches in ${Object.keys(fs).length} files`));
    events.push({ kind: 'text', text: explainText(prompt, fs, file) });
    return { events, finalFiles: fs };
  }

  if (intent === 'fix') {
    events.push({ kind: 'thinking', text: '先复现问题，再定位到具体文件改最小的一处。' });
    events.push(tool('Bash', 'npm test', '运行测试（复现）', '✗ 1 failing — TypeError: list is not iterable', 700));
    events.push(tool('Read', file, `读取 ${file}`, `Read ${lineCount(fs[file])} lines`));
    const after = applyTransform('fix', fs[file], prompt);
    const diff = diffLines(fs[file], after);
    const st = diffStat(diff);
    fs[file] = after;
    events.push(tool('Edit', file, `修改 ${file}`, `+${st.added} -${st.removed}`));
    events.push({ kind: 'diff', file, diff });
    events.push(tool('Bash', 'npm test', '重新运行测试', '✓ all passing', 700));
    events.push({ kind: 'text', text: `已定位并修复 \`${file}\`：对入参做了防御性判断，测试重新通过。\n\n（离线模拟：这是演示性的最小改动。）` });
    return { events, finalFiles: fs };
  }

  if (intent === 'refactor') {
    events.push({ kind: 'thinking', text: '通读文件，确认对外行为不变后再整理。' });
    events.push(tool('Read', file, `读取 ${file}`, `Read ${lineCount(fs[file])} lines`));
    const after = applyTransform('refactor', fs[file], prompt);
    const diff = diffLines(fs[file], after);
    const st = diffStat(diff);
    fs[file] = after;
    events.push(tool('Edit', file, `整理 ${file}`, `+${st.added} -${st.removed}`));
    events.push({ kind: 'diff', file, diff });
    events.push({ kind: 'text', text: `已在不改变对外行为的前提下整理了 \`${file}\`。\n\n（离线模拟：示例性的轻量重构。）` });
    return { events, finalFiles: fs };
  }

  if (intent === 'add') {
    const isClamp = /clamp/i.test(prompt);
    events.push({ kind: 'thinking', text: '先看现有工具文件的写法，保持风格一致再新增。' });
    events.push(tool('Read', file, `读取 ${file}`, `Read ${lineCount(fs[file])} lines`));
    const after = applyTransform('add', fs[file], prompt);
    const diff = diffLines(fs[file], after);
    const st = diffStat(diff);
    fs[file] = after;
    events.push(tool('Edit', file, `编辑 ${file}`, `+${st.added} -${st.removed}`));
    events.push({ kind: 'diff', file, diff });
    events.push(tool('Bash', 'npm test', '运行测试', '✓ all passing', 700));
    const fn = isClamp ? 'clamp' : deriveName(prompt);
    events.push({ kind: 'text', text: `已在 \`${file}\` 新增 \`${fn}()\` 并保持原有风格，测试通过。\n\n（离线模拟：真实改代码请配置 /login 接你自己的 AI。）` });
    return { events, finalFiles: fs };
  }

  // plan：给不出明确动作时，先勘察再给方案（贴近 Claude Code 的 plan mode）
  events.push({ kind: 'thinking', text: '需求比较开放，先勘察项目再给出落地步骤（不直接改文件）。' });
  events.push(tool('Bash', 'ls -R', '浏览项目结构', Object.keys(fs).join('  ')));
  events.push(tool('Read', file, `读取 ${file}`, `Read ${lineCount(fs[file])} lines`));
  events.push({
    kind: 'text',
    text: [
      `针对「${prompt}」，建议这样推进：`,
      '',
      `1. 在 \`${file}\` 增加对应实现，保持现有导出风格`,
      '2. 在 `src/index.js` 接入并验证输出',
      '3. `npm test` 回归，确认无回归',
      '',
      '（离线模拟：把真实诉求接给你自己的 AI 见 /login。）',
    ].join('\n'),
  });
  return { events, finalFiles: fs };
}

/** 为「真实 AI」模式构造一个让模型像 CLI agent 那样作答的 system prompt。 */
export function agentSystemPrompt() {
  return [
    'You are a terminal-based coding assistant, similar to Claude Code / Codex CLI / Gemini CLI.',
    'Answer concisely and practically, as if replying in a developer terminal.',
    'Prefer short paragraphs and tight bullet lists. Use fenced code blocks for code.',
    'When the user asks in Chinese, reply in Chinese.',
  ].join(' ');
}

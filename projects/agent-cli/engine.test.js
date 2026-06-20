import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseInput,
  matchSlash,
  estimateTokens,
  seedFiles,
  diffLines,
  diffStat,
  classifyIntent,
  pickFile,
  deriveName,
  planAgentRun,
  SLASH_COMMANDS,
  toolKind,
  needsApproval,
  executeTool,
  displayToolName,
  AGENT_TOOLS,
  transcriptToMarkdown,
  formatRunStats,
} from './engine.js';

test('parseInput 区分空 / 斜杠 / 自然语言', () => {
  assert.equal(parseInput('   ').type, 'empty');
  const s = parseInput('/cat src/utils.js');
  assert.equal(s.type, 'slash');
  assert.equal(s.name, '/cat');
  assert.equal(s.args, 'src/utils.js');
  assert.deepEqual(s.argv, ['src/utils.js']);
  assert.equal(parseInput('解释一下这个项目').type, 'prompt');
});

test('parseInput 斜杠命令大小写归一', () => {
  assert.equal(parseInput('/HELP').name, '/help');
});

test('matchSlash 前缀补全，含空格不补全', () => {
  const m = matchSlash('/c');
  const names = m.map((c) => c.name);
  assert.ok(names.includes('/clear'));
  assert.ok(names.includes('/cat'));
  assert.ok(names.includes('/cost'));
  assert.equal(matchSlash('/cat ').length, 0);
  assert.equal(matchSlash('hello').length, 0);
});

test('每个斜杠命令都有描述', () => {
  for (const c of SLASH_COMMANDS) {
    assert.ok(c.name.startsWith('/'));
    assert.ok(c.desc && c.desc.length > 0);
  }
});

test('estimateTokens：CJK 比同长 ASCII 更贵', () => {
  assert.ok(estimateTokens('你好世界') > estimateTokens('hello'));
  assert.equal(estimateTokens(''), 0);
});

test('diffLines + diffStat 正确统计增删', () => {
  const a = 'line1\nline2\nline3';
  const b = 'line1\nline2-changed\nline3\nline4';
  const d = diffLines(a, b);
  const st = diffStat(d);
  assert.equal(st.removed, 1); // line2
  assert.equal(st.added, 2);   // line2-changed + line4
  assert.ok(d.some((x) => x.type === 'ctx' && x.text === 'line1'));
});

test('diffLines 相同文本无增删', () => {
  const d = diffLines('a\nb', 'a\nb');
  assert.deepEqual(diffStat(d), { added: 0, removed: 0 });
});

test('classifyIntent 命中常见意图', () => {
  assert.equal(classifyIntent('修复 sum 的 bug'), 'fix');
  assert.equal(classifyIntent('add a clamp function'), 'add');
  assert.equal(classifyIntent('解释一下这个项目'), 'explain');
  assert.equal(classifyIntent('refactor utils'), 'refactor');
  assert.equal(classifyIntent('帮我看看'), 'plan');
});

test('pickFile 命中提到的文件名，否则兜底 utils', () => {
  const files = seedFiles();
  assert.equal(pickFile('看看 README.md', files), 'README.md');
  assert.equal(pickFile('随便', files), 'src/utils.js');
});

test('deriveName 过滤噪声词', () => {
  assert.equal(deriveName('add clamp helper'), 'clamp');
  assert.equal(deriveName('加一个'), 'helper');
});

test('planAgentRun(add clamp) 产出工具事件并真的改了文件', () => {
  const files = seedFiles();
  const { events, finalFiles } = planAgentRun('加一个 clamp(n,min,max)', files);
  assert.ok(events.length > 0);
  assert.ok(events.some((e) => e.kind === 'tool' && e.tool === 'Edit'));
  assert.ok(events.some((e) => e.kind === 'diff'));
  assert.ok(events.some((e) => e.kind === 'text'));
  assert.ok(finalFiles['src/utils.js'].includes('export function clamp'));
  assert.ok(!files['src/utils.js'].includes('clamp'));
});

test('planAgentRun(fix) 跑测试→改→再跑测试', () => {
  const { events, finalFiles } = planAgentRun('修复 sum 的报错', seedFiles());
  const bash = events.filter((e) => e.kind === 'tool' && e.tool === 'Bash');
  assert.equal(bash.length, 2);
  assert.ok(finalFiles['src/utils.js'].includes('Array.isArray'));
});

test('planAgentRun(explain) 只读不写', () => {
  const files = seedFiles();
  const { events, finalFiles } = planAgentRun('解释这个项目', files);
  assert.ok(!events.some((e) => e.kind === 'tool' && (e.tool === 'Edit' || e.tool === 'Write')));
  assert.deepEqual(finalFiles, files);
});

test('toolKind 归类 read/edit/exec', () => {
  assert.equal(toolKind('Read'), 'read');
  assert.equal(toolKind('Grep'), 'read');
  assert.equal(toolKind('Edit'), 'edit');
  assert.equal(toolKind('Write'), 'edit');
  assert.equal(toolKind('Bash'), 'exec');
});

test('needsApproval 三档放权语义', () => {
  // full-auto：什么都不拦
  assert.equal(needsApproval('full-auto', 'Edit'), false);
  assert.equal(needsApproval('full-auto', 'Bash'), false);
  // auto-edit：只拦命令
  assert.equal(needsApproval('auto-edit', 'Edit'), false);
  assert.equal(needsApproval('auto-edit', 'Bash'), true);
  assert.equal(needsApproval('auto-edit', 'Read'), false);
  // suggest：拦改文件 + 命令，读放行
  assert.equal(needsApproval('suggest', 'Edit'), true);
  assert.equal(needsApproval('suggest', 'Bash'), true);
  assert.equal(needsApproval('suggest', 'Read'), false);
});

test('executeTool read/list/grep 只读不改文件', () => {
  const files = seedFiles();
  const r = executeTool('read_file', { path: 'src/utils.js' }, files);
  assert.ok(r.ok && r.content.includes('export function sum'));
  assert.equal(executeTool('read_file', { path: 'nope.js' }, files).ok, false);
  assert.ok(executeTool('list_files', {}, files).content.includes('package.json'));
  assert.match(executeTool('grep', { pattern: 'export' }, files).result, /matches/);
  // 不改原文件
  assert.deepEqual(r.files, files);
});

test('executeTool edit_file 命中替换并产出 diff', () => {
  const files = seedFiles();
  const r = executeTool('edit_file', { path: 'src/utils.js', old_string: 'Hello, ${name}!', new_string: 'Hi, ${name}~' }, files);
  assert.ok(r.ok);
  assert.ok(r.files['src/utils.js'].includes('Hi, ${name}~'));
  assert.ok(Array.isArray(r.diff));
  // old_string 不存在时报错、不改文件
  const bad = executeTool('edit_file', { path: 'src/utils.js', old_string: 'NOPE', new_string: 'x' }, files);
  assert.equal(bad.ok, false);
});

test('executeTool write_file / run_bash', () => {
  const files = seedFiles();
  const w = executeTool('write_file', { path: 'NEW.md', content: 'a\nb\n' }, files);
  assert.ok(w.ok && w.files['NEW.md'] === 'a\nb\n');
  assert.match(executeTool('run_bash', { command: 'npm test' }, files).result, /passing/);
});

test('transcriptToMarkdown 渲染会话且跳过装饰', () => {
  const history = [
    { type: 'banner' },
    { type: 'user', text: '加个 clamp' },
    { type: 'thinking', text: '先看文件' },
    { type: 'tool', tool: 'Edit', arg: 'src/utils.js', detail: '+4 -0' },
    { type: 'diff', diff: [{ type: 'ctx', text: 'a' }, { type: 'add', text: 'b' }, { type: 'del', text: 'c' }] },
    { type: 'approval', tool: 'Bash', arg: 'npm test', status: 'approve' },
    { type: 'assistant', text: '已完成。' },
  ];
  const md = transcriptToMarkdown(history);
  assert.match(md, /^# Agent CLI 会话记录/);
  assert.ok(md.includes('### › 加个 clamp'));
  assert.ok(md.includes('● **Edit**(src/utils.js) — +4 -0'));
  assert.ok(md.includes('```diff'));
  assert.ok(md.includes('+b') && md.includes('-c'));
  assert.ok(md.includes('已批准'));
  assert.ok(md.includes('已完成。'));
  assert.ok(!md.includes('banner')); // 装饰被跳过
});

test('formatRunStats 拼装小结，steps 可选', () => {
  assert.equal(formatRunStats({ tools: 3, ms: 1400, tokens: 120 }), '✓ 3 个工具 · 1.4s · ≈120 tok');
  assert.ok(formatRunStats({ tools: 2, steps: 4, ms: 900, tokens: 50 }).includes('4 步'));
  assert.match(formatRunStats({}), /^✓ 0 个工具/);
});

test('AGENT_TOOLS 与 displayToolName 一致', () => {
  assert.ok(AGENT_TOOLS.length >= 5);
  for (const t of AGENT_TOOLS) {
    assert.ok(t.name && t.desc && t.schema && t.display);
    assert.equal(displayToolName(t.name), t.display);
  }
  assert.equal(displayToolName('unknown_x'), 'unknown_x');
});

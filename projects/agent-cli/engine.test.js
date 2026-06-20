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

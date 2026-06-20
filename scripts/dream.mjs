#!/usr/bin/env node
// dream.mjs — g-lab「做梦机制 / dreaming」的统一记录工具（零依赖，Claude & Codex 通用）
//
// 三个存放地（都在 g-lab 根目录的 dreaming/ 下）：
//   素材  materials  → dreaming/materials.md  每次提交写「做了什么 / 解决什么问题」
//   脑爆  dreams      → dreaming/dreams.md     基于素材自由发散「下一步可以做什么」
//   计划  plans       → dreaming/plans.md      从脑爆里筛出「真实可行」的计划
//
// 用法（flag 风格，便于 agent 调用，可重复传 --idea / --step）：
//   node scripts/dream.mjs capture --by claude --scope learning \
//       --title "学习站拆二级分类" --focus "把全方位提升拆成二级子分类" \
//       --problem "一级分类太粗，找不到对应模板" [--commit HEAD] [--note "遗留：移动端待测"]
//
//   node scripts/dream.mjs dream --by claude --title "学习站下一步" \
//       --from "M-... , M-..." --idea "想法A" --idea "想法B"
//
//   node scripts/dream.mjs plan --by codex --title "二级分类搜索" \
//       --from "D-3" --why "数据结构已就绪，纯前端可做" \
//       --step "加搜索框" --step "模糊匹配二级分类" --accept "输入关键词秒出对应模板"
//
//   node scripts/dream.mjs plan --update P-2 --status active   # proposed|active|done|dropped
//   node scripts/dream.mjs status                              # 速览：最近素材 + 待办计划
//
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'dreaming');
const FILES = {
  materials: join(DIR, 'materials.md'),
  dreams: join(DIR, 'dreams.md'),
  plans: join(DIR, 'plans.md'),
};
const PREFIX = { materials: 'M', dreams: 'D', plans: 'P' };

// ---- arg 解析：支持重复 flag（值聚成数组），无值 flag 记为 true ----
function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      const val = next && !next.startsWith('--') ? (i++, next) : true;
      if (key in out) out[key] = [].concat(out[key], val);
      else out[key] = val;
    } else out._.push(a);
  }
  return out;
}
const arr = (v) => (v == null ? [] : [].concat(v));
const today = () => new Date().toISOString().slice(0, 10);

function read(file) {
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
}
// 下一个自增 id：扫描已有的 `## M-12 ·` 形式取最大值 +1
function nextId(file, prefix) {
  const re = new RegExp(`^## ${prefix}-(\\d+)`, 'gm');
  let max = 0, m;
  const text = read(file);
  while ((m = re.exec(text))) max = Math.max(max, Number(m[1]));
  return `${prefix}-${max + 1}`;
}
function append(file, block) {
  let cur = read(file);
  if (cur && !cur.endsWith('\n')) cur += '\n';
  const gap = cur === '' ? '' : '\n'; // 条目之间空一行
  writeFileSync(file, cur + gap + block + '\n');
}
function gitShort(ref) {
  try { return execSync(`git rev-parse --short ${ref}`, { cwd: ROOT }).toString().trim(); }
  catch { return ref; }
}
function requireFlags(a, keys, cmd) {
  const missing = keys.filter((k) => !a[k] || a[k] === true);
  if (missing.length) {
    console.error(`✗ ${cmd} 缺少必填参数: ${missing.map((k) => '--' + k).join(', ')}`);
    process.exit(1);
  }
}

function capture(a) {
  requireFlags(a, ['by', 'title', 'focus', 'problem'], 'capture');
  const id = nextId(FILES.materials, PREFIX.materials);
  const commit = a.commit ? gitShort(a.commit) : gitShort('HEAD');
  const lines = [
    `## ${id} · ${today()} · ${a.title}`,
    `- 作者: ${a.by}`,
    `- 提交: ${commit}`,
    a.scope ? `- 子项目: ${a.scope}` : null,
    `- 重点: ${a.focus}`,
    `- 解决的问题: ${a.problem}`,
    ...arr(a.note).map((n) => `- 遗留/副作用: ${n}`),
  ].filter(Boolean);
  append(FILES.materials, lines.join('\n'));
  console.log(`✓ 素材 ${id} 已记入 dreaming/materials.md`);
}

function dream(a) {
  requireFlags(a, ['by', 'title'], 'dream');
  const ideas = arr(a.idea);
  if (!ideas.length) { console.error('✗ dream 至少要一条 --idea'); process.exit(1); }
  const id = nextId(FILES.dreams, PREFIX.dreams);
  const lines = [
    `## ${id} · ${today()} · ${a.title}`,
    `- 作者: ${a.by}`,
    a.from ? `- 来源素材: ${a.from}` : `- 来源素材: （自由脑爆）`,
    `- 脑爆:`,
    ...ideas.map((x) => `  - ${x}`),
  ];
  append(FILES.dreams, lines.join('\n'));
  console.log(`✓ 脑爆 ${id} 已记入 dreaming/dreams.md`);
}

function plan(a) {
  if (a.update) return updatePlan(a);
  requireFlags(a, ['by', 'title', 'why'], 'plan');
  const steps = arr(a.step);
  if (!steps.length) { console.error('✗ plan 至少要一条 --step'); process.exit(1); }
  const id = nextId(FILES.plans, PREFIX.plans);
  const status = a.status && a.status !== true ? a.status : 'proposed';
  const lines = [
    `## ${id} · ${a.title}`,
    `- 状态: ${status}`,
    `- 作者: ${a.by}`,
    a.from ? `- 来源脑爆: ${a.from}` : null,
    `- 可行性: ${a.why}`,
    `- 步骤:`,
    ...steps.map((s, i) => `  ${i + 1}. ${s}`),
    a.accept ? `- 验收: ${a.accept}` : null,
  ].filter(Boolean);
  append(FILES.plans, lines.join('\n'));
  console.log(`✓ 计划 ${id} 已记入 dreaming/plans.md (状态: ${status})`);
}

const STATUSES = ['proposed', 'active', 'done', 'dropped'];
function updatePlan(a) {
  requireFlags(a, ['status'], 'plan --update');
  if (!STATUSES.includes(a.status)) {
    console.error(`✗ 状态须为: ${STATUSES.join(' | ')}`); process.exit(1);
  }
  const id = a.update;
  const text = read(FILES.plans);
  const re = new RegExp(`(^## ${id} ·[^\\n]*\\n(?:[^\\n]*\\n)*?- 状态: )[^\\n]*`, 'm');
  if (!re.test(text)) { console.error(`✗ 未找到计划 ${id}`); process.exit(1); }
  writeFileSync(FILES.plans, text.replace(re, `$1${a.status}`));
  console.log(`✓ 计划 ${id} 状态 → ${a.status}`);
}

function status() {
  // 最近 5 条素材
  const mids = [...read(FILES.materials).matchAll(/^## (M-\d+) · (\S+) · (.+)$/gm)];
  console.log('— 最近素材 —');
  for (const m of mids.slice(-5)) console.log(`  ${m[1]}  ${m[2]}  ${m[3]}`);
  // 计划按状态分组
  const plans = [...read(FILES.plans).matchAll(/^## (P-\d+) · (.+)\n- 状态: (\w+)/gm)];
  const open = plans.filter((p) => p[3] === 'proposed' || p[3] === 'active');
  console.log(`\n— 待办计划 (proposed/active: ${open.length}) —`);
  for (const p of open) console.log(`  ${p[1]}  [${p[3]}]  ${p[2]}`);
}

function enableHooks() {
  execSync('git config core.hooksPath scripts/hooks', { cwd: ROOT });
  for (const h of ['pre-commit', 'post-commit']) {
    try { execSync(`chmod +x scripts/hooks/${h}`, { cwd: ROOT }); } catch {}
  }
  console.log('✓ 已启用 dreaming git 钩子 (core.hooksPath = scripts/hooks)');
  console.log('  pre-commit 拦住没记素材的代码提交，post-commit 提醒记素材。');
}

const cmd = process.argv[2];
const a = parseArgs(process.argv.slice(3));
const handlers = { capture, dream, plan, status, 'enable-hooks': enableHooks };
(handlers[cmd] || (() => {
  console.log('用法: node scripts/dream.mjs <capture|dream|plan|status|enable-hooks> [flags]');
  console.log('详见 dreaming/README.md');
}))(a);

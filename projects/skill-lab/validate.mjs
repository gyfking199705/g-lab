/**
 * validate.mjs — 校验 skills/ 下每个 SKILL.md 是否符合业界标准，并打质量分。
 *   node validate.mjs            # 人类可读报告
 *   node validate.mjs --strict   # 有任一硬性 issue 时以非零码退出（CI 用）
 *   node validate.mjs --min 60   # 质量分低于阈值也算失败（默认仅 issue 失败）
 *
 * 用于 CI（见 .github/workflows/skill-lab-validate.yml）与贡献者本地自检。
 * 复用 app/ 的纯逻辑，确保与画廊、构建脚本同一套规则。
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitFrontmatter } from './app/frontmatter.js';
import { normalizeSkill, validateSkill, scoreSkill } from './app/registry.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(HERE, 'skills');
const args = process.argv.slice(2);
const strict = args.includes('--strict');
const minIdx = args.indexOf('--min');
const min = minIdx > -1 ? Number(args[minIdx + 1]) : 0;

if (!existsSync(SKILLS_DIR)) {
  console.error('✗ 找不到 skills/ 目录');
  process.exit(1);
}

let failed = 0;
let total = 0;
const rows = [];

for (const name of readdirSync(SKILLS_DIR).sort()) {
  if (name.startsWith('_') || name.startsWith('.')) continue;
  const dir = join(SKILLS_DIR, name);
  const file = join(dir, 'SKILL.md');
  if (!statSync(dir).isDirectory() || !existsSync(file)) continue;
  total++;

  const { data, body } = splitFrontmatter(readFileSync(file, 'utf8'));
  const skill = normalizeSkill({ ...data, slug: name }, name);
  const issues = validateSkill(skill);
  const { score, grade } = scoreSkill(skill, body);

  const bad = issues.length > 0 || (min > 0 && score < min);
  if (bad) failed++;
  rows.push({ name, score, grade, issues, bad });
}

const pad = (s, n) => String(s).padEnd(n);
console.log(`\n  Skill Lab 校验 · ${total} 个技能${min ? `（质量分阈值 ${min}）` : ''}\n`);
for (const r of rows) {
  const mark = r.bad ? '✗' : '✓';
  console.log(`  ${mark} ${pad(r.name, 26)} ${r.grade}  ${pad(r.score + '/100', 8)}${r.issues.length ? '  ⚠ ' + r.issues.join('；') : ''}`);
}
const avg = rows.length ? Math.round(rows.reduce((n, r) => n + r.score, 0) / rows.length) : 0;
console.log(`\n  平均质量分：${avg}/100 ｜ 通过 ${total - failed}/${total}\n`);

if (strict && failed > 0) {
  console.error(`✗ 有 ${failed} 个技能未达标。`);
  process.exit(1);
}

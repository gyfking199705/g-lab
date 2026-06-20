/**
 * Skill 研究室构建脚本。
 *   cd projects/skill-lab && npm install --no-save esbuild react@18.3.1 react-dom@18.3.1 && node build.mjs
 *
 * 做两件事：
 *   1) 扫描 skills/<name>/SKILL.md，解析 frontmatter，校验是否符合标准，生成 skills/index.json（登记表）。
 *   2) 把 app/bootstrap.jsx 打成自托管单文件 dist/app.js（含 React），并给 index.html 写入 ?v=hash。
 */
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { splitFrontmatter } from './app/frontmatter.js';
import { normalizeSkill, validateSkill, scoreSkill } from './app/registry.js';

// ── 1) 生成技能登记表 skills/index.json ──────────────────────────────
const SKILLS_DIR = 'skills';
const entries = [];
const problems = [];

if (existsSync(SKILLS_DIR)) {
  for (const name of readdirSync(SKILLS_DIR).sort()) {
    if (name.startsWith('_') || name.startsWith('.')) continue; // _template / 隐藏目录不收录
    const dir = join(SKILLS_DIR, name);
    const file = join(dir, 'SKILL.md');
    if (!statSync(dir).isDirectory() || !existsSync(file)) continue;
    const { data, body } = splitFrontmatter(readFileSync(file, 'utf8'));
    const skill = normalizeSkill({ ...data, slug: name, path: `skills/${name}/SKILL.md` }, name);
    const issues = validateSkill(skill);
    if (issues.length) problems.push(`  · ${name}: ${issues.join('；')}`);
    const { score, grade } = scoreSkill(skill, body);
    entries.push({
      slug: skill.slug,
      name: skill.name,
      description: skill.description,
      license: skill.license,
      'allowed-tools': skill.allowedTools,
      path: skill.path,
      score,
      grade,
      metadata: {
        category: skill.category,
        version: skill.version,
        author: skill.author,
        tags: skill.tags,
      },
    });
  }
}

entries.sort((a, b) =>
  (a.metadata.category || '').localeCompare(b.metadata.category || '') || a.name.localeCompare(b.name));

const index = {
  generatedAt: new Date().toISOString().slice(0, 10),
  count: entries.length,
  skills: entries,
};
writeFileSync(join(SKILLS_DIR, 'index.json'), JSON.stringify(index, null, 2) + '\n');
console.log(`📇 已生成 skills/index.json：收录 ${entries.length} 个技能`);
if (problems.length) {
  console.warn('⚠️  以下技能不完全符合标准：\n' + problems.join('\n'));
}

// ── 2) 打包前端 dist/app.js ──────────────────────────────────────────
await build({
  bundle: true,
  jsx: 'transform',
  minify: true,
  sourcemap: false,
  format: 'esm',
  target: ['es2019'],
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
  entryPoints: ['app/bootstrap.jsx'],
  outfile: 'dist/app.js',
});

// 给 index.html 写入缓存破坏版本号
if (existsSync('index.html') && existsSync('dist/app.js')) {
  const hash = createHash('sha1').update(readFileSync('dist/app.js')).digest('hex').slice(0, 10);
  const html = readFileSync('index.html', 'utf8');
  const next = html.replace(/src="\.\/dist\/app\.js(?:\?v=[a-f0-9]+)?"/, `src="./dist/app.js?v=${hash}"`);
  if (next !== html) writeFileSync('index.html', next);
  console.log(`✅ 已打包 dist/app.js（v=${hash}）`);
}

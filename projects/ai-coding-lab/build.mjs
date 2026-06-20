/**
 * AI Coding 研究室 打包脚本：把 React 应用打成自托管单文件 bundle（含 React，无外部 CDN）。
 *   cd projects/ai-coding-lab && npm i --no-save esbuild react@18.3.1 react-dom@18.3.1 && node build.mjs
 * 产物：
 *   dist/app.js   —— 自托管单文件（入库，GitHub Pages），并把内容哈希写进 index.html 的 ?v= 缓存号。
 *   KNOWLEDGE.md  —— 全量知识库的 Markdown 摘要（入库），供人/别的 agent 不跑应用即可直接通读、吸收。
 */
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { ITEMS, TEMPLATES } from './data/practices.js';
import { toMarkdown } from './src/exportMd.js';

await build({
  bundle: true,
  format: 'esm',
  jsx: 'transform', // 经典运行时：组件内 import React 后使用 React.createElement
  minify: true,
  sourcemap: false,
  target: ['es2019'],
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'none',
  entryPoints: ['src/bootstrap.jsx'],
  outfile: 'dist/app.js',
});

if (existsSync('index.html') && existsSync('dist/app.js')) {
  const hash = createHash('sha1').update(readFileSync('dist/app.js')).digest('hex').slice(0, 10);
  const html = readFileSync('index.html', 'utf8');
  const next = html.replace(/src="\.\/dist\/app\.js(?:\?v=[a-f0-9]+)?"/, `src="./dist/app.js?v=${hash}"`);
  if (next !== html) writeFileSync('index.html', next);
}

// 生成全量知识库摘要 KNOWLEDGE.md（单一事实来源 = data/practices.js）
const body = toMarkdown(ITEMS, { title: 'AI Coding 研究室 · 知识库全量摘要' });
const withTpl = Object.keys(TEMPLATES).length;
const header = [
  '<!-- 本文件由 `node build.mjs` 自动生成，请勿手改；改 data/practices.js 后重新生成。 -->',
  '',
  '> 这是 `projects/ai-coding-lab/` 知识库的全量纯文本摘要，供人或别的 agent 不运行应用即可直接通读、吸收。',
  `> 共 ${ITEMS.length} 条实践，其中 ${withTpl} 条带「可复制模板」（见应用详情页或 data/practices.js 的 \`TEMPLATES\`）。`,
  '> 想扩展/修改请读 [`AGENTS.md`](AGENTS.md)；交互式浏览见同目录应用（在线路径 `…/projects/ai-coding-lab/`）。',
  '',
  '---',
  '',
].join('\n');
writeFileSync('KNOWLEDGE.md', header + body);

console.log('✅ ai-coding-lab 已打包：dist/app.js（已写入 ?v= 缓存号）+ KNOWLEDGE.md 摘要');

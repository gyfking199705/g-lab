/**
 * AI Coding 研究室 打包脚本：把 React 应用打成自托管单文件 bundle（含 React，无外部 CDN）。
 *   cd projects/ai-coding-lab && npm i --no-save esbuild react@18.3.1 react-dom@18.3.1 && node build.mjs
 * 产物：dist/app.js（入库，GitHub Pages 自托管），并把内容哈希写进 index.html 的 ?v= 缓存号。
 */
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

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

console.log('✅ ai-coding-lab 已打包：dist/app.js（已写入 ?v= 缓存号）');

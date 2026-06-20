/**
 * prompt-lab 打包脚本。
 *   cd projects/prompt-lab && npm i --no-save esbuild react@18.3.1 react-dom@18.3.1 && node build.mjs
 * 产物：
 *   dist/app.js —— 应用 bundle（含 React，GitHub Pages 自托管，入库）
 * 同时把缓存破坏版本号写进 index.html 的 ?v=。
 */
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

await build({
  bundle: true,
  jsx: 'transform',
  minify: true,
  sourcemap: false,
  format: 'esm',
  target: ['es2019'],
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
  entryPoints: ['src/bootstrap.jsx'],
  outfile: 'dist/app.js',
});

if (existsSync('index.html') && existsSync('dist/app.js')) {
  const hash = createHash('sha1').update(readFileSync('dist/app.js')).digest('hex').slice(0, 10);
  const html = readFileSync('index.html', 'utf8');
  const next = html.replace(/src="\.\/dist\/app\.js(?:\?v=[a-f0-9]+)?"/, `src="./dist/app.js?v=${hash}"`);
  if (next !== html) writeFileSync('index.html', next);
}

console.log('✅ prompt-lab 已打包：dist/app.js');

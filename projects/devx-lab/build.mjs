/**
 * devx-lab 打包脚本。
 *   cd projects/devx-lab && npm i --no-save esbuild react@18.3.1 react-dom@18.3.1 && node build.mjs
 * 产物：app.js —— 演示页 bundle（含 React，入库自托管，GitHub Pages 用）。
 * 同时把缓存破坏版本号 ?v=<hash> 写回 index.html。
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
  entryPoints: ['bootstrap.jsx'],
  outfile: 'app.js',
});

if (existsSync('index.html') && existsSync('app.js')) {
  const hash = createHash('sha1').update(readFileSync('app.js')).digest('hex').slice(0, 10);
  const html = readFileSync('index.html', 'utf8');
  const next = html.replace(/src="\.\/app\.js(?:\?v=[a-f0-9]+)?"/, `src="./app.js?v=${hash}"`);
  if (next !== html) writeFileSync('index.html', next);
  console.log(`✅ devx-lab 已打包：app.js（?v=${hash}）`);
} else {
  console.log('✅ devx-lab 已打包：app.js');
}

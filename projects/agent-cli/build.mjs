/**
 * agent-cli 打包脚本。
 *   cd projects/agent-cli && npm install --no-save esbuild react@18.3.1 react-dom@18.3.1 && node build.mjs
 * 产物：
 *   app.js —— 演示页 bundle（GitHub Pages 用，含 React，入库自托管，无外部 CDN）
 */
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

await build({
  bundle: true,
  jsx: 'transform', // 经典运行时：组件里 import React 后使用 React.createElement
  minify: true,
  sourcemap: false,
  format: 'esm',
  target: ['es2019'],
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
  entryPoints: ['bootstrap.jsx'],
  outfile: 'app.js',
});

// 缓存破坏：把 bundle 内容哈希写入 index.html 的 <script src=...?v=hash>
if (existsSync('index.html') && existsSync('app.js')) {
  const hash = createHash('sha1').update(readFileSync('app.js')).digest('hex').slice(0, 10);
  const html = readFileSync('index.html', 'utf8');
  const next = html.replace(/src="\.\/app\.js(?:\?v=[a-f0-9]+)?"/, `src="./app.js?v=${hash}"`);
  if (next !== html) writeFileSync('index.html', next);
}

console.log('✅ agent-cli 已打包：app.js（演示页，自托管含 React）');

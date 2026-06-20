/**
 * 打包脚本：把 React 应用打成自托管单文件 bundle（无外部 CDN、无运行时转译）。
 *   cd projects/swarm && npm i --no-save esbuild react@18.3.1 react-dom@18.3.1 && node build.mjs
 * 产物：dist/swarm.js（index.html 加载），并把内容哈希写进 index.html 的 ?v= 实现缓存破坏。
 */
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

await build({
  bundle: true,
  format: 'esm',
  jsx: 'transform',
  minify: true,
  sourcemap: false,
  target: ['es2019'],
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'none',
  entryPoints: ['app/bootstrap.jsx'],
  outfile: 'dist/swarm.js',
});

if (existsSync('index.html') && existsSync('dist/swarm.js')) {
  const hash = createHash('sha1').update(readFileSync('dist/swarm.js')).digest('hex').slice(0, 10);
  const html = readFileSync('index.html', 'utf8');
  const next = html.replace(/src="\.\/dist\/swarm\.js(?:\?v=[^"]*)?"/, `src="./dist/swarm.js?v=${hash}"`);
  if (next !== html) writeFileSync('index.html', next);
}

console.log('✅ swarm 已打包：dist/swarm.js');

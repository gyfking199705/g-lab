/**
 * muse-ui 打包脚本。
 *   cd projects/muse-ui && npm install --no-save esbuild react react-dom && node build.mjs
 * 产物：
 *   dist/index.js   —— 库 ESM（发 npm；不入库，react 外置）
 *   dist/index.cjs  —— 库 CommonJS（发 npm；不入库）
 *   demo.js         —— 画廊演示页 bundle（GitHub Pages 用，含 React，入库自托管）
 */
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const base = {
  bundle: true,
  jsx: 'transform',
  minify: true,
  sourcemap: true,
  target: ['es2019'],
  external: ['react', 'react-dom'],
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
};

// 1) 库构建（发 npm）：react/react-dom 外置，产物在 dist/（.gitignore，不入库）
await build({ ...base, entryPoints: ['src/index.js'], format: 'esm', outfile: 'dist/index.js' });
await build({ ...base, entryPoints: ['src/index.js'], format: 'cjs', outfile: 'dist/index.cjs' });

// 2) 演示页构建（GitHub Pages）：React 一起打进去，产物 demo.js（入库、自托管）
await build({
  bundle: true,
  jsx: 'transform',
  minify: true,
  sourcemap: false,
  format: 'esm',
  target: ['es2019'],
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
  entryPoints: ['demo/bootstrap.jsx'],
  outfile: 'demo.js',
});

// 给演示页 index.html 写入缓存破坏版本号
if (existsSync('index.html') && existsSync('demo.js')) {
  const hash = createHash('sha1').update(readFileSync('demo.js')).digest('hex').slice(0, 10);
  const html = readFileSync('index.html', 'utf8');
  const next = html.replace(/src="\.\/demo\.js(?:\?v=[a-f0-9]+)?"/, `src="./demo.js?v=${hash}"`);
  if (next !== html) writeFileSync('index.html', next);
}

console.log('✅ muse-ui 已打包：dist/index.js+cjs（库）+ demo.js（演示页）');

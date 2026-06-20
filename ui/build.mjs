/**
 * popcorn-ui 库打包脚本（供「发 npm」用）。
 *   cd ui && npm install --no-save esbuild && node build.mjs
 * 产物：
 *   dist/index.js   —— ESM（现代打包器/原生 ESM）
 *   dist/index.cjs  —— CommonJS（require 兼容）
 * react / react-dom 作为 peerDependency 外置，不打进库里。
 */
import { build } from 'esbuild';

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

await build({ ...base, entryPoints: ['src/index.js'], format: 'esm', outfile: 'dist/index.js' });
await build({ ...base, entryPoints: ['src/index.js'], format: 'cjs', outfile: 'dist/index.cjs' });

console.log('✅ popcorn-ui 已打包：dist/index.js (ESM) + dist/index.cjs (CJS)');

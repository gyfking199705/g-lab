/**
 * 打包脚本：把 React 应用打成自托管的单文件 bundle（不依赖任何外部 CDN / 运行时 Babel）。
 *
 * 用法：
 *   npm install --no-save esbuild react@18.3.1 react-dom@18.3.1
 *   node scripts/build.mjs
 *
 * 产物：
 *   dist/app.js      —— 主应用（首页 index.html 加载）
 *   dist/savings.js  —— 财富规划器独立页（savings/index.html 加载）
 *   dist/learning.js —— AI 学习计划站独立页（learning/index.html 加载）
 *   dist/fitness.js  —— 健身训练规划独立页（fitness/index.html 加载）
 *   dist/project.js  —— 项目规划独立页（project/index.html 加载）
 *   dist/schedule.js —— 日程安排独立页（schedule/index.html 加载）
 *   dist/goals.js    —— 目标进度独立页（goals/index.html 加载）
 *   dist/habits.js   —— 习惯打卡独立页（habits/index.html 加载）
 */
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const common = {
  bundle: true,
  format: 'esm',
  jsx: 'transform', // 经典运行时：组件里 import React 后使用 React.createElement
  minify: true,
  sourcemap: false,
  target: ['es2019'],
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'none',
};

await build({ ...common, entryPoints: ['app/bootstrap.jsx'], outfile: 'dist/app.js' });
await build({ ...common, entryPoints: ['savings/bootstrap.jsx'], outfile: 'dist/savings.js' });
await build({ ...common, entryPoints: ['learning/bootstrap.jsx'], outfile: 'dist/learning.js' });
await build({ ...common, entryPoints: ['fitness/bootstrap.jsx'], outfile: 'dist/fitness.js' });
await build({ ...common, entryPoints: ['project/bootstrap.jsx'], outfile: 'dist/project.js' });
await build({ ...common, entryPoints: ['schedule/bootstrap.jsx'], outfile: 'dist/schedule.js' });
await build({ ...common, entryPoints: ['goals/bootstrap.jsx'], outfile: 'dist/goals.js' });
await build({ ...common, entryPoints: ['habits/bootstrap.jsx'], outfile: 'dist/habits.js' });
await build({ ...common, entryPoints: ['cut/bootstrap.jsx'], outfile: 'dist/cut.js' });
await build({ ...common, entryPoints: ['papers/bootstrap.jsx'], outfile: 'dist/papers.js' });
await build({ ...common, entryPoints: ['ledger/bootstrap.jsx'], outfile: 'dist/ledger.js' });
await build({ ...common, entryPoints: ['compare/bootstrap.jsx'], outfile: 'dist/compare.js' });
await build({ ...common, entryPoints: ['salary/bootstrap.jsx'], outfile: 'dist/salary.js' });

/* 缓存破坏：把每个 bundle 的内容哈希写进对应 index.html 的 <script src=...?v=hash>，
   这样内容一变 URL 就变，GitHub Pages / 浏览器一定会加载新版（解决"部署了却看不到变化"）。 */
function stamp(htmlPath, bundleRef, bundleFile) {
  if (!existsSync(htmlPath) || !existsSync(bundleFile)) return;
  const hash = createHash('sha1').update(readFileSync(bundleFile)).digest('hex').slice(0, 10);
  const ref = bundleRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let html = readFileSync(htmlPath, 'utf8');
  const next = html.replace(new RegExp(`src="${ref}(?:\\?v=[a-f0-9]+)?"`), `src="${bundleRef}?v=${hash}"`);
  if (next !== html) writeFileSync(htmlPath, next);
}
stamp('index.html', './dist/app.js', 'dist/app.js');
for (const m of ['savings', 'learning', 'fitness', 'project', 'schedule', 'goals', 'habits', 'cut', 'papers', 'ledger', 'compare', 'salary']) {
  stamp(`${m}/index.html`, `../dist/${m}.js`, `dist/${m}.js`);
}

console.log('✅ 打包完成 + 已写入缓存破坏版本号：dist/{...,ledger,compare}.js');

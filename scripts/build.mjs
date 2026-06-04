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

console.log('✅ 打包完成：dist/{app,savings,learning,fitness,project,schedule,goals,habits,cut,papers}.js');

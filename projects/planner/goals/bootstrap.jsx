/**
 * 目标进度 独立页启动入口（供打包器使用）
 * esbuild 以本文件为入口，打成自托管 bundle（dist/goals.js）。
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import GoalsPlanner from './GoalsPlanner.jsx';

const el = document.getElementById('root');
if (el) {
  el.innerHTML = '';
  createRoot(el).render(React.createElement(GoalsPlanner));
}

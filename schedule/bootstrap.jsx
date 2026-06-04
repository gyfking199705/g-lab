/**
 * 日程安排 独立页启动入口（供打包器使用）
 * esbuild 以本文件为入口，打成自托管 bundle（dist/schedule.js）。
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import SchedulePlanner from './SchedulePlanner.jsx';

const el = document.getElementById('root');
if (el) {
  el.innerHTML = '';
  createRoot(el).render(React.createElement(SchedulePlanner));
}

/**
 * 应用启动入口（供打包器使用）
 * esbuild 以本文件为入口，把 React + 全部组件打成单个自托管 bundle（dist/app.js）。
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './main.jsx';

const el = document.getElementById('root');
if (el) {
  el.innerHTML = '';
  createRoot(el).render(React.createElement(App));
}

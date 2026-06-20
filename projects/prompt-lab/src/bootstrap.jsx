/**
 * prompt-lab 独立页启动入口（供 esbuild 打包）。
 * esbuild 以本文件为入口，打成自托管 bundle（dist/app.js，含 React）。
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

const el = document.getElementById('root');
if (el) {
  el.innerHTML = '';
  createRoot(el).render(React.createElement(App));
}

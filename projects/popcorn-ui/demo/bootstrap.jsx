/**
 * popcorn-ui 画廊独立页入口（供打包器使用）。
 * esbuild 以本文件为入口打成自托管 bundle（dist/ui.js，含 React）。
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import Gallery from './Gallery.jsx';

const el = document.getElementById('root');
if (el) {
  el.innerHTML = '';
  createRoot(el).render(React.createElement(Gallery));
}

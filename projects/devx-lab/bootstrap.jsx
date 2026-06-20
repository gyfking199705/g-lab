/**
 * devx-lab 打包入口（供 esbuild 使用）。打成自托管单文件 app.js（含 React），无外部 CDN。
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import DevxLab from './DevxLab.jsx';

const el = document.getElementById('root');
if (el) {
  el.innerHTML = '';
  createRoot(el).render(React.createElement(DevxLab));
}

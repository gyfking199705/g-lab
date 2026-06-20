/**
 * Skill 研究室独立页入口（供 esbuild 打包成自托管单文件 dist/app.js，含 React）。
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import SkillLab from './SkillLab.jsx';

const el = document.getElementById('root');
if (el) {
  el.innerHTML = '';
  createRoot(el).render(React.createElement(SkillLab));
}

/** 极简线性图标（手写 SVG，无图标库），统一 1.7 描边、currentColor。 */
import React from 'react';

const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const Icon = {
  search: (p) => (
    <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
  ),
  plus: (p) => (
    <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
  ),
  star: (p) => (
    <svg {...base} {...p}><path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z" /></svg>
  ),
  starFill: (p) => (
    <svg {...base} fill="currentColor" {...p}><path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z" /></svg>
  ),
  copy: (p) => (
    <svg {...base} {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></svg>
  ),
  check: (p) => (
    <svg {...base} {...p}><path d="M5 12.5l4 4 10-10" /></svg>
  ),
  edit: (p) => (
    <svg {...base} {...p}><path d="M4 20h4l10-10-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg>
  ),
  trash: (p) => (
    <svg {...base} {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
  ),
  close: (p) => (
    <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
  ),
  download: (p) => (
    <svg {...base} {...p}><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" /></svg>
  ),
  upload: (p) => (
    <svg {...base} {...p}><path d="M12 20V9m0 0 4 4m-4-4-4 4M5 4h14" /></svg>
  ),
  grid: (p) => (
    <svg {...base} {...p}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>
  ),
};

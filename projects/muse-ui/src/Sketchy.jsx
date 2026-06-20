/**
 * <Sketchy> — 手绘风边框，把内容裹进一个抖动的"手绘"矩形里。
 * 用法：<Sketchy color="#CC785C">手写感卡片</Sketchy>
 * 用 viewBox 拉伸 + non-scaling-stroke，无需测量尺寸；同 seed 形状稳定（不抖动闪烁）。
 */
import React from 'react';
import { roughRectPath } from './util/sketch.js';
import { useInjectedStyle } from './util/hooks.js';

const CSS = `
.muse-sketchy{position:relative;display:inline-block;}
.muse-sketchy-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;}
.muse-sketchy-content{position:relative;}
`;

export default function Sketchy({
  color = '#33312C',
  strokeWidth = 2,
  roughness = 2,
  seed = 42,
  fill = 'none',
  padding = '10px 16px',
  className = '',
  style,
  children,
  ...rest
}) {
  useInjectedStyle('muse-sketchy', CSS);
  const d = roughRectPath(100, 100, { roughness, seed });
  return (
    <span className={`muse-sketchy ${className}`.trim()} style={{ padding, ...style }} {...rest}>
      <svg className="muse-sketchy-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path
          d={d}
          fill={fill}
          stroke={color}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <span className="muse-sketchy-content">{children}</span>
    </span>
  );
}

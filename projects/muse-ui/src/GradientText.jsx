/**
 * <GradientText> — 渐变填充文字，可缓慢流动。
 * 用法：<GradientText colors={['#CC785C','#6E83C4','#5C8A6B']}>标题</GradientText>
 */
import React from 'react';
import { linearGradient } from './util/interactions.js';
import { useInjectedStyle, usePrefersReducedMotion } from './util/hooks.js';

const CSS = `
.muse-gradtext{background-size:200% auto;-webkit-background-clip:text;background-clip:text;
  color:transparent;-webkit-text-fill-color:transparent;display:inline-block;}
.muse-gradtext.anim{animation:muse-gradtext-move var(--mgt-dur,6s) linear infinite;}
@keyframes muse-gradtext-move{to{background-position:200% center;}}
@media (prefers-reduced-motion: reduce){.muse-gradtext.anim{animation:none;}}
`;

export default function GradientText({ colors, angle = 90, speed = 6, animate = true, as: Tag = 'span', className = '', style, children, ...rest }) {
  useInjectedStyle('muse-gradienttext', CSS);
  const reduced = usePrefersReducedMotion();
  // 颜色首尾相接复制一份，配合 200% background-size 实现无缝循环
  const seq = colors && colors.length ? [...colors, ...colors] : undefined;
  const on = animate && !reduced;
  return (
    <Tag
      className={`muse-gradtext ${on ? 'anim' : ''} ${className}`.trim()}
      style={{ backgroundImage: linearGradient(seq, angle), '--mgt-dur': `${speed}s`, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

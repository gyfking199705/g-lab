/**
 * <Marquee> — 无缝循环跑马灯（内容复制两份，平移取模实现无缝）。
 * 用法：<Marquee speed={60}><span>条目 A</span><span>条目 B</span></Marquee>
 * 开启「减少动态效果」时静止。
 */
import React, { useRef, useState } from 'react';
import { marqueeOffset } from './util/interactions.js';
import { useRaf, usePrefersReducedMotion, useInjectedStyle } from './util/hooks.js';

const CSS = `
.muse-marquee{overflow:hidden;display:flex;width:100%;}
.muse-marquee-track{display:inline-flex;flex:none;will-change:transform;}
.muse-marquee-group{display:inline-flex;flex:none;align-items:center;}
`;

export default function Marquee({ speed = 60, gap = 40, className = '', style, children, ...rest }) {
  useInjectedStyle('muse-marquee', CSS);
  const reduced = usePrefersReducedMotion();
  const groupRef = useRef(null);
  const [x, setX] = useState(0);

  useRaf((elapsed) => {
    const node = groupRef.current;
    const w = node ? node.offsetWidth : 0;
    setX(marqueeOffset(elapsed, speed, w || 1));
  }, !reduced);

  const groupStyle = { paddingRight: gap, gap };
  return (
    <div className={`muse-marquee ${className}`.trim()} style={style} {...rest}>
      <div className="muse-marquee-track" style={{ transform: `translateX(${x}px)` }}>
        <div className="muse-marquee-group" ref={groupRef} style={groupStyle}>
          {children}
        </div>
        <div className="muse-marquee-group" style={groupStyle} aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * <SpotlightCard> — 鼠标移动时浮现一束跟随的光斑，悬停才亮。
 * 用法：<SpotlightCard><p>内容</p></SpotlightCard>
 */
import React, { useRef, useState } from 'react';
import { spotlightStyle } from './util/interactions.js';
import { useInjectedStyle } from './util/hooks.js';

const CSS = `
.popcorn-spot{position:relative;overflow:hidden;border-radius:16px;}
.popcorn-spot-glow{position:absolute;inset:0;pointer-events:none;transition:opacity .3s ease-out;z-index:0;}
.popcorn-spot-content{position:relative;z-index:1;}
`;

export default function SpotlightCard({ color = 'rgba(255,255,255,0.22)', size = 320, className = '', style, children, ...rest }) {
  useInjectedStyle('popcorn-spotlight', CSS);
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  const onMove = (e) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  return (
    <div
      ref={ref}
      className={`popcorn-spot ${className}`.trim()}
      style={style}
      onMouseMove={onMove}
      onMouseLeave={() => setPos(null)}
      {...rest}
    >
      <div className="popcorn-spot-glow" style={pos ? { ...spotlightStyle(pos.x, pos.y, size, color), opacity: 1 } : { opacity: 0 }} />
      <div className="popcorn-spot-content">{children}</div>
    </div>
  );
}

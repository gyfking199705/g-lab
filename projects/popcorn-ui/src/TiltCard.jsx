/**
 * <TiltCard> — 跟随鼠标做 3D 倾斜的卡片，可选高光(glare)。
 * 用法：<TiltCard maxDeg={14}><h3>Hello</h3></TiltCard>
 */
import React, { useRef, useState } from 'react';
import { tiltTransform } from './util/interactions.js';
import { useInjectedStyle, usePrefersReducedMotion } from './util/hooks.js';

const CSS = `
.popcorn-tilt{position:relative;border-radius:16px;transition:transform .18s ease-out;transform-style:preserve-3d;will-change:transform;}
.popcorn-tilt-glare{position:absolute;inset:0;border-radius:inherit;pointer-events:none;transition:opacity .25s ease-out;mix-blend-mode:soft-light;}
`;

export default function TiltCard({ maxDeg = 12, glare = true, scale = 1.03, className = '', style, children, ...rest }) {
  useInjectedStyle('popcorn-tiltcard', CSS);
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();
  const [t, setT] = useState(null);

  const onMove = (e) => {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setT(tiltTransform(e.clientX - r.left, e.clientY - r.top, r.width, r.height, maxDeg));
  };
  const onLeave = () => setT(null);

  const transform =
    t && !reduced
      ? `perspective(800px) rotateX(${t.rx}deg) rotateY(${t.ry}deg) scale(${scale})`
      : 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)';

  return (
    <div
      ref={ref}
      className={`popcorn-tilt ${className}`.trim()}
      style={{ ...style, transform }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      {...rest}
    >
      {children}
      {glare && !reduced && (
        <div
          className="popcorn-tilt-glare"
          style={{
            opacity: t ? 1 : 0,
            background: t
              ? `radial-gradient(circle at ${t.glareX}% ${t.glareY}%, rgba(255,255,255,.45), transparent 55%)`
              : 'none',
          }}
        />
      )}
    </div>
  );
}

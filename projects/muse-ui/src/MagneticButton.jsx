/**
 * <MagneticButton> — 指针靠近时元素被「磁吸」朝指针移动，离开回弹。
 * 用法：<MagneticButton radius={90} strength={0.5}>点我</MagneticButton>
 * 可用 as 指定标签：<MagneticButton as="a" href="...">链接</MagneticButton>
 */
import React, { useRef, useState } from 'react';
import { magneticOffset } from './util/interactions.js';
import { useInjectedStyle, usePrefersReducedMotion } from './util/hooks.js';

const CSS = `
.muse-mag{display:inline-flex;align-items:center;justify-content:center;border:none;cursor:pointer;
  padding:12px 26px;border-radius:999px;font:inherit;font-weight:600;color:#fff;background:#CC785C;
  transition:transform .22s cubic-bezier(.2,.8,.2,1),box-shadow .22s;box-shadow:0 6px 20px rgba(204,120,92,.35);}
.muse-mag:hover{box-shadow:0 10px 28px rgba(204,120,92,.5);}
`;

export default function MagneticButton({ radius = 80, strength = 0.4, as: Tag = 'button', className = '', style, children, ...rest }) {
  useInjectedStyle('muse-magnetic', CSS);
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();
  const [o, setO] = useState({ x: 0, y: 0 });

  const onMove = (e) => {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const { x, y } = magneticOffset(e.clientX - cx, e.clientY - cy, radius, strength);
    setO({ x, y });
  };
  const onLeave = () => setO({ x: 0, y: 0 });

  return (
    <Tag
      ref={ref}
      className={`muse-mag ${className}`.trim()}
      style={{ ...style, transform: `translate(${o.x}px, ${o.y}px)` }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      {...rest}
    >
      {children}
    </Tag>
  );
}

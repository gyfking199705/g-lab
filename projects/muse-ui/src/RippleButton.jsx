/**
 * <RippleButton> — 点击处扩散水波纹（Material 风格），纯 CSS 动画。
 * 用法：<RippleButton onClick={...}>提交</RippleButton>
 */
import React, { useRef, useState } from 'react';
import { rippleGeometry } from './util/interactions.js';
import { useInjectedStyle } from './util/hooks.js';

const CSS = `
.muse-rip{position:relative;overflow:hidden;border:none;cursor:pointer;font:inherit;font-weight:600;
  padding:12px 26px;border-radius:12px;color:#fff;background:#33312C;isolation:isolate;}
.muse-rip-label{position:relative;z-index:1;}
.muse-rip-dot{position:absolute;border-radius:50%;pointer-events:none;transform:scale(0);opacity:.55;
  animation:muse-rip-anim .6s ease-out forwards;}
@keyframes muse-rip-anim{to{transform:scale(1);opacity:0;}}
@media (prefers-reduced-motion: reduce){.muse-rip-dot{animation-duration:.01ms;}}
`;

let _rid = 0;

export default function RippleButton({ color = 'rgba(255,255,255,0.6)', as: Tag = 'button', className = '', style, children, onMouseDown, ...rest }) {
  useInjectedStyle('muse-ripple', CSS);
  const ref = useRef(null);
  const [ripples, setRipples] = useState([]);

  const onDown = (e) => {
    if (ref.current) {
      const g = rippleGeometry(ref.current.getBoundingClientRect(), e.clientX, e.clientY);
      const id = ++_rid;
      setRipples((rs) => [...rs, { id, ...g }]);
      setTimeout(() => setRipples((rs) => rs.filter((r) => r.id !== id)), 600);
    }
    if (onMouseDown) onMouseDown(e);
  };

  return (
    <Tag ref={ref} className={`muse-rip ${className}`.trim()} style={style} onMouseDown={onDown} {...rest}>
      <span className="muse-rip-label">{children}</span>
      {ripples.map((r) => (
        <span
          key={r.id}
          className="muse-rip-dot"
          style={{ left: r.x, top: r.y, width: r.size, height: r.size, marginLeft: -r.size / 2, marginTop: -r.size / 2, background: color }}
        />
      ))}
    </Tag>
  );
}

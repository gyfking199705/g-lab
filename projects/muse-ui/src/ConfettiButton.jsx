/**
 * <ConfettiButton> — 点击迸发礼花（纯函数粒子 + raf 积分）。
 * 用法：<ConfettiButton onClick={...}>🎉 庆祝</ConfettiButton>
 * 开启「减少动态效果」时只触发 onClick、不迸发。
 */
import React, { useRef, useState } from 'react';
import { makeParticles, stepParticle } from './util/particles.js';
import { usePrefersReducedMotion, useInjectedStyle } from './util/hooks.js';

const CSS = `
.muse-confetti-wrap{position:relative;display:inline-block;}
.muse-confetti-btn{border:none;cursor:pointer;font:inherit;font-weight:600;padding:12px 26px;border-radius:12px;color:#fff;background:#CC785C;}
.muse-confetti-layer{position:absolute;left:50%;top:50%;width:0;height:0;pointer-events:none;z-index:5;}
.muse-confetti-bit{position:absolute;border-radius:2px;will-change:transform,opacity;}
`;

let _cid = 0;

export default function ConfettiButton({ as: Tag = 'button', count = 26, className = '', style, children, onClick, ...rest }) {
  useInjectedStyle('muse-confetti', CSS);
  const reduced = usePrefersReducedMotion();
  const [bursts, setBursts] = useState([]);
  const rafRef = useRef(null);

  const fire = () => {
    if (reduced || typeof requestAnimationFrame === 'undefined') return;
    const id = ++_cid;
    let parts = makeParticles(count);
    let age = 0;
    let last = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    setBursts((b) => [...b, { id, parts, age }]);
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      age += dt;
      parts = parts.map((p) => stepParticle(p, dt));
      const opacity = age < 0.9 ? 1 : Math.max(0, 1 - (age - 0.9) / 0.4);
      setBursts((b) => b.map((x) => (x.id === id ? { id, parts, opacity } : x)));
      if (age < 1.3) rafRef.current = requestAnimationFrame(tick);
      else setBursts((b) => b.filter((x) => x.id !== id));
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const handle = (e) => {
    fire();
    if (onClick) onClick(e);
  };

  return (
    <span className="muse-confetti-wrap">
      <Tag className={`muse-confetti-btn ${className}`.trim()} style={style} onClick={handle} {...rest}>
        {children}
      </Tag>
      {bursts.map((burst) => (
        <span key={burst.id} className="muse-confetti-layer">
          {burst.parts.map((p, i) => (
            <span
              key={i}
              className="muse-confetti-bit"
              style={{
                width: p.size,
                height: p.size * 0.6,
                background: p.color,
                opacity: burst.opacity == null ? 1 : burst.opacity,
                transform: `translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg)`,
              }}
            />
          ))}
        </span>
      ))}
    </span>
  );
}

/**
 * <MeshGradient> — 多色径向渐变缓慢漂移的动态背景（纯 CSS，无 canvas）。
 * 用法：<MeshGradient colors={['#CC785C','#5C8A6B','#6E83C4']} style={{height:240}} />
 * 开启「减少动态效果」时自动静止。
 */
import React, { useState } from 'react';
import { meshGradient } from './util/interactions.js';
import { useRaf, usePrefersReducedMotion, useInjectedStyle } from './util/hooks.js';

const CSS = `
.muse-mesh{position:relative;overflow:hidden;border-radius:16px;background-color:#1b1a17;}
.muse-mesh-content{position:relative;z-index:1;width:100%;height:100%;}
`;

export default function MeshGradient({ colors, speed = 0.05, className = '', style, children, ...rest }) {
  useInjectedStyle('muse-mesh', CSS);
  const reduced = usePrefersReducedMotion();
  const [t, setT] = useState(0);
  useRaf((elapsed) => setT(elapsed * speed), !reduced);

  return (
    <div
      className={`muse-mesh ${className}`.trim()}
      style={{ ...style, background: meshGradient(colors, reduced ? 0.15 : t) }}
      {...rest}
    >
      {children != null && <div className="muse-mesh-content">{children}</div>}
    </div>
  );
}

/**
 * <Sparkles> — 在内容四周持续闪烁的星点。
 * 用法：<Sparkles><h2>会发光的标题</h2></Sparkles>
 * 星点位置由 seed 确定；开启「减少动态效果」时静止为微光。
 */
import React, { useMemo } from 'react';
import { makeSparkles, mulberry32 } from './util/sketch.js';
import { usePrefersReducedMotion, useInjectedStyle } from './util/hooks.js';

const STAR = 'M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z';

const CSS = `
.muse-sparkles{position:relative;display:inline-block;}
.muse-sparkles-layer{position:absolute;inset:0;pointer-events:none;overflow:visible;z-index:2;}
.muse-spark{position:absolute;transform:translate(-50%,-50%) scale(0);animation:muse-spark-tw var(--d,1.6s) ease-in-out infinite;}
@keyframes muse-spark-tw{0%,100%{transform:translate(-50%,-50%) scale(0) rotate(0deg);opacity:0;}50%{transform:translate(-50%,-50%) scale(1) rotate(90deg);opacity:1;}}
.muse-sparkles-content{position:relative;z-index:1;}
@media (prefers-reduced-motion: reduce){.muse-spark{animation:none;opacity:.7;transform:translate(-50%,-50%) scale(.8);}}
`;

export default function Sparkles({ count = 14, color = '#C9A14A', seed = 7, className = '', style, children, ...rest }) {
  useInjectedStyle('muse-sparkles', CSS);
  const reduced = usePrefersReducedMotion();
  const sparks = useMemo(() => makeSparkles(count, mulberry32(seed)), [count, seed]);

  return (
    <span className={`muse-sparkles ${className}`.trim()} style={style} {...rest}>
      <span className="muse-sparkles-layer">
        {sparks.map((s, i) => (
          <svg
            key={i}
            className="muse-spark"
            width={s.size}
            height={s.size}
            viewBox="0 0 24 24"
            style={{ left: `${s.x}%`, top: `${s.y}%`, '--d': `${s.dur}s`, animationDelay: `${reduced ? 0 : s.delay}s` }}
            aria-hidden="true"
          >
            <path d={STAR} fill={color} />
          </svg>
        ))}
      </span>
      <span className="muse-sparkles-content">{children}</span>
    </span>
  );
}

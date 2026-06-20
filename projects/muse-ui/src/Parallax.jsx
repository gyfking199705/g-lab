/**
 * <Parallax> — 指针视差分层容器。子元素可通过 data-depth 属性指定深度系数，
 * 鼠标移动时各层按深度做不同幅度的平移，产生立体视差感。
 * 用法：
 *   <Parallax maxPx={30}>
 *     <img data-depth="0.2" src="bg.png" />
 *     <div data-depth="0.8">前景内容</div>
 *   </Parallax>
 * depth 越大，该层随指针移动越多；负值反方向漂移（远景感）。
 * 开启「减少动效」时所有层静止（无平移）。
 */
import React, { useRef, useState, useCallback } from 'react';
import { parallaxOffset, pointerToNorm } from './util/parallax.js';
import { usePrefersReducedMotion, useInjectedStyle } from './util/hooks.js';

const CSS = `
.muse-parallax{position:relative;overflow:hidden;transform-style:preserve-3d;}
.muse-parallax>*{will-change:transform;transition:transform 0.05s linear;}
@media (prefers-reduced-motion: reduce){.muse-parallax>*{transform:none !important;transition:none;}}
`;

export default function Parallax({ maxPx = 24, className = '', style, children, ...rest }) {
  useInjectedStyle('muse-parallax', CSS);
  const reduced = usePrefersReducedMotion();
  const ref = useRef(null);
  const [offsets, setOffsets] = useState(null); // { nx, ny } or null

  const onMove = useCallback((e) => {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const norm = pointerToNorm(e.clientX - r.left, e.clientY - r.top, r.width, r.height);
    setOffsets(norm);
  }, [reduced]);

  const onLeave = useCallback(() => setOffsets(null), []);

  // Apply parallaxOffset to each child based on its data-depth attribute
  const layeredChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    const depth = parseFloat(child.props['data-depth'] ?? 0);
    const { x, y } = offsets && !reduced
      ? parallaxOffset(offsets.nx, offsets.ny, depth, maxPx)
      : { x: 0, y: 0 };
    return React.cloneElement(child, {
      style: {
        ...child.props.style,
        transform: `translate(${x}px, ${y}px)${child.props.style?.transform ? ` ${child.props.style.transform}` : ''}`,
      },
    });
  });

  return (
    <div
      ref={ref}
      className={`muse-parallax ${className}`.trim()}
      style={style}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      {...rest}
    >
      {layeredChildren}
    </div>
  );
}

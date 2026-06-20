/**
 * <ScrambleText> — 文字"解码"动画：随机字符逐渐还原为目标文本。
 * 用法：<ScrambleText text="DECRYPTING…" duration={1.2} />
 * 开启「减少动态效果」时直接显示完整文本。
 */
import React, { useEffect, useState } from 'react';
import { revealCount, scrambleText } from './util/interactions.js';
import { useRaf, usePrefersReducedMotion, useInjectedStyle } from './util/hooks.js';

const CSS = `.muse-scramble{font-variant-ligatures:none;white-space:pre-wrap;}`;

export default function ScrambleText({ text = '', duration = 1.2, charset, className = '', style, ...rest }) {
  useInjectedStyle('muse-scramble', CSS);
  const reduced = usePrefersReducedMotion();
  const [t, setT] = useState(0);

  useEffect(() => {
    setT(0);
  }, [text]);

  const progress = reduced ? 1 : Math.min(1, t / Math.max(0.01, duration));
  const done = progress >= 1;
  useRaf((elapsed) => setT(elapsed), !reduced && !done);

  const shown = reduced ? text : scrambleText(text, revealCount(text.length, progress), charset);
  return (
    <span className={`muse-scramble ${className}`.trim()} style={style} {...rest}>
      {shown}
    </span>
  );
}

/**
 * <Typewriter> — 文字逐字打出，带闪烁光标。
 * 用法：<Typewriter text="你好，世界" cps={22} />
 * 开启「减少动态效果」时直接显示完整文本。
 */
import React, { useEffect, useState } from 'react';
import { typedSlice } from './util/interactions.js';
import { useRaf, usePrefersReducedMotion, useInjectedStyle } from './util/hooks.js';

const CSS = `
.muse-tw-caret{display:inline-block;width:.5ch;margin-left:1px;animation:muse-tw-blink 1s steps(1) infinite;}
@keyframes muse-tw-blink{50%{opacity:0;}}
@media (prefers-reduced-motion: reduce){.muse-tw-caret{animation:none;}}
`;

export default function Typewriter({ text = '', cps = 22, caret = true, className = '', style, ...rest }) {
  useInjectedStyle('muse-typewriter', CSS);
  const reduced = usePrefersReducedMotion();
  const [t, setT] = useState(0);

  useEffect(() => {
    setT(0);
  }, [text]);

  const done = t * cps >= text.length;
  useRaf((elapsed) => setT(elapsed), !reduced && !done);

  const shown = reduced ? text : typedSlice(text, t, cps);
  return (
    <span className={`muse-tw ${className}`.trim()} style={style} {...rest}>
      {shown}
      {caret && <span className="muse-tw-caret">▋</span>}
    </span>
  );
}

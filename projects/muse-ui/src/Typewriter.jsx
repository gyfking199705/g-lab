/**
 * <Typewriter> — 文字逐字打出，带闪烁光标。
 * 单句：<Typewriter text="你好，世界" />
 * 多句循环（打字→停留→退格→下一句）：<Typewriter text={['一', '二', '三']} loop />
 * 开启「减少动态效果」时直接显示（首句/末句）完整文本。
 */
import React, { useState } from 'react';
import { typewriterState } from './util/interactions.js';
import { useRaf, usePrefersReducedMotion, useInjectedStyle } from './util/hooks.js';

const CSS = `
.muse-tw-caret{display:inline-block;width:.5ch;margin-left:1px;animation:muse-tw-blink 1s steps(1) infinite;}
@keyframes muse-tw-blink{50%{opacity:0;}}
@media (prefers-reduced-motion: reduce){.muse-tw-caret{animation:none;}}
`;

export default function Typewriter({ text = '', cps = 22, delCps = 40, hold = 1.2, gap = 0.4, loop, caret = true, className = '', style, ...rest }) {
  useInjectedStyle('muse-typewriter', CSS);
  const reduced = usePrefersReducedMotion();
  const [t, setT] = useState(0);

  const list = Array.isArray(text) ? text : [text];
  const isLoop = loop == null ? list.length > 1 : loop;
  // 单句且不循环：打完即停，省掉 raf
  const single = list.length === 1 && !isLoop;
  const st = reduced
    ? { text: list[0] || '', phase: 'done' }
    : typewriterState(text, t, { cps, delCps, hold, gap, loop: isLoop });

  useRaf((elapsed) => setT(elapsed), !reduced && !(single && st.phase === 'done'));

  return (
    <span className={`muse-tw ${className}`.trim()} style={style} {...rest}>
      {st.text}
      {caret && <span className="muse-tw-caret">▋</span>}
    </span>
  );
}

/**
 * popcorn-ui · React hooks（涉及 DOM/RAF，浏览器侧使用；都带 SSR 守卫）
 */
import { useEffect, useRef, useState } from 'react';

/** 把一段 CSS 按 id 只注入一次（组件自带样式，使用者无需单独 import css）。 */
export function useInjectedStyle(id, css) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

/** 是否开启了「减少动态效果」系统偏好（无障碍：开启时组件会自动收敛动画）。 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(!!mq.matches);
    on();
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on);
    };
  }, []);
  return reduced;
}

/** 每帧回调 cb(elapsedSeconds, timestamp)，active=false 时停止。 */
export function useRaf(cb, active = true) {
  const cbRef = useRef(cb);
  cbRef.current = cb;
  useEffect(() => {
    if (!active || typeof requestAnimationFrame === 'undefined') return undefined;
    let raf;
    let start = null;
    const loop = (ts) => {
      if (start == null) start = ts;
      cbRef.current((ts - start) / 1000, ts);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

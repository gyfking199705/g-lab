/**
 * <CountUp> — 数字从 from 缓动滚动到 value。
 * 用法：<CountUp value={1280} prefix="¥" decimals={0} />
 */
import React, { useEffect, useRef, useState } from 'react';
import { countAt, formatNumber } from './util/interactions.js';
import { easings } from './util/anim.js';
import { usePrefersReducedMotion } from './util/hooks.js';

export default function CountUp({
  value = 0,
  from = 0,
  duration = 1.4,
  decimals = 0,
  prefix = '',
  suffix = '',
  ease = easings.easeOutCubic,
  className = '',
  style,
  ...rest
}) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : from);
  const rafRef = useRef(null);
  const easeRef = useRef(ease);
  easeRef.current = ease;

  useEffect(() => {
    if (reduced || typeof requestAnimationFrame === 'undefined') {
      setDisplay(value);
      return undefined;
    }
    let start = null;
    const startVal = from;
    const loop = (ts) => {
      if (start == null) start = ts;
      const p = Math.min(1, (ts - start) / (duration * 1000));
      setDisplay(countAt(startVal, value, p, easeRef.current));
      if (p < 1) rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, from, duration, reduced]);

  return (
    <span className={`popcorn-countup ${className}`.trim()} style={style} {...rest}>
      {prefix}
      {formatNumber(display, decimals)}
      {suffix}
    </span>
  );
}

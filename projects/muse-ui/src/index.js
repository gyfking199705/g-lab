/**
 * muse-ui ✨ — 零依赖的 React 创意交互组件
 * 入口：导出全部组件 + 可复用的纯函数/hooks。
 */
export { default as TiltCard } from './TiltCard.jsx';
export { default as SpotlightCard } from './SpotlightCard.jsx';
export { default as MagneticButton } from './MagneticButton.jsx';
export { default as RippleButton } from './RippleButton.jsx';
export { default as MeshGradient } from './MeshGradient.jsx';
export { default as CountUp } from './CountUp.jsx';
export { default as GradientText } from './GradientText.jsx';
export { default as Typewriter } from './Typewriter.jsx';
export { default as CommandPalette } from './CommandPalette.jsx';
export { default as ScrambleText } from './ScrambleText.jsx';
export { default as Marquee } from './Marquee.jsx';
export { default as ConfettiButton } from './ConfettiButton.jsx';
export { default as StickyCanvas } from './StickyCanvas.jsx';
export { default as Sketchy } from './Sketchy.jsx';
export { default as Sparkles } from './Sparkles.jsx';

// 纯工具（高级用法）
export * from './util/anim.js';
export * from './util/interactions.js';
export { fuzzyScore, filterCommands, fuzzyMatchIndices, groupCommands, pickByIds } from './util/command.js';
export { makeParticles, stepParticle } from './util/particles.js';
export { clampNote, snap, reorderToFront, cascadeXY } from './util/board.js';
export { mulberry32, roughRectPath, makeSparkles } from './util/sketch.js';
export { useRaf, usePrefersReducedMotion, useInjectedStyle } from './util/hooks.js';

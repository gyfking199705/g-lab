/**
 * muse-ui ✨ — 类型声明（手写，随库一起发布）
 * 与 src/index.js 的导出一一对应。
 */
import * as React from 'react';

/* ============================ 组件 ============================ */
export interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 最大倾斜角度（度），默认 12 */
  maxDeg?: number;
  /** 是否显示跟随高光，默认 true */
  glare?: boolean;
  /** 悬停时缩放，默认 1.03 */
  scale?: number;
}
export const TiltCard: React.FC<TiltCardProps>;

export interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 光斑颜色，默认 rgba(255,255,255,0.22) */
  color?: string;
  /** 光斑直径(px)，默认 320 */
  size?: number;
}
export const SpotlightCard: React.FC<SpotlightCardProps>;

export interface MagneticButtonProps extends React.HTMLAttributes<HTMLElement> {
  /** 磁吸生效半径(px)，默认 80 */
  radius?: number;
  /** 磁吸强度 0..1，默认 0.4 */
  strength?: number;
  /** 渲染标签，默认 'button' */
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>;
}
export const MagneticButton: React.FC<MagneticButtonProps>;

export interface RippleButtonProps extends React.HTMLAttributes<HTMLElement> {
  /** 涟漪颜色，默认 rgba(255,255,255,0.6) */
  color?: string;
  /** 渲染标签，默认 'button' */
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>;
}
export const RippleButton: React.FC<RippleButtonProps>;

export interface MeshGradientProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 渐变色板 */
  colors?: string[];
  /** 漂移速度，默认 0.05 */
  speed?: number;
}
export const MeshGradient: React.FC<MeshGradientProps>;

export interface CountUpProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** 目标值 */
  value: number;
  /** 起始值，默认 0 */
  from?: number;
  /** 时长(秒)，默认 1.4 */
  duration?: number;
  /** 小数位，默认 0 */
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** 缓动函数 (t:0..1)=>0..1 */
  ease?: (t: number) => number;
}
export const CountUp: React.FC<CountUpProps>;

export interface GradientTextProps extends React.HTMLAttributes<HTMLElement> {
  colors?: string[];
  /** 渐变角度(度)，默认 90 */
  angle?: number;
  /** 流动一周时长(秒)，默认 6 */
  speed?: number;
  /** 是否流动，默认 true */
  animate?: boolean;
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>;
}
export const GradientText: React.FC<GradientTextProps>;

export interface TypewriterProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: string;
  /** 每秒字符数，默认 22 */
  cps?: number;
  /** 是否显示光标，默认 true */
  caret?: boolean;
}
export const Typewriter: React.FC<TypewriterProps>;

export interface Command {
  id?: string;
  label: string;
  hint?: string;
  keywords?: string;
  onRun?: () => void;
}
export interface CommandPaletteProps {
  commands: Command[];
  /** 受控开关；不传则非受控并自带 ⌘K 热键 */
  open?: boolean;
  onClose?: () => void;
  /** 是否启用 ⌘K/Ctrl+K 热键（非受控时），默认 true */
  hotkey?: boolean;
  placeholder?: string;
  className?: string;
}
export const CommandPalette: React.FC<CommandPaletteProps>;

export interface ScrambleTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: string;
  /** 解码时长(秒)，默认 1.2 */
  duration?: number;
  /** 乱码字符集 */
  charset?: string;
}
export const ScrambleText: React.FC<ScrambleTextProps>;

export interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 速度(px/秒)，默认 60 */
  speed?: number;
  /** 内容间距(px)，默认 40 */
  gap?: number;
}
export const Marquee: React.FC<MarqueeProps>;

export interface ConfettiButtonProps extends React.HTMLAttributes<HTMLElement> {
  /** 粒子数，默认 26 */
  count?: number;
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>;
}
export const ConfettiButton: React.FC<ConfettiButtonProps>;

export interface StickyNote { id: string; x: number; y: number; text: string; color: string }
export interface StickyCanvasProps {
  initialNotes?: StickyNote[];
  /** 画板高度(px)，默认 360 */
  height?: number;
  /** 可选颜色板 */
  colors?: string[];
  onChange?: (notes: StickyNote[]) => void;
  className?: string;
  style?: React.CSSProperties;
}
export const StickyCanvas: React.FC<StickyCanvasProps>;

/* ============================ 纯函数 ============================ */
export function clamp(v: number, min: number, max: number): number;
export function lerp(a: number, b: number, t: number): number;
export function mapRange(v: number, inMin: number, inMax: number, outMin: number, outMax: number): number;
export function roundTo(v: number, decimals?: number): number;
export type EaseName = 'linear' | 'easeOutQuad' | 'easeOutCubic' | 'easeInOutCubic' | 'easeOutExpo' | 'easeOutBack';
export const easings: Record<EaseName, (t: number) => number>;
export function cx(...args: any[]): string;

export function tiltTransform(px: number, py: number, w: number, h: number, maxDeg?: number): { rx: number; ry: number; glareX: number; glareY: number };
export function magneticOffset(dx: number, dy: number, radius: number, strength?: number): { x: number; y: number; active: boolean };
export function spotlightStyle(px: number, py: number, size?: number, color?: string): { background: string };
export function rippleGeometry(rect: { left: number; top: number; width: number; height: number }, clientX: number, clientY: number): { x: number; y: number; size: number };
export function countAt(start: number, end: number, progress: number, ease?: (t: number) => number): number;
export function formatNumber(value: number, decimals?: number, sep?: string): string;
export function meshGradient(colors?: string[] | null, t?: number, opts?: { spread?: number }): string;
export function typedSlice(text: string, elapsedSec: number, cps?: number): string;
export function typeDone(text: string, elapsedSec: number, cps?: number): boolean;
export function linearGradient(colors?: string[] | null, angle?: number): string;
export function marqueeOffset(elapsedSec: number, speed: number, width: number): number;
export function revealCount(total: number, progress: number): number;
export function scrambleText(target: string, revealed: number, charset?: string, rand?: () => number): string;
export function fuzzyScore(query: string, text: string): number;
export function filterCommands<T extends { label?: string; hint?: string; keywords?: string }>(commands: T[], query: string): T[];
export interface Particle { x: number; y: number; vx: number; vy: number; rot: number; vr: number; color: string; size: number }
export function makeParticles(n?: number, opts?: { rand?: () => number; colors?: string[]; speed?: number; spread?: number; angle?: number }): Particle[];
export function stepParticle(p: Particle, dt: number, gravity?: number): Particle;
export function clampNote(x: number, y: number, w: number, h: number, bounds: { width: number; height: number }): { x: number; y: number };
export function snap(v: number, grid: number): number;
export function reorderToFront<T extends { id: string }>(notes: T[], id: string): T[];
export function cascadeXY(count: number, step?: number, base?: number): { x: number; y: number };

/* ============================ hooks ============================ */
export function useRaf(cb: (elapsedSec: number, ts: number) => void, active?: boolean): void;
export function usePrefersReducedMotion(): boolean;
export function useInjectedStyle(id: string, css: string): void;

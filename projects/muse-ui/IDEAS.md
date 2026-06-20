# muse-ui · 脑爆 & research 记录 🧠

muse-ui 是一个 **UI 组件的脑爆 + research 实验室**：想法在这里冒出来 → 研究可行性 → 落成组件 →（成熟后）被 g-lab 的 planner 复用、也可发 npm。
本文件就是那本「灵感账本」：记录做了什么、在研究什么、还想做什么、灵感来自哪。

> 约定：每个组件都遵循 **逻辑/视图解耦**（几何与数学进 `src/util/*.js` 纯函数 + `node --test`）、
> **自带样式**（`useInjectedStyle` 注入、类名前缀 `muse-`）、**尊重 `prefers-reduced-motion`**、**零运行时依赖**。

## ✅ 已落地（v0.2）
| 组件 | 一句话 | 纯逻辑 |
| --- | --- | --- |
| `TiltCard` | 跟随鼠标 3D 倾斜 + 高光 | `tiltTransform` |
| `SpotlightCard` | 跟随指针的光斑 | `spotlightStyle` |
| `MagneticButton` | 磁吸按钮 | `magneticOffset` |
| `RippleButton` | 点击水波纹 | `rippleGeometry` |
| `MeshGradient` | 动态网格渐变背景 | `meshGradient` |
| `CountUp` | 数字滚动 | `countAt` / `formatNumber` |
| `GradientText` | 渐变流动文字 | `linearGradient` |
| `Typewriter` | 逐字打字 + 光标 | `typedSlice` |
| `CommandPalette` | ⌘K 模糊命令面板 | `fuzzyScore` / `filterCommands` |
| `ScrambleText` | 文字解码动画 | `revealCount` / `scrambleText` |
| `Marquee` | 无缝循环跑马灯 | `marqueeOffset` |
| `ConfettiButton` | 点击迸发礼花 | `makeParticles` / `stepParticle` |
| `StickyCanvas` | 便利贴白板（拖拽/编辑/换色） | `clampNote` / `reorderToFront` / `cascadeXY` |
| `Sketchy` | 手绘风边框 | `mulberry32` / `roughRectPath` |
| `Sparkles` | 四周闪烁星点 | `makeSparkles` |
| `Parallax` | 指针视差分层容器（子元素按 data-depth 独立平移） | `parallaxOffset` / `pointerToNorm` |

## ✅ 已打磨（v0.5）
- **CommandPalette**：分组（group）+ 最近使用（recent）+ 命中字符高亮 ✓（嵌套子命令仍待做）
- **Typewriter**：多句数组循环 + 退格删除 ✓（纯函数 `typewriterState` 状态机）

## 🔬 研究中（已有雏形，待打磨）
- **CommandPalette**：嵌套子命令、命令别名/分数权重可配。
- **MeshGradient**：可选 `blur`/颗粒叠加；用 `prefers-reduced-motion` 时给一帧静态好看的构图。

## 🧠 待脑爆（Backlog）
- **Sketchy++**：手绘下划线/圈选/箭头（roughRectPath 的兄弟函数）。
- **StickyCanvas++**：连线/分组、便利贴间箭头、导出 PNG/JSON（在现有白板上加）。
- **TiltGroup**：多卡片联动倾斜（Parallax 指针版已落地，此为扩展变体）。
- **NoiseOverlay**：SVG `feTurbulence` 颗粒质感叠层。
- **Carousel3D / CoverFlow**：3D 卡片轮播。
- **Sparkles**：元素四周持续闪烁星点（粒子复用 `particles.js`）。

## 🪝 复用到 planner（路线）
- 先把成熟、零交互风险的组件用进 planner：`CountUp`（KPI 数字）、`GradientText`（标题）、`Typewriter`（欢迎语）。
- 复用方式：monorepo 内相对引入 `import { CountUp } from '../../muse-ui/src/index.js'`（planner 的 esbuild 会把它一起打进对应 bundle）。
- 验证点：构建产物不膨胀、样式不打架（`muse-` 前缀隔离）、SSR/首屏正常。

## 📚 参考 / 灵感来源
- 命令面板：`cmdk`、各类 ⌘K 实现的交互范式（模糊匹配 + 键盘优先）。
- 交互动效：framer-motion / aceternity / 各「awwwards 风」组件站的观感（这里用零依赖手写复刻其神韵）。
- 无障碍：始终接 `prefers-reduced-motion`，动效可一键收敛。

---
有了新想法就往「待脑爆」里加一条；动手前把它挪到「研究中」；落地后进「已落地」表。

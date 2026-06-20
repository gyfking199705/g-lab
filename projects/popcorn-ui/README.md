# popcorn-ui 🍿

零依赖的 **React 创意交互组件**库——3D 倾斜、光斑、磁吸、涟漪、动态网格渐变、数字滚动。
**复制即用、自带样式（无需引 CSS）、尊重 `prefers-reduced-motion`**。是 g-lab 里的一个可独立发 npm 的子项目。

```
ui/
├── src/
│   ├── index.js            # 入口：导出全部组件 + 纯工具/hooks
│   ├── TiltCard.jsx        # 3D 倾斜卡片（+高光）
│   ├── SpotlightCard.jsx   # 跟随指针的光斑卡片
│   ├── MagneticButton.jsx  # 磁吸按钮
│   ├── RippleButton.jsx    # 点击水波纹按钮
│   ├── MeshGradient.jsx    # 动态网格渐变背景
│   ├── CountUp.jsx         # 数字滚动
│   └── util/
│       ├── anim.js         # clamp/lerp/mapRange/easings/cx（纯函数，可单测）
│       ├── interactions.js # tilt/magnetic/spotlight/ripple/countAt/mesh 几何（纯函数，可单测）
│       ├── hooks.js        # useInjectedStyle / usePrefersReducedMotion / useRaf
│       ├── anim.test.js
│       └── interactions.test.js
├── demo/                   # 画廊演示页（/ui/，不打进库）
├── build.mjs               # 库打包（ESM + CJS，react 外置）
└── package.json
```

## 设计原则
- **零运行时依赖**：只把 `react`/`react-dom` 作为 `peerDependency`，不打进库。
- **逻辑/视图分离**：所有几何与数学都在 `util/*.js` 纯函数里（`node --test` 可测），`.jsx` 只把鼠标事件接上去。
- **自带样式**：组件用 `useInjectedStyle` 按 id 注入一次 `<style>`，使用者 `import` 即用，不必单独引 CSS。
- **无障碍**：检测系统「减少动态效果」偏好，自动收敛动画。

## 安装与使用
```bash
npm i popcorn-ui   # 需自带 react>=18 / react-dom>=18
```
```jsx
import { TiltCard, MagneticButton, CountUp } from 'popcorn-ui';

<TiltCard maxDeg={14}><h3>Hello 🍿</h3></TiltCard>
<MagneticButton strength={0.5} radius={100}>点我</MagneticButton>
<CountUp value={1280000} prefix="¥" duration={2} />
```

| 组件 | 关键 props |
|---|---|
| `<TiltCard>` | `maxDeg=12` `glare=true` `scale=1.03` |
| `<SpotlightCard>` | `color` `size=320` |
| `<MagneticButton>` | `radius=80` `strength=0.4` `as='button'` |
| `<RippleButton>` | `color` `as='button'` |
| `<MeshGradient>` | `colors[]` `speed=0.05` |
| `<CountUp>` | `value` `from=0` `duration=1.4` `decimals=0` `prefix` `suffix` `ease` |

也可单独引用纯函数：`import { tiltTransform, meshGradient, easings, cx } from 'popcorn-ui'`。

## 开发
```bash
cd ui && node --test          # 跑纯函数单测
node scripts/build.mjs        # 在仓库根：生成画廊页 dist/ui.js（/ui/ 可预览）
cd ui && node build.mjs        # 生成可发布的库产物 dist/index.js(ESM)+index.cjs(CJS)
```
画廊在线预览：部署后访问 `/ui/`。

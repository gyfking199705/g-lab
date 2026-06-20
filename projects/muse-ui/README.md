# muse-ui ✨

**UI 组件的「脑爆 + research」实验室**——创意交互组件在这里孵化、打磨、研究：3D 倾斜、光斑、磁吸、涟漪、动态网格渐变、数字滚动、渐变文字、打字机、⌘K 命令面板。
零依赖、**复制即用、自带样式（无需引 CSS）、尊重 `prefers-reduced-motion`**。现为独立子项目，组件可被 g-lab 的 **planner 复用**，也可独立发 npm。

```
muse-ui/
├── src/
│   ├── index.js            # 入口：导出全部组件 + 纯工具/hooks
│   ├── TiltCard.jsx        # 3D 倾斜卡片（+高光）
│   ├── SpotlightCard.jsx   # 跟随指针的光斑卡片
│   ├── MagneticButton.jsx  # 磁吸按钮
│   ├── RippleButton.jsx    # 点击水波纹按钮
│   ├── MeshGradient.jsx    # 动态网格渐变背景
│   ├── CountUp.jsx         # 数字滚动
│   ├── GradientText.jsx    # 渐变流动文字
│   ├── Typewriter.jsx      # 逐字打字 + 光标
│   ├── CommandPalette.jsx  # ⌘K 模糊命令面板
│   └── util/
│       ├── anim.js         # clamp/lerp/mapRange/easings/cx（纯函数，可单测）
│       ├── interactions.js # tilt/magnetic/spotlight/ripple/countAt/mesh/typed/gradient（纯函数）
│       ├── command.js      # 命令面板模糊匹配 fuzzyScore/filterCommands（纯函数）
│       ├── hooks.js        # useInjectedStyle / usePrefersReducedMotion / useRaf
│       └── *.test.js       # anim / interactions / command 三套单测
├── demo/                   # 画廊演示页源码（Gallery.jsx + bootstrap.jsx）
├── demo.js                 # 画廊打包产物（含 React，入库自托管，GitHub Pages 用）
├── index.html              # 画廊页（加载 ./demo.js）
├── index.d.ts              # TypeScript 类型声明（随库发布）
├── IDEAS.md                # 脑爆 & research 记录（已落地 / 研究中 / 待脑爆）
├── build.mjs               # 打包：库 dist/(ESM+CJS, 不入库) + 演示 demo.js(入库)
├── package.json
└── dist/                   # 库发布产物（.gitignore；发 npm 前用 build.mjs 生成）
```

## 设计原则
- **零运行时依赖**：只把 `react`/`react-dom` 作为 `peerDependency`，不打进库。
- **逻辑/视图分离**：所有几何与数学都在 `util/*.js` 纯函数里（`node --test` 可测），`.jsx` 只把鼠标事件接上去。
- **自带样式**：组件用 `useInjectedStyle` 按 id 注入一次 `<style>`，使用者 `import` 即用，不必单独引 CSS。
- **无障碍**：检测系统「减少动态效果」偏好，自动收敛动画。

## 安装与使用
```bash
npm i muse-ui   # 需自带 react>=18 / react-dom>=18
```
```jsx
import { TiltCard, MagneticButton, CountUp } from 'muse-ui';

<TiltCard maxDeg={14}><h3>Hello ✨</h3></TiltCard>
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
| `<GradientText>` | `colors[]` `angle=90` `speed=6` `animate=true` `as='span'` |
| `<Typewriter>` | `text` `cps=22` `caret=true` |
| `<CommandPalette>` | `commands[]` `open?` `onClose?` `hotkey=true` `placeholder` |

`<CommandPalette>` 非受控时自带 **⌘K / Ctrl+K** 热键；受控用法传 `open` + `onClose` 并设 `hotkey={false}`。

也可单独引用纯函数：`import { tiltTransform, meshGradient, fuzzyScore, easings, cx } from 'muse-ui'`。

**TypeScript**：随包发布 `index.d.ts`，`import` 即有完整类型提示（组件 props、纯函数签名、hooks）。
研究/灵感记录见 [`IDEAS.md`](IDEAS.md)。

## 开发
```bash
cd projects/muse-ui
node --test                                          # 跑纯函数单测（17 例）
npm i --no-save esbuild react@18.3.1 react-dom@18.3.1
node build.mjs   # 库 dist/index.js(ESM)+index.cjs(CJS) + 画廊 demo.js（并给 index.html 打 ?v= 戳）
```
画廊在线预览：部署后访问 `/projects/muse-ui/`（本地 `python3 -m http.server 8000` 后开 `http://localhost:8000/projects/muse-ui/`）。

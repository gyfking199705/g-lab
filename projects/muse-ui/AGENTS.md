# AGENTS.md — muse-ui 给 AI agent 的「吸收精华」指南

> 别的 agent 想看懂 muse-ui、照它的范式加组件、或把它的组件用到别处，**先读这份**。
> 细节再去看：用法/props → [`README.md`](README.md)；路线/灵感 → [`IDEAS.md`](IDEAS.md)；
> 类型签名 → [`index.d.ts`](index.d.ts)；行为真相 → `src/util/*.test.js`（测试即规格）。

muse-ui 是 g-lab 的「UI 组件脑爆 + research 实验室」：零依赖 React 创意交互组件，在这里孵化/打磨，
成熟后被 planner 等子项目复用、也可发 npm。当前 16 个组件、~47 个纯函数单测。

---

## 1. 精华：5 条铁律（每个组件都遵守）

1. **逻辑/视图解耦** —— 所有数学/几何/状态机进 `src/util/*.js` **纯函数**（不碰 React/DOM），`.jsx` 只把鼠标/键盘事件接到纯函数上。好处：`node --test` 可测、可跨框架复用、组件极薄。
2. **自带样式** —— 组件内 `const CSS = '...'`（类名一律 `muse-` 前缀），用 `useInjectedStyle(id, CSS)` 全局注入一次。使用者 `import` 即用，**不引 CSS、不污染全局、与别处前缀不冲突**。
3. **零运行时依赖** —— 组件只 `import React`；`react`/`react-dom` 是 `peerDependency`，不打进库。（可自由用任意 React 内置 hook：`useState`/`useRef`/`useMemo`/`useCallback`…；`util/hooks.js` 的三个是额外工具层，不是替代。）
4. **无障碍优先** —— 动效组件用 `usePrefersReducedMotion()`，系统开启「减少动效」时收敛或静止。
5. **确定性可测** —— 随机用**可注入的种子 RNG**（`mulberry32(seed)`）或纯时间参数，纯函数测试不依赖 `Math.random`/真实时间。
   - ⚠️ JS 的 `-0` 坑：几何函数里 `x*0` 可能得 `-0`，而 `assert.equal(-0, 0)` 会**抛错**。规避：测试里写 `assert.equal(r.x + 0, 0)`，或纯函数返回前 `roundTo(v, n)`（已把 `-0` 归一为 `0`）。

> 这 5 条不仅是 muse-ui 的，也是值得搬到别的 lab 的通用范式。

---

## 2. 一眼看懂的范例：`TiltCard`（30 行讲清全部 5 条）

```jsx
import React, { useRef, useState } from 'react';
import { tiltTransform } from './util/interactions.js';        // ① 纯逻辑在 util
import { useInjectedStyle, usePrefersReducedMotion } from './util/hooks.js';

const CSS = `.muse-tilt{...}.muse-tilt-glare{...}`;            // ② muse- 前缀样式

export default function TiltCard({ maxDeg = 12, glare = true, className = '', style, children, ...rest }) {
  useInjectedStyle('muse-tiltcard', CSS);                      // ② 注入一次
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();                   // ④ 无障碍
  const [t, setT] = useState(null);
  const onMove = (e) => {
    if (reduced || !ref.current) return;                      // ④ 收敛
    const r = ref.current.getBoundingClientRect();
    setT(tiltTransform(e.clientX - r.left, e.clientY - r.top, r.width, r.height, maxDeg)); // ① 只调纯函数
  };
  return (
    <div ref={ref} className={`muse-tilt ${className}`.trim()} style={{ ...style }}
         onMouseMove={onMove} onMouseLeave={() => setT(null)} {...rest}>  {/* 透传 className/style/...rest */}
      {children}
    </div>
  );
}
```
`tiltTransform(px,py,w,h,maxDeg)` 是纯函数（在 `util/interactions.js`，有单测）；组件只负责把 DOM 坐标喂给它、把结果写进 style。③ 全程只 import React。

---

## 3. 组件 → 纯逻辑 对照（吸收时按这个找源头）

| 组件 | 纯逻辑模块/函数 |
| --- | --- |
| TiltCard / SpotlightCard / MagneticButton / RippleButton / MeshGradient / CountUp / GradientText / Typewriter / ScrambleText / Marquee | `util/interactions.js`（tiltTransform / spotlightStyle / magneticOffset / rippleGeometry / meshGradient / countAt+formatNumber / linearGradient / typewriterState+typedSlice / scrambleText+revealCount / marqueeOffset） |
| CommandPalette | `util/command.js`（fuzzyScore / filterCommands / fuzzyMatchIndices / groupCommands / pickByIds） |
| ConfettiButton | `util/particles.js`（makeParticles / stepParticle） |
| StickyCanvas | `util/board.js`（clampNote / snap / reorderToFront / cascadeXY） |
| Sketchy / Sparkles | `util/sketch.js`（mulberry32 / roughRectPath / makeSparkles） |
| 通用 | `util/anim.js`（clamp / lerp / mapRange / roundTo / easings / cx） |

三个 hooks 在 `util/hooks.js`：`useInjectedStyle(id,css)`、`usePrefersReducedMotion()`、`useRaf(cb, active)`（每帧回调，active=false 停）。

---

## 4. 配方 A：在 muse-ui 里**新增一个组件**

1. **纯逻辑先行**：把数学/几何/状态机写进 `src/util/<topic>.js`（已有就复用），导出纯函数；配 `src/util/<topic>.test.js`，`cd projects/muse-ui && node --test` 必须全绿。
   - 测试用 **Node 内置 `node:test`**（无需装框架）：`import { test } from 'node:test'; import assert from 'node:assert/strict';`；文件名 `<topic>.test.js`，与被测文件同目录；`node --test` 会自动发现 `**/*.test.js`。
2. **写组件** `src/<Name>.jsx`：顶部 header 注释（一句话 + 用法）→ `const CSS`（`muse-` 前缀）→ `useInjectedStyle('muse-<name>', CSS)` → 引纯函数 → 只接事件 → 透传 `className/style/...rest` → 动效就接 `usePrefersReducedMotion()`。
   - 进阶：若组件要**从子元素读配置**（而非 props），用 `data-*` 属性 + `React.Children.map` + `cloneElement` 注入 style——参考 `Parallax.jsx`（`data-depth`）。
3. **导出**：`src/index.js` 加 `export { default as <Name> } from './<Name>.jsx';`，并把新纯函数也 export。
4. **类型**：`index.d.ts` 加 `<Name>Props` 接口 + 组件声明 + 新纯函数签名。
5. **演示**：`demo/Gallery.jsx` 加一个 `<Section>`；Hero 的 `<CountUp value={N}>` 计数 +1，**且把 footer 里写死的「N 个组件」那行也同步改**（两处都是硬编码）。
6. **记录**：`IDEAS.md` 把它从「待脑爆」挪到「已落地」表；并同步 `README.md`（目录树加文件、props 表加一行、`node --test` 的「N 例」改数、顶部组件清单补名）。
7. **构建**：`node build.mjs` → 产库 `dist/`（**.gitignore 不入库**）+ 演示 `demo.js`（**入库**）+ 给 `index.html` 打 `?v=` 戳。
8. **提交**：只 `git add` 你真正改的源码 + `demo.js` + `index.html`；库 `dist/` 已被忽略。

---

## 5. 配方 B：在**别的 g-lab 子项目**里复用 muse-ui 组件

1. **按文件相对引入**（别拉整个 barrel，减小 bundle）：
   ```jsx
   // 你的文件在 projects/planner/<module>/X.jsx → muse-ui 在 projects/muse-ui/src/
   import GradientText from '../../muse-ui/src/GradientText.jsx';
   import CountUp from '../../muse-ui/src/CountUp.jsx';
   ```
2. **直接用**：`<GradientText colors={['#CC785C','#C9A14A']}>标题</GradientText>`。样式自带；`muse-` 前缀与你的前缀（`pp-`/`lp-`/`fp-`…）天然不冲突。
3. **重打你自己项目的包**（如 planner：`node scripts/build.mjs`）——它的 esbuild 会把 muse-ui 源码一起打进对应 bundle，无需发 npm / 软链。
4. **只提交你真正改到的 bundle**：`dist/<module>.js` + 该模块 `index.html` 的 `?v=` 行；其余 bundle 用 `git checkout origin/main -- <文件>` 还原（详见根 [`CONTRIBUTING.md`](../../CONTRIBUTING.md) 的「打包注意」）。
5. **验证**：相关模块 `node --test` 通过；`grep "muse-" dist/<module>.js` 能看到注入的类名；`?v=` 哈希与 bundle 内容一致；SSR/首屏正常。

> 已落地范例：planner 的 **project / learning / fitness** 三个模块标题用了 `GradientText`、project 的数字 KPI 用了 `CountUp`。这条复用链路已验证稳定。

---

## 6. 红线（别做）

- ❌ 把 `react`/`react-dom` 打进库（必须是 peer）。
- ❌ 引外部 CDN、运行时转译、图表库（图表手写 SVG）。
- ❌ 在 `util/*.js` 里碰 DOM / React（纯函数必须可在 Node 里跑测试）。
- ❌ 动效组件不接 `prefers-reduced-motion`；随机不可注入（破坏可测性）。
- ❌ 复用时把别的项目的全部 bundle 一起提交（只交你改的那个）。

---

## 7. 一分钟自检清单（加组件/改组件后）

- [ ] 纯逻辑在 util + 有单测，`node --test` 全绿
- [ ] 组件只 import React + 自家 util；`muse-` 前缀样式经 `useInjectedStyle` 注入
- [ ] 动效接了 reduced-motion；随机用了注入式种子
- [ ] `index.js` 导出、`index.d.ts` 有类型、`Gallery` 有演示、`IDEAS` 已更新
- [ ] `node build.mjs` 重建；只提交 `demo.js`+`index.html`（库 dist 不入库）；`?v=` 一致

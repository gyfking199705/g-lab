# core · 共享数据层与 UI 基元

日常核心模块（首页看板 / 日程安排 / 目标进度 / 习惯打卡）共用的基础设施，避免重复造轮子、统一设计语言与数据约定。

## 文件

| 文件 | 作用 |
| --- | --- |
| `date.js` | 纯日期工具：`todayStr` / `addDays` / `dayDiff` / `startOfWeek` / `weekDates` / `fmtDate` / `relDay` / `lastNDays` …（日期一律 `'YYYY-MM-DD'` 字符串，字典序即时间序） |
| `store.js` | 带**版本号 + 迁移**的 localStorage 读写：`migrate` / `loadState` / `saveState` / `readModule` / `uid` |
| `ui.jsx` | 设计令牌 + 通用类名（前缀 `gx-`）+ 轻量组件 `Progress` / `Empty` / `Segmented`，导出 `SHARED_CSS` 字符串供各模块 `<style>` 注入 |

## 数据约定（落实「增量不破坏」）

每个核心模块的数据形如 `{ v: <number>, ...payload }`：

```js
import { loadState, saveState } from '../core/store.js';
const DEFAULTS = { v: 1, items: [] };
const data = loadState('xxx-planner', DEFAULTS, {
  // 1: (d) => ({ ...d, /* v1 → v2 的迁移 */ }),  // 日后结构升级时补这里
});
```

`migrate` 会从旧版本号**逐级**调用迁移函数升到最新，再合并默认字段——旧数据永不丢失。

## 测试

```bash
node --test core/date.test.js core/store.test.js
```

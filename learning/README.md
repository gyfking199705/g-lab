# 📚 AI 学习计划站模块

一个「能在上面真正学习」的通用学习站：制定学习计划、每天学一点、用**间隔复习**对抗遗忘，并用统计看见自己的坚持。
主题不限（编程 / 语言 / 考证 / 读书…），内置可一键开课的模板与一条示例「AI/ML 学习路径」。

默认**全离线可用**；填入你自己的 API Key（仅存本地浏览器）后，解锁「AI 生成计划 / AI 讲解知识点」。
可作为独立组件单独运行，也可集成进主应用（个人成长规划系统）。

```
learning/
├── calc.js              # ① 纯函数计算（间隔复习 SM-2 / 进度 / 连续天数 / 活跃度 / AI 提示词与解析）— 不依赖 React
├── calc.test.js         # 计算逻辑单元测试（Node 内置 test runner，24 个用例）
├── templates.js         # 内置学习计划模板库（通用 + AI/ML 示例）
├── ai.js                # BYOK AI 客户端（浏览器直连 Anthropic / OpenAI 兼容接口；Key 仅存本地）
├── LearningPlanner.jsx  # ② React 组件（函数式 + hooks），SVG 热力图，自带样式
├── bootstrap.jsx        # 独立页打包入口
├── index.html           # ③ 可独立运行的演示页（加载 ../dist/learning.js）
└── package.json         # 标记 ESM，便于 Node 测试
```

---

## ✨ 功能

- **今日**：连续学习天数 / 今日时长 / 总进度 / 待复习数；番茄计时器一键计时记录；间隔复习队列（忘了/有点难/记得/太简单）；继续学习队列。
- **我的计划**：从模板 / AI 生成 / 空白创建；逐知识点追踪「未开始 / 学习中 / 已掌握」，记笔记、加资源链接，让 AI 讲解；模块化编辑；一键导出某个计划（即一份可分享、可复用的课程）。
- **统计**：手写 SVG 学习热力图（最近 13 周）、各计划进度、未来 7 天复习分布。

### 间隔复习（SM-2 变体）

每个知识点掌握后进入复习队列，按自测评分推进下次复习时间：
- 「记得」连续推进间隔：1 天 → 6 天 → ×难度系数（EF）逐步拉长；
- 「忘了」重置并明天再来；难度系数随表现升降，下限 1.3。

到期（含逾期）的知识点会出现在「今日复习」，复习一次即安排下一次，符合记忆曲线。

---

## 🚀 独立运行

页面加载的是**自托管打包产物** `../dist/learning.js`（已含 React，无任何外部 CDN）。需通过 **HTTP** 访问：

```bash
# 仓库根目录起静态服务器
python3 -m http.server 8000
# 浏览器打开：http://localhost:8000/learning/
```

部署到 GitHub Pages 后，直接访问 `https://<用户名>.github.io/<repo>/learning/`。
改动任何源码后，需在根目录重新打包：`node scripts/build.mjs`。

## 🧪 测试

```bash
cd learning
node --test     # 覆盖间隔复习/进度/连续天数/活跃度/模板/AI 解析/格式化
```

---

## 🔌 集成进主应用

组件与计算逻辑解耦，集成时只需引入 `LearningPlanner.jsx`：

```jsx
import LearningPlanner from './learning/LearningPlanner.jsx';

function App() {
  return (
    <LearningPlanner
      // 可选：初始数据（优先于 localStorage）。结构 { plans, sessions, settings }
      initialState={{ plans: [], sessions: [] }}
      // 可选：数据变化回调（主应用可借此刷新徽章等）
      onChange={(data) => console.log(data)}
      // 可选：localStorage 键名；传 null 关闭本地持久化、完全由 props 驱动
      storageKey="learning-planner"
    />
  );
}
```

- **数据进**：`initialState`（与默认值浅合并）
- **数据出**：`onChange(data)`——`data` 为 `{ plans, sessions, settings }`
- **样式**：组件自带 `<style>`（类名前缀 `lp-`），无需额外 CSS

---

## 📐 计算函数说明（`calc.js`）

所有函数均为纯函数（`uid` 除外）。日期统一为 `'YYYY-MM-DD'` 字符串（字典序即时间序），时长统一为分钟。

| 函数 | 说明 |
| --- | --- |
| `scheduleReview({sr, grade, today})` | SM-2 变体：按评分推进间隔复习状态 |
| `qualityOf(grade)` / `GRADES` | 评分（again/hard/good/easy）→ 质量分 |
| `planStats(plan)` / `overallStats(plans)` | 各状态计数与完成度（含加权进度）|
| `dueReviews(plans, today)` | 今日到期（含逾期）的复习队列 |
| `upcomingReviews(plans, today, days)` | 未来若干天的复习到期分布 |
| `nextLessons(plans, n, planId?)` | 接下来要学的知识点（学习中优先）|
| `computeStreak(sessions, today)` | 连续学习天数（current / longest）|
| `activitySeries(sessions, today, days)` | 最近 N 天活跃度序列（热力图用）|
| `suggestedDailyLessons(plan, today)` | 按剩余量与目标日期建议的每日学习数 |
| `scaffoldPlan(template, opts)` | 把模板实例化为可编辑计划 |
| `normalizePlan(raw)` / `parsePlanFromText(text)` | 归一化任意/AI 输出为合法计划（裁剪异常规模）|
| `buildPlanMessages(...)` / `buildExplainMessages(...)` | 构建发给大模型的提示词（与厂商无关）|
| `formatDuration / pctText / fmtDate / relDay` | 中文展示格式化 |

---

## 🔐 关于 AI（BYOK）与隐私

- AI 为**可选增强**：不配置 Key 时，模板、追踪、间隔复习、统计等核心功能均可离线使用。
- API Key **仅保存在你本地浏览器**（`localStorage` 键 `learning-ai`），调用时**直连模型厂商**、不经过任何服务器；该键**不纳入跨模块备份**，避免随分享外泄。
- ⚠️ 纯前端调用会把 Key 暴露在浏览器端，**仅建议个人使用**。若要做成「公开让别人来学」的多用户站点，应改为「后端代理 + 服务端密钥」，再把本组件的 AI 调用指向你的代理地址（`baseURL`）。
- 分享给别人来学的推荐方式：在计划详情里**导出**某个计划的 JSON，对方导入即可，无需 Key。

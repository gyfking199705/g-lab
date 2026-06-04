# 🎯 个人成长规划系统 (Personal Growth Planner)

一个统一风格的单页 Web 应用，把个人规划、**AI 学习计划站**、**健身训练规划**与**财富规划**整合在同一个外壳里，
暖纸色 + 陶土橙配色（Claude.ai 风格）、衬线标题、数据可视化，移动端友好。纯前端、数据存于浏览器。

## 📋 功能模块

> **日常核心四块**（侧栏置顶）围绕「督促自己、坚持好习惯」展开，数据互通：习惯/日程可关联目标，健身记录训练后自动点亮当日「训练完成」习惯，首页看板聚合三者的当日全局。

### 0. 🏠 首页看板
打开即见全局：今日习惯打卡（可就地打卡）、今日日程（含逾期提醒、可就地勾选）、目标进度概览。各模块的「融合层」，只读/写各模块数据、不单独存储。

### 0a. 📅 日程安排
管理日常事项，按**日 / 周**查看；日视图含逾期提醒与待办/已完成分组，周视图 7 天概览可下钻。事项可关联目标。由独立模块 `schedule/`（`SchedulePlanner.jsx` + 纯函数 `calc.js`）提供，详见 [`schedule/README.md`](schedule/README.md)。

### 0b. 🎯 目标进度
管理中长期目标：拆子任务、可选数值指标（如「跑量 100km」）、进度条、截止日提醒、归档。由独立模块 `goals/` 提供，详见 [`goals/README.md`](goals/README.md)。

### 0c. 🔥 习惯打卡
追踪日常正向习惯（勾选型 / 计数型如喝水 8 杯），连续打卡 streak、近 30 天完成率、最近 70 天热力图回顾；预置训练/喝水/早睡/活动模板。**与健身模块联动**：当天有训练记录自动点亮「训练完成」。由独立模块 `habits/` 提供，详见 [`habits/README.md`](habits/README.md)。

> 💡 上述核心模块共用 `core/`（共享日期工具 `date.js` + 带版本迁移的存储 `store.js` + 设计令牌/UI 基元 `ui.jsx`），详见 [`core/README.md`](core/README.md)。

### 1. 📝 个人规划
待办事项的添加、勾选完成、编辑、删除，回车快速录入，完成进度统计。

### 2. 📚 AI 学习计划站
一个「能在上面真正学习」的通用学习站（主题不限：编程 / 语言 / 考证 / 读书…）：
- **今日**：连续学习天数 / 今日时长 / 总进度 / 待复习；番茄计时器一键记录；**间隔复习（SM-2）**队列与「继续学习」队列
- **我的计划**：从内置模板（含一条示例 **AI/ML 学习路径**）/ AI 生成 / 空白 / 导入分享码创建；逐知识点追踪「未开始 / 学习中 / 已掌握」，记笔记、加资源、让 AI 讲解
- **统计**：手写 SVG **学习热力图** + 各计划进度 + 未来 7 天复习分布
- **分享给别人学**：把某个计划生成「分享链接 / 分享码」，对方打开链接或在「新建 → 导入」里粘贴即可一键开始同样的学习（只含结构、不含进度，**无需 Key**）
- **AI 为可选增强**：默认全离线可用；填自己的 API Key（**自带 Key**，仅存本地、直连厂商）即可用「AI 生成计划 / AI 讲解」；想公开让别人也用 AI、又不想每人各填 Key，可部署 **后端代理**（Key 放服务端，见 [`learning/proxy/`](learning/proxy/README.md)）

> 💡 学习站由独立模块 `learning/`（`LearningPlanner.jsx` + 纯函数 `calc.js` + 模板 `templates.js` + AI 客户端 `ai.js`）提供，
> 既被主应用集成，也可单独运行。详见 [`learning/README.md`](learning/README.md)。

### 3. 💪 健身训练规划
一个正经的训练追踪器（不再是简单待办）：
- **今日**：本周训练 / 连续训练周 / 累计容量 / 上次训练概览；**实时记录器**——加动作、逐组填「次数 × 重量」、加组删组、一键保存
- **训练计划**：从模板（推/拉/腿、全身、上下肢分化）或空白创建，编辑目标组数/次数，「▶ 开练」自动带出动作
- **记录**：历史训练流水（容量/组数/肌群），可展开看每组、删除
- **统计**：各肌群最近 4 周容量、所选动作的**估算 1RM 走势**（手写 SVG 折线）、训练**热力图**；可切换重量单位（kg/lb）与 1RM 公式（Epley/Brzycki）

> 💡 健身由独立模块 `fitness/`（`FitnessPlanner.jsx` + 纯函数 `fitness/calc.js` + 动作库 `fitness/exercises.js`）提供，
> 既被主应用集成，也可单独运行。详见 [`fitness/README.md`](fitness/README.md)。

### 4. 📋 项目规划

一套**共享任务模型**，三种看法（同一批任务，不重复录入）：

- **🗓 日程**：一行快速建任务（标题/负责人/起止日期），按到期日自动分桶——逾期 · 今天 · 近 7 天 · 以后 · 未排期 · 已完成；点圆点切「待办→进行中→完成」，点 ▶ 直接对该任务开番茄
- **📊 人力甘特**：按**负责人**分行，在时间轴上画任务起止条，今天竖线标记、时间窗可选 2/4/8/12 周、横向滚动；点色条即可编辑（手写，无图表库）
- **🍅 番茄专注**：可配置番茄钟（默认专注 25 / 休息 5 分），可绑定到某个任务，完成一段自动记录；看连续天数、累计、近 7 天柱图与最近记录

> 💡 由独立模块 `project/`（`ProjectPlanner.jsx` + 纯函数 `project/calc.js`）提供，既被主应用集成，也可单独运行。详见 [`project/README.md`](project/README.md)。

### 5. 💰 财富规划
面向一线城市家庭（可双人）的交互式财富规划器，四个 Tab：
- **测算**：税前→税后（个税年度税率表近似 + 五险一金 + 专项附加扣除）、双人收支与储蓄率、多资产投资配置加权综合年化、复利预测（达成目标所需年数 + 手写 SVG 资产曲线 + 敏感性/通胀）
- **净资产**：定期记录资产 / 负债快照 → **净资产曲线**、资产构成占比、环比变化（把「算一次」变成「长期回看」）
- **体检**：综合最新净资产与收支，给出应急储备 / 储蓄率 / 负债率 / 净资产倍数等检查项与综合评分
- **压力测试（蒙特卡洛）**：收益按「均值 ± 波动率」每年随机抽样、跑几千次 → **达成概率** + 可悬停的 **P10/P50/P90 扇形带** + 结果直方图；滑块实时重算、可「🎲 重新模拟」

> 💡 财富规划由独立的 React 组件 `savings/SavingsPlanner.jsx` + 纯函数计算 `savings/calc.js` 提供，
> 既被主应用集成，也可单独运行。详见 [`savings/README.md`](savings/README.md)。

### 6. 📈 股市观测
自选股清单 + 实时行情观测（手写 SVG 迷你走势图、涨跌配色可切换 红涨绿跌/绿涨红跌）。
- **数据源**（设置里切换）：
  - **实时行情（默认）**：直连 Yahoo Finance，被 CORS 拦截时自动经公共 CORS 代理回退；覆盖**美股 / A股(.SS·.SZ) / 港股(.HK)**、含走势图，零部署、免 key
  - **自建代理（更稳）**：自建 Cloudflare Worker 转发 Yahoo，受限网络/高频时更可靠（部署见 [`stocks/proxy/README.md`](stocks/proxy/README.md)）
  - Finnhub：填自己的免费 key（仅存本机），美股实时但免费版无历史走势
  - 演示数据：确定性合成，离线兜底
- **数据落点**：实时行情活在浏览器内存（React state），最近一次快照缓存到 localStorage（重开先秒显示）；自选清单/设置存 localStorage。**GitHub Pages 无后端、无数据库**，数据由浏览器直连 API；代理也只是无状态中转、不存数据。

> 💡 由 `stocks/StockWatch.jsx`（UI）+ `stocks/api.js`（数据适配层）+ `stocks/proxy/worker.js`（可选代理）提供。

## 🏗️ 项目结构

React 单页应用（函数式 + hooks）。源码为 `.jsx`，用 esbuild 预打包成**自托管的单文件 bundle**
（React 一起打进去），页面只从同源加载一个 JS，**不依赖任何外部 CDN、也没有运行时转译**，加载快。

```
g-lab/
├── README.md
├── index.html                # 应用外壳：全局样式 + 加载 dist/app.js
├── favicon.svg               # 站点图标
├── app/
│   ├── main.jsx             # 主应用：侧边栏导航（核心四块置顶）+ 集成所有模块
│   ├── Dashboard.jsx        # 🏠 首页看板：聚合今日日程/目标/习惯，可就地打卡
│   └── bootstrap.jsx        # 打包入口（挂载 React）
├── core/                     # 🧩 共享数据层 + UI 基元（日常核心四块共用）
│   ├── date.js              #   纯日期工具（todayStr/addDays/streak 周期等），可单测
│   ├── store.js             #   带版本号+迁移的 localStorage 读写，可单测
│   ├── ui.jsx               #   设计令牌 + 通用类名(gx-) + 轻量组件(Progress/Empty/Segmented)
│   ├── date.test.js / store.test.js  # 单元测试（node --test）
│   └── README.md            #   数据层约定与迁移说明
├── schedule/                 # 📅 日程安排模块（按日/周）
│   ├── calc.js              #   纯函数（按日/周分组、今日分桶、逾期统计），可单测
│   ├── SchedulePlanner.jsx  #   React 组件（日/周视图），复用 core/ui
│   ├── bootstrap.jsx / index.html / calc.test.js / README.md
├── goals/                    # 🎯 目标进度模块（目标/子任务/数值指标）
│   ├── calc.js              #   纯函数（进度/达成/截止状态/排序），可单测
│   ├── GoalsPlanner.jsx     #   React 组件（进度条/子任务/归档），复用 core/ui
│   ├── bootstrap.jsx / index.html / calc.test.js / README.md
├── habits/                   # 🔥 习惯打卡模块（streak/热力图/健身联动）
│   ├── calc.js              #   纯函数（连续/最长/完成率/热力图/健身联动），可单测
│   ├── HabitsPlanner.jsx    #   React 组件（打卡/计数/回顾弹窗），复用 core/ui
│   ├── bootstrap.jsx / index.html / calc.test.js / README.md
├── learning/                 # 📚 AI 学习计划站模块
│   ├── calc.js              #   纯函数（间隔复习/进度/连续天数/活跃度/AI 解析/分享码），可单测
│   ├── templates.js         #   内置学习计划模板库（通用 + AI/ML 示例）
│   ├── ai.js                #   BYOK AI 客户端（浏览器直连，Key 仅存本地）
│   ├── LearningPlanner.jsx  #   React 组件 + 手写 SVG 热力图，自带样式
│   ├── bootstrap.jsx        #   独立页打包入口
│   ├── calc.test.js         #   单元测试（node --test）
│   ├── index.html           #   学习站的独立演示页（加载 dist/learning.js）
│   └── README.md            #   模块集成说明与函数 I/O
├── fitness/                  # 💪 健身训练规划模块
│   ├── calc.js              #   纯函数（1RM/容量/按肌群/最佳与走势/频率/活跃度），可单测
│   ├── exercises.js         #   内置动作库 + 训练计划模板（推/拉/腿等）
│   ├── FitnessPlanner.jsx   #   React 组件 + 手写 SVG（1RM 折线/热力图），自带样式
│   ├── bootstrap.jsx        #   独立页打包入口
│   ├── calc.test.js         #   单元测试（node --test）
│   ├── index.html           #   健身的独立演示页（加载 dist/fitness.js）
│   └── README.md            #   模块集成说明与函数 I/O
├── project/                  # 📋 项目规划模块（任务 / 人力甘特 / 番茄专注）
│   ├── calc.js              #   纯函数（任务分桶/甘特布局/番茄统计），可单测
│   ├── ProjectPlanner.jsx   #   React 组件（三视图 + 手写甘特/番茄钟），自带样式
│   ├── bootstrap.jsx        #   独立页打包入口
│   ├── calc.test.js         #   单元测试（node --test）
│   ├── index.html           #   项目规划的独立演示页（加载 dist/project.js）
│   └── README.md            #   模块集成说明与函数 I/O
├── stocks/                   # 📈 股市观测模块（StockWatch.jsx + api.js 数据适配层）
├── savings/                  # 💰 财富规划模块
│   ├── calc.js              #   纯函数计算逻辑（不依赖 UI，可单测）
│   ├── SavingsPlanner.jsx   #   React 组件 + 手写 SVG 图表，自带样式
│   ├── bootstrap.jsx        #   独立页打包入口
│   ├── calc.test.js         #   单元测试（node --test）
│   ├── index.html           #   财富规划器的独立演示页（加载 dist/savings.js）
│   └── README.md            #   模块集成说明与函数 I/O
├── sync/                     # ☁️ Google Drive 云同步（无后端）
│   ├── backup.js            #   备份采集/恢复 + Drive multipart 构造（纯函数，可单测）
│   ├── drive.js             #   浏览器侧 OAuth(GIS) + Drive REST（可见文件夹/多文件，drive.file）
│   ├── backup.test.js       #   单元测试（node --test）
│   └── README.md            #   一次性 OAuth 配置 + 安全说明
├── dist/                     # 打包产物（提交入库，Pages 直接部署）
│   ├── app.js               #   主应用 bundle（含 React）
│   ├── schedule.js / goals.js / habits.js  # 核心三块独立页 bundle
│   ├── learning.js          #   学习站 bundle（含 React）
│   ├── fitness.js           #   健身 bundle（含 React）
│   └── savings.js           #   财富规划器 bundle（含 React）
├── scripts/build.mjs         # esbuild 打包脚本
└── .github/workflows/        # GitHub Pages 自动部署（static，整仓库原样上传）
```

## 🚀 运行

直接通过 **HTTP** 打开即可（不能 `file://` 直接双击，因为用了 ES Module）：

```bash
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000/
```

部署到 GitHub Pages 后直接访问站点首页；各模块也有独立演示页：日程 `/schedule/`、目标 `/goals/`、习惯 `/habits/`、学习站 `/learning/`、健身 `/fitness/`、项目规划 `/project/`、财富规划器 `/savings/`。

### 🔧 修改源码后重新打包

改动任何 `.jsx` 或 `calc.js` 后，需重新生成 `dist/`：

```bash
npm install --no-save esbuild react@18.3.1 react-dom@18.3.1
node scripts/build.mjs        # 产出 dist/{app,learning,fitness,project,savings,schedule,goals,habits}.js
```

## 🧪 测试

学习站、健身、财富、项目规划的计算逻辑均有完整单元测试：

```bash
cd learning && node --test    # 间隔复习/进度/连续天数/活跃度/模板/AI 解析/分享码/格式化 + AI 配置（32 个用例）
cd fitness  && node --test    # 1RM/容量/按肌群/最佳与走势/训练频率/格式化（11 个用例）
cd savings  && node --test    # 税率表/换算/预算/复利/净资产/体检/格式化 + 蒙特卡洛（25 个用例）
cd project  && node --test    # 任务分桶/甘特布局/番茄统计/日期与格式化（12 个用例）
cd sync     && node --test    # 备份采集/恢复/文件名映射/multipart 构造（11 个用例）
cd core     && node --test    # 共享日期工具 + 带版本迁移的存储（22 个用例）
cd goals    && node --test    # 目标进度/达成/截止状态/排序（11 个用例）
cd habits   && node --test    # 连续打卡/最长/完成率/热力图/健身联动（15 个用例）
cd schedule && node --test    # 日/周分组/今日分桶/逾期统计（5 个用例）
```

## 📂 数据存储与备份

数据保存在浏览器 **localStorage**（按模块分键，与历史版本兼容，旧数据不丢）：
- `planning_personal` — 个人规划清单
- `planning_learning` / `planning_fitness` — 旧版学习/健身待办（保留以兼容历史备份）
- `learning-planner` — AI 学习计划站数据（计划 / 学习记录 / 设置）
- `learning-ai` — 学习站的 AI 配置（含 API Key）。**故意不纳入备份**，避免随分享外泄
- `fitness-planner` — 健身训练规划数据（计划 / 训练记录 / 设置）
- `savings-planner` — 财富规划器输入（含净资产快照）
- `stocks-watch` — 股市观测自选清单与设置
- `project-planner` — 项目规划数据（任务 / 专注记录 / 番茄设置）
- `schedule-planner` — 日程安排（按日/周事项），结构带版本号 `v`
- `goals-planner` — 目标进度（目标 / 子任务 / 数值指标），结构带版本号 `v`
- `habits-planner` — 习惯打卡（习惯定义 / 打卡记录），结构带版本号 `v`
- `sync-client-id` / `sync-auto` / `sync-sig` / `sync-filesigs` — 云同步的本机配置（Client ID / 自动开关 / 内容签名）；**仅本机，不纳入备份与同步**

> 日常核心三块（日程/目标/习惯）的数据结构带版本号 `v`，经 `core/store.js` 的 `migrate` 做向后兼容迁移；新增字段不会破坏旧数据。

侧边栏底部可**一键导出/导入备份**，或接入 **Google Drive 云同步**：浏览器侧 OAuth、最小权限 `drive.file`，
数据写进你自己 Drive 里一个**可见文件夹**「成长规划 (g-lab)」、**每个模块一个 JSON 文件 + 说明.txt**（可自行浏览/备份/编辑），**无后端**。
勾选「自动同步」后只把改动了的文件防抖上传、连接时按内容签名三向对账（详见 [`sync/README.md`](sync/README.md)）。备份与同步内容均**不含 AI Key**。

## 🛠️ 技术说明

- React 18（函数式组件 + hooks），esbuild 预打包成自托管单文件，**无外部 CDN、无运行时转译**
- 计算逻辑与 UI 解耦，纯函数可独立测试与复用
- 图表为**手写 SVG**，不依赖任何图表库
- 统一设计语言：Claude.ai 式暖色编辑风（暖纸色背景 + 陶土橙 + 衬线标题，克制留白）

## 🎨 设计风格

视觉风格已沉淀为可复用的设计指南，供协作者 / 其他 agent 参照：
- 中文：[`DESIGN.md`](DESIGN.md)
- English：[`DESIGN.en.md`](DESIGN.en.md)

## 💡 后续计划

- [x] 学习站：计划分享链接 / 分享码，一键导入（无需 Key）
- [x] 健身升级为正经训练规划（动作库 / 组数 / 重量 / 1RM / 容量）
- [x] 学习站 AI 后端代理（Cloudflare Worker，把 Key 放服务端，公开让别人也能用 AI）
- [x] Google Drive 云同步（可见文件夹 / 每模块一个 JSON 文件，`drive.file` 最小权限、无后端、可自管）
- [x] 自动同步（连接时按内容签名三向对账 + 改动防抖自动上传 + token 静默续期）
- [x] 财富规划压力测试（蒙特卡洛：达成概率 + 可悬停 P10/P50/P90 扇形带 + 结果直方图）
- [x] 项目规划模块（共享任务模型 → 日程分桶 / 人力甘特 / 番茄专注）
- [ ] 多用户账号体系（云端存数据，真正的多人各自进度）
- [ ] 提醒与通知（每日学习 / 到期复习 / 训练日）

---

**开始你的成长规划之旅吧！** 🚀

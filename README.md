# 🎯 个人成长规划系统 (Personal Growth Planner)

一个统一风格的单页 Web 应用，把个人规划、学习规划、健身规划与**财富规划**整合在同一个外壳里，
浅色卡片式设计、蓝绿配色、数据可视化，移动端友好。零构建、纯前端、数据存于浏览器。

## 📋 功能模块

### 1. 📝 个人规划
待办事项的添加、勾选完成、编辑、删除，回车快速录入，完成进度统计。

### 2. 📚 学习规划
学习目标与课程进度追踪，交互同上。

### 3. 💪 健身规划
健身计划制定与追踪，交互同上。

### 4. 💰 财富规划
面向一线城市家庭（可双人）的交互式储蓄规划器：
- **税前→税后换算**：中国个税年度税率表近似 + 可调五险一金 + 专项附加扣除
- **收支与储蓄率**：双人收入、12~18 薪、各项支出，实时储蓄率
- **投资配置**：多资产占比/年化滑块，自动加权综合年化
- **复利预测**：达成目标所需年数 + 手写 SVG 资产增长曲线（本金线/目标线/悬停数值）+ 敏感性测试

> 💡 财富规划由独立的 React 组件 `savings/SavingsPlanner.jsx` + 纯函数计算 `savings/calc.js` 提供，
> 既被主应用集成，也可单独运行。详见 [`savings/README.md`](savings/README.md)。

### 5. 📈 股市观测
自选股清单 + 实时行情观测（手写 SVG 迷你走势图、涨跌配色可切换 红涨绿跌/绿涨红跌）。
- **数据源**（设置里切换）：
  - 演示数据（默认，确定性合成，始终可用）
  - **行情代理**：自建 Cloudflare Worker 转发 Yahoo，覆盖**美股 / A股(.SS·.SZ) / 港股(.HK)** 且带走势图，免费、无需 key（部署见 [`stocks/proxy/README.md`](stocks/proxy/README.md)）
  - Finnhub：填自己的免费 key（仅存本机），美股实时但免费版无历史走势
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
│   ├── main.jsx             # 主应用：侧边栏导航 + 通用清单模块 + 数据导出/导入
│   └── bootstrap.jsx        # 打包入口（挂载 React）
├── stocks/                   # 📈 股市观测模块（StockWatch.jsx + api.js 数据适配层）
├── savings/                  # 💰 财富规划模块
│   ├── calc.js              #   纯函数计算逻辑（不依赖 UI，可单测）
│   ├── SavingsPlanner.jsx   #   React 组件 + 手写 SVG 图表，自带样式
│   ├── bootstrap.jsx        #   独立页打包入口
│   ├── calc.test.js         #   单元测试（node --test）
│   ├── index.html           #   财富规划器的独立演示页（加载 dist/savings.js）
│   └── README.md            #   模块集成说明与函数 I/O
├── dist/                     # 打包产物（提交入库，Pages 直接部署）
│   ├── app.js               #   主应用 bundle（含 React）
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

部署到 GitHub Pages 后直接访问站点首页；财富规划器独立演示在 `/savings/`。

### 🔧 修改源码后重新打包

改动任何 `.jsx` 或 `calc.js` 后，需重新生成 `dist/`：

```bash
npm install --no-save esbuild react@18.3.1 react-dom@18.3.1
node scripts/build.mjs        # 产出 dist/app.js、dist/savings.js
```

## 🧪 测试

财富规划的计算逻辑有完整单元测试：

```bash
cd savings && node --test     # 税率表/换算/预算/加权/复利/达成年数/格式化，全部通过
```

## 📂 数据存储与备份

数据保存在浏览器 **localStorage**（按模块分键，与历史版本兼容，旧数据不丢）：
- `planning_personal` / `planning_learning` / `planning_fitness` — 三个清单模块
- `savings-planner` — 财富规划器输入

侧边栏底部可**一键导出/导入备份**（一个 JSON 涵盖全部模块），便于跨设备/浏览器迁移。

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

- [ ] 趋势/分类统计图表
- [ ] 待办优先级与截止日期
- [ ] 提醒与通知
- [ ] 云端同步（可选）

---

**开始你的成长规划之旅吧！** 🚀

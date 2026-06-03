# 🎯 个人成长规划系统 (Personal Growth Planner)

一个统一风格的单页 Web 应用，把个人规划、**AI 学习计划站**、健身规划与**财富规划**整合在同一个外壳里，
暖纸色 + 陶土橙配色（Claude.ai 风格）、衬线标题、数据可视化，移动端友好。纯前端、数据存于浏览器。

## 📋 功能模块

### 1. 📝 个人规划
待办事项的添加、勾选完成、编辑、删除，回车快速录入，完成进度统计。

### 2. 📚 AI 学习计划站
一个「能在上面真正学习」的通用学习站（主题不限：编程 / 语言 / 考证 / 读书…）：
- **今日**：连续学习天数 / 今日时长 / 总进度 / 待复习；番茄计时器一键记录；**间隔复习（SM-2）**队列与「继续学习」队列
- **我的计划**：从内置模板（含一条示例 **AI/ML 学习路径**）/ AI 生成 / 空白创建；逐知识点追踪「未开始 / 学习中 / 已掌握」，记笔记、加资源、让 AI 讲解；一键导出某计划即一份可分享课程
- **统计**：手写 SVG **学习热力图** + 各计划进度 + 未来 7 天复习分布
- **AI 为可选增强（BYOK）**：默认全离线可用；填入你自己的 API Key（仅存本地浏览器、直连模型厂商）后解锁「AI 生成计划 / AI 讲解」

> 💡 学习站由独立模块 `learning/`（`LearningPlanner.jsx` + 纯函数 `calc.js` + 模板 `templates.js` + AI 客户端 `ai.js`）提供，
> 既被主应用集成，也可单独运行。详见 [`learning/README.md`](learning/README.md)。

### 3. 💪 健身规划
健身计划制定与追踪，待办清单式交互。

### 4. 💰 财富规划
面向一线城市家庭（可双人）的交互式储蓄规划器：
- **税前→税后换算**：中国个税年度税率表近似 + 可调五险一金 + 专项附加扣除
- **收支与储蓄率**：双人收入、12~18 薪、各项支出，实时储蓄率
- **投资配置**：多资产占比/年化滑块，自动加权综合年化
- **复利预测**：达成目标所需年数 + 手写 SVG 资产增长曲线（本金线/目标线/悬停数值）+ 敏感性测试

> 💡 财富规划由独立的 React 组件 `savings/SavingsPlanner.jsx` + 纯函数计算 `savings/calc.js` 提供，
> 既被主应用集成，也可单独运行。详见 [`savings/README.md`](savings/README.md)。

## 🏗️ 项目结构

React 单页应用（函数式 + hooks）。源码为 `.jsx`，用 esbuild 预打包成**自托管的单文件 bundle**
（React 一起打进去），页面只从同源加载一个 JS，**不依赖任何外部 CDN、也没有运行时转译**，加载快。

```
g-lab/
├── README.md
├── index.html                # 应用外壳：全局样式 + 加载 dist/app.js
├── favicon.svg               # 站点图标
├── app/
│   ├── main.jsx             # 主应用：侧边栏导航 + 通用清单模块，集成学习站与财富规划
│   └── bootstrap.jsx        # 打包入口（挂载 React）
├── learning/                 # 📚 AI 学习计划站模块
│   ├── calc.js              #   纯函数（间隔复习/进度/连续天数/活跃度/AI 解析），可单测
│   ├── templates.js         #   内置学习计划模板库（通用 + AI/ML 示例）
│   ├── ai.js                #   BYOK AI 客户端（浏览器直连，Key 仅存本地）
│   ├── LearningPlanner.jsx  #   React 组件 + 手写 SVG 热力图，自带样式
│   ├── bootstrap.jsx        #   独立页打包入口
│   ├── calc.test.js         #   单元测试（node --test）
│   ├── index.html           #   学习站的独立演示页（加载 dist/learning.js）
│   └── README.md            #   模块集成说明与函数 I/O
├── savings/                  # 💰 财富规划模块
│   ├── calc.js              #   纯函数计算逻辑（不依赖 UI，可单测）
│   ├── SavingsPlanner.jsx   #   React 组件 + 手写 SVG 图表，自带样式
│   ├── bootstrap.jsx        #   独立页打包入口
│   ├── calc.test.js         #   单元测试（node --test）
│   ├── index.html           #   财富规划器的独立演示页（加载 dist/savings.js）
│   └── README.md            #   模块集成说明与函数 I/O
├── dist/                     # 打包产物（提交入库，Pages 直接部署）
│   ├── app.js               #   主应用 bundle（含 React）
│   ├── learning.js          #   学习站 bundle（含 React）
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

部署到 GitHub Pages 后直接访问站点首页；学习站独立演示在 `/learning/`，财富规划器在 `/savings/`。

### 🔧 修改源码后重新打包

改动任何 `.jsx` 或 `calc.js` 后，需重新生成 `dist/`：

```bash
npm install --no-save esbuild react@18.3.1 react-dom@18.3.1
node scripts/build.mjs        # 产出 dist/app.js、dist/learning.js、dist/savings.js
```

## 🧪 测试

学习站与财富规划的计算逻辑均有完整单元测试：

```bash
cd learning && node --test    # 间隔复习/进度/连续天数/活跃度/模板/AI 解析/格式化（24 个用例）
cd savings  && node --test    # 税率表/换算/预算/加权/复利/达成年数/格式化
```

## 📂 数据存储与备份

数据保存在浏览器 **localStorage**（按模块分键，与历史版本兼容，旧数据不丢）：
- `planning_personal` / `planning_fitness` — 个人 / 健身清单模块
- `planning_learning` — 旧版学习待办（保留以兼容历史备份）
- `learning-planner` — AI 学习计划站数据（计划 / 学习记录 / 设置）
- `learning-ai` — 学习站的 AI 配置（含 API Key）。**故意不纳入备份**，避免随分享外泄
- `savings-planner` — 财富规划器输入

侧边栏底部可**一键导出/导入备份**（一个 JSON 涵盖各模块数据，不含 AI Key），便于跨设备/浏览器迁移。

## 🛠️ 技术说明

- React 18（函数式组件 + hooks），esbuild 预打包成自托管单文件，**无外部 CDN、无运行时转译**
- 计算逻辑与 UI 解耦，纯函数可独立测试与复用
- 图表为**手写 SVG**，不依赖任何图表库
- 统一设计语言：浅色卡片、蓝绿配色、圆角、徽章、进度条

## 💡 后续计划

- [ ] 学习站：多用户 / 后端代理（把 AI Key 放服务端，公开让别人也能来学）
- [ ] 学习站：计划在线分享与一键导入（无需 Key 即可复用别人的课程）
- [ ] 健身模块升级为正经训练规划（动作库 / 组数 / 重量 / 进度）
- [ ] 提醒与通知（每日学习 / 到期复习）
- [ ] 云端同步（可选）

---

**开始你的成长规划之旅吧！** 🚀

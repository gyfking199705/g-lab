# 🔬 研发提效研究室 · devx-lab

> g-lab 的子项目。收集**业界都在用、且被研究验证有效**的研发提效范式，对齐 DORA / SPACE / DevEx
> 等公认框架——做到**可检索、可对标、可自评**。纯前端、无后端，数据存本地浏览器。

在线路径：`…/g-lab/projects/devx-lab/`

## 它有什么

三个标签页：

1. **提效范式库** —— 跨 8 个类别（AI 辅助研发 / 持续交付 / 代码评审 / 测试质量 / 平台工程 /
   协作流程 / 度量反馈 / 开发者体验）的 20+ 条提效实践。每条标注：
   - **影响 / 成本 / 采用度**（1–5）与「性价比」(影响÷成本)
   - 它**对齐哪个业界框架**（点击徽章可按框架筛选）
   - **怎么落地**（步骤）、**关注什么信号**、以及**一手来源链接**
   - 支持关键词搜索、类别/框架筛选、多种排序、★ 收藏（存本地）
2. **业界框架** —— DORA、SPACE、DevEx、DX Core 4、Team Topologies、Platform Engineering
   六个框架的速览：核心维度、提出者、年份与原始资料链接。
3. **DORA 自评** —— 用 DORA 四项指标（部署频率 / 变更前置时间 / 变更失败率 / 故障恢复时间）
   各选一档，即时算出综合评级（Elite / High / Medium / Low）并用手写 SVG 仪表盘展示。
   **口径取自业界 State of DevOps 通用分级，仅用于团队自我对标，非个人考核。**

## 为什么「符合业界标准」

范式不是拍脑袋，每条都锚定公开、权威的一手资料：

- **DORA / State of DevOps** — <https://dora.dev/>
- **SPACE**（ACM Queue, 2021）— <https://queue.acm.org/detail.cfm?id=3454124>
- **DevEx**（ACM Queue, 2023）— <https://queue.acm.org/detail.cfm?id=3595878>
- **DX Core 4** — <https://getdx.com/research/measuring-developer-productivity-with-the-dx-core-4/>
- **Team Topologies** — <https://teamtopologies.com/>
- **CNCF Platforms White Paper** — <https://tag-app-delivery.cncf.io/whitepapers/platforms/>
- 以及 Google Eng Practices、Trunk-Based Development、12-Factor、Conventional Commits、
  Semantic Versioning、OpenTelemetry、Backstage 等业界标准。

## 结构

```
devx-lab/
├── index.html         # 独立演示页（加载自托管 app.js）
├── app.js             # esbuild 打包产物（含 React，入库自托管）
├── build.mjs          # 打包脚本
├── bootstrap.jsx      # 打包入口
├── DevxLab.jsx        # 主壳（hero + 三个标签页）
├── Practices.jsx      # 范式库视图
├── Frameworks.jsx     # 业界框架视图
├── Assessment.jsx     # DORA 自评视图（含 SVG 仪表盘）
├── data.js            # 纯数据：范式库 + 框架 + DORA 分级口径
├── calc.js            # 纯逻辑：筛选/排序/统计/DORA 评级
├── calc.test.js       # node --test 单测
├── styles.js          # 全站样式（遵循 g-lab DESIGN.md）
└── store.js           # localStorage 持久化（收藏 / 自评，仅本地）
```

逻辑（`calc.js` 纯函数）与 UI（`*.jsx`）解耦，图表为手写 SVG，不引图表库。

## 本地开发

```bash
# 跑纯逻辑单测
cd projects/devx-lab && node --test

# 改完重新打包（会把 ?v=hash 写回 index.html）
npm i --no-save esbuild react@18.3.1 react-dom@18.3.1 && node build.mjs

# 预览（需经 HTTP，不能 file:// 双击）
cd ../.. && python3 -m http.server 8000
# 然后访问 http://localhost:8000/projects/devx-lab/
```

> 数据与收藏只存在浏览器 `localStorage`，不上传、无后端。新增范式：在 `data.js` 的 `PRACTICES`
> 里加一条（带 `sources` 来源），跑单测再 `node build.mjs` 重打包即可。

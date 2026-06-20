# 🔬 研发提效研究室 · devx-lab

> g-lab 的子项目。收集**业界都在用、且被研究验证有效**的研发提效范式，对齐 DORA / SPACE / DevEx
> 等公认框架——做到**可检索、可对标、可自评**。纯前端、无后端，数据存本地浏览器。

在线路径：`…/g-lab/projects/devx-lab/`

## 它有什么

六个标签页：

1. **提效范式库** —— 跨 8 个类别（AI 辅助研发 / 持续交付 / 代码评审 / 测试质量 / 平台工程 /
   协作流程 / 度量反馈 / 开发者体验）的 34 条提效实践。每条标注：
   - **影响 / 成本 / 采用度**（1–5）与「性价比」(影响÷成本)
   - 它**对齐哪个业界框架**（点击徽章可按框架筛选）
   - **怎么落地**（步骤）、**关注什么信号**、以及**一手来源链接**
   - 支持关键词搜索、类别/框架筛选、多种排序、★ 收藏（存本地）
   - **采纳追踪**：每条范式可标记 `未开始 / 进行中 / 已落地`（存本地），hero 顶部显示
     团队整体落地进度条，并可「按状态」筛选——把图鉴变成可追踪的落地清单。
2. **反模式** —— 与范式相对的一面：业界公认的「效能杀手」（英雄主义/救火、长期分支、手工发布、
   会议过载、单指标考核、雪花服务器、巨型 PR、不稳定测试、评审瓶颈、重复手工劳动…），每个给
   症状/危害，并把「解药」链到范式库对应条目，正反对照、点击可跳转。
3. **业界框架** —— DORA、SPACE、DevEx、DX Core 4、Team Topologies、Platform Engineering
   六个框架的速览：核心维度、提出者、年份与原始资料链接。每个框架还显示**覆盖度**
   （对齐了多少条范式、其中已落地/进行中几条），把落地进度按框架维度聚合。
4. **DORA 自评** —— 用 DORA 四项指标（部署频率 / 变更前置时间 / 变更失败率 / 故障恢复时间）
   各选一档，即时算出综合评级（Elite / High / Medium / Low）并用手写 SVG 仪表盘展示，
   支持**一键复制 Markdown 结果**贴进周报/文档。
   **口径取自业界 State of DevOps 通用分级，仅用于团队自我对标，非个人考核。**

5. **落地路线** —— 把诊断变成有先后的行动计划：
   - **处方建议**：读 DORA 自评结果，针对落到 Medium/Low 的薄弱指标，推荐能提升它、
     且尚未落地的范式（按性价比排序，点一下即跳到范式库对应条目）。
   - **建议落地顺序**：按范式之间的前置依赖（如「主干开发」依赖「CI/CD」）做拓扑排序，
     分成「第 1 批 / 第 2 批…」，先打地基再逐层往上。
6. **团队画像** —— 手写 SVG **雷达图**按 8 个能力类别画出团队画像（已落地% 实心 + 含进行中% 浅色
   两条序列），一眼看强弱项；并可**一键生成《团队研发提效报告》**（聚合 DORA 评级、采纳总览、
   能力画像、框架覆盖度、优先处方），复制或下载为 Markdown 分享给管理层。
   还可**保存进度快照**（落地率 + DORA 评分），用手写 SVG 折线看二者随时间的趋势——让持续改进看得见。

底部「我的数据」栏可把收藏 / 采纳状态 / 自评**导出为 JSON 备份**，或**导入**他人分享的快照
（团队间共享落地清单）。所有数据仅存浏览器 `localStorage`，不上传。

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
├── DevxLab.jsx        # 主壳（hero + 六个标签页）
├── Practices.jsx      # 范式库视图
├── AntiPatterns.jsx   # 反模式视图（效能杀手 + 解药链接）
├── Frameworks.jsx     # 业界框架视图
├── Assessment.jsx     # DORA 自评视图（含 SVG 仪表盘）
├── Roadmap.jsx        # 落地路线视图（处方建议 + 拓扑落地顺序）
├── Profile.jsx        # 团队画像视图（SVG 雷达图 + 一键提效报告）
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

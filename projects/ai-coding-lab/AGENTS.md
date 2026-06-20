# AGENTS.md — AI Coding 研究室（ai-coding-lab）工作约定

> 在本子项目里工作的 AI agent 请先读本文件。
> 它说明：这是什么、目录怎么分、数据结构长什么样、如何新增/修改一条实践、提交前必须过哪些关。
> 上层约定见仓库根 [`/AGENTS.md`](../../AGENTS.md)，视觉规范见 [`/DESIGN.md`](../../DESIGN.md)，更详细的人类向说明见同目录 [`README.md`](README.md)。

## 这是什么

`ai-coding-lab` 是一个**收集、提炼并展示「业界正在用的 AI 编程范式与提效方式」**的纯前端知识库站点。
核心资产是一份结构化数据 `data/practices.js`（当前 70+ 条，以文件为准），UI 只是它的浏览器。
**绝大多数贡献 = 往 `data/practices.js` 增删改条目**，几乎不需要动 UI。

## 目录与职责

```
ai-coding-lab/
├── AGENTS.md            # 你正在读的这份（agent 工作约定）
├── README.md            # 人类向说明（更详细的背景与命令）
├── index.html           # 独立演示页，加载 ./dist/app.js?v=<hash>
├── favicon.svg
├── build.mjs            # esbuild 打包脚本：src + data → dist/app.js，并写入 index.html 的 ?v= 缓存号
├── package.json         # { "type": "module" }
├── data/
│   └── practices.js     # ★ 知识库数据（纯数据，无依赖，可被 Node 直接 import / 单测）★
├── src/
│   ├── bootstrap.jsx    # 打包入口（挂载 React）
│   ├── App.jsx          # 主界面（卡片网格 / 详情抽屉 / 筛选 / 搜索 / 排序 / 视图切换）
│   ├── MatrixChart.jsx  # 「影响力 × 落地成本」四象限散点图（手写 SVG）
│   ├── style.js         # 内联样式（遵循 /DESIGN.md 的设计令牌）
│   ├── filter.js        # ★ 纯逻辑：搜索 / 筛选 / 排序 / 统计（无 React/DOM 依赖）★
│   └── filter.test.js   # node --test 单测（含「数据集健全性检查」）
└── dist/
    └── app.js           # 打包产物（入库，GitHub Pages 自托管；改完必须重建并提交）
```

逻辑（`filter.js` 纯函数 + `data/practices.js` 纯数据）与 UI（`*.jsx`）**解耦**。能放进纯数据/纯函数的就别写进组件。

## 数据模型（`data/practices.js`）

文件导出三样东西：`CATEGORIES`、`MATURITY` / `LEVEL`（枚举元数据）、`ITEMS`（条目数组）。
**每个条目的标准结构（字段全部必填，除非标注可选）：**

```js
{
  id: 'kebab-case-unique',        // 唯一、稳定、kebab-case；勿与现有重复
  title: '中文名 (English Name)',  // 中文为主，括号给业界英文术语
  category: 'paradigm' | 'workflow' | 'technique' | 'tooling' | 'guardrail',
  summary: '一句话讲清这是什么（卡片正面展示）',
  why: '为什么有效 / 解决什么根本问题（详情页展示）',
  how: ['可操作步骤1', '步骤2', ...],   // ≥ 2 步，动词开头，具体可落地
  whenToUse: '何时该用（适用场景）',     // 可选但强烈建议
  pitfalls: ['常见坑1', '反模式2', ...], // 可选但强烈建议；详情页带 ⚠ 展示
  tags: ['lowercase', 'kebab'],         // 小写标签，复用已有标签优先（见下）
  maturity: 'emerging' | 'growing' | 'established',  // 成熟度
  impact: 'low' | 'medium' | 'high',                 // 提效/质量提升幅度
  effort: 'low' | 'medium' | 'high',                 // 团队落地成本
  refs: [{ label: '出处名', url: 'https://…' }],      // ≥ 1 条，必须是真实可达的权威链接
}
```

### 五大类（`category`）口径
- `paradigm` 范式 🧭 —— 高层方法论：决定「人与 AI 如何分工」的根本姿势。
- `workflow` 工作流 🔁 —— 把范式落到日常协作的可重复流程。
- `technique` 提效技巧 ⚡ —— 具体、可立即上手的操作手法。
- `tooling` 工具与生态 🧰 —— 支撑 AI Coding 的标准、协议与工具类别。
- `guardrail` 质量与护栏 🛡️ —— 保证速度不牺牲安全、正确性与可维护性。

### 评级口径（保持克制、可横向比较）
- `maturity`：`emerging` 萌芽 / `growing` 成长 / `established` 成熟（业界默认实践）。
- `impact` / `effort`：`low` / `medium` / `high`。UI 会用 `impact - effort` 算「性价比」排序，所以**别虚标**——评级是这个项目的可信度根基。

## 怎么新增 / 修改一条实践（最常见任务）

1. 打开 `data/practices.js`，在对应**分类分组的注释块**下追加一个条目对象（保持文件的分组与缩进风格）。
2. 沿用上面的完整结构；`how` ≥ 2 步、`refs` ≥ 1 条真实链接、`id` 唯一。
3. 内容用**中文**，术语括注英文；语气克制、信息密度高，不写营销话术。
4. 跑测试（含数据健全性检查会校验字段/枚举/唯一 id/refs URL）：
   ```bash
   cd projects/ai-coding-lab && node --test
   ```
5. 重建产物并校验缓存号：
   ```bash
   npm i --no-save esbuild react@18.3.1 react-dom@18.3.1   # 若 node_modules 不在
   node build.mjs
   ```
6. 提交 `data/practices.js` + `dist/app.js` + `index.html`（三者一起，缺一不可）。

### 复制即用模板
```js
{
  id: '',
  title: ' ()',
  category: 'technique',
  summary: '',
  why: '',
  how: ['', ''],
  whenToUse: '',
  pitfalls: [''],
  tags: [''],
  maturity: 'growing', impact: 'medium', effort: 'low',
  refs: [{ label: '', url: 'https://' }],
}
```

## 标签（`tags`）约定
- 小写、简短、kebab-case；**优先复用已有标签**而非造新词（同义合并，避免碎片化）。
- 想看现有标签及频次：
  ```bash
  node -e "import('./data/practices.js').then(m=>{const c={};m.ITEMS.forEach(i=>i.tags.forEach(t=>c[t]=(c[t]||0)+1));console.log(Object.entries(c).sort((a,b)=>b[1]-a[1]))})"
  ```

## 必须遵守（提交前自检）
1. **`node --test` 全绿**：`filter.test.js` 里的「数据集健全性检查」会拦截缺字段、非法枚举、重复 id、非 `http(s)` 的 refs。
2. **改完必重建并提交 `dist/app.js`**：`node build.mjs` 会同时把内容哈希写进 `index.html` 的 `?v=`；确认两者一致（`?v=<hash>` == bundle 的 sha1 前 10 位）。
3. **跟随 [`/DESIGN.md`](../../DESIGN.md)**：暖纸色 `#F6F5F0` + 陶土橙 `#CC785C`、衬线标题、发丝级边框、几乎无阴影、克制留白；**图表手写 SVG，不引图表库**。
4. **无外部 CDN / 无运行时转译**：React 18 + esbuild 预打包成自托管单文件；样式走 `style.js` 的设计令牌，类名前缀统一 `acl-`。
5. **无后端、不入库密钥**：本页纯静态、不收集数据；任何示例都不要写入真实密钥或私密数据。
6. **`refs` 必须真实**：只放确实存在、权威、稳定的链接（厂商工程博客、开放标准、官方文档）。宁缺毋造。

## 改 UI / 逻辑时（较少见）
- 纯逻辑（搜索/筛选/排序/统计）放 `filter.js`，并在 `filter.test.js` 补测试；别把可单测的逻辑塞进组件。
- 新增可视化用**手写 SVG**（参考 `MatrixChart.jsx`），不引图表库。
- 颜色/间距/字体走 `style.js` 既有令牌，保持与 `/DESIGN.md` 一致。

## 验证命令速查
```bash
cd projects/ai-coding-lab
node --test                                              # 逻辑 + 数据健全性单测
npm i --no-save esbuild react@18.3.1 react-dom@18.3.1    # 装打包依赖（gitignore，不入库）
node build.mjs                                           # 重建 dist/app.js + 写 ?v= 缓存号
node -e "import('./data/practices.js').then(m=>console.log('条目数:',m.ITEMS.length))"
# 本地预览（需经 HTTP，不能 file://）：在仓库根 python3 -m http.server 8000
#   → http://localhost:8000/projects/ai-coding-lab/
```

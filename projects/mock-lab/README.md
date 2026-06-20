# 🧪 Mock 研究室 (mock-lab)

> 收集、提炼并**展示**业界优秀的 **Mock 系统**与**提效方式**，并配一个**配置工坊**：
> 定义一次，一键生成**可快速接入、可植入**的 mock 配置与代码——尤其是 **Python**，
> 支持**本地或远端配置**灵活切换 mock 与真实。
> g-lab 伞形 monorepo 下的一个自包含子项目，纯前端、无后端，部署于 GitHub Pages。

在线路径：`…/g-lab/projects/mock-lab/`

## 它解决什么

mock / 服务虚拟化的工具与玩法很多，但信息碎片、上手成本不一。本研究室做两件事：

1. **研究室（Gallery）**——把散落的厂商/社区实践沉淀成一份**可检索、可对比、带出处**的中文知识库：
   - **五大类**：范式 🧭 · Mock 服务 🖥️ · Python 接入 🐍 · 提效技巧 ⚡ · 质量护栏 🛡️
   - **每条结构化**：为什么有效 / 怎么落地 / 何时用 / 常见坑 / 成熟度 / 影响力 / 落地成本 / 权威出处
   - **两种展示**：卡片网格 + 「影响力 × 落地成本」四象限散点图（手写 SVG）
   - 覆盖 WireMock / Mockoon / Prism / MockServer / json-server / Hoverfly，以及 Python 的
     `unittest.mock` / `pytest-mock` / `responses` / `respx` / `VCR.py` / `moto` / Faker / freezegun 等。

2. **配置工坊（Workshop）**——把「mock 哪些、返回什么」抽成一份统一配置，**即取即用**地生成多端产物：

   | 产物 | 用途 |
   | --- | --- |
   | **g-mock 配置**（JSON） | 可植入的统一配置，本地文件或远端 URL 都能加载 |
   | **Python · g_mock** | 用内置 `adapters/g_mock.py` 从本地/远端配置一键绑定到 `responses` |
   | **Python · responses** | mock `requests` 的 HTTP 调用，离线、确定、可断言 |
   | **Python · respx** | mock `httpx`（含 async），FastAPI/异步栈首选 |
   | **Python · pytest fixture** | 复用型 `conftest.py` fixture，测试加 `mocked_api` 参数即用 |
   | **Python · requests-mock** | `requests` 的另一主流 mock 库，`Mocker` 上下文注册路由 |
   | **VCR.py 磁带**（JSON） | 手写磁带，`record_mode='none'` 直接离线回放，无需先联网录制 |
   | **WireMock 映射**（JSON） | 独立 mock 服务的 stub，可经 admin API 远端下发 |
   | **OpenAPI 3.1**（JSON） | 业界标准规格，直接喂给 Prism / Mockoon / Microcks 起 mock |

## 可植入适配器：`adapters/g_mock.py`

单文件、零硬依赖加载，把灵活 mock「植入」你的 Python 项目。同一份配置，本地或远端切换：

```python
import os, g_mock

# 本地路径 或 http(s):// 远端 URL，靠环境变量切换，无需改代码
MOCK_SOURCE = os.getenv("MOCK_SOURCE", "mocks/g-mock.json")

def test_calls_external_api():
    with g_mock.bind_responses(MOCK_SOURCE):   # 也有 bind_respx（httpx/async）
        ...  # 调用被测代码；内部 requests 请求会被拦截、按配置离线返回
```

```bash
MOCK_SOURCE=https://config.example.com/g-mock.json pytest   # 远端共享同一套场景
MOCK_SOURCE=mocks/g-mock.json pytest                        # 本地离线
```

配置 schema（g-mock v1，由配置工坊一键生成）：

```json
{
  "version": 1,
  "baseUrl": "https://api.example.com",
  "routes": [
    { "method": "GET", "path": "/users/1", "status": 200, "delayMs": 0,
      "headers": { "Content-Type": "application/json" },
      "body": { "id": 1, "name": "Ada" } }
  ]
}
```

## 目录结构

```
mock-lab/
├── index.html          # 独立演示页（加载 ./dist/app.js）
├── favicon.svg
├── build.mjs           # esbuild 打包脚本（产出自托管单文件 dist/app.js）
├── package.json        # { "type": "module" }
├── adapters/
│   └── g_mock.py       # 可植入的 Python 适配器（本地/远端加载 + 绑定 responses/respx）
├── data/
│   └── systems.js      # 知识库数据（纯数据，无依赖，可被 Node 单测引用）
├── src/
│   ├── bootstrap.jsx   # 打包入口（挂载 React）
│   ├── App.jsx         # 主界面（研究室 + 配置工坊 双 Tab）
│   ├── Workshop.jsx    # 配置工坊（定义路由 → 多端产物）
│   ├── MatrixChart.jsx # 四象限散点图（手写 SVG）
│   ├── style.js        # 内联样式（遵循共享 DESIGN.md）
│   ├── filter.js       # 纯逻辑：筛选 / 搜索 / 排序 / 统计
│   ├── filter.test.js  # node --test 单测
│   ├── codegen.js      # 纯逻辑：定义 → g-mock/responses/respx/WireMock/OpenAPI
│   └── codegen.test.js # node --test 单测
└── dist/
    └── app.js          # 打包产物（入库，GitHub Pages 自托管）
```

逻辑（`filter.js` / `codegen.js` 纯函数）与 UI（`*.jsx`）解耦，便于测试与复用；图表手写 SVG，不引图表库。

## 本地预览

```bash
# 在仓库根
python3 -m http.server 8000
# 打开 http://localhost:8000/projects/mock-lab/
```

> 需经 HTTP 访问（ES Module），不能 `file://` 双击。

## 开发与构建

```bash
cd projects/mock-lab
node --test                                  # 跑纯逻辑 + 数据健全性 + 代码生成单测
npm i --no-save esbuild react@18.3.1 react-dom@18.3.1
node build.mjs                               # 重建 dist/app.js 并写入 index.html 的 ?v= 缓存号
```

改完源码（`data/` 或 `src/`）务必重新 `node build.mjs` 并提交 `dist/app.js` 与 `index.html`。

## 新增 / 修改一条研究室条目

编辑 `data/systems.js` 的 `ITEMS` 数组，按既有字段补全：

```js
{
  id: 'unique-id',
  title: '名称 (English Name)',
  category: 'paradigm' | 'server' | 'python' | 'technique' | 'guardrail',
  summary: '一句话概括',
  why: '为什么有效',
  how: ['步骤1', '步骤2', ...],   // 至少 2 步
  whenToUse: '何时使用',
  pitfalls: ['坑1', ...],
  tags: ['tag1', 'tag2'],
  maturity: 'emerging' | 'growing' | 'established',
  impact: 'low' | 'medium' | 'high',
  effort: 'low' | 'medium' | 'high',
  refs: [{ label: '出处', url: 'https://…' }],   // 至少 1 条
}
```

`filter.test.js` 含数据健全性检查（必填字段、枚举合法、id 唯一、refs 为合法 URL 等），
`codegen.test.js` 校验各产物可解析、Python 片段结构正确，`node --test` 全绿后再 `node build.mjs` 提交。

## 内容口径

- 评级（成熟度 / 影响力 / 落地成本）保持克制、可横向比较，便于按**性价比**取舍。
- 每条尽量附**权威出处**（厂商工程博客、开放标准、官方文档）。
- 内容仅供参考，领域演进快，请以最新实践为准。

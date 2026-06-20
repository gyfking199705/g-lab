# papers · 论文推荐阅读器

以 **arXiv** 为主的论文推荐 + AI 解读 + 阅读进度追踪。纯前端、无后端。

## 功能

- **推荐**：按你订阅的 arXiv 分类(cs.LG/cs.AI/stat.ML…) + 关键词，拉取最新论文；也支持关键词 / arXiv ID 搜索。
- **AI 总结**：复用学习站的 BYOK AI 客户端(`learning-ai`，一处配置处处可用)，基于论文**摘要**解读「一句话概括 / 解决的问题 / 核心方法 / 结论亮点 / 适合谁读」。
- **进度**：阅读清单(想读/在读/已读)、评分、笔记；已读连续天数、近 7 天读完数、已读分类分布;数据回流首页看板「论文阅读」卡。

> 全文 PDF 解析较重，v1 基于摘要解读(摘要已能判断是否值得精读)。

## 跨域(CORS)

arXiv API 纯前端直连可能被 CORS 拦。`arxiv.js` 沿用股市模块思路：**先直连 → 失败依次走公共 CORS 代理**；也可在「订阅设置」填**自建代理 URL**(最优先)。

## 数据（localStorage 键 `papers-planner`）

```js
{
  v: 1,
  settings: { categories:[], keywords:[], maxResults, proxyUrl },
  items: [ { id, title, authors[], summary, categories[], primary, published, updated,
             absUrl, pdfUrl, status:'want'|'reading'|'done', rating?, notes?, aiSummary?, addedAt, doneAt? } ]
}
```

## 文件

| 文件 | 作用 |
| --- | --- |
| `arxiv.js` | arXiv 客户端：`buildQueryUrl` / `parseArxivAtom`(纯，正则解析 Atom) + `fetchArxiv`(CORS 兜底) |
| `calc.js` | 阅读进度纯函数：`statusCounts` / `filterItems` / `readingStreak` / `byCategory` / `summary` / `buildSummaryMessages`(AI prompt) |
| `PapersReader.jsx` | React 组件(推荐 feed / 阅读清单 / AI 总结弹窗 / 设置)，复用 core/ui |

## 运行 / 测试

```bash
node --test papers/arxiv.test.js papers/calc.test.js   # 18 例
# 集成于主应用(侧栏「论文阅读」)；独立演示页 /papers/（先 node scripts/build.mjs）
```

## 免责声明

论文数据来自 arXiv 公开 API；AI 解读由你自配模型生成，可能有误，请以原文为准。

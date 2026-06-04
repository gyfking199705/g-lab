# arXiv 代理（可选，更稳）

纯前端直连 arXiv 常被 CORS 挡，App 会自动尝试公共 CORS 代理兜底；但公共代理偶尔限流/不稳。
部署你自己的免费 Cloudflare Worker 代理可彻底解决，**无后端数据库、无 key、不存数据**。

## 部署（约 2 分钟）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Create Worker**。
2. 把本目录 [`worker.js`](worker.js) 的内容整段粘贴进编辑器，**Deploy**。
3. 复制分配到的地址 `https://<name>.<account>.workers.dev/`。
4. 回到 App「📄 论文阅读 → ⚙ 订阅设置 → 自建代理 URL」粘贴该地址，保存。

之后论文拉取会**优先走你的代理**（直连/公共代理仍作兜底）。

## 契约

```
GET https://<your-worker>.workers.dev/?url=<encodeURIComponent(完整 arXiv API URL)>
→ 原样 Atom XML + CORS 头
```

只允许转发 `export.arxiv.org` / `arxiv.org`，避免被当成开放代理滥用。

> 用 `wrangler` 部署亦可：`wrangler deploy worker.js`（需先 `npm i -g wrangler` 并登录）。

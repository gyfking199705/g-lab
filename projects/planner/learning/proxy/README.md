# 学习站 AI 代理（Cloudflare Worker）

GitHub Pages 没有后端。默认情况下学习站的 AI 是 **BYOK**（每个人填自己的 API Key）。
如果你想 **公开让别人也来学、且不需要他们各自的 Key**，就部署这个 **无状态代理**：
把大模型 Key 放在服务端（Worker Secret），浏览器只调代理。它不存任何数据，只是带 Key 的安全中转 + 补 CORS。

> ⚠️ 代理用的是**你的** Key、由**你**付费。强烈建议设置 `ACCESS_TOKEN` 访问口令，避免被陌生人白嫖额度。

## 部署（约 3 分钟，免费额度足够）

### 方式 A：网页控制台（最简单）
1. 登录 <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Create Worker**。
2. 起名（如 `learn-ai-proxy`）→ **Deploy**。
3. **Edit code**，把本目录 [`worker.js`](worker.js) 整段粘贴覆盖 → **Deploy**。
4. **Settings → Variables and Secrets** 添加：
   - `API_KEY`（**Secret**）：你的大模型 Key（Anthropic `sk-ant-...` 或 OpenAI `sk-...`）
   - `PROVIDER`（可选）：`anthropic`（默认）或 `openai`
   - `MODEL`（可选）：如 `claude-sonnet-4-6` / `gpt-4o-mini`
   - `ACCESS_TOKEN`（**Secret**，强烈建议）：自定义一串口令，分享给被允许的学习者
   - `ALLOW_ORIGIN`（可选）：收紧到你的站点，如 `https://<用户名>.github.io`
5. 复制 Worker 地址，形如 `https://learn-ai-proxy.<你的子域>.workers.dev`。

### 方式 B：命令行（wrangler）
```bash
npm i -g wrangler
wrangler login
wrangler deploy worker.js --name learn-ai-proxy --compatibility-date 2024-01-01
# 设置密钥（交互输入）：
wrangler secret put API_KEY
wrangler secret put ACCESS_TOKEN     # 可选但推荐
# 普通变量可在控制台或 wrangler.toml 里设 PROVIDER / MODEL / ALLOW_ORIGIN
```

## 接入学习站
打开「学习站 → ✨ 配置 AI → 模式选**后端代理**」：
- **代理 URL**：填上面的 Worker 地址
- **访问口令**：如果设了 `ACCESS_TOKEN`，把口令填进去
- 点「测试连接」确认通；之后这台浏览器用 AI 就走代理、无需本地 Key

把「站点链接 + 访问口令」发给想来学的人，他们也照此填一次即可——无需各自的大模型 Key。

## 请求契约（便于自测 / 二次开发）
```
POST https://<你的worker>.workers.dev/
Authorization: Bearer <ACCESS_TOKEN>            # 若设置了口令
Content-Type: application/json
{ "system": "你是助教", "user": "用一句话介绍闭包", "max_tokens": 500 }
→ 200 { "text": "……" }
```

## 说明与注意
- `max_tokens` 服务端封顶 4000，避免单次请求过大。
- 代理只转发到固定上游（Anthropic / OpenAI），不是开放代理；但**没有 `ACCESS_TOKEN` 就等于公开可用**，务必设口令。
- Key 仅存在于 Worker Secret，不会下发到浏览器、也不进任何备份。
- 免费版 Worker 每天有请求额度；超量或滥用风险由口令 + 上游用量上限共同控制。

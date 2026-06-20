# 行情代理（Cloudflare Worker）

GitHub Pages 没有后端；这个 **无状态代理** 让浏览器能拿到「直连会被 CORS 挡」的行情数据
（如 A 股、含历史走势的美股）。它只是「借道 + 加 CORS 头」，**不存任何数据**。

上游用 **Yahoo Finance**，一个源覆盖：美股（`AAPL`）、A 股（上证 `600519.SS` / 深证 `000001.SZ`）、
港股（`00700.HK`）、指数（`^GSPC`），且带历史收盘价可画走势图。

## 部署（约 3 分钟，免费）

### 方式 A：网页控制台（最简单）
1. 登录 <https://dash.cloudflare.com> → 左侧 **Workers & Pages** → **Create** → **Create Worker**。
2. 给它起个名字（如 `quote-proxy`）→ **Deploy**。
3. 点 **Edit code**，把本目录 [`worker.js`](worker.js) 的内容整段粘贴覆盖，→ **Deploy**。
4. 复制上方分配的地址，形如 `https://quote-proxy.<你的子域>.workers.dev`。

### 方式 B：命令行（wrangler）
```bash
npm i -g wrangler
wrangler login
# 在本目录：
wrangler deploy worker.js --name quote-proxy --compatibility-date 2024-01-01
```

## 接入 App
打开「股市观测 → ⚙ 设置 → 数据源 → 行情代理」，把上面的 Worker URL 粘进「代理 URL」即可。
之后：
- A 股填 `600519.SS`、`000001.SZ`
- 港股填 `00700.HK`
- 美股直接 `AAPL`、`NVDA`

## 自测
浏览器直接打开 `https://<你的worker>.workers.dev/?symbol=AAPL`，应返回一段 JSON（含 `price`、`series`）。

## 说明与注意
- 代理只接受合法标的字符、且固定打到 Yahoo，不是开放代理。
- 免费版 Cloudflare Worker 每天有请求额度（个人观测足够）。
- 行情有延迟、仅供参考，不构成投资建议。Yahoo 接口为非官方用途，可能随时变化。

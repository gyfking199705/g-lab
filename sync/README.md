# ☁️ Google Drive 云同步（无后端，文件可自管）

把数据同步到**你自己** Google Drive 里一个**可见文件夹**，每个模块一个人类可读的 JSON 文件——
你能在 Drive 里直接浏览 / 单独备份 / 编辑 / 删除。**没有后端、没有数据库**：数据只在「你的浏览器 ↔ 你的 Google」之间走，本项目不经手、不留存。

```
sync/
├── backup.js       # 备份采集/恢复 + 文件名映射 + 内容签名 + multipart 构造（纯函数，可单测）
├── backup.test.js  # 单元测试（node --test）
├── drive.js        # 浏览器侧：Google Identity Services + Drive REST（可见文件夹/多文件）
└── README.md
```

## 你 Drive 里会长这样
```
📁 成长规划 (g-lab)/
   ├─ 说明.txt          ← 解释每个文件是什么、怎么手动备份
   ├─ 个人规划.json
   ├─ 学习计划.json
   ├─ 健身训练.json
   ├─ 财富规划.json
   └─ 股市观测.json
```
（文件名 ↔ 模块键的映射见 `backup.js` 的 `FILE_MAP`。）

## 为什么安全
- **最小权限 `drive.file`**：应用**只能访问它自己创建的文件/文件夹**，**看不到你 Drive 的其它内容**。
- **无 client secret**（OAuth 令牌流）；access token 只活在浏览器内存，不落 localStorage。
- **敏感数据不上云**：同步内容来自 `BACKUP_KEYS`，**不含** `learning-ai`(AI Key)、`sync-client-id` 等。
- OAuth 客户端可在控制台**锁定授权来源**到你的站点域名；Client ID 本身可公开。

## 一次性设置（约 5 分钟，免费，全程只做这一次）
1. <https://console.cloud.google.com/> → 新建/选择项目。
2. **APIs & Services → Library** → 启用 **Google Drive API**。
3. **OAuth consent screen**：User Type 选 **External**，填应用名/邮箱；**保持「Testing」状态**，在 **Test users** 里**只加你自己的 Google 邮箱**。
   → 这一步就是隐私锁：处于 Testing 且只有你是测试用户时，**除你之外没有任何人能完成授权**，公开 demo 的访客点了也连不上。
   （`drive.file` 属「非敏感」范围，测试模式足够个人长期使用。）
4. **Credentials → Create Credentials → OAuth client ID** → **Web application**：
   - **Authorized JavaScript origins** 加两条：本地 `http://localhost:8000`、部署 `https://<你的用户名>.github.io`
     → 这是第二把锁：即使 Client ID 公开，**别的域名也无法用它发起授权**。
   - 复制 **Client ID**（`xxx.apps.googleusercontent.com`）。
5. 把 Client ID 用上（二选一）：
   - **A · 写死为默认（推荐，所有设备免粘贴）**：编辑 `app/main.jsx` 里的 `const DEFAULT_CLIENT_ID = ''`，把 `''` 换成你的 Client ID，提交（push main 自动部署）。之后你**任何设备**打开页面都自带它。
   - **B · 仅本机粘贴**：应用侧栏 **☁️ 设置云同步** → 粘贴 Client ID（存本机 localStorage，仅这台浏览器生效）。
6. 侧栏勾上 **「自动同步到 Drive」** → 首次 **连接 Google Drive** 授权一次。**完成。**

> Client ID 写死进代码**是安全的**：它本就是公开值（每个 Google 网页应用的 JS 里都能看到）。真正拦住别人的是上面第 3、4 步的两把锁。**不要**写死的：AI API Key、任何 client secret（令牌流根本没有 secret）。

## 「自动登录」能到什么程度（无后端的真实边界）
- **能做到**：开了「自动同步」后，每次打开页面**自动静默重连**（你登着 Google 且授权过 → **零点击**）；token 到期前**自动静默续期**（约每 50 分钟），长会话不掉线。
- **做不到**：跨设备「永久免登录、且不需要你登着 Google」——那需要后端保存 refresh token。无后端时，掉了 Google 登录就需**点一次「连接」**。这是所有无后端应用的共同边界，不是 bug。

## 常见问题
- **每台新设备要怎么弄？** 用方案 A（写死默认）时：打开页面 → 勾一次「自动同步」→ 授权一次 → 以后这台设备全自动。**无需再进 Cloud Console、无需粘贴。**
- **怎么开自动？** 勾上「自动同步到 Drive」。之后本机改动会**只把变化了的文件**防抖上传；连接时按内容签名三向对账（本机改→推 / 云端较新→拉 / 双改→询问 / 本机空→直接拉）。
- **能手动直接改 Drive 里的 JSON 吗？** 可以，保持合法 JSON 即可；下次在应用点「⬇️ 恢复」或重连即载入。
- **换台设备数据怎么过去？** 同一 Google 账号、连接后自动对账拉到你的数据。

## 测试
```bash
cd sync && node --test    # 备份采集/恢复 + 文件名映射 + 内容签名 + multipart（纯逻辑）
```
> Drive 的 OAuth 与网络调用需在浏览器里实测（按上面的设置走一遍）。

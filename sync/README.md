# ☁️ Google Drive 云同步（无后端）

把本应用的数据（一份带版本号的 JSON 备份）同步到**你自己** Google Drive 的「应用专属隐藏目录」(`appDataFolder`)，
实现跨设备备份/恢复。**没有后端、没有数据库**：数据只在「你的浏览器 ↔ 你的 Google」之间走，本项目不经手、不留存。

```
sync/
├── backup.js       # 备份采集/恢复 + Drive multipart 构造（纯函数，可单测）
├── backup.test.js  # 单元测试（node --test）
├── drive.js        # 浏览器侧：Google Identity Services + Drive REST（appDataFolder）
└── package.json
```

## 为什么安全
- **最小权限**：只申请 `drive.appdata` 范围 —— 应用**只能读写自己创建的同步文件**，看不到你 Drive 里的任何其他内容。
- **无密钥下发**：用 OAuth「令牌流」，**没有 client secret**；access token 只活在浏览器内存（不写 localStorage）。
- **敏感数据不上云**：同步内容来自 `BACKUP_KEYS`，其中**不含** `learning-ai`（AI Key）、`sync-client-id`。
- **来源限制**：在 Google 控制台把 OAuth 客户端的「授权来源」限定为你的站点域名，别人拿不到你的授权。
- 代码开源可审计；OAuth **Client ID 本身可公开**（它不是密钥）。

## 一次性设置（约 5 分钟，免费）

1. 打开 <https://console.cloud.google.com/> → 新建一个项目（或用现有的）。
2. **APIs & Services → Library** → 搜索 **Google Drive API** → **Enable**。
3. **APIs & Services → OAuth consent screen**：User Type 选 **External**，填应用名/邮箱即可；
   在 **Test users** 里加上你自己的 Google 邮箱（测试模式下只有测试用户能登录，足够个人/小范围用）。
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**：
   - Application type：**Web application**
   - **Authorized JavaScript origins** 添加你访问应用的来源：
     - 本地：`http://localhost:8000`
     - 部署：`https://<你的用户名>.github.io`（GitHub Pages 的根域名）
   - 创建后复制 **Client ID**（形如 `xxx.apps.googleusercontent.com`）。
5. 回到应用：侧边栏 **☁️ 设置云同步** → 粘贴 Client ID → **连接 Google Drive** → 授权。
6. 之后用 **⬆️ 上传到云 / ⬇️ 从云恢复**。换台设备登录同一 Google 账号、填同一个 Client ID，即可恢复。

> 想正式公开给多人用：把 OAuth consent screen 从「测试」发布为「生产」（可能需 Google 审核，
> 但 `drive.appdata` 属于非敏感范围，通常无需繁琐验证）。每个人用各自的 Google 账号登录 →
> 数据进各自的 Drive，**仍然零后端**。

## 行为说明
- 同步文件名：`g-lab-sync.json`，存于 `appDataFolder`（在 Drive 网页端看不到，属正常现象）。
- 目前是**显式三动作**（连接 / 上传 / 恢复），行为可预测、好排查；冲突策略是「以你点击的方向为准」（上传=本机覆盖云端，恢复=云端覆盖本机，恢复前有确认）。
- 想要自动同步（防抖 onChange 自动上传 + 启动时拉取）可在此基础上扩展，provider 接口已与 UI 解耦。

## 测试
```bash
cd sync && node --test    # 备份采集/恢复/multipart 构造（纯逻辑）
```
> Drive 的 OAuth 与网络调用需在浏览器里实测（按上面的设置走一遍）。

/**
 * Google Drive 同步 —— 浏览器侧（无后端）
 * ------------------------------------------------------------------
 * 用 Google Identity Services (GIS) 走 OAuth「令牌流」拿 access token，
 * 然后用 Drive REST 把一个 JSON 同步文件读写到 **appDataFolder**（应用专属隐藏目录）。
 *
 * 安全要点：
 *  - 仅申请 `drive.appdata` 范围：应用**只能看到自己创建的同步文件**，看不到你 Drive 的其他内容（最小权限）。
 *  - 无 client secret（令牌流不需要）；OAuth Client ID 是可公开的，建议在 Google 控制台把
 *    「授权来源」限制为你的 Pages 域名。
 *  - access token 只活在内存（本模块闭包），不落 localStorage。
 *
 * 纯逻辑（备份采集 / multipart 构造）在 ./backup.js，可单测；本文件只负责 GIS 与网络。
 */
import { SYNC_FILENAME, buildMultipartBody } from './backup.js';

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const GIS_SRC = 'https://accounts.google.com/gsi/client';
const FILES = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

let gisPromise = null;

/** 动态加载 Google 身份服务脚本（只加载一次）。 */
export function ensureGis() {
  if (typeof window !== 'undefined' && window.google && window.google.accounts && window.google.accounts.oauth2) {
    return Promise.resolve();
  }
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => {
      const t0 = Date.now();
      (function wait() {
        if (window.google && window.google.accounts && window.google.accounts.oauth2) return resolve();
        if (Date.now() - t0 > 6000) return reject(new Error('Google 身份服务加载超时'));
        setTimeout(wait, 50);
      })();
    };
    s.onerror = () => reject(new Error('无法加载 Google 身份服务（检查网络 / 网络策略是否放行 accounts.google.com）'));
    document.head.appendChild(s);
  });
  return gisPromise;
}

/**
 * 弹出 Google 授权，返回 access token（内存持有，调用方自行保存到 state）。
 * @param {string} clientId Google OAuth Client ID
 */
export async function requestToken(clientId) {
  if (!clientId || !clientId.trim()) throw new Error('未配置 Google OAuth Client ID');
  await ensureGis();
  return new Promise((resolve, reject) => {
    let settled = false;
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId.trim(),
      scope: DRIVE_SCOPE,
      callback: (resp) => {
        settled = true;
        if (resp && resp.access_token) resolve(resp.access_token);
        else reject(new Error('未获得授权'));
      },
      error_callback: (err) => {
        settled = true;
        const t = err && err.type;
        if (t === 'popup_closed') reject(new Error('授权窗口被关闭'));
        else if (t === 'popup_failed_to_open') reject(new Error('授权弹窗被拦截，请允许弹窗后重试'));
        else reject(new Error('授权失败：' + (err && err.message ? err.message : t || '未知错误')));
      },
    });
    try {
      client.requestAccessToken();
    } catch (e) {
      if (!settled) reject(e);
    }
  });
}

/** 在 appDataFolder 里查找同步文件，返回 {id, modifiedTime} 或 null。 */
export async function findSyncFile(token) {
  const q = encodeURIComponent(`name='${SYNC_FILENAME}'`);
  const url = `${FILES}?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime)&pageSize=1`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(await driveErr(r));
  const d = await r.json();
  return d.files && d.files[0] ? d.files[0] : null;
}

/** 下载并解析同步文件内容。 */
export async function downloadFile(token, fileId) {
  const r = await fetch(`${FILES}/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(await driveErr(r));
  return r.json();
}

/** 上传同步文件：有 fileId 则更新（PATCH media），否则在 appDataFolder 新建。返回 fileId。 */
export async function uploadSync(token, fileId, obj) {
  const media = JSON.stringify(obj);
  if (fileId) {
    const r = await fetch(`${UPLOAD}/${encodeURIComponent(fileId)}?uploadType=media&fields=id`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
      body: media,
    });
    if (!r.ok) throw new Error(await driveErr(r));
    const d = await r.json();
    return d.id || fileId;
  }
  const boundary = 'glab' + Math.random().toString(36).slice(2);
  const body = buildMultipartBody({ name: SYNC_FILENAME, parents: ['appDataFolder'] }, media, boundary);
  const r = await fetch(`${UPLOAD}?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!r.ok) throw new Error(await driveErr(r));
  const d = await r.json();
  return d.id;
}

async function driveErr(r) {
  let detail = '';
  try {
    const b = await r.json();
    detail = (b && b.error && (b.error.message || b.error.status)) || '';
  } catch (e) {
    detail = await r.text().catch(() => '');
  }
  if (r.status === 401) return `登录已过期（401），请重新连接。${detail}`;
  if (r.status === 403) return `无权限（403）：确认已启用 Drive API 且授权范围正确。${detail}`;
  return `Drive 请求失败（${r.status}）：${detail || r.statusText}`;
}

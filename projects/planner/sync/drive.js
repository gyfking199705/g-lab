/**
 * Google Drive 同步 —— 浏览器侧（无后端）
 * ------------------------------------------------------------------
 * 用 Google Identity Services (GIS) 走 OAuth「令牌流」拿 access token，
 * 然后用 Drive REST 在你 Drive 里一个**可见文件夹**（默认「成长规划 (g-lab)」）中，
 * 按「每个模块一个 JSON 文件」读写数据 —— 你能在 Drive 里直接浏览/备份/编辑。
 *
 * 安全要点：
 *  - 仅申请 `drive.file` 范围：应用**只能访问它自己创建的文件/文件夹**，看不到你 Drive 的其它内容。
 *  - 无 client secret（令牌流）；OAuth Client ID 可公开，建议在控制台把「授权来源」限定为你的站点域名。
 *  - access token 只活在内存（调用方持有），不落 localStorage。
 *
 * 纯逻辑（文件名映射 / 还原 / 签名 / multipart 构造）在 ./backup.js，可单测；本文件只负责 GIS 与网络。
 */
import { buildMultipartBody } from './backup.js';

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GIS_SRC = 'https://accounts.google.com/gsi/client';
const FILES = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

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
 * @param {{silent?:boolean}} [opts] silent=true 时尝试免交互续期（已授权过才会成功）
 */
export async function requestToken(clientId, opts = {}) {
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
      client.requestAccessToken(opts.silent ? { prompt: '' } : {});
    } catch (e) {
      if (!settled) reject(e);
    }
  });
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

/** 找到（或新建）应用的数据文件夹，返回 folderId。 */
export async function findOrCreateFolder(token, name) {
  const q = encodeURIComponent(`name='${name.replace(/'/g, "\\'")}' and mimeType='${FOLDER_MIME}' and trashed=false`);
  const r = await fetch(`${FILES}?q=${q}&fields=files(id,name)&pageSize=1`, { headers: auth(token) });
  if (!r.ok) throw new Error(await driveErr(r));
  const d = await r.json();
  if (d.files && d.files[0]) return d.files[0].id;
  const cr = await fetch(`${FILES}?fields=id`, {
    method: 'POST',
    headers: { ...auth(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME }),
  });
  if (!cr.ok) throw new Error(await driveErr(cr));
  return (await cr.json()).id;
}

/** 列出文件夹内的文件（[{id,name,modifiedTime}]）。 */
export async function listChildren(token, folderId) {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const r = await fetch(`${FILES}?q=${q}&fields=files(id,name,modifiedTime)&pageSize=200`, { headers: auth(token) });
  if (!r.ok) throw new Error(await driveErr(r));
  const d = await r.json();
  return d.files || [];
}

/** 下载文件文本内容。 */
export async function downloadText(token, fileId) {
  const r = await fetch(`${FILES}/${encodeURIComponent(fileId)}?alt=media`, { headers: auth(token) });
  if (!r.ok) throw new Error(await driveErr(r));
  return r.text();
}

/** 写文件：有 fileId 则更新(PATCH media)，否则在 folderId 下新建。返回 fileId。 */
export async function uploadFile(token, folderId, name, fileId, content, mime = 'application/json') {
  if (fileId) {
    const r = await fetch(`${UPLOAD}/${encodeURIComponent(fileId)}?uploadType=media&fields=id`, {
      method: 'PATCH',
      headers: { ...auth(token), 'Content-Type': `${mime}; charset=UTF-8` },
      body: content,
    });
    if (!r.ok) throw new Error(await driveErr(r));
    return (await r.json()).id || fileId;
  }
  const boundary = 'glab' + Math.random().toString(36).slice(2);
  const body = buildMultipartBody({ name, parents: [folderId] }, content, boundary, `${mime}; charset=UTF-8`);
  const r = await fetch(`${UPLOAD}?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: { ...auth(token), 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!r.ok) throw new Error(await driveErr(r));
  return (await r.json()).id;
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

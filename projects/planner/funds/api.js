/**
 * 基金净值 —— 数据层（数据源适配器）
 * ------------------------------------------------------------------
 * 与 stocks/api.js 同构：GitHub Pages 无后端，浏览器直连第三方取数，统一标准化对象。
 * 提供方：
 *   - eastmoney ：天天基金实时估值 fundgz.1234567.com.cn/js/{code}.js（JSONP，经 CORS 代理转发）
 *   - demo      ：本地合成（确定性、始终可用）
 *
 * 标准化净值对象 FundNav：
 *   { code, name, nav, navDate, estNav, estPct, estTime, demo, error? }
 *   · nav    单位净值（上一交易日，权威值）
 *   · estNav 实时估算净值（盘中估值，folio 估值优先用它）
 *   · estPct 估算涨跌幅 %
 */
import { CORS_PROXIES } from '../stocks/api.js';

/* ----------------------------- 解析（纯函数，可单测） ----------------------------- */
// 天天基金返回形如：jsonpgz({"fundcode":"161725","name":"...","jzrq":"2026-06-06","dwjz":"1.234","gsz":"1.245","gszzl":"0.89","gztime":"2026-06-09 15:00"});
export function parseFundGz(text, code) {
  const m = /jsonpgz\(\s*(\{[\s\S]*?\})\s*\)/.exec(text || '');
  if (!m) throw new Error('解析失败（非预期格式）');
  const d = JSON.parse(m[1]);
  const toNum = (v) => (v == null || v === '' ? NaN : Number(v));
  const nav = toNum(d.dwjz);
  const est = toNum(d.gsz);
  const estPct = toNum(d.gszzl);
  if (!isFinite(nav) && !isFinite(est)) throw new Error('无净值数据');
  return {
    code: String(d.fundcode || code || '').trim(),
    name: d.name || '',
    nav: isFinite(nav) ? nav : est,
    navDate: d.jzrq || '',
    estNav: isFinite(est) ? est : null,
    estPct: isFinite(estPct) ? estPct : null,
    estTime: d.gztime || '',
    demo: false,
  };
}

/** 估值取价：实时估算优先，回落到单位净值。 */
export function navForValuation(f) {
  if (!f) return 0;
  if (f.estNav != null && isFinite(f.estNav) && f.estNav > 0) return f.estNav;
  return isFinite(f.nav) && f.nav > 0 ? f.nav : 0;
}

/* ----------------------------- 演示数据 ----------------------------- */
function seedFrom(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i++) h = Math.imul(h ^ String(str).charCodeAt(i), 16777619);
  return h >>> 0;
}
export function demoFundNav(code) {
  const c = String(code).trim();
  let s = seedFrom(c) >>> 0;
  const r = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const nav = +(0.8 + r() * 3).toFixed(4);
  const estPct = +(((r() - 0.5) * 4)).toFixed(2);
  const estNav = +(nav * (1 + estPct / 100)).toFixed(4);
  return { code: c, name: '演示基金 ' + c, nav, navDate: '演示', estNav, estPct, estTime: '演示', demo: true };
}

/* ----------------------------- 天天基金（经 CORS 代理） ----------------------------- */
export async function eastmoneyFundNav(code) {
  const c = String(code).trim();
  if (!/^\d{6}$/.test(c)) throw new Error('基金代码应为 6 位数字');
  const target = `https://fundgz.1234567.com.cn/js/${c}.js?rt=${Date.now()}`;
  let lastErr;
  for (const wrap of CORS_PROXIES) {
    try {
      const res = await fetch(wrap(target));
      if (!res.ok) { lastErr = new Error('HTTP ' + res.status); continue; }
      const text = await res.text();
      return parseFundGz(text, c);
    } catch (e) { lastErr = e; }
  }
  throw new Error((lastErr && lastErr.message) || '获取失败（可能被网络/CORS 拦截）');
}

/* --------------------------- 统一取数入口 --------------------------- */
/**
 * 批量取基金净值，逐只容错。
 * @param {string[]} codes
 * @param {{provider?:'eastmoney'|'demo'}} opts
 * @returns {Promise<FundNav[]>}
 */
export async function fetchFundNavs(codes, { provider = 'eastmoney' } = {}) {
  const list = [...new Set((codes || []).map((c) => String(c).trim()).filter(Boolean))];
  if (provider === 'demo') return list.map((c) => demoFundNav(c));
  return Promise.all(
    list.map(async (c) => {
      try { return await eastmoneyFundNav(c); }
      catch (e) { return { code: c, error: e.message || '获取失败', demo: false }; }
    })
  );
}

/**
 * 首页「行情」区 —— 金价卡 + 股市卡（浏览器直连取数，无后端）
 * ------------------------------------------------------------------
 * · 金价：国际金价 GC=F × 美元兑人民币 CNY=X ÷ 31.1035 → 人民币元/克（≈工行积存金，纯函数在 gold/calc.js）
 * · 股市：复用「股市观测」的自选股配置与缓存（stocks-watch / -cache）
 * 进首页先用本地缓存秒显示，缓存陈旧（>10 分钟）才后台刷新；失败保留旧值并提示。
 */
import React, { useState, useEffect } from 'react';
import { LineChart, Empty } from '../core/ui.jsx';
import { readModule } from '../core/store.js';
import { yahooQuote, fetchQuotes, formatPct } from '../stocks/api.js';
import { portfolioStats } from '../stocks/analysis.js';
import { goldSummary, formatGram, DEFAULT_USDCNY } from '../gold/calc.js';

const GOLD_CACHE = 'gold-cache';
const STOCK_CFG = 'stocks-watch';
const STOCK_CACHE = 'stocks-watch-cache';
const STALE_MS = 10 * 60 * 1000;

const ageMs = (at) => (at ? Date.now() - new Date(at).getTime() : Infinity);
const fmtTime = (at) => { try { return new Date(at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
const writeCache = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 静默 */ } };

/** 取国际金价 + 汇率，折算人民币金价（汇率失败用兜底常数，标注近似）。 */
export async function fetchGold() {
  const [gc, fx] = await Promise.allSettled([yahooQuote('GC=F'), yahooQuote('CNY=X')]);
  if (gc.status !== 'fulfilled') throw new Error((gc.reason && gc.reason.message) || '金价获取失败');
  let usdCny = DEFAULT_USDCNY, fxFallback = true;
  if (fx.status === 'fulfilled' && isFinite(fx.value.price) && fx.value.price > 0) { usdCny = fx.value.price; fxFallback = false; }
  const s = goldSummary(gc.value, usdCny);
  if (!s) throw new Error('金价解析失败');
  return { ...s, fxFallback, at: new Date().toISOString() };
}

export default function MarketCards({ onOpenStocks }) {
  const [gold, setGold] = useState(() => readModule(GOLD_CACHE));
  const [goldErr, setGoldErr] = useState('');
  const [goldBusy, setGoldBusy] = useState(false);

  const cfg = readModule(STOCK_CFG) || {};
  const symbols = cfg.symbols || [];
  const [stock, setStock] = useState(() => readModule(STOCK_CACHE) || { quotes: [], at: null });
  const [stockBusy, setStockBusy] = useState(false);

  const refreshGold = async () => {
    setGoldBusy(true); setGoldErr('');
    try { const g = await fetchGold(); setGold(g); writeCache(GOLD_CACHE, g); }
    catch (e) { setGoldErr(e.message || '获取失败'); }
    finally { setGoldBusy(false); }
  };
  const refreshStocks = async () => {
    if (!symbols.length) return;
    setStockBusy(true);
    try {
      const quotes = await fetchQuotes(symbols, { provider: cfg.provider || 'yahoo', apiKey: cfg.apiKey, proxyUrl: cfg.proxyUrl });
      const c = { quotes, at: new Date().toISOString() };
      setStock(c); writeCache(STOCK_CACHE, c);
    } catch (e) { /* 保留旧快照 */ }
    finally { setStockBusy(false); }
  };

  useEffect(() => {
    if (!gold || ageMs(gold.at) > STALE_MS) refreshGold();
    if (symbols.length && ageMs(stock.at) > STALE_MS) refreshStocks();
    // 仅挂载时按需刷新一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ps = portfolioStats(stock.quotes || []);
  const pick = (stock.quotes || []).filter((q) => q && Array.isArray(q.series) && q.series.length > 1)
    .sort((a, b) => (b.changePct || 0) - (a.changePct || 0))[0];

  return (
    <>
      <div className="db-sectitle">行情 · 实时</div>
      <div className="mk-grid">
        {/* 金价卡 */}
        <div className="mk-card" style={{ '--mk': 'var(--warn)' }}>
          <div className="mk-head">
            <h3>🪙 金价 · 人民币/克</h3>
            <button className="mk-refresh" onClick={refreshGold} disabled={goldBusy} title="刷新金价">{goldBusy ? '…' : '↻'}</button>
          </div>
          {gold ? (
            <>
              <div className="mk-hero">
                <span className="mk-v">{formatGram(gold.pricePerGram)}</span>
                <span className="mk-u">元/克</span>
                <span className={`mk-d ${gold.change >= 0 ? 'up' : 'down'}`}>{gold.change >= 0 ? '↑' : '↓'} {formatGram(Math.abs(gold.change))} ({formatPct(gold.changePct)})</span>
              </div>
              {gold.series && gold.series.length > 1 && <div className="mk-chart"><LineChart values={gold.series} height={64} stroke="var(--warn)" /></div>}
              <div className="mk-note">国际金价 ${gold.usdPerOz != null ? gold.usdPerOz.toLocaleString('en-US') : '—'}/oz × 汇率 {gold.usdCny ? gold.usdCny.toFixed(2) : '—'} 折算 · ≈工行积存金{gold.fxFallback ? ' · 汇率近似' : ''}</div>
              <div className="mk-foot"><span>{goldErr ? '⚠ ' + goldErr : '更新于 ' + fmtTime(gold.at)}</span></div>
            </>
          ) : goldErr ? (
            <Empty icon="🪙" title="金价暂时获取失败" hint={goldErr} />
          ) : (
            <div className="mk-loading">{goldBusy ? '正在获取金价…' : '点 ↻ 获取金价'}</div>
          )}
        </div>

        {/* 股市卡 */}
        <div className="mk-card mk-click" style={{ '--mk': 'var(--accent)' }} onClick={onOpenStocks} role="button" tabIndex={0}>
          <div className="mk-head">
            <h3>📈 股市 · 自选</h3>
            <button className="mk-refresh" onClick={(e) => { e.stopPropagation(); refreshStocks(); }} disabled={stockBusy || !symbols.length} title="刷新行情">{stockBusy ? '…' : '↻'}</button>
          </div>
          {symbols.length === 0 ? (
            <Empty icon="📈" title="还没有自选股" hint="进入「股市观测」添加，这里会显示组合涨跌与走势" />
          ) : ps.count === 0 ? (
            <div className="mk-loading">{stockBusy ? '正在刷新行情…' : '点 ↻ 刷新行情'}</div>
          ) : (
            <>
              <div className="mk-hero">
                <span className="mk-v">{symbols.length}</span>
                <span className="mk-u">只 · 上涨 {ps.gainers}/下跌 {ps.losers}</span>
                <span className={`mk-d ${ps.avgChangePct >= 0 ? 'up' : 'down'}`}>均 {formatPct(ps.avgChangePct)}</span>
              </div>
              {pick && pick.series && <div className="mk-chart"><LineChart values={pick.series} height={64} stroke="var(--accent)" interactive={false} /></div>}
              <div className="mk-movers">
                {ps.top && <span className="up">最强 {ps.top.symbol} {formatPct(ps.top.changePct)}</span>}
                {ps.bottom && <span className="down">最弱 {ps.bottom.symbol} {formatPct(ps.bottom.changePct)}</span>}
              </div>
              <div className="mk-foot"><span>更新于 {fmtTime(stock.at)}</span><span className="mk-go">查看大盘 ›</span></div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export const MARKET_CSS = `
.mk-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;}
.mk-card{background:var(--surface);border:1px solid color-mix(in srgb,var(--mk) 20%,var(--bd));border-radius:14px;padding:16px 18px;position:relative;overflow:hidden;display:flex;flex-direction:column;}
.mk-card::before{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:var(--mk);opacity:.8;}
.mk-card.mk-click{cursor:pointer;transition:box-shadow .18s,border-color .18s;}
.mk-card.mk-click:hover{box-shadow:0 8px 22px rgba(38,36,31,.09);border-color:color-mix(in srgb,var(--mk) 42%,var(--bd));}
.mk-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;}
.mk-head h3{font-family:var(--serif);font-size:14.5px;font-weight:500;}
.mk-refresh{border:1px solid var(--bd-2);background:var(--surface-2);border-radius:8px;width:26px;height:24px;cursor:pointer;color:var(--text-2);font-size:13px;flex:none;transition:.15s;}
.mk-refresh:hover:not(:disabled){background:var(--surface-3);color:var(--text);}
.mk-refresh:disabled{opacity:.5;cursor:default;}
.mk-hero{display:flex;align-items:baseline;gap:7px;flex-wrap:wrap;}
.mk-v{font-family:var(--serif);font-size:28px;font-weight:500;line-height:1;letter-spacing:-.6px;color:var(--mk);font-variant-numeric:tabular-nums;}
.mk-u{font-size:12px;color:var(--text-3);}
.mk-d{margin-left:auto;font-size:11.5px;padding:2px 9px;border-radius:999px;white-space:nowrap;font-variant-numeric:tabular-nums;}
.mk-d.up{color:var(--danger);background:var(--danger-soft);}
.mk-d.down{color:var(--success);background:var(--success-soft);}
.mk-chart{margin:11px 0 4px;}
.mk-movers{display:flex;gap:12px;flex-wrap:wrap;font-size:11.5px;margin-top:2px;font-variant-numeric:tabular-nums;}
.mk-movers .up{color:var(--danger);}
.mk-movers .down{color:var(--success);}
.mk-note{font-size:10.5px;color:var(--text-3);margin-top:8px;line-height:1.5;}
.mk-foot{display:flex;justify-content:space-between;gap:8px;font-size:10.5px;color:var(--text-3);margin-top:8px;padding-top:7px;border-top:1px solid var(--bd-soft);}
.mk-go{color:var(--mk);font-weight:500;}
.mk-loading{font-size:12px;color:var(--text-3);padding:18px 0;text-align:center;}
`;

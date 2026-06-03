/**
 * 股市观测管理器 —— React 组件
 * ------------------------------------------------------------------
 * - 自选股清单（localStorage 持久化）+ 实时/演示行情卡片 + 迷你走势图（手写 SVG）
 * - 数据层见 ./api.js；GitHub Pages 无后端，数据由浏览器直连第三方 API
 * - 数据源：演示数据（默认，始终可用）/ Finnhub 实时（用户自带免费 key，存本地）
 * - 涨跌配色支持「红涨绿跌（A股惯例）」与「绿涨红跌（欧美惯例）」切换
 * - 样式遵循 DESIGN.md（暖纸色 + 陶土橙 + 衬线数字，克制留白）
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchQuotes, formatPrice, formatChange, formatPct } from './api.js';

const STORE_KEY = 'stocks-watch';
const CACHE_KEY = 'stocks-watch-cache'; // 最近一次行情快照，重开页面先秒显示
const DEFAULT_CFG = {
  symbols: ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'BABA'],
  provider: 'yahoo', // 'yahoo' 实时(默认) | 'proxy' 自建代理 | 'finnhub' | 'demo'
  apiKey: '',
  proxyUrl: '',
  redUp: true, // true=红涨绿跌（A股）  false=绿涨红跌（欧美）
};

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return { ...DEFAULT_CFG, ...JSON.parse(raw) };
  } catch (e) {
    /* ignore */
  }
  return DEFAULT_CFG;
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    /* ignore */
  }
  return { quotes: [], at: null };
}

export default function StockWatch() {
  const [cfg, setCfg] = useState(load);
  const cached = loadCache();
  const [quotes, setQuotes] = useState(cached.quotes); // 先用上次快照渲染
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(cached.at ? new Date(cached.at) : null);
  const [showSettings, setShowSettings] = useState(false);
  const [input, setInput] = useState('');

  // 持久化配置
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(cfg));
    } catch (e) {
      /* ignore */
    }
  }, [cfg]);

  const refresh = useCallback(async () => {
    if (!cfg.symbols.length) {
      setQuotes([]);
      return;
    }
    setLoading(true);
    try {
      const q = await fetchQuotes(cfg.symbols, {
        provider: cfg.provider,
        apiKey: cfg.apiKey,
        proxyUrl: cfg.proxyUrl,
      });
      const at = new Date();
      setQuotes(q);
      setUpdatedAt(at);
      // 存最近一次快照（浏览器本地），重开页面先秒显示
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ quotes: q, at: at.toISOString() }));
      } catch (e) {
        /* ignore */
      }
    } finally {
      setLoading(false);
    }
  }, [cfg.symbols, cfg.provider, cfg.apiKey, cfg.proxyUrl]);

  // 标的/数据源变化时自动刷新
  useEffect(() => {
    refresh();
  }, [refresh]);

  const addSymbol = () => {
    const s = input.trim().toUpperCase();
    if (!s) return;
    if (cfg.symbols.includes(s)) {
      setInput('');
      return;
    }
    setCfg((c) => ({ ...c, symbols: [...c.symbols, s] }));
    setInput('');
  };
  const removeSymbol = (s) => setCfg((c) => ({ ...c, symbols: c.symbols.filter((x) => x !== s) }));

  const upColor = cfg.redUp ? 'var(--danger)' : 'var(--g)';
  const downColor = cfg.redUp ? 'var(--g)' : 'var(--danger)';
  const colorOf = (v) => (v > 0 ? upColor : v < 0 ? downColor : 'var(--t2)');

  return (
    <div className="sw-root">
      <style>{CSS}</style>

      <header className="sw-header">
        <div>
          <h1>股市观测管理器</h1>
          <p className="sw-sub">自选股实时观测 · 数据由浏览器直连行情 API（无后端）</p>
        </div>
        <div className="sw-head-acts">
          <button className="sw-icon-btn" onClick={refresh} disabled={loading} title="刷新">
            {loading ? '刷新中…' : '↻ 刷新'}
          </button>
          <button className="sw-icon-btn" onClick={() => setShowSettings((v) => !v)} title="设置">
            ⚙ 设置
          </button>
        </div>
      </header>

      {/* 设置面板 */}
      {showSettings && (
        <div className="sw-settings">
          <div className="sw-set-row">
            <span className="sw-set-label">数据源</span>
            <div className="sw-seg">
              <button
                className={cfg.provider === 'yahoo' ? 'on' : ''}
                onClick={() => setCfg((c) => ({ ...c, provider: 'yahoo' }))}
              >
                实时行情
              </button>
              <button
                className={cfg.provider === 'proxy' ? 'on' : ''}
                onClick={() => setCfg((c) => ({ ...c, provider: 'proxy' }))}
              >
                自建代理
              </button>
              <button
                className={cfg.provider === 'finnhub' ? 'on' : ''}
                onClick={() => setCfg((c) => ({ ...c, provider: 'finnhub' }))}
              >
                Finnhub
              </button>
              <button
                className={cfg.provider === 'demo' ? 'on' : ''}
                onClick={() => setCfg((c) => ({ ...c, provider: 'demo' }))}
              >
                演示
              </button>
            </div>
          </div>
          {cfg.provider === 'yahoo' && (
            <p className="sw-hint">
              免费实时行情（数据源 Yahoo Finance），覆盖美股 <code>AAPL</code>、A股 <code>600519.SS</code>/<code>000001.SZ</code>、
              港股 <code>00700.HK</code>，含走势图，无需 key。直连失败时自动经公共 CORS 代理获取；
              若偶发不稳定或在受限网络，建议改用「自建代理」（更稳）。
            </p>
          )}
          {cfg.provider === 'finnhub' && (
            <div className="sw-set-row">
              <span className="sw-set-label">API Key</span>
              <input
                className="sw-input"
                type="password"
                placeholder="粘贴你的 Finnhub 免费 key"
                value={cfg.apiKey}
                onChange={(e) => setCfg((c) => ({ ...c, apiKey: e.target.value }))}
              />
            </div>
          )}
          {cfg.provider === 'finnhub' && (
            <p className="sw-hint">
              免费 key 在 <a href="https://finnhub.io/register" target="_blank" rel="noreferrer">finnhub.io</a> 注册即得；
              仅存在你本机浏览器，不会上传或进仓库。免费版支持美股等实时报价（暂无历史走势权限）。
            </p>
          )}
          {cfg.provider === 'proxy' && (
            <div className="sw-set-row">
              <span className="sw-set-label">代理 URL</span>
              <input
                className="sw-input"
                placeholder="https://你的-worker.workers.dev"
                value={cfg.proxyUrl}
                onChange={(e) => setCfg((c) => ({ ...c, proxyUrl: e.target.value }))}
              />
            </div>
          )}
          {cfg.provider === 'proxy' && (
            <p className="sw-hint">
              自建 Cloudflare Worker 代理（约 3 分钟，免费），覆盖美股 / A股 / 港股且带走势图。
              部署步骤见仓库 <code>stocks/proxy/README.md</code>。
              代码示例：A股 <code>600519.SS</code>、深市 <code>000001.SZ</code>、港股 <code>00700.HK</code>、美股 <code>AAPL</code>。
            </p>
          )}
          <div className="sw-set-row">
            <span className="sw-set-label">涨跌配色</span>
            <div className="sw-seg">
              <button className={cfg.redUp ? 'on' : ''} onClick={() => setCfg((c) => ({ ...c, redUp: true }))}>
                红涨绿跌（A股）
              </button>
              <button className={!cfg.redUp ? 'on' : ''} onClick={() => setCfg((c) => ({ ...c, redUp: false }))}>
                绿涨红跌（欧美）
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加标的 */}
      <div className="sw-add">
        <input
          className="sw-input"
          placeholder="添加代码，如 AAPL、NVDA、MSFT…"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && addSymbol()}
        />
        <button className="sw-btn" onClick={addSymbol}>添加</button>
      </div>

      {/* 行情卡片 */}
      {cfg.symbols.length === 0 ? (
        <div className="sw-empty">
          <div className="ic">📈</div>
          <div>还没有自选股</div>
          <div className="sw-empty-sub">在上方输入代码开始观测</div>
        </div>
      ) : (
        <div className="sw-grid">
          {quotes.map((q) => (
            <QuoteCard key={q.symbol} q={q} colorOf={colorOf} onRemove={() => removeSymbol(q.symbol)} />
          ))}
        </div>
      )}

      <div className="sw-status">
        <span>
          数据源：{
            cfg.provider === 'yahoo' ? '实时行情（Yahoo）'
            : cfg.provider === 'finnhub' ? 'Finnhub 实时'
            : cfg.provider === 'proxy' ? '自建代理（实时）'
            : '演示数据'
          }
          {updatedAt && ` · 更新于 ${updatedAt.toLocaleTimeString('zh-CN')}`}
        </span>
        {cfg.provider === 'demo' && <span className="sw-demo-tag">演示数据 · 非真实行情</span>}
      </div>

      <p className="sw-disclaimer">
        ⚠️ 行情仅供观测参考，可能延迟或不准确，<strong>不构成任何投资建议</strong>。
        GitHub Pages 为纯静态托管、无后端，数据由你的浏览器直接向第三方 API 获取。
      </p>
    </div>
  );
}

/* ----------------------------- 行情卡片 ----------------------------- */
function QuoteCard({ q, colorOf, onRemove }) {
  if (q.error) {
    return (
      <div className="sw-card sw-card-err">
        <div className="sw-card-top">
          <span className="sw-sym">{q.symbol}</span>
          <button className="sw-rm" onClick={onRemove} title="移除">×</button>
        </div>
        <div className="sw-err">{q.error}</div>
      </div>
    );
  }
  const c = colorOf(q.change);
  const arrow = q.change > 0 ? '▲' : q.change < 0 ? '▼' : '·';
  return (
    <div className="sw-card">
      <div className="sw-card-top">
        <span className="sw-sym">{q.symbol}</span>
        <button className="sw-rm" onClick={onRemove} title="移除">×</button>
      </div>
      <div className="sw-price" style={{ color: c }}>{formatPrice(q.price)}</div>
      <div className="sw-chg" style={{ color: c }}>
        {arrow} {formatChange(q.change)} ({formatPct(q.changePct)})
      </div>
      <Spark series={q.series} color={c} />
    </div>
  );
}

/* ----------------------------- 迷你走势 SVG ----------------------------- */
function Spark({ series, color }) {
  if (!series || series.length < 2) {
    return <div className="sw-spark-empty">— 暂无走势 —</div>;
  }
  const w = 220;
  const h = 44;
  const pad = 3;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const n = series.length;
  const x = (i) => pad + (i / (n - 1)) * (w - pad * 2);
  const y = (v) => pad + (1 - (v - min) / span) * (h - pad * 2);
  const line = series.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L ${x(n - 1).toFixed(1)} ${h} L ${x(0).toFixed(1)} ${h} Z`;
  const gid = 'sw-g-' + Math.abs(series[0] * 1000 | 0);
  return (
    <svg className="sw-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

/* ============================ 样式（遵循 DESIGN.md） ============================ */
const CSS = `
.sw-root{--accent:#CC785C;--accent-2:#B5654A;--accent-soft:#F5ECE5;--g:#6E9079;
  --surface:#FFFFFF;--surface-2:#FBFAF6;--surface-3:#F1EFE8;--bd:#ECEAE2;--bd-2:#E3E0D7;--bd-soft:#F0EEE7;
  --t1:#26241F;--t2:#83827A;--t3:#B0AFA5;--danger:#BC6055;
  --serif:'Tiempos Text',Georgia,'Songti SC','STSong','Source Han Serif SC','Noto Serif CJK SC',serif;
  --sans:ui-sans-serif,system-ui,-apple-system,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;
  font-family:var(--sans);font-size:13px;color:var(--t1);line-height:1.55;max-width:1000px;margin:0 auto;}
.sw-root *{box-sizing:border-box;}
.sw-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px;}
.sw-header h1{font-family:var(--serif);font-size:21px;font-weight:500;margin:0;letter-spacing:-.3px;}
.sw-sub{margin:5px 0 0;color:var(--t2);font-size:12.5px;}
.sw-head-acts{display:flex;gap:8px;flex:none;}
.sw-icon-btn{background:none;border:1px solid var(--bd);border-radius:8px;padding:6px 12px;font-size:12.5px;cursor:pointer;color:var(--t2);transition:.15s;}
.sw-icon-btn:hover{border-color:var(--bd-2);background:var(--surface-2);color:var(--t1);}
.sw-icon-btn:disabled{opacity:.5;cursor:default;}

.sw-settings{background:var(--surface);border:1px solid var(--bd);border-radius:14px;padding:16px;margin-bottom:14px;display:flex;flex-direction:column;gap:12px;}
.sw-set-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.sw-set-label{font-size:12px;color:var(--t2);width:64px;flex:none;}
.sw-seg{display:inline-flex;border:1px solid var(--bd);border-radius:8px;overflow:hidden;}
.sw-seg button{background:none;border:none;padding:6px 12px;font-size:12px;cursor:pointer;color:var(--t2);font-family:var(--sans);transition:.15s;}
.sw-seg button.on{background:var(--accent-soft);color:var(--accent-2);font-weight:500;}
.sw-hint{font-size:11.5px;color:var(--t3);margin:0;line-height:1.6;}
.sw-hint a{color:var(--accent-2);}
.sw-hint code{background:var(--surface-3);border-radius:4px;padding:1px 5px;font-size:11px;color:var(--t2);}

.sw-add{display:flex;gap:8px;margin-bottom:18px;}
.sw-input{flex:1;min-width:0;padding:8px 12px;background:var(--surface-2);border:1px solid var(--bd);border-radius:9px;font-size:13px;color:var(--t1);font-family:var(--sans);transition:.15s;}
.sw-input::placeholder{color:var(--t3);}
.sw-input:focus{outline:none;background:var(--surface);border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft);}
.sw-btn{padding:8px 16px;border:none;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;font-family:var(--sans);
  background:var(--accent);color:#fff;box-shadow:0 1px 2px rgba(204,120,92,.25);transition:background .15s,box-shadow .15s,transform .1s;}
.sw-btn:hover{background:var(--accent-2);box-shadow:0 2px 6px rgba(204,120,92,.3);}
.sw-btn:active{transform:translateY(1px);}

.sw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;}
.sw-card{background:var(--surface);border:1px solid var(--bd);border-radius:14px;padding:15px 16px;transition:border-color .15s,background .15s;}
.sw-card:hover{border-color:var(--bd-2);}
.sw-card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
.sw-sym{font-weight:600;font-size:14px;letter-spacing:.3px;}
.sw-rm{background:none;border:none;color:var(--t3);font-size:17px;line-height:1;cursor:pointer;padding:0 2px;border-radius:6px;transition:.15s;}
.sw-rm:hover{color:var(--danger);}
.sw-price{font-family:var(--serif);font-size:25px;font-weight:500;letter-spacing:-.5px;font-variant-numeric:tabular-nums;}
.sw-chg{font-size:12.5px;margin-top:3px;font-variant-numeric:tabular-nums;}
.sw-spark{width:100%;height:44px;display:block;margin-top:10px;}
.sw-spark-empty{height:44px;margin-top:10px;display:flex;align-items:center;justify-content:center;color:var(--t3);font-size:11px;}
.sw-card-err{background:var(--surface-2);}
.sw-err{color:var(--danger);font-size:12px;padding:8px 0 2px;}

.sw-empty{text-align:center;padding:48px 24px;color:var(--t3);}
.sw-empty .ic{font-size:34px;margin-bottom:12px;opacity:.6;}
.sw-empty>div:nth-child(2){font-family:var(--serif);font-size:15px;color:var(--t2);}
.sw-empty-sub{font-size:12.5px;margin-top:4px;}

.sw-status{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-top:16px;font-size:11.5px;color:var(--t3);}
.sw-demo-tag{color:var(--accent-2);background:var(--accent-soft);border-radius:999px;padding:2px 9px;}
.sw-disclaimer{margin-top:12px;font-size:11px;color:var(--t3);border:1px solid var(--bd-soft);border-radius:11px;padding:12px 14px;line-height:1.65;}
.sw-disclaimer strong{color:var(--t2);}

@media(max-width:480px){
  .sw-grid{grid-template-columns:1fr 1fr;}
  .sw-set-label{width:auto;}
}
`;

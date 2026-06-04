/**
 * 全局 AI 设置 —— 可复用组件
 * ------------------------------------------------------------------
 * 让用户在任意位置（侧边栏 / 论文阅读 / 学习站）配置「自己的 Claude / OpenAI」。
 * 统一读写 localStorage 键 `learning-ai`（与学习站共用一处配置，Key 仅存本地、不进备份）。
 *
 * 导出：loadAIConfig / saveAIConfig（纯读写）、AISettingsButton（带状态的入口按钮 + 弹窗）。
 */
import React, { useState } from 'react';
import { SHARED_CSS } from './ui.jsx';
import { PROVIDERS, defaultAIConfig, isConfigured } from '../learning/ai.js';

const AI_KEY = 'learning-ai';

export function loadAIConfig() {
  try {
    const raw = localStorage.getItem(AI_KEY);
    return raw ? { ...defaultAIConfig(), ...JSON.parse(raw) } : defaultAIConfig();
  } catch (e) { return defaultAIConfig(); }
}
export function saveAIConfig(cfg) {
  try {
    localStorage.setItem(AI_KEY, JSON.stringify(cfg));
    // 通知同页其它已挂载组件刷新
    window.dispatchEvent(new CustomEvent('ai-config-changed'));
  } catch (e) { /* 静默 */ }
}

/** 入口按钮：显示 AI 是否就绪，点击打开设置弹窗。compact=侧栏精简样式。 */
export function AISettingsButton({ compact, className, onSaved }) {
  const [open, setOpen] = useState(false);
  const cfg = loadAIConfig();
  const ok = isConfigured(cfg);
  return (
    <>
      <button
        className={className || (compact ? 'app-tool' : 'gx-btn gx-btn-sm')}
        onClick={() => setOpen(true)}
        title="配置你自己的 AI（Claude/OpenAI），Key 仅存本地"
      >
        {ok ? '✨ AI 已就绪' : '✨ 配置 AI'}
      </button>
      {open && <AISettingsModal onClose={() => setOpen(false)} onSaved={onSaved} />}
    </>
  );
}

function AISettingsModal({ onClose, onSaved }) {
  const init = loadAIConfig();
  const [mode, setMode] = useState(init.mode || 'byok');
  const [provider, setProvider] = useState(init.provider || 'anthropic');
  const [model, setModel] = useState(init.model || '');
  const [apiKey, setApiKey] = useState(init.apiKey || '');
  const [baseURL, setBaseURL] = useState(init.baseURL || '');
  const [proxyURL, setProxyURL] = useState(init.proxyURL || '');
  const [accessToken, setAccessToken] = useState(init.accessToken || '');
  const preset = PROVIDERS[provider] || PROVIDERS.anthropic;

  const save = () => {
    const cfg = { ...init, enabled: true, mode, provider, model: model.trim(), apiKey: apiKey.trim(), baseURL: baseURL.trim(), proxyURL: proxyURL.trim(), accessToken: accessToken.trim() };
    saveAIConfig(cfg);
    if (onSaved) onSaved(cfg);
    onClose();
  };
  const clearKey = () => { setApiKey(''); };

  return (
    <div className="gx-root" onClick={onClose} style={overlay}>
      <style>{SHARED_CSS}</style>
      <div onClick={(e) => e.stopPropagation()} style={panel}>
        <div className="gx-sechead"><h3>✨ AI 设置</h3><button className="gx-btn gx-btn-ghost gx-btn-sm" onClick={onClose}>✕</button></div>
        <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 12 }}>
          用<strong>你自己的</strong> API Key 直连厂商。Key <strong>只存在本机浏览器</strong>，不进备份/云同步、不经任何服务器。
          需要的是 <strong>API Key</strong>（按量付费），不是 Claude.ai 订阅。
        </p>

        <div className="gx-seg" style={{ marginBottom: 12 }}>
          <button className={mode === 'byok' ? 'active' : ''} onClick={() => setMode('byok')}>自带 Key 直连</button>
          <button className={mode === 'proxy' ? 'active' : ''} onClick={() => setMode('proxy')}>走后端代理</button>
        </div>

        {mode === 'byok' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={field}><span style={lab}>厂商</span>
              <div className="gx-seg" style={{ width: 'fit-content' }}>
                {Object.keys(PROVIDERS).map((k) => (
                  <button key={k} className={provider === k ? 'active' : ''} onClick={() => { setProvider(k); setModel(''); }}>{PROVIDERS[k].label}</button>
                ))}
              </div>
            </label>
            <label style={field}><span style={lab}>模型</span>
              <select className="gx-in" value={model} onChange={(e) => setModel(e.target.value)}>
                <option value="">默认（{preset.defaultModel}）</option>
                {preset.models.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label style={field}><span style={lab}>API Key</span>
              <input className="gx-in" type="password" autoComplete="off" placeholder={preset.keyHint} value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
              <a href={preset.keyUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--accent-2)', marginTop: 3 }}>从这里获取 Key →</a>
            </label>
            <label style={field}><span style={lab}>自定义 BaseURL（可选，反代/中转）</span>
              <input className="gx-in" placeholder={preset.defaultBaseURL} value={baseURL} onChange={(e) => setBaseURL(e.target.value)} />
            </label>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>把 Key 放服务端、前端只调你的代理（公开分享给别人用又不暴露 Key）。见 learning/proxy/README。</p>
            <label style={field}><span style={lab}>代理 URL</span>
              <input className="gx-in" placeholder="https://your-proxy.workers.dev/" value={proxyURL} onChange={(e) => setProxyURL(e.target.value)} /></label>
            <label style={field}><span style={lab}>访问令牌（可选）</span>
              <input className="gx-in" type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} /></label>
          </div>
        )}

        <div className="gx-inrow" style={{ marginTop: 14 }}>
          <button className="gx-btn gx-btn-primary" onClick={save}>保存</button>
          <button className="gx-btn" onClick={onClose}>取消</button>
          {mode === 'byok' && apiKey && <button className="gx-btn gx-btn-ghost gx-btn-sm danger" onClick={clearKey} style={{ marginLeft: 'auto' }}>清除 Key</button>}
        </div>
      </div>
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(38,36,31,.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 };
const panel = { background: 'var(--surface)', borderRadius: 16, padding: 20, maxWidth: 460, width: '100%', maxHeight: '90vh', overflow: 'auto' };
const field = { display: 'flex', flexDirection: 'column', gap: 4 };
const lab = { fontSize: 12, color: 'var(--text-2)' };

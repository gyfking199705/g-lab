/**
 * Agent CLI 交互研究 —— 复刻 + 对比业界 coding-agent CLI 的交互方式
 * ------------------------------------------------------------------
 * 两部分：
 *   1) 可玩的「终端式 agent 控制台」——复刻 Claude Code / Codex / Gemini CLI 的交互手感：
 *      命令行 composer、斜杠命令 + 自动补全、↑↓ 历史、Esc 中断、流式（思考/工具卡/diff/打字机）。
 *      默认离线模拟即可体验；/login 配置自己的 Key 后走真实 AI（BYOK，仅存本地）。
 *   2) 「玩法调研」——Claude Code / Codex / Gemini CLI 的交互模型对比 + 共性设计模式（附来源）。
 *
 * 纯逻辑在 ./engine.js（已单测）；研究数据在 ./notes.js（已单测）；真实模型走 ./ai.js（BYOK）。
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  SLASH_COMMANDS, DEMO_PROMPT, parseInput, matchSlash, estimateTokens,
  seedFiles, diffStat, planAgentRun, agentSystemPrompt, agentToolSystemPrompt,
  APPROVAL_MODES, needsApproval, matrixToMarkdown,
} from './engine.js';
import {
  PROVIDERS, callChat, runRealAgent, loadAIConfig, saveAIConfig, isConfigured, resolveModel,
} from './ai.js';
import { CLIS, MATRIX, PATTERNS, SOURCES } from './notes.js';

let _seq = 0;
const nid = () => `it_${Date.now().toString(36)}_${_seq++}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function AgentCli() {
  return (
    <div className="ac-page">
      <style>{PAGE_CSS}{CLI_CSS}</style>
      <header className="ac-hero">
        <h1>🖥️ Agent CLI 交互研究</h1>
        <p>把 Claude Code / Codex / Gemini CLI 这类「命令行 agent」的交互方式拆开来看，并做一个可上手把玩的复刻。</p>
        <div className="ac-herotags">
          <span>终端式 REPL</span><span>斜杠命令</span><span>工具调用 + diff</span><span>流式 · 可中断</span><span>分级放权（审批模式）</span><span>真实工具循环</span>
        </div>
      </header>

      <section className="ac-section">
        <div className="ac-sechead"><h2>① 上手玩：终端式 agent 控制台</h2>
          <span className="ac-sub">离线即可玩 · 试 <code>/demo</code> 或 <code>/help</code></span></div>
        <Console />
      </section>

      <section className="ac-section">
        <div className="ac-sechead"><h2>② 调研：业界六家怎么做交互</h2>
          <span className="ac-sub">Claude Code · Codex CLI · Gemini CLI · Aider · Cline · Continue</span></div>
        <ResearchPanel />
      </section>
    </div>
  );
}

/* ============================ 终端控制台 ============================ */
function Console() {
  const [history, setHistory] = useState(() => [{ id: nid(), type: 'banner' }]);
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [files, setFiles] = useState(() => seedFiles());
  const [theme, setTheme] = useState('dark');
  const [aiOpen, setAiOpen] = useState(false);
  const [, setAiTick] = useState(0);
  const [menuIdx, setMenuIdx] = useState(0);
  const [approval, setApproval] = useState('auto-edit'); // 审批模式：suggest / auto-edit / full-auto

  const cfg = loadAIConfig();
  const aiReady = isConfigured(cfg);
  const model = resolveModel(cfg);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const cancelRef = useRef(false);
  const abortRef = useRef(null);
  const cmdHistRef = useRef([]);
  const histPtrRef = useRef(-1);
  const modeRef = useRef(approval);     // 给 async 闭包读最新审批模式
  const approvalRef = useRef(null);     // 待决审批的 resolver
  useEffect(() => { modeRef.current = approval; }, [approval]);

  const menu = matchSlash(input);

  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [history]);
  useEffect(() => {
    const h = () => setAiTick((t) => t + 1);
    window.addEventListener('ai-config-changed', h);
    return () => window.removeEventListener('ai-config-changed', h);
  }, []);
  useEffect(() => { setMenuIdx(0); }, [input]);
  // 输入框随内容自适应高度（Shift+Enter 多行时增高，发送清空后回落）
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(160, el.scrollHeight) + 'px';
  }, [input]);

  const push = useCallback((item) => { setHistory((h) => [...h, { id: nid(), ...item }]); }, []);
  const update = useCallback((id, patch) => { setHistory((h) => h.map((it) => (it.id === id ? { ...it, ...patch } : it))); }, []);

  const streamInto = useCallback(async (id, full) => {
    const step = 3;
    for (let i = 0; i <= full.length; i += step) {
      if (cancelRef.current) { update(id, { text: full.slice(0, i) + ' ⏹', streaming: false }); return; }
      update(id, { text: full.slice(0, i), streaming: true });
      await sleep(10);
    }
    update(id, { text: full, streaming: false });
  }, [update]);

  // 审批门：按当前模式决定是否需要人工批准；返回是否放行
  const requestApproval = useCallback((toolName, argStr) => new Promise((resolve) => {
    const id = nid();
    setHistory((h) => [...h, { id, type: 'approval', tool: toolName, arg: argStr, status: 'pending' }]);
    approvalRef.current = (decision) => {
      approvalRef.current = null;
      update(id, { status: decision });
      resolve(decision === 'approve');
    };
  }), [update]);
  const gate = useCallback(async (toolName, argStr) => {
    if (cancelRef.current) return false;
    if (!needsApproval(modeRef.current, toolName)) return true;
    return await requestApproval(toolName, argStr);
  }, [requestApproval]);

  const playEvents = useCallback(async (events, finalFiles) => {
    for (const ev of events) {
      if (cancelRef.current) break;
      if (ev.kind === 'thinking') {
        push({ type: 'thinking', text: ev.text });
        await sleep(420);
      } else if (ev.kind === 'tool') {
        const ok = await gate(ev.tool, ev.arg);
        if (!ok) { push({ type: 'system', text: `✗ 已拒绝 ${ev.tool}(${ev.arg})，停止本次任务。` }); break; }
        const id = nid();
        setHistory((h) => [...h, { id, type: 'tool', tool: ev.tool, arg: ev.arg, summary: ev.summary, status: 'running' }]);
        await sleep(ev.ms || 500);
        if (cancelRef.current) { update(id, { status: 'error', detail: '已中断' }); break; }
        update(id, { status: 'done', detail: ev.detail });
      } else if (ev.kind === 'diff') {
        push({ type: 'diff', file: ev.file, diff: ev.diff });
        await sleep(220);
      } else if (ev.kind === 'text') {
        const id = nid();
        setHistory((h) => [...h, { id, type: 'assistant', text: '', streaming: true }]);
        await streamInto(id, ev.text);
      }
    }
    if (finalFiles && !cancelRef.current) setFiles(finalFiles);
  }, [push, update, streamInto, gate]);

  // 真实 AI：BYOK 直连用 function-calling 工具循环（工具卡 + diff + 审批门）；代理模式退回纯聊天
  const runReal = useCallback(async (prompt) => {
    const liveCfg = loadAIConfig();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    try {
      if (liveCfg.mode === 'proxy') {
        const id = nid();
        push({ type: 'thinking', text: `调用你的模型（${model}，代理模式·纯聊天）…` });
        setHistory((h) => [...h, { id, type: 'assistant', text: '', streaming: true }]);
        const text = await callChat({ config: liveCfg, system: agentSystemPrompt(), user: prompt, maxTokens: 1500, signal });
        await streamInto(id, text);
        return;
      }
      push({ type: 'thinking', text: `调用你的模型（${model}）·工具循环…` });
      const { files: nf } = await runRealAgent({
        config: liveCfg,
        system: agentToolSystemPrompt(),
        user: prompt,
        files,
        signal,
        onText: (t) => { const id = nid(); setHistory((h) => [...h, { id, type: 'assistant', text: '', streaming: true }]); streamInto(id, t); },
        onToolStart: (display, argStr) => { const id = nid(); setHistory((h) => [...h, { id, type: 'tool', tool: display, arg: argStr, status: 'running' }]); return id; },
        onToolEnd: (id, r) => { update(id, { status: r.ok === false ? 'error' : 'done', detail: r.result }); if (r.diff && r.diff.length) push({ type: 'diff', file: '(edit)', diff: r.diff }); },
        onApproval: (display, argStr) => gate(display, argStr),
      });
      if (nf && !cancelRef.current) setFiles(nf);
    } catch (e) {
      push({ type: 'error', text: `调用失败：${e && e.message ? e.message : String(e)}` });
    } finally { abortRef.current = null; }
  }, [model, push, update, streamInto, files, gate]);

  const handlePrompt = useCallback(async (prompt) => {
    setRunning(true);
    cancelRef.current = false;
    try {
      if (aiReady) await runReal(prompt);
      else { const { events, finalFiles } = planAgentRun(prompt, files); await playEvents(events, finalFiles); }
    } finally { setRunning(false); cancelRef.current = false; }
  }, [aiReady, runReal, playEvents, files]);

  function handleInit() {
    setRunning(true);
    cancelRef.current = false;
    (async () => {
      const content = [
        '# AGENTS.md', '', '## 项目', 'demo-app —— 用于演示 Agent CLI 交互的迷你 Node 项目。', '',
        '## 常用命令', '- `npm start`：运行 src/index.js', '- `npm test`：node --test', '',
        '## 结构', Object.keys(files).map((f) => `- ${f}`).join('\n'),
      ].join('\n');
      const nf = { ...files, 'AGENTS.md': content + '\n' };
      const evs = [
        { kind: 'thinking', text: '扫描项目结构，准备生成 AGENTS.md。' },
        { kind: 'tool', tool: 'Bash', arg: 'ls -R', summary: '浏览目录', detail: Object.keys(files).join('  '), ms: 500 },
        { kind: 'tool', tool: 'Read', arg: 'package.json', summary: '读取 package.json', detail: 'Read 10 lines', ms: 420 },
        { kind: 'tool', tool: 'Write', arg: 'AGENTS.md', summary: '写入 AGENTS.md', detail: `+${content.split('\n').length} lines`, ms: 500 },
        { kind: 'text', text: '已生成 `AGENTS.md`（离线模拟）。可用 /cat AGENTS.md 查看。' },
      ];
      await playEvents(evs, nf);
      setRunning(false);
    })();
  }

  const runSlash = useCallback((name, argv) => {
    switch (name) {
      case '/help': push({ type: 'help' }); break;
      case '/clear': setHistory([{ id: nid(), type: 'system', text: '会话已清空。' }]); break;
      case '/model': {
        const list = (PROVIDERS[cfg.provider] || PROVIDERS.anthropic).models;
        const next = list[(list.indexOf(model) + 1) % list.length];
        saveAIConfig({ ...loadAIConfig(), model: next });
        setAiTick((t) => t + 1);
        push({ type: 'system', text: `模型切换为 ${next}（仅本地记录；未配置 Key 时只影响显示）。` });
        break;
      }
      case '/login': setAiOpen(true); break;
      case '/status': push({ type: 'system', text: [
        `模型      ${model}`,
        `AI 状态   ${aiReady ? '已就绪（真实调用 · 工具循环）' : '未配置（离线模拟）'}`,
        `厂商      ${cfg.provider || 'anthropic'}`,
        `审批模式  ${approval}`,
        `工作目录  ~/demo-app`,
        `文件      ${Object.keys(files).length} 个`,
        `消息      ${history.filter((h) => h.type === 'user' || h.type === 'assistant').length} 条`,
      ].join('\n') }); break;
      case '/approval': {
        const ids = APPROVAL_MODES.map((m) => m.id);
        const next = ids[(ids.indexOf(modeRef.current) + 1) % ids.length];
        setApproval(next);
        const m = APPROVAL_MODES.find((x) => x.id === next);
        push({ type: 'system', text: `审批模式 → ${next}：${m.hint}` });
        break;
      }
      case '/cost': { const tok = history.reduce((s, h) => s + estimateTokens(h.text || ''), 0); push({ type: 'system', text: `本次会话约 ${tok} tokens（粗略估算，仅供参考）。` }); break; }
      case '/init': handleInit(); break;
      case '/diff': { const last = [...history].reverse().find((h) => h.type === 'diff'); if (last) push({ type: 'diff', file: last.file, diff: last.diff }); else push({ type: 'system', text: '还没有改动可显示。试试 /demo 或描述一个改代码的诉求。' }); break; }
      case '/ls': push({ type: 'system', text: Object.keys(files).map((f) => `  ${f}`).join('\n') }); break;
      case '/cat': { const f = argv[0]; if (!f) push({ type: 'error', text: '用法：/cat <file>，如 /cat src/utils.js' }); else if (files[f] == null) push({ type: 'error', text: `没有这个文件：${f}（用 /ls 看看）` }); else push({ type: 'file', file: f, text: files[f] }); break; }
      case '/demo': push({ type: 'user', text: DEMO_PROMPT }); cmdHistRef.current.unshift(DEMO_PROMPT); handlePrompt(DEMO_PROMPT); break;
      case '/theme': setTheme((t) => (t === 'dark' ? 'light' : 'dark')); push({ type: 'system', text: '已切换主题。' }); break;
      case '/reset': setFiles(seedFiles()); push({ type: 'system', text: '虚拟项目文件已重置。' }); break;
      case '/about': push({ type: 'about' }); break;
      default: push({ type: 'error', text: `未知命令：${name}（输入 /help 看全部）` });
    }
  }, [push, model, aiReady, cfg.provider, files, history, handlePrompt, approval]);

  const submit = useCallback(() => {
    if (running) return;
    const raw = input;
    const parsed = parseInput(raw);
    if (parsed.type === 'empty') return;
    setInput('');
    histPtrRef.current = -1;
    if (raw.trim()) cmdHistRef.current.unshift(raw.trim());
    if (parsed.type === 'slash') { push({ type: 'cmd', text: raw.trim() }); runSlash(parsed.name, parsed.argv); }
    else { push({ type: 'user', text: parsed.text }); handlePrompt(parsed.text); }
  }, [input, running, push, runSlash, handlePrompt]);

  const interrupt = useCallback(() => {
    cancelRef.current = true;
    if (abortRef.current) abortRef.current.abort();
    push({ type: 'system', text: '⏹ 已请求中断。' });
  }, [push]);

  const onKeyDown = (e) => {
    if (menu.length && !running) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMenuIdx((i) => (i + 1) % menu.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMenuIdx((i) => (i - 1 + menu.length) % menu.length); return; }
      if (e.key === 'Tab') { e.preventDefault(); setInput(menu[menuIdx].name + ' '); return; }
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setInput(''); const cmd = menu[menuIdx].name; push({ type: 'cmd', text: cmd }); runSlash(cmd, []); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); return; }
    if (e.key === 'Escape') { e.preventDefault(); if (approvalRef.current) { approvalRef.current('reject'); } if (running) interrupt(); else setInput(''); return; }
    if (!menu.length) {
      if (e.key === 'ArrowUp') {
        const list = cmdHistRef.current;
        if (list.length && (input === '' || histPtrRef.current >= 0)) { e.preventDefault(); histPtrRef.current = Math.min(histPtrRef.current + 1, list.length - 1); setInput(list[histPtrRef.current]); }
      } else if (e.key === 'ArrowDown') {
        const list = cmdHistRef.current;
        if (histPtrRef.current >= 0) { e.preventDefault(); histPtrRef.current -= 1; setInput(histPtrRef.current < 0 ? '' : list[histPtrRef.current]); }
      }
    }
  };

  const tokens = history.reduce((s, h) => s + estimateTokens(h.text || ''), 0);

  return (
    <div className={`cli-root cli-${theme}`} onClick={() => inputRef.current && inputRef.current.focus()}>
      <div className="cli-titlebar">
        <span className="cli-dots"><i /><i /><i /></span>
        <span className="cli-title">agent-cli · ~/demo-app</span>
        <span className="cli-titleacts" onClick={(e) => e.stopPropagation()}>
          <button className="cli-tbtn" title="切换主题" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}>{theme === 'dark' ? '☾' : '☀'}</button>
          <button className={`cli-tbtn ${aiReady ? 'on' : ''}`} onClick={() => setAiOpen(true)}>{aiReady ? '✨ AI 已就绪' : '✨ 配置 AI'}</button>
        </span>
      </div>

      <div className="cli-screen" ref={scrollRef}>
        {history.map((it) => <Line key={it.id} it={it} onDecide={(d) => approvalRef.current && approvalRef.current(d)} />)}
        {running && <div className="cli-runhint">运行中… <span className="cli-blink">▋</span> <span className="cli-dim">按 Esc 中断</span></div>}
      </div>

      {menu.length > 0 && !running && (
        <div className="cli-menu" onClick={(e) => e.stopPropagation()}>
          {menu.map((c, i) => (
            <div key={c.name} className={`cli-menuitem ${i === menuIdx ? 'sel' : ''}`} onMouseEnter={() => setMenuIdx(i)}
              onClick={() => { setInput(''); push({ type: 'cmd', text: c.name }); runSlash(c.name, []); }}>
              <span className="cli-menuname">{c.name}</span><span className="cli-menudesc">{c.desc}</span>
            </div>
          ))}
        </div>
      )}

      <div className="cli-composer" onClick={(e) => e.stopPropagation()}>
        <span className="cli-prompt">{running ? '…' : '›'}</span>
        <textarea ref={inputRef} className="cli-input" rows={1} spellCheck={false}
          placeholder={running ? '任务运行中（Esc 中断）…' : '问点什么，或输入 / 看命令 —— 试试 /demo'}
          value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown} disabled={running} />
        <button className="cli-send" onClick={submit} disabled={running || !input.trim()}>↵</button>
      </div>

      <div className="cli-statusbar" onClick={(e) => e.stopPropagation()}>
        <span>{aiReady ? '● 真实 AI' : '○ 离线模拟'}</span>
        <span>{model}</span>
        <span className="cli-approval" title="审批模式（分级放权）">
          {APPROVAL_MODES.map((m) => (
            <button key={m.id} className={approval === m.id ? 'on' : ''} title={m.hint} onClick={() => setApproval(m.id)}>{m.label}</button>
          ))}
        </span>
        <span className="cli-spacer" />
        <span>~/demo-app · {Object.keys(files).length} files</span>
        <span>≈{tokens} tok</span>
      </div>

      {aiOpen && <AISettings onClose={() => { setAiOpen(false); setAiTick((t) => t + 1); }} />}
    </div>
  );
}

/* ----------------------------- 单行渲染 ----------------------------- */
function Line({ it, onDecide }) {
  switch (it.type) {
    case 'approval':
      return (
        <div className={`cli-approvalrow ${it.status}`}>
          <span className="cli-aprompt">⏸</span>
          <span className="cli-atext">需要批准：<span className="cli-toolname">{it.tool}</span><span className="cli-toolarg">({it.arg})</span></span>
          {it.status === 'pending' ? (
            <span className="cli-apacts">
              <button className="cli-apbtn ok" onClick={() => onDecide && onDecide('approve')}>批准 ↵</button>
              <button className="cli-apbtn no" onClick={() => onDecide && onDecide('reject')}>拒绝 Esc</button>
            </span>
          ) : (
            <span className={`cli-apdone ${it.status}`}>{it.status === 'approve' ? '✓ 已批准' : '✗ 已拒绝'}</span>
          )}
        </div>
      );
    case 'banner':
      return (
        <div className="cli-banner">
          <div className="cli-banner-h">✻ Agent CLI <span className="cli-dim">— 终端式 agent 控制台</span></div>
          <div className="cli-banner-b">
            像 Claude Code / Codex / Gemini CLI 那样在终端里干活：描述诉求 → 看它「思考 · 调工具 · 改代码」。
            {'\n'}默认<strong>离线模拟</strong>即可体验；配置 <code>/login</code> 接你自己的 AI 后走<strong>真实工具循环</strong>（function calling）。
            {'\n'}底部可切<strong>审批模式</strong>：suggest 每步批准 / auto-edit 改文件自动·命令批准 / full-auto 全自动——亲手体验「分级放权」。
          </div>
          <div className="cli-banner-tips">
            <span><code>/demo</code> 跑个示例任务</span><span><code>/help</code> 全部命令</span>
            <span><code>/approval</code> 切审批档</span>
            <span><code>↑</code> 历史 · <code>Tab</code> 补全 · <code>Esc</code> 中断</span>
          </div>
        </div>
      );
    case 'help':
      return (
        <div className="cli-block">
          <div className="cli-blockhead">可用命令</div>
          {SLASH_COMMANDS.map((c) => (<div className="cli-cmdrow" key={c.name}><span className="cli-cmdname">{c.name}</span><span className="cli-cmddesc">{c.desc}</span></div>))}
          <div className="cli-blockhead" style={{ marginTop: 10 }}>快捷键</div>
          <div className="cli-cmdrow"><span className="cli-cmdname">Enter</span><span className="cli-cmddesc">发送（Shift+Enter 换行）</span></div>
          <div className="cli-cmdrow"><span className="cli-cmdname">↑ / ↓</span><span className="cli-cmddesc">调取历史输入 / 在补全里选择</span></div>
          <div className="cli-cmdrow"><span className="cli-cmdname">Tab</span><span className="cli-cmddesc">补全斜杠命令</span></div>
          <div className="cli-cmdrow"><span className="cli-cmdname">Esc</span><span className="cli-cmddesc">中断正在运行的任务</span></div>
        </div>
      );
    case 'about':
      return (
        <div className="cli-block">
          <div className="cli-blockhead">关于</div>
          <div className="cli-abouttext">
            这是 g-lab 的子项目 <code>agent-cli</code>，用来复刻并对比业界 coding-agent CLI（Claude Code / Codex / Gemini CLI）的交互方式。
            {'\n'}纯前端、零后端：离线模拟 agent + 虚拟文件系统演示交互；接上你自己的 API Key 即真实可用。
            {'\n'}核心逻辑见 <code>engine.js</code>（已单测），交互在 <code>AgentCli.jsx</code>，调研数据在 <code>notes.js</code>。
          </div>
        </div>
      );
    case 'user': return <div className="cli-user"><span className="cli-uprompt">›</span><span className="cli-utext">{it.text}</span></div>;
    case 'cmd': return <div className="cli-cmd"><span className="cli-uprompt">›</span><span className="cli-cmdtext">{it.text}</span></div>;
    case 'thinking': return <div className="cli-thinking">✻ {it.text}</div>;
    case 'assistant': return <div className="cli-assistant"><span className="cli-bullet">●</span><span className="cli-atext">{renderText(it.text)}{it.streaming && <span className="cli-blink">▋</span>}</span></div>;
    case 'tool':
      return (
        <div className="cli-tool">
          <div className="cli-toolhead">
            <span className={`cli-bullet ${it.status}`}>{it.status === 'running' ? '◍' : it.status === 'error' ? '✗' : '●'}</span>
            <span className="cli-toolname">{it.tool}</span><span className="cli-toolarg">({it.arg})</span>
            {it.summary && <span className="cli-toolsum">{it.summary}</span>}
          </div>
          <div className="cli-toolresult"><span className="cli-branch">⎿</span><span className={`cli-tooldetail ${it.status}`}>{it.status === 'running' ? '…' : (it.detail || '')}</span></div>
        </div>
      );
    case 'diff':
      return (
        <div className="cli-diff">
          <div className="cli-difffile">{it.file} <span className="cli-dim">{statLabel(it.diff)}</span></div>
          <pre className="cli-diffbody">{it.diff.map((d, i) => (<div key={i} className={`cli-dl ${d.type}`}><span className="cli-dsign">{d.type === 'add' ? '+' : d.type === 'del' ? '-' : ' '}</span>{d.text || ' '}</div>))}</pre>
        </div>
      );
    case 'file': return <div className="cli-diff"><div className="cli-difffile">{it.file}</div><pre className="cli-filebody">{it.text}</pre></div>;
    case 'system': return <pre className="cli-system">{it.text}</pre>;
    case 'error': return <div className="cli-error">⚠ {it.text}</div>;
    default: return null;
  }
}

function statLabel(diff) { const s = diffStat(diff); return `+${s.added} -${s.removed}`; }

function renderText(text) {
  const t = String(text || '');
  return t.split(/(`[^`]+`)/g).map((p, i) => (p.startsWith('`') && p.endsWith('`') && p.length > 1 ? <code key={i} className="cli-code">{p.slice(1, -1)}</code> : <span key={i}>{p}</span>));
}

/* ============================ BYOK 设置弹窗（自包含） ============================ */
function AISettings({ onClose }) {
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
    saveAIConfig({ ...init, enabled: true, mode, provider, model: model.trim(), apiKey: apiKey.trim(), baseURL: baseURL.trim(), proxyURL: proxyURL.trim(), accessToken: accessToken.trim() });
    onClose();
  };

  return (
    <div className="ac-overlay" onClick={onClose}>
      <div className="ac-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ac-modalhead"><h3>✨ AI 设置（BYOK）</h3><button className="ac-x" onClick={onClose}>✕</button></div>
        <p className="ac-modalp">用<strong>你自己的</strong> API Key 直连厂商。Key <strong>只存在本机浏览器</strong>，不入库、不经任何服务器。需要的是 API Key（按量付费），不是订阅。</p>
        <div className="ac-seg">
          <button className={mode === 'byok' ? 'on' : ''} onClick={() => setMode('byok')}>自带 Key 直连</button>
          <button className={mode === 'proxy' ? 'on' : ''} onClick={() => setMode('proxy')}>走后端代理</button>
        </div>
        {mode === 'byok' ? (
          <div className="ac-fields">
            <label><span>厂商</span>
              <div className="ac-seg sm">{Object.keys(PROVIDERS).map((k) => (<button key={k} className={provider === k ? 'on' : ''} onClick={() => { setProvider(k); setModel(''); }}>{PROVIDERS[k].label}</button>))}</div>
            </label>
            <label><span>模型</span>
              <select value={model} onChange={(e) => setModel(e.target.value)}>
                <option value="">默认（{preset.defaultModel}）</option>
                {preset.models.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label><span>API Key</span>
              <input type="password" autoComplete="off" placeholder={preset.keyHint} value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
              <a href={preset.keyUrl} target="_blank" rel="noreferrer">从这里获取 Key →</a>
            </label>
            <label><span>自定义 BaseURL（可选，反代/中转）</span>
              <input placeholder={preset.defaultBaseURL} value={baseURL} onChange={(e) => setBaseURL(e.target.value)} /></label>
          </div>
        ) : (
          <div className="ac-fields">
            <p className="ac-modalp">把 Key 放服务端、前端只调你的代理（不暴露 Key）。</p>
            <label><span>代理 URL</span><input placeholder="https://your-proxy.workers.dev/" value={proxyURL} onChange={(e) => setProxyURL(e.target.value)} /></label>
            <label><span>访问令牌（可选）</span><input type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} /></label>
          </div>
        )}
        <div className="ac-modalacts">
          <button className="ac-btn primary" onClick={save}>保存</button>
          <button className="ac-btn" onClick={onClose}>取消</button>
          {mode === 'byok' && apiKey && <button className="ac-btn ghost" onClick={() => setApiKey('')} style={{ marginLeft: 'auto' }}>清除 Key</button>}
        </div>
      </div>
    </div>
  );
}

/* ============================ agentic 循环示意（手写 SVG，无图表库；可自动演示） ============================ */
const LOOP_STEPS = [
  { label: '诉求', sub: 'prompt', cx: 64, caption: '① 你给出诉求（自然语言）' },
  { label: '推理', sub: 'reason', cx: 220, caption: '② 推理：想清楚下一步要做什么' },
  { label: '调用工具', sub: 'act', cx: 376, caption: '③ 调用工具：经审批/沙箱后读文件·改代码·跑命令' },
  { label: '观察', sub: 'observe', cx: 532, caption: '④ 观察工具返回，更新认知' },
  { label: '回答', sub: 'answer', cx: 668, accent: true, caption: '⑤ 不够 → 回到②继续循环；够了 → 给出回答' },
];

function LoopDiagram() {
  const C = { bd: '#E3E0D7', t1: '#26241F', t2: '#83827A', t3: '#B0AFA5', accent: '#CC785C', accent2: '#B5654A', surf: '#FFFFFF', soft: '#F5ECE5' };
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(-1);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setActive((i) => (i + 1) % LOOP_STEPS.length), 1100);
    return () => clearInterval(t);
  }, [playing]);
  const toggle = () => { if (playing) { setPlaying(false); setActive(-1); } else { setActive(0); setPlaying(true); } };
  const w = 104, h = 46, y = 78;
  const Box = ({ cx, label, sub, accent }, i) => {
    const on = active === i;
    return (
      <g key={label} style={{ transition: 'opacity .2s' }} opacity={active >= 0 && !on ? 0.45 : 1}>
        <rect x={cx - w / 2} y={y} width={w} height={h} rx={11}
          fill={on ? C.soft : accent ? C.soft : C.surf} stroke={on || accent ? C.accent : C.bd} strokeWidth={on ? 2 : accent ? 1.4 : 1.2} />
        <text x={cx} y={y + 20} textAnchor="middle" fontSize="14" fontFamily="Georgia, serif" fontWeight="600" fill={on || accent ? C.accent2 : C.t1}>{label}</text>
        <text x={cx} y={y + 36} textAnchor="middle" fontSize="9.5" fill={C.t3} letterSpacing="0.5">{sub}</text>
      </g>
    );
  };
  const arrow = (x1, x2) => <line x1={x1} y1={y + h / 2} x2={x2} y2={y + h / 2} stroke={C.t3} strokeWidth="1.4" markerEnd="url(#ac-ah)" />;
  const loopOn = active === LOOP_STEPS.length - 1;
  return (
    <div>
      <div className="ac-diagbar">
        <button className="ac-playbtn" onClick={toggle}>{playing ? '⏸ 停止' : '▶ 自动演示'}</button>
        <span className="ac-caption">{active >= 0 ? LOOP_STEPS[active].caption : '点「自动演示」逐步走一遍 agentic 循环'}</span>
      </div>
      <svg viewBox="0 0 730 168" width="100%" style={{ display: 'block', minWidth: 560 }} role="img" aria-label="agentic ReAct 循环示意图">
        <defs>
          <marker id="ac-ah" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill={C.t3} /></marker>
          <marker id="ac-ah-a" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill={C.accent} /></marker>
        </defs>
        {arrow(64 + w / 2, 220 - w / 2)}
        {arrow(220 + w / 2, 376 - w / 2)}
        {arrow(376 + w / 2, 532 - w / 2)}
        {arrow(532 + w / 2, 668 - w / 2)}
        {/* 审批 / 沙箱门：在「推理→调用工具」之间 */}
        <g>
          <line x1={298} y1={y + h / 2 - 10} x2={298} y2={y + h / 2 + 10} stroke={C.accent} strokeWidth="1.4" strokeDasharray="3 2" />
          <text x={298} y={y - 6} textAnchor="middle" fontSize="10" fill={C.accent2}>审批 · 沙箱</text>
        </g>
        {/* 回环箭头：观察 → 推理（继续循环），自动演示到末步时高亮 */}
        <path d={`M532,${y} C532,28 220,28 220,${y - 2}`} fill="none" stroke={C.accent} strokeWidth={loopOn ? 2.4 : 1.5} strokeDasharray="4 3" markerEnd="url(#ac-ah-a)" opacity={loopOn ? 1 : 0.75} />
        <text x={376} y={22} textAnchor="middle" fontSize="11" fill={C.accent2}>继续循环（还需要更多信息 / 下一步动作）</text>
        <text x={600} y={y + h + 20} textAnchor="middle" fontSize="10" fill={C.t2}>满足后才结束</text>
        {LOOP_STEPS.map((b, i) => Box(b, i))}
      </svg>
    </div>
  );
}

/* ============================ 调研对比面板 ============================ */
function ResearchPanel() {
  const [copied, setCopied] = useState(false);
  const copyMatrix = async () => {
    const md = matrixToMarkdown(MATRIX);
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (e) {
      // 退化：选中提示
      window.prompt('复制下面的 Markdown：', md);
    }
  };
  return (
    <>
      <div className="ac-clis">
        {CLIS.map((c) => (
          <div className="ac-card" key={c.id}>
            <div className="ac-cardhead">
              <span className="ac-glyph">{c.glyph}</span>
              <div><div className="ac-cardname">{c.name}</div><div className="ac-cardvendor">{c.vendor}</div></div>
            </div>
            <div className="ac-tagline">{c.tagline}</div>
            <div className="ac-loop"><span className="ac-looplabel">循环</span>{c.loop}</div>
            <dl className="ac-rows">
              {c.rows.map(([k, v]) => (<div className="ac-row" key={k}><dt>{k}</dt><dd>{v}</dd></div>))}
            </dl>
            <div className="ac-srcline">来源：{c.sources.map((s, i) => (<React.Fragment key={s}>{i > 0 && '、'}<a href={SOURCES[s].url} target="_blank" rel="noreferrer">[{s + 1}]</a></React.Fragment>))}</div>
          </div>
        ))}
      </div>

      <div className="ac-sechead" style={{ marginTop: 26 }}>
        <h2 className="ac-h3">速查矩阵</h2>
        <span className="ac-sub" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          维度 × 六家 · 横向滚动可看全
          <button className="ac-copybtn" onClick={copyMatrix}>{copied ? '✓ 已复制' : '⧉ 复制为 Markdown'}</button>
        </span>
      </div>
      <div className="ac-matrixwrap">
        <table className="ac-matrix">
          <thead>
            <tr><th>维度</th>{MATRIX.cols.map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {MATRIX.rows.map((row) => (
              <tr key={row[0]}><th scope="row">{row[0]}</th>{row.slice(1).map((cell, i) => <td key={i}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ac-sechead" style={{ marginTop: 26 }}><h2 className="ac-h3">agentic 循环长什么样</h2><span className="ac-sub">ReAct：推理 → 调工具 → 观察 → 再推理，满足后才回答</span></div>
      <div className="ac-diagram"><LoopDiagram /></div>

      <div className="ac-sechead" style={{ marginTop: 26 }}><h2 className="ac-h3">③ 共性设计模式</h2><span className="ac-sub">跨产品反复出现 · 也是上面 demo 复刻的对象</span></div>
      <div className="ac-patterns">
        {PATTERNS.map(([t, d]) => (<div className="ac-pat" key={t}><div className="ac-patt">{t}</div><div className="ac-patd">{d}</div></div>))}
      </div>

      <div className="ac-sources">
        <div className="ac-sourceshead">参考来源</div>
        <ol>{SOURCES.map((s, i) => (<li key={i}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>))}</ol>
        <p className="ac-disclaim">写于 2026-06；各 CLI 的接口/命名随版本演进，以官方文档为准。本页纯前端、数据存本地浏览器；API Key 只存本机、不入库。</p>
      </div>
    </>
  );
}

/* ============================ 样式 ============================ */
const PAGE_CSS = `
.ac-page{
  --bg:#F6F5F0;--surface:#FFFFFF;--surface-2:#FBFAF6;--surface-3:#F1EFE8;
  --t1:#26241F;--t2:#83827A;--t3:#B0AFA5;
  --accent:#CC785C;--accent-2:#B5654A;--accent-soft:#F5ECE5;--bd:#ECEAE2;--bd-2:#E3E0D7;
  --serif:'Tiempos Text',Georgia,'Songti SC','STSong','Source Han Serif SC',serif;
  --sans:ui-sans-serif,system-ui,-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;
  font-family:var(--sans);color:var(--t1);max-width:1000px;margin:0 auto;
}
.ac-page *{box-sizing:border-box;}
.ac-hero{margin-bottom:30px;}
.ac-hero h1{font-family:var(--serif);font-size:30px;font-weight:600;letter-spacing:-.5px;}
.ac-hero p{color:var(--t2);font-size:15px;margin-top:10px;max-width:680px;line-height:1.65;}
.ac-herotags{display:flex;flex-wrap:wrap;gap:7px;margin-top:16px;}
.ac-herotags span{font-size:12px;color:var(--accent-2);background:var(--accent-soft);border-radius:999px;padding:3px 11px;}
.ac-section{margin-bottom:34px;}
.ac-sechead{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px;}
.ac-sechead h2,.ac-h3{font-family:var(--serif);font-size:19px;font-weight:600;letter-spacing:-.3px;}
.ac-sub{font-size:12.5px;color:var(--t3);}
.ac-sub code,.ac-sechead code{background:var(--surface-3);border-radius:5px;padding:0 5px;color:var(--accent-2);font-size:12px;}

/* CLI 对比卡 */
.ac-clis{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;}
.ac-card{background:var(--surface);border:1px solid var(--bd);border-radius:16px;padding:20px;}
.ac-cardhead{display:flex;align-items:center;gap:12px;margin-bottom:12px;}
.ac-glyph{font-size:26px;color:var(--accent);width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:var(--accent-soft);border-radius:11px;flex:none;}
.ac-cardname{font-family:var(--serif);font-size:18px;font-weight:600;}
.ac-cardvendor{font-size:11.5px;color:var(--t3);letter-spacing:.5px;}
.ac-tagline{font-size:13px;color:var(--accent-2);font-weight:500;margin-bottom:10px;}
.ac-loop{font-size:12.5px;color:var(--t2);line-height:1.6;background:var(--surface-2);border:1px solid var(--bd-soft,#F0EEE7);border-radius:10px;padding:9px 11px;margin-bottom:12px;}
.ac-looplabel{display:inline-block;font-size:10.5px;color:var(--accent-2);background:var(--accent-soft);border-radius:5px;padding:0 6px;margin-right:7px;font-weight:600;}
.ac-rows{display:flex;flex-direction:column;gap:8px;margin:0;}
.ac-row{display:grid;grid-template-columns:64px 1fr;gap:10px;align-items:start;}
.ac-row dt{font-size:12px;color:var(--t3);padding-top:1px;}
.ac-row dd{font-size:12.5px;color:var(--t1);line-height:1.55;margin:0;}
.ac-srcline{margin-top:13px;padding-top:11px;border-top:1px solid var(--bd);font-size:11.5px;color:var(--t3);}
.ac-srcline a,.ac-sources a{color:var(--accent-2);text-decoration:none;}
.ac-srcline a:hover,.ac-sources a:hover{text-decoration:underline;}

/* agentic 循环示意 */
.ac-diagram{overflow-x:auto;border:1px solid var(--bd);border-radius:14px;background:var(--surface);padding:14px 16px;}
.ac-diagbar{display:flex;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap;}
.ac-playbtn{font-family:var(--sans);font-size:12.5px;font-weight:500;cursor:pointer;border:1px solid var(--accent);background:var(--accent-soft);color:var(--accent-2);border-radius:8px;padding:5px 13px;transition:.15s;flex:none;}
.ac-playbtn:hover{background:var(--accent);color:#fff;}
.ac-caption{font-size:12.5px;color:var(--t2);}
.ac-copybtn{font-family:var(--sans);font-size:11.5px;cursor:pointer;border:1px solid var(--bd-2);background:var(--surface);color:var(--t2);border-radius:7px;padding:3px 10px;transition:.15s;}
.ac-copybtn:hover{border-color:var(--accent);color:var(--accent-2);}

/* 速查矩阵 */
.ac-matrixwrap{overflow-x:auto;border:1px solid var(--bd);border-radius:14px;background:var(--surface);}
.ac-matrix{border-collapse:collapse;width:100%;min-width:640px;font-size:12.5px;}
.ac-matrix th,.ac-matrix td{text-align:left;padding:9px 12px;border-bottom:1px solid var(--bd);vertical-align:top;line-height:1.5;}
.ac-matrix thead th{font-family:var(--serif);font-weight:600;color:var(--t1);background:var(--surface-2);position:sticky;top:0;}
.ac-matrix thead th:first-child{color:var(--t3);font-family:var(--sans);font-weight:500;}
.ac-matrix tbody th{font-weight:600;color:var(--accent-2);white-space:nowrap;background:var(--surface-2);}
.ac-matrix td{color:var(--t2);}
.ac-matrix tbody tr:last-child th,.ac-matrix tbody tr:last-child td{border-bottom:none;}
.ac-matrix tbody tr:hover td,.ac-matrix tbody tr:hover th{background:var(--surface-3);}

/* 共性模式 */
.ac-patterns{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;}
.ac-pat{background:var(--surface-2);border:1px solid var(--bd);border-radius:12px;padding:14px 16px;}
.ac-patt{font-family:var(--serif);font-size:14.5px;font-weight:600;margin-bottom:5px;}
.ac-patd{font-size:12.5px;color:var(--t2);line-height:1.6;}

/* 来源区 */
.ac-sources{margin-top:24px;background:var(--surface-2);border:1px solid var(--bd);border-radius:14px;padding:18px 20px;}
.ac-sourceshead{font-family:var(--serif);font-size:14px;font-weight:600;margin-bottom:10px;}
.ac-sources ol{margin:0 0 12px;padding-left:20px;display:flex;flex-direction:column;gap:5px;}
.ac-sources li{font-size:12.5px;color:var(--t2);}
.ac-disclaim{font-size:11.5px;color:var(--t3);line-height:1.6;}

/* 设置弹窗 */
.ac-overlay{position:fixed;inset:0;background:rgba(38,36,31,.34);display:flex;align-items:center;justify-content:center;z-index:80;padding:16px;}
.ac-modal{background:var(--surface);border-radius:16px;padding:20px;max-width:460px;width:100%;max-height:90vh;overflow:auto;font-family:var(--sans);}
.ac-modalhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
.ac-modalhead h3{font-family:var(--serif);font-size:17px;font-weight:600;}
.ac-x{border:none;background:none;color:var(--t3);font-size:15px;cursor:pointer;padding:4px 8px;border-radius:7px;}
.ac-x:hover{background:var(--surface-3);color:var(--t1);}
.ac-modalp{font-size:12px;color:var(--t2);line-height:1.6;margin-bottom:12px;}
.ac-seg{display:inline-flex;gap:3px;background:var(--surface-2);padding:3px;border-radius:10px;border:1px solid var(--bd);margin-bottom:12px;}
.ac-seg.sm{margin-bottom:0;}
.ac-seg button{border:none;background:none;padding:6px 13px;border-radius:8px;font-size:12.5px;cursor:pointer;color:var(--t2);font-family:var(--sans);}
.ac-seg button.on{background:var(--surface);color:var(--accent-2);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.04);}
.ac-fields{display:flex;flex-direction:column;gap:10px;}
.ac-fields label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--t2);}
.ac-fields input,.ac-fields select{padding:9px 12px;background:var(--surface-2);border:1px solid var(--bd);border-radius:9px;font-size:13px;color:var(--t1);font-family:var(--sans);width:100%;}
.ac-fields input:focus,.ac-fields select:focus{outline:none;background:var(--surface);border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft);}
.ac-fields a{font-size:11px;color:var(--accent-2);text-decoration:none;}
.ac-modalacts{display:flex;gap:8px;margin-top:14px;align-items:center;}
.ac-btn{padding:8px 15px;border:1px solid var(--bd);background:var(--surface);border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;font-family:var(--sans);color:var(--t1);}
.ac-btn.primary{background:var(--accent);color:#fff;border-color:var(--accent);}
.ac-btn.primary:hover{background:var(--accent-2);}
.ac-btn.ghost{border-color:transparent;color:var(--t3);}
.ac-btn.ghost:hover{color:var(--accent-2);}

@media(max-width:560px){ .ac-hero h1{font-size:25px;} }
`;

/* 终端样式（暖色，两套主题） */
const CLI_CSS = `
.cli-root{
  --mono:ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono','PingFang SC',monospace;
  border-radius:14px;overflow:hidden;font-family:var(--mono);font-size:13px;line-height:1.65;
  display:flex;flex-direction:column;max-height:70vh;min-height:430px;box-shadow:0 10px 34px -14px rgba(38,36,31,.30);
}
.cli-root *{box-sizing:border-box;}
.cli-dark{ --t-bg:#231F1A;--t-screen:#1E1A16;--t-card:#2A251F;--t-bd:#3A332B;
  --t-fg:#ECE5D8;--t-dim:#9C9384;--t-accent:#E2A781;--t-green:#A7C295;--t-red:#E0998A;--t-blue:#9DB9CC;--t-yellow:#D8B777;
  background:var(--t-bg);color:var(--t-fg); }
.cli-light{ --t-bg:#F1EFE8;--t-screen:#FBFAF6;--t-card:#FFFFFF;--t-bd:#E3E0D7;
  --t-fg:#26241F;--t-dim:#9A988E;--t-accent:#B5654A;--t-green:#5E8068;--t-red:#BC6055;--t-blue:#5C7E92;--t-yellow:#A77E3C;
  background:var(--t-bg);color:var(--t-fg); }

.cli-titlebar{display:flex;align-items:center;gap:10px;padding:9px 14px;background:var(--t-card);border-bottom:1px solid var(--t-bd);}
.cli-dots{display:inline-flex;gap:6px;}
.cli-dots i{width:11px;height:11px;border-radius:50%;background:var(--t-bd);}
.cli-dots i:nth-child(1){background:#E0998A;}.cli-dots i:nth-child(2){background:#D8B777;}.cli-dots i:nth-child(3){background:#A7C295;}
.cli-title{font-size:12px;color:var(--t-dim);letter-spacing:.3px;}
.cli-titleacts{margin-left:auto;display:flex;gap:7px;}
.cli-tbtn{font-family:var(--mono);font-size:11.5px;background:none;border:1px solid var(--t-bd);color:var(--t-dim);border-radius:7px;padding:4px 10px;cursor:pointer;transition:.15s;}
.cli-tbtn:hover{color:var(--t-fg);border-color:var(--t-accent);}
.cli-tbtn.on{color:var(--t-accent);border-color:var(--t-accent);}

.cli-screen{flex:1;overflow-y:auto;padding:16px 16px 8px;background:var(--t-screen);}
.cli-screen::-webkit-scrollbar{width:9px;}
.cli-screen::-webkit-scrollbar-thumb{background:var(--t-bd);border-radius:6px;}
.cli-dim{color:var(--t-dim);}
.cli-blink{animation:cliblink 1s steps(1) infinite;color:var(--t-accent);}
@keyframes cliblink{50%{opacity:0;}}

.cli-banner{border:1px solid var(--t-bd);border-radius:10px;padding:14px 16px;margin-bottom:14px;background:var(--t-card);}
.cli-banner-h{color:var(--t-accent);font-size:14px;margin-bottom:7px;}
.cli-banner-b{color:var(--t-fg);white-space:pre-wrap;opacity:.92;}
.cli-banner-b code,.cli-banner-tips code{color:var(--t-accent);}
.cli-banner-tips{display:flex;flex-wrap:wrap;gap:7px 18px;margin-top:10px;color:var(--t-dim);font-size:12px;}

.cli-user,.cli-cmd{display:flex;gap:9px;margin:12px 0 6px;}
.cli-uprompt{color:var(--t-accent);font-weight:600;flex:none;}
.cli-utext{color:var(--t-fg);white-space:pre-wrap;overflow-wrap:anywhere;}
.cli-cmdtext{color:var(--t-blue);white-space:pre-wrap;}
.cli-thinking{color:var(--t-dim);font-style:italic;margin:6px 0;opacity:.85;}
.cli-assistant{display:flex;gap:9px;margin:6px 0 12px;}
.cli-assistant .cli-bullet{color:var(--t-accent);flex:none;}
.cli-atext{white-space:pre-wrap;overflow-wrap:anywhere;}
.cli-code{font-family:var(--mono);background:var(--t-card);border:1px solid var(--t-bd);border-radius:5px;padding:0 5px;color:var(--t-accent);font-size:12px;}

.cli-tool{margin:5px 0;}
.cli-toolhead{display:flex;align-items:baseline;gap:7px;flex-wrap:wrap;}
.cli-toolhead .cli-bullet{flex:none;}
.cli-toolhead .cli-bullet.done{color:var(--t-green);}
.cli-toolhead .cli-bullet.running{color:var(--t-yellow);animation:cliblink 1s steps(1) infinite;}
.cli-toolhead .cli-bullet.error{color:var(--t-red);}
.cli-toolname{color:var(--t-fg);font-weight:600;}
.cli-toolarg{color:var(--t-blue);}
.cli-toolsum{color:var(--t-dim);font-size:12px;}
.cli-toolresult{display:flex;gap:7px;padding-left:7px;color:var(--t-dim);}
.cli-branch{color:var(--t-bd);flex:none;}
.cli-tooldetail{white-space:pre-wrap;overflow-wrap:anywhere;}
.cli-tooldetail.running{color:var(--t-yellow);}

.cli-diff{margin:8px 0;border:1px solid var(--t-bd);border-radius:9px;overflow:hidden;}
.cli-difffile{background:var(--t-card);padding:6px 12px;color:var(--t-fg);font-size:12px;border-bottom:1px solid var(--t-bd);}
.cli-diffbody,.cli-filebody{margin:0;padding:8px 0;background:var(--t-screen);overflow-x:auto;font-family:var(--mono);font-size:12.5px;}
.cli-filebody{padding:10px 12px;color:var(--t-fg);white-space:pre;}
.cli-dl{display:flex;gap:6px;padding:0 12px;white-space:pre;}
.cli-dl .cli-dsign{flex:none;width:9px;color:var(--t-dim);}
.cli-dl.add{background:rgba(110,144,121,.16);color:var(--t-green);}
.cli-dl.add .cli-dsign{color:var(--t-green);}
.cli-dl.del{background:rgba(188,96,85,.15);color:var(--t-red);}
.cli-dl.del .cli-dsign{color:var(--t-red);}

.cli-block{border:1px solid var(--t-bd);border-radius:9px;padding:11px 14px;margin:8px 0;background:var(--t-card);}
.cli-blockhead{color:var(--t-accent);font-size:12px;margin-bottom:7px;letter-spacing:.5px;text-transform:uppercase;}
.cli-cmdrow{display:flex;gap:14px;padding:2px 0;}
.cli-cmdname{color:var(--t-blue);flex:none;min-width:78px;}
.cli-cmddesc{color:var(--t-dim);}
.cli-abouttext{white-space:pre-wrap;color:var(--t-fg);opacity:.92;}
.cli-abouttext code,.cli-block code{color:var(--t-accent);}
.cli-system{margin:6px 0;color:var(--t-dim);white-space:pre-wrap;font-family:var(--mono);}
.cli-error{margin:6px 0;color:var(--t-red);}
.cli-runhint{color:var(--t-dim);margin:8px 0;font-size:12.5px;}

.cli-menu{background:var(--t-card);border-top:1px solid var(--t-bd);max-height:190px;overflow-y:auto;}
.cli-menuitem{display:flex;gap:14px;padding:6px 16px;cursor:pointer;}
.cli-menuitem.sel{background:var(--t-screen);}
.cli-menuname{color:var(--t-accent);min-width:78px;flex:none;}
.cli-menudesc{color:var(--t-dim);}

.cli-composer{display:flex;align-items:flex-end;gap:9px;padding:11px 14px;background:var(--t-card);border-top:1px solid var(--t-bd);}
.cli-prompt{color:var(--t-accent);font-weight:700;padding-bottom:6px;flex:none;}
.cli-input{flex:1;resize:none;border:none;outline:none;background:none;color:var(--t-fg);font-family:var(--mono);font-size:13.5px;line-height:1.6;max-height:160px;padding:4px 0;}
.cli-input::placeholder{color:var(--t-dim);}
.cli-send{flex:none;border:1px solid var(--t-bd);background:none;color:var(--t-accent);border-radius:8px;width:34px;height:32px;cursor:pointer;font-size:15px;transition:.15s;}
.cli-send:hover:not(:disabled){border-color:var(--t-accent);background:var(--t-screen);}
.cli-send:disabled{opacity:.4;cursor:default;}

.cli-statusbar{display:flex;align-items:center;gap:14px;padding:6px 14px;background:var(--t-screen);border-top:1px solid var(--t-bd);color:var(--t-dim);font-size:11.5px;flex-wrap:wrap;}
.cli-statusbar .cli-spacer{flex:1;}
/* 审批模式选择器（状态栏） */
.cli-approval{display:inline-flex;gap:2px;align-items:center;}
.cli-approval button{font-family:var(--mono);font-size:10.5px;background:none;border:1px solid var(--t-bd);color:var(--t-dim);border-radius:6px;padding:1px 7px;cursor:pointer;transition:.12s;}
.cli-approval button:hover{color:var(--t-fg);}
.cli-approval button.on{color:var(--t-accent);border-color:var(--t-accent);background:var(--t-card);}
/* 审批请求行 */
.cli-approvalrow{display:flex;align-items:center;gap:9px;margin:7px 0;padding:8px 11px;border:1px solid var(--t-accent);border-radius:9px;background:var(--t-card);flex-wrap:wrap;}
.cli-approvalrow.approve{border-color:var(--t-green);opacity:.7;}
.cli-approvalrow.reject{border-color:var(--t-red);opacity:.7;}
.cli-aprompt{color:var(--t-accent);flex:none;}
.cli-apacts{margin-left:auto;display:flex;gap:6px;}
.cli-apbtn{font-family:var(--mono);font-size:12px;border:1px solid var(--t-bd);background:none;border-radius:7px;padding:3px 11px;cursor:pointer;color:var(--t-fg);}
.cli-apbtn.ok{border-color:var(--t-green);color:var(--t-green);}
.cli-apbtn.ok:hover{background:var(--t-green);color:var(--t-bg);}
.cli-apbtn.no{border-color:var(--t-red);color:var(--t-red);}
.cli-apbtn.no:hover{background:var(--t-red);color:var(--t-bg);}
.cli-apdone{margin-left:auto;font-size:12px;}
.cli-apdone.approve{color:var(--t-green);}
.cli-apdone.reject{color:var(--t-red);}
@media(max-width:600px){ .cli-root{max-height:none;} }
`;

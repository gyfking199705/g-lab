import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { runJob } from '../core/engine.js';
import { topoLayers, progress } from '../core/queue.js';
import { getRole, roleList } from '../core/roles.js';
import { classify, buildPlan, planToSpecs, topologyLabel } from '../core/orchestrator.js';
import { PROVIDERS, defaultAIConfig, isConfigured } from '../core/ai.js';
import { estimateJobCost, formatUSD, formatTokens } from '../core/cost.js';
import { mdToHtml } from './markdown.js';

const LS_AI = 'swarm.ai.v1';
const LS_HISTORY = 'swarm.history.v1';

const SAMPLES = [
  '帮我做一个团队周报自动汇总工具',
  '调研一下要不要把后端从 REST 迁移到 GraphQL',
  '我该不该接受这个跳槽 offer',
  '写一篇介绍多智能体协作的科普短文',
];

const STATUS_LABEL = {
  queued: '排队中', planning: '拆解中', running: '执行中',
  synthesizing: '汇总中', done: '已完成', failed: '失败',
};
const TASK_LABEL = { queued: '排队', running: '运行中', done: '完成', failed: '失败' };

function load(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [aiConfig, setAIConfig] = useState(() => ({ ...defaultAIConfig(), ...load(LS_AI, {}) }));
  const [history, setHistory] = useState(() => load(LS_HISTORY, []));
  const [activeJob, setActiveJob] = useState(null);
  const [running, setRunning] = useState(false);
  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(LS_HISTORY, JSON.stringify(history.slice(0, 20)));
  }, [history]);

  const live = isConfigured(aiConfig) && aiConfig.enabled;

  const submit = useCallback(async () => {
    const requirement = input.trim();
    if (!requirement || running) return;
    setRunning(true);
    setInput('');
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const final = await runJob({
        requirement,
        config: live ? aiConfig : null,
        concurrency: 2,
        stepDelay: live ? 0 : 480,
        signal: ctrl.signal,
        onUpdate: (job) => setActiveJob({ ...job }),
      });
      setHistory((h) => [final, ...h].slice(0, 20));
      setActiveJob(final);
    } catch (e) {
      setActiveJob((j) => (j ? { ...j, status: 'failed', error: e?.message || String(e) } : j));
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [input, running, live, aiConfig]);

  const stop = () => abortRef.current?.abort();

  // 派单前预估：路由 + 步数/波次/token/花费（随输入与所选模型实时变化）
  const preview = useMemo(() => {
    const req = input.trim();
    if (!req) return null;
    const { plan, route } = buildPlan(req);
    const specs = planToSpecs(plan, (n) => `p${n}`);
    const model = (aiConfig.model || '').trim() || (aiConfig.provider === 'openai' ? 'gpt-4o-mini' : 'claude-sonnet-4-6');
    return { route, est: estimateJobCost(specs, { requirement: req, model }) };
  }, [input, aiConfig.model, aiConfig.provider]);

  return (
    <div className="sw">
      <Style />
      <header className="sw-top">
        <div className="sw-brand">
          <span className="sw-logo">🐝</span>
          <div>
            <div className="sw-title">多智能体协作工作区</div>
            <div className="sw-sub">需求进队列 · 多智能体分工 · 集群协作 · 给出结论</div>
          </div>
        </div>
        <div className="sw-topbtns">
          <span className={'sw-mode ' + (live ? 'on' : '')}>{live ? '🟢 AI 实跑' : '⚪ 离线模拟'}</span>
          <button className="sw-ghost" onClick={() => setShowSettings(true)}>AI 设置</button>
          <a className="sw-ghost" href="./RESEARCH.md">业界调研 ↗</a>
        </div>
      </header>

      <div className="sw-body">
        <aside className="sw-side">
          <div className="sw-panel-h">需求队列</div>
          <textarea
            className="sw-input"
            placeholder="把你的需求提进队列，例如：帮我做一个团队周报工具…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
            }}
            rows={3}
          />
          <div className="sw-actions">
            {running ? (
              <button className="sw-cta" onClick={stop}>■ 停止</button>
            ) : (
              <button className="sw-cta" onClick={submit} disabled={!input.trim()}>提交需求 →</button>
            )}
          </div>
          {!running && preview && (
            <div className="sw-preview">
              <div className="sw-preview-top">
                <span className={'sw-route ' + preview.route}>
                  {preview.route === 'fast' ? '⚡ 快路径' : `🧭 ${topologyLabel(classify(input.trim()))}`}
                </span>
                <span className="sw-preview-cost">~{formatUSD(preview.est.usd)}</span>
              </div>
              <div className="sw-preview-sub">
                派单前预估 · {preview.est.steps} 步 / {preview.est.waves} 波 · ~{formatTokens(preview.est.totalTokens)} tok
                <span className="sw-preview-model"> · 按 {preview.est.model} 计价</span>
              </div>
            </div>
          )}
          <div className="sw-samples">
            {SAMPLES.map((s) => (
              <button key={s} className="sw-chip" onClick={() => setInput(s)} disabled={running}>{s}</button>
            ))}
          </div>

          <div className="sw-panel-h" style={{ marginTop: 18 }}>历史</div>
          <div className="sw-history">
            {history.length === 0 && <div className="sw-empty">还没有记录。</div>}
            {history.map((j) => (
              <button
                key={j.id}
                className={'sw-hist-item' + (activeJob && activeJob.id === j.id ? ' sel' : '')}
                onClick={() => !running && setActiveJob(j)}
              >
                <span className="sw-hist-req">{j.requirement}</span>
                <span className={'sw-badge ' + j.status}>{STATUS_LABEL[j.status] || j.status}</span>
              </button>
            ))}
          </div>
          <RoleLegend />
        </aside>

        <main className="sw-main">
          {!activeJob ? <Welcome live={live} /> : <Workspace job={activeJob} />}
        </main>
      </div>

      {showSettings && (
        <AISettings
          config={aiConfig}
          onClose={() => setShowSettings(false)}
          onSave={(cfg) => {
            setAIConfig(cfg);
            localStorage.setItem(LS_AI, JSON.stringify(cfg));
            setShowSettings(false);
          }}
        />
      )}
    </div>
  );
}

function Welcome({ live }) {
  return (
    <div className="sw-welcome">
      <div className="sw-welcome-card">
        <h2>把一个需求丢进队列试试 👈</h2>
        <p>
          工作区会模拟业界主流的 <b>orchestrator-worker（协调者—工作者）</b> 范式：
          <b>协调者</b>把需求拆成带依赖的子任务，<b>调研 / 规划 / 执行 / 评审</b>等角色按依赖关系
          <b>并行或串行</b>处理（集群波次），最后由 <b>汇总者</b>给你一份结论。
        </p>
        <p className="sw-welcome-note">
          {live
            ? '已接入你的 AI Key，将调用真实大模型分工协作。'
            : '当前为离线模拟模式（无需 Key 即可看完整流程）。点右上「AI 设置」填入 Key 可接真实大模型。'}
        </p>
        <p className="sw-welcome-note">想了解业界都怎么玩、我们如何对齐与超越？看 <a href="./RESEARCH.md">业界调研报告 →</a></p>
      </div>
    </div>
  );
}

function Workspace({ job }) {
  const layers = topoLayers(job.tasks || []);
  const tasksById = Object.fromEntries((job.tasks || []).map((t) => [t.id, t]));
  const p = progress(job.tasks || []);
  return (
    <div className="sw-ws">
      <div className="sw-ws-head">
        <div className="sw-ws-req">
          <span className="sw-kind">{kindLabel(classify(job.requirement))}</span>
          {job.route && (
            <span className={'sw-route ' + job.route}>{job.route === 'fast' ? '⚡ 快路径' : '🧭 全量编排'}</span>
          )}
          {job.route !== 'fast' && (
            <span className="sw-topo">拓扑 · {topologyLabel(classify(job.requirement))}</span>
          )}
          {job.requirement}
        </div>
        <div className="sw-progress">
          <div className="sw-progress-bar"><span style={{ width: p.pct + '%' }} /></div>
          <span className="sw-progress-txt">{p.done}/{p.total} · {STATUS_LABEL[job.status]}</span>
        </div>
        {job.estimate && (
          <div className="sw-estimate">
            预估：{job.estimate.steps} 步 / {job.estimate.waves} 波 · ~{formatTokens(job.estimate.totalTokens)} tok
            （入 {formatTokens(job.estimate.inTokens)} / 出 {formatTokens(job.estimate.outTokens)}）
            · ~{formatUSD(job.estimate.usd)} <span className="sw-est-model">按 {job.estimate.model} 计价</span>
          </div>
        )}
      </div>

      {job.error && <div className="sw-err">⚠️ {job.error}</div>}

      {(job.tasks || []).length === 0 ? (
        <div className="sw-planning">🧭 协调者正在拆解需求…</div>
      ) : (
        <div className="sw-board">
          {layers.map((ids, i) => (
            <div className="sw-wave" key={i}>
              <div className="sw-wave-label">
                波次 {i + 1}{ids.length > 1 ? ` · ${ids.length} 个智能体并行` : ''}
              </div>
              <div className="sw-wave-cards">
                {ids.map((id) => <TaskCard key={id} task={tasksById[id]} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {job.conclusion && (
        <div className="sw-conclusion">
          <div className="sw-conclusion-h">📝 最终结论</div>
          <div className="sw-md" dangerouslySetInnerHTML={{ __html: mdToHtml(job.conclusion) }} />
        </div>
      )}
    </div>
  );
}

function TaskCard({ task }) {
  const [open, setOpen] = useState(false);
  if (!task) return null;
  const role = getRole(task.role);
  const isSynth = task.role === 'synthesizer';
  return (
    <div className={'sw-task ' + task.status} style={{ '--role': role.color }}>
      <div className="sw-task-top">
        <span className="sw-task-icon" style={{ background: role.color }}>{role.icon}</span>
        <div className="sw-task-meta">
          <div className="sw-task-role">{role.name}</div>
          <div className="sw-task-title">{task.title}</div>
        </div>
        <span className={'sw-tstatus ' + task.status}>
          {task.status === 'running' && <span className="sw-spin" />}
          {TASK_LABEL[task.status]}
        </span>
      </div>
      {task.status === 'running' && task.output && (
        <pre className="sw-task-out streaming">{task.output}<span className="sw-caret" /></pre>
      )}
      {task.status === 'done' && !isSynth && task.output && (
        <>
          <button className="sw-task-toggle" onClick={() => setOpen((o) => !o)}>
            {open ? '收起产出 ▲' : '查看产出 ▼'}
          </button>
          {open && <pre className="sw-task-out">{task.output}</pre>}
        </>
      )}
      {task.status === 'failed' && <div className="sw-task-fail">失败：{task.error}</div>}
    </div>
  );
}

function RoleLegend() {
  return (
    <div className="sw-legend">
      <div className="sw-panel-h" style={{ marginTop: 18 }}>分工角色</div>
      {roleList().map((r) => (
        <div className="sw-legend-row" key={r.id}>
          <span className="sw-legend-ic" style={{ background: r.color }}>{r.icon}</span>
          <span className="sw-legend-name">{r.name}</span>
          <span className="sw-legend-duty">{r.duty}</span>
        </div>
      ))}
    </div>
  );
}

function AISettings({ config, onClose, onSave }) {
  const [draft, setDraft] = useState(config);
  const preset = PROVIDERS[draft.provider] || PROVIDERS.anthropic;
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  return (
    <div className="sw-modal-bg" onClick={onClose}>
      <div className="sw-modal" onClick={(e) => e.stopPropagation()}>
        <h3>AI 设置（BYOK）</h3>
        <p className="sw-modal-note">
          Key 只保存在你的浏览器本地（localStorage），不上传任何服务器。不填也能用离线模拟。
        </p>
        <label className="sw-field">
          <span>启用真实大模型</span>
          <input type="checkbox" checked={!!draft.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
        </label>
        <label className="sw-field col">
          <span>厂商</span>
          <select value={draft.provider} onChange={(e) => set({ provider: e.target.value, model: '' })}>
            {Object.entries(PROVIDERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <label className="sw-field col">
          <span>模型</span>
          <select value={draft.model || preset.defaultModel} onChange={(e) => set({ model: e.target.value })}>
            {preset.models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="sw-field col">
          <span>API Key</span>
          <input
            type="password"
            placeholder={preset.keyHint}
            value={draft.apiKey}
            onChange={(e) => set({ apiKey: e.target.value })}
          />
        </label>
        <label className="sw-field col">
          <span>自定义 baseURL（可选 / 代理）</span>
          <input
            type="text"
            placeholder={preset.defaultBaseURL}
            value={draft.baseURL}
            onChange={(e) => set({ baseURL: e.target.value })}
          />
        </label>
        <div className="sw-modal-warn">
          ⚠️ 纯前端直连会把 Key 暴露在浏览器端，仅建议个人使用，勿分享含 Key 的备份。
        </div>
        <div className="sw-modal-actions">
          <button className="sw-ghost" onClick={onClose}>取消</button>
          <button className="sw-cta" onClick={() => onSave(draft)}>保存</button>
        </div>
      </div>
    </div>
  );
}

function kindLabel(kind) {
  return { build: '构建', research: '调研', decide: '决策', write: '写作', general: '通用' }[kind] || '通用';
}

/* ----------------------------- 样式 ----------------------------- */
function Style() {
  return (
    <style>{`
.sw{--bg:#F6F5F0;--surface:#FFFFFF;--surface-2:#FBFAF6;--fill:#F1EFE8;
  --t1:#26241F;--t2:#83827A;--t3:#B0AFA5;--accent:#CC785C;--accent-2:#B5654A;--accent-soft:#F5ECE5;
  --bd:#ECEAE2;--bd-2:#F0EEE7;--ok:#6E9079;--warn:#BE9356;--danger:#BC6055;
  --serif:'Tiempos Text',Georgia,'Songti SC','STSong',serif;
  --sans:ui-sans-serif,system-ui,-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;
  font-family:var(--sans);color:var(--t1);background:var(--bg);min-height:100vh;font-size:13.5px;line-height:1.6;}
.sw *{box-sizing:border-box;}
.sw-top{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:1px solid var(--bd);background:var(--surface);position:sticky;top:0;z-index:10;}
.sw-brand{display:flex;align-items:center;gap:12px;}
.sw-logo{font-size:28px;}
.sw-title{font-family:var(--serif);font-size:19px;font-weight:600;}
.sw-sub{color:var(--t2);font-size:12px;}
.sw-topbtns{display:flex;align-items:center;gap:10px;}
.sw-mode{font-size:12px;color:var(--t2);background:var(--fill);padding:5px 10px;border-radius:20px;}
.sw-mode.on{color:var(--ok);background:#EAF0EC;}
.sw-ghost{background:transparent;border:1px solid var(--bd);color:var(--t2);padding:6px 12px;border-radius:8px;font-size:12.5px;cursor:pointer;text-decoration:none;transition:.15s;}
.sw-ghost:hover{border-color:var(--accent);color:var(--accent-2);}
.sw-body{display:grid;grid-template-columns:300px 1fr;gap:0;align-items:start;}
.sw-side{padding:20px;border-right:1px solid var(--bd);min-height:calc(100vh - 65px);position:sticky;top:65px;align-self:start;}
.sw-panel-h{font-family:var(--serif);font-size:13px;font-weight:600;color:var(--t2);margin-bottom:10px;letter-spacing:.3px;}
.sw-input{width:100%;border:1px solid var(--bd);border-radius:8px;padding:10px;font:inherit;background:var(--surface);resize:vertical;color:var(--t1);}
.sw-input:focus{outline:none;border-color:var(--accent);}
.sw-actions{margin-top:10px;}
.sw-cta{background:var(--accent);color:#fff;border:none;padding:8px 16px;border-radius:8px;font-weight:500;font-size:13px;cursor:pointer;box-shadow:0 1px 2px rgba(204,120,92,.25);transition:.15s;width:100%;}
.sw-cta:hover{background:var(--accent-2);}
.sw-cta:active{transform:translateY(1px);}
.sw-cta:disabled{opacity:.45;cursor:not-allowed;}
.sw-samples{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;}
.sw-chip{font-size:11.5px;color:var(--t2);background:var(--surface-2);border:1px solid var(--bd);border-radius:20px;padding:4px 10px;cursor:pointer;transition:.15s;text-align:left;}
.sw-chip:hover{border-color:var(--accent);color:var(--accent-2);}
.sw-history{display:flex;flex-direction:column;gap:6px;}
.sw-empty{color:var(--t3);font-size:12px;}
.sw-hist-item{display:flex;justify-content:space-between;align-items:center;gap:8px;background:transparent;border:1px solid transparent;border-radius:8px;padding:8px 10px;cursor:pointer;text-align:left;transition:.15s;}
.sw-hist-item:hover{background:var(--surface-2);border-color:var(--bd);}
.sw-hist-item.sel{background:var(--accent-soft);border-color:var(--accent);}
.sw-hist-req{font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;}
.sw-badge{font-size:10.5px;padding:2px 7px;border-radius:20px;background:var(--fill);color:var(--t2);white-space:nowrap;}
.sw-badge.done{background:#EAF0EC;color:var(--ok);}
.sw-badge.failed{background:#F6E9E7;color:var(--danger);}
.sw-legend{margin-top:4px;}
.sw-legend-row{display:flex;align-items:center;gap:8px;padding:5px 0;}
.sw-legend-ic{width:22px;height:22px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;filter:saturate(.9);}
.sw-legend-name{font-size:12.5px;font-weight:500;width:46px;flex-shrink:0;}
.sw-legend-duty{font-size:11px;color:var(--t3);line-height:1.4;}
.sw-main{padding:24px;min-height:calc(100vh - 65px);}
.sw-welcome{display:flex;align-items:flex-start;justify-content:center;padding-top:40px;}
.sw-welcome-card{max-width:640px;background:var(--surface);border:1px solid var(--bd);border-radius:16px;padding:32px;}
.sw-welcome-card h2{font-family:var(--serif);font-size:22px;font-weight:600;margin:0 0 14px;}
.sw-welcome-card p{color:var(--t2);margin:0 0 12px;}
.sw-welcome-card b{color:var(--t1);font-weight:600;}
.sw-welcome-note{font-size:12.5px;color:var(--t3)!important;}
.sw-welcome-card a{color:var(--accent-2);text-decoration:none;}
.sw-ws-head{margin-bottom:20px;}
.sw-ws-req{font-family:var(--serif);font-size:20px;font-weight:600;margin-bottom:12px;display:flex;align-items:center;gap:10px;}
.sw-kind{font-size:11px;font-weight:500;color:var(--accent-2);background:var(--accent-soft);padding:3px 9px;border-radius:20px;font-family:var(--sans);}
.sw-route{font-size:11px;font-weight:500;padding:3px 9px;border-radius:20px;font-family:var(--sans);}
.sw-route.fast{color:var(--ok);background:#EAF0EC;}
.sw-route.full{color:var(--t2);background:var(--fill);}
.sw-topo{font-size:11px;font-weight:500;color:var(--accent-2);background:var(--accent-soft);padding:3px 9px;border-radius:20px;font-family:var(--sans);}
.sw-estimate{margin-top:8px;font-size:11.5px;color:var(--t2);font-variant-numeric:tabular-nums;}
.sw-est-model{color:var(--t3);}
.sw-preview{margin-top:10px;background:var(--surface-2);border:1px solid var(--bd);border-radius:8px;padding:8px 10px;}
.sw-preview-top{display:flex;justify-content:space-between;align-items:center;}
.sw-preview-cost{font-family:var(--serif);font-size:15px;color:var(--t1);font-variant-numeric:tabular-nums;}
.sw-preview-sub{font-size:11px;color:var(--t2);margin-top:4px;font-variant-numeric:tabular-nums;}
.sw-preview-model{color:var(--t3);}
.sw-progress{display:flex;align-items:center;gap:12px;max-width:520px;}
.sw-progress-bar{flex:1;height:6px;background:var(--fill);border-radius:6px;overflow:hidden;}
.sw-progress-bar span{display:block;height:100%;background:var(--accent);border-radius:6px;transition:width .4s;}
.sw-progress-txt{font-size:12px;color:var(--t2);font-variant-numeric:tabular-nums;white-space:nowrap;}
.sw-err{background:#F6E9E7;border:1px solid #E8C9C3;color:#9A3F36;padding:10px 14px;border-radius:10px;margin-bottom:16px;font-size:12.5px;}
.sw-planning{color:var(--t2);padding:40px;text-align:center;font-size:15px;}
.sw-board{display:flex;flex-direction:column;gap:18px;}
.sw-wave{position:relative;}
.sw-wave-label{font-size:11px;color:var(--t3);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;}
.sw-wave-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;}
.sw-task{background:var(--surface);border:1px solid var(--bd);border-left:3px solid var(--role,var(--accent));border-radius:12px;padding:14px;transition:.2s;}
.sw-task.running{box-shadow:0 0 0 1px var(--role);}
.sw-task.queued{opacity:.62;}
.sw-task-top{display:flex;align-items:flex-start;gap:10px;}
.sw-task-icon{width:30px;height:30px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;filter:saturate(.9);}
.sw-task-meta{flex:1;min-width:0;}
.sw-task-role{font-size:11px;color:var(--t2);}
.sw-task-title{font-size:13.5px;font-weight:500;line-height:1.4;}
.sw-tstatus{font-size:11px;color:var(--t2);display:inline-flex;align-items:center;gap:5px;white-space:nowrap;}
.sw-tstatus.done{color:var(--ok);}
.sw-tstatus.failed{color:var(--danger);}
.sw-tstatus.running{color:var(--accent-2);}
.sw-spin{width:9px;height:9px;border:2px solid var(--accent);border-top-color:transparent;border-radius:50%;display:inline-block;animation:sw-rot .7s linear infinite;}
@keyframes sw-rot{to{transform:rotate(360deg);}}
.sw-task-toggle{margin-top:10px;background:transparent;border:none;color:var(--t2);font-size:11.5px;cursor:pointer;padding:0;}
.sw-task-toggle:hover{color:var(--accent-2);}
.sw-task-out{margin-top:8px;background:var(--surface-2);border:1px solid var(--bd-2);border-radius:8px;padding:10px;font-size:11.5px;line-height:1.6;white-space:pre-wrap;color:var(--t1);max-height:220px;overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}
.sw-task-out.streaming{border-color:var(--accent);background:#FFFDFB;}
.sw-caret{display:inline-block;width:6px;height:12px;margin-left:2px;background:var(--accent);vertical-align:text-bottom;animation:sw-blink 1s steps(2) infinite;}
@keyframes sw-blink{0%,50%{opacity:1;}50.01%,100%{opacity:0;}}
.sw-task-fail{margin-top:8px;font-size:11.5px;color:var(--danger);}
.sw-conclusion{margin-top:26px;background:var(--surface);border:1px solid var(--bd);border-radius:16px;padding:24px;border-top:3px solid var(--accent);}
.sw-conclusion-h{font-family:var(--serif);font-size:16px;font-weight:600;margin-bottom:12px;}
.sw-md h2{font-family:var(--serif);font-size:18px;margin:0 0 10px;}
.sw-md h3{font-family:var(--serif);font-size:14px;color:var(--t2);margin:16px 0 6px;}
.sw-md p{margin:0 0 10px;color:var(--t1);}
.sw-md ul,.sw-md ol{margin:0 0 12px;padding-left:22px;}
.sw-md li{margin:3px 0;}
.sw-md blockquote{border-left:3px solid var(--bd);margin:10px 0;padding:2px 14px;color:var(--t2);font-size:12.5px;}
.sw-md code{background:var(--fill);padding:1px 5px;border-radius:4px;font-size:12px;}
.sw-modal-bg{position:fixed;inset:0;background:rgba(38,36,31,.4);display:flex;align-items:center;justify-content:center;z-index:50;padding:20px;}
.sw-modal{background:var(--surface);border-radius:16px;padding:26px;width:440px;max-width:100%;max-height:90vh;overflow:auto;}
.sw-modal h3{font-family:var(--serif);font-size:18px;margin:0 0 8px;}
.sw-modal-note{font-size:12px;color:var(--t2);margin:0 0 16px;}
.sw-field{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-size:13px;gap:10px;}
.sw-field.col{flex-direction:column;align-items:stretch;gap:5px;}
.sw-field>span{color:var(--t2);}
.sw-field input[type=text],.sw-field input[type=password],.sw-field select{border:1px solid var(--bd);border-radius:8px;padding:8px 10px;font:inherit;background:var(--surface);color:var(--t1);}
.sw-field input:focus,.sw-field select:focus{outline:none;border-color:var(--accent);}
.sw-modal-warn{font-size:11.5px;color:var(--warn);background:#FAF4E9;border-radius:8px;padding:9px 11px;margin:6px 0 16px;}
.sw-modal-actions{display:flex;justify-content:flex-end;gap:10px;}
.sw-modal-actions .sw-cta{width:auto;}
@media(max-width:820px){.sw-body{grid-template-columns:1fr;}.sw-side{position:static;min-height:0;border-right:none;border-bottom:1px solid var(--bd);}}
`}</style>
  );
}

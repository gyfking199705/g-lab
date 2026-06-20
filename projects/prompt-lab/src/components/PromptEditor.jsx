import React, { useState } from 'react';
import { Icon } from '../icons.jsx';
import { CATEGORIES, TECHNIQUES, MODELS, extractVariables, normalizePrompt } from '../schema.js';
import { lintPrompt } from '../lint.js';

const TONE = { ok: 'var(--ok)', warn: 'var(--warn)', danger: 'var(--danger)' };

const empty = {
  title: '',
  summary: '',
  category: 'other',
  tags: [],
  models: ['Any'],
  techniques: [],
  system: '',
  content: '',
  exampleInput: '',
  exampleOutput: '',
  notes: '',
  source: '',
  license: '',
  version: '1.0.0',
};

/** 新增 / 编辑表单（模态）。字段对齐业界 prompt 元数据约定。 */
export default function PromptEditor({ initial, onSave, onClose }) {
  const [f, setF] = useState({ ...empty, ...(initial || {}), tags: (initial?.tags || []).join(', ') });
  const isEdit = !!(initial && initial.id);
  const upd = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const toggle = (k, v) =>
    setF((s) => {
      const arr = s[k] || [];
      return { ...s, [k]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] };
    });

  const vars = extractVariables(f.content);
  const lint = lintPrompt(
    normalizePrompt({
      ...f,
      tags: String(f.tags).split(/[,，]/).map((t) => t.trim()).filter(Boolean),
    })
  );

  const submit = () => {
    onSave({
      ...initial,
      ...f,
      tags: String(f.tags)
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="pl-overlay pl-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pl-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="pl-dh">
          <h3>{isEdit ? '编辑 Prompt' : '新增 Prompt'}</h3>
          <button className="pl-btn pl-ghost" onClick={onClose}><Icon.close /></button>
        </div>

        <div className="pl-db">
          <div className="pl-field">
            <label>标题 *</label>
            <input className="pl-input" value={f.title} onChange={upd('title')} placeholder="例如：资深代码评审员" />
          </div>

          <div className="pl-field">
            <label>一句话简介</label>
            <input className="pl-input" value={f.summary} onChange={upd('summary')} placeholder="这条 prompt 做什么、何时用" />
          </div>

          <div className="pl-row2">
            <div className="pl-field">
              <label>分类</label>
              <select className="pl-input" value={f.category} onChange={upd('category')}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="pl-field">
              <label>版本</label>
              <input className="pl-input" value={f.version} onChange={upd('version')} placeholder="1.0.0" />
            </div>
          </div>

          <div className="pl-field">
            <label>适用模型</label>
            <div className="pl-multi">
              {MODELS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={'pl-chip' + ((f.models || []).includes(m) ? ' pl-on' : '')}
                  onClick={() => toggle('models', m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="pl-field">
            <label>技巧标签</label>
            <div className="pl-multi">
              {TECHNIQUES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={'pl-chip' + ((f.techniques || []).includes(t.id) ? ' pl-on' : '')}
                  onClick={() => toggle('techniques', t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pl-field">
            <label>标签 <span className="pl-hint">逗号分隔</span></label>
            <input className="pl-input" value={f.tags} onChange={upd('tags')} placeholder="code-review, quality" />
          </div>

          <div className="pl-field">
            <label>System / 角色 <span className="pl-hint">可选</span></label>
            <textarea className="pl-textarea" value={f.system} onChange={upd('system')} placeholder="你是一名…" />
          </div>

          <div className="pl-field">
            <label>
              Prompt 正文 * <span className="pl-hint">用 {'{{变量}}'} 表示占位符</span>
            </label>
            <textarea
              className="pl-textarea"
              style={{ minHeight: 140 }}
              value={f.content}
              onChange={upd('content')}
              placeholder="请评审下面的代码：\n<diff>\n{{diff}}\n</diff>"
            />
            {vars.length ? (
              <div className="pl-hint">检测到变量：{vars.map((v) => `{{${v}}}`).join('  ')}</div>
            ) : null}
          </div>

          <div className="pl-row2">
            <div className="pl-field">
              <label>示例输入 <span className="pl-hint">可选</span></label>
              <textarea className="pl-textarea" value={f.exampleInput} onChange={upd('exampleInput')} />
            </div>
            <div className="pl-field">
              <label>示例输出 <span className="pl-hint">可选</span></label>
              <textarea className="pl-textarea" value={f.exampleOutput} onChange={upd('exampleOutput')} />
            </div>
          </div>

          <div className="pl-field">
            <label>笔记 / 为什么有效 <span className="pl-hint">可选</span></label>
            <textarea className="pl-textarea" value={f.notes} onChange={upd('notes')} />
          </div>

          <div className="pl-row2">
            <div className="pl-field">
              <label>出处 <span className="pl-hint">可选</span></label>
              <input className="pl-input" value={f.source} onChange={upd('source')} placeholder="作者 / 链接" />
            </div>
            <div className="pl-field">
              <label>许可 <span className="pl-hint">可选</span></label>
              <input className="pl-input" value={f.license} onChange={upd('license')} placeholder="如 CC0 / MIT" />
            </div>
          </div>
        </div>

        <div className="pl-foot" style={{ flexWrap: 'wrap' }}>
          <div className="pl-lint-mini" title={`通过 ${lint.passed}/${lint.total} 项业界最佳实践`} style={{ marginRight: 'auto' }}>
            质量 <b style={{ color: TONE[lint.grade.tone] }}>{lint.score}</b>
            <span className="pl-lint-bar">
              <i style={{ width: `${lint.score}%`, background: TONE[lint.grade.tone] }} />
            </span>
            <span style={{ color: TONE[lint.grade.tone] }}>{lint.grade.label}</span>
          </div>
          <button className="pl-btn" onClick={onClose}>取消</button>
          <button className="pl-btn pl-primary" onClick={submit} disabled={!f.title.trim() || !f.content.trim()}>
            <Icon.check width={15} height={15} /> {isEdit ? '保存' : '添加'}
          </button>
        </div>
      </div>
    </div>
  );
}

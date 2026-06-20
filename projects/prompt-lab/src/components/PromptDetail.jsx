import React, { useState } from 'react';
import { Icon } from '../icons.jsx';
import { categoryLabel, techniqueLabel, renderTemplate, promptToMarkdown } from '../schema.js';
import HistoryPanel from './HistoryPanel.jsx';
import BatchPanel from './BatchPanel.jsx';
import LintPanel from './LintPanel.jsx';

function CopyBtn({ text, onCopied, label = '复制' }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    const ok = await writeClipboard(text);
    setDone(true);
    onCopied && onCopied(ok);
    setTimeout(() => setDone(false), 1400);
  };
  return (
    <button className="pl-btn pl-btn-sm pl-ghost" onClick={copy}>
      {done ? <Icon.check width={14} height={14} /> : <Icon.copy width={14} height={14} />}
      {done ? '已复制' : label}
    </button>
  );
}

export async function writeClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch (e) {
    return false;
  }
}

/** prompt 详情抽屉：展示元信息、可填变量预览、一键复制、编辑/删除。 */
export default function PromptDetail({ prompt, onClose, onEdit, onDelete, onClone, onToggleFav, onRestore, onToast }) {
  const [vals, setVals] = useState({});
  const [batch, setBatch] = useState(false);
  if (!prompt) return null;

  const rendered = renderTemplate(prompt.content, vals);
  const fullPrompt = prompt.system ? `[System]\n${prompt.system}\n\n[User]\n${rendered}` : rendered;

  const onCopied = (ok) => onToast(ok ? '已复制到剪贴板' : '复制失败，请手动选择');

  return (
    <div className="pl-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pl-drawer" onMouseDown={(e) => e.stopPropagation()}>
        <div className="pl-dh">
          <h3>{prompt.title}</h3>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className={'pl-star' + (prompt.favorite ? ' pl-on' : '')}
              title="收藏"
              onClick={() => onToggleFav(prompt.id)}
            >
              {prompt.favorite ? <Icon.starFill /> : <Icon.star />}
            </button>
            <button className="pl-btn pl-ghost" onClick={onClose} title="关闭">
              <Icon.close />
            </button>
          </div>
        </div>

        <div className="pl-db">
          {prompt.summary ? <div style={{ color: 'var(--t2)' }}>{prompt.summary}</div> : null}

          <div className="pl-kv">
            <span><b>分类</b> {categoryLabel(prompt.category)}</span>
            <span><b>模型</b> {(prompt.models || []).join(' · ')}</span>
            <span><b>版本</b> {prompt.version}</span>
            {prompt.license ? <span><b>许可</b> {prompt.license}</span> : null}
          </div>

          {(prompt.techniques || []).length ? (
            <div className="pl-multi">
              {prompt.techniques.map((t) => (
                <span key={t} className="pl-tag-s pl-cat">{techniqueLabel(t)}</span>
              ))}
            </div>
          ) : null}
          {(prompt.tags || []).length ? (
            <div className="pl-multi">
              {prompt.tags.map((t) => (
                <span key={t} className="pl-tag-s">#{t}</span>
              ))}
            </div>
          ) : null}

          <LintPanel prompt={prompt} />

          {prompt.system ? (
            <div className="pl-block">
              <h5>System / 角色<CopyBtn text={prompt.system} onCopied={onCopied} /></h5>
              <div className="pl-pre">{prompt.system}</div>
            </div>
          ) : null}

          {(prompt.variables || []).length ? (
            <div className="pl-block">
              <h5>
                变量（填入后预览与复制即套用）
                <button className="pl-btn pl-btn-sm pl-ghost" onClick={() => setBatch((b) => !b)}>
                  {batch ? '单组填充' : '批量对照'}
                </button>
              </h5>
              {batch ? null : prompt.variables.map((v) => (
                <div className="pl-var-row" key={v}>
                  <label>{`{{${v}}}`}</label>
                  <input
                    placeholder={`填入 ${v}…`}
                    value={vals[v] || ''}
                    onChange={(e) => setVals((s) => ({ ...s, [v]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          ) : null}

          {batch ? <BatchPanel prompt={prompt} onToast={onToast} /> : null}

          <div className="pl-block">
            <h5>
              Prompt 正文
              <CopyBtn text={rendered} onCopied={onCopied} />
            </h5>
            <div className="pl-pre">{rendered}</div>
          </div>

          {prompt.exampleInput || prompt.exampleOutput ? (
            <div className="pl-block">
              <h5>示例</h5>
              {prompt.exampleInput ? (
                <div className="pl-pre pl-muted" style={{ marginBottom: 8 }}>
                  输入：{prompt.exampleInput}
                </div>
              ) : null}
              {prompt.exampleOutput ? (
                <div className="pl-pre pl-muted">输出：{prompt.exampleOutput}</div>
              ) : null}
            </div>
          ) : null}

          {prompt.notes ? (
            <div className="pl-block">
              <h5>笔记 / 为什么有效</h5>
              <div className="pl-pre pl-muted">{prompt.notes}</div>
            </div>
          ) : null}

          {prompt.source ? (
            <div className="pl-kv"><span><b>出处</b> {prompt.source}</span></div>
          ) : null}

          <HistoryPanel prompt={prompt} onRestore={onRestore} />

          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
            <CopyBtn text={fullPrompt} onCopied={onCopied} label="复制完整（System+User）" />
            <CopyBtn text={promptToMarkdown(prompt)} onCopied={onCopied} label="复制为 Markdown" />
            <button className="pl-btn pl-btn-sm" onClick={() => onEdit(prompt)}>
              <Icon.edit width={14} height={14} /> 编辑
            </button>
            <button className="pl-btn pl-btn-sm" onClick={() => onClone(prompt)}>
              <Icon.copy width={14} height={14} /> 克隆
            </button>
            <button className="pl-btn pl-btn-sm pl-danger" onClick={() => onDelete(prompt)}>
              <Icon.trash width={14} height={14} /> 删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

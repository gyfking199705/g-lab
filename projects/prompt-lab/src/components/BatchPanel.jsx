import React, { useState } from 'react';
import { Icon } from '../icons.jsx';
import { renderTemplate } from '../schema.js';
import { writeClipboard } from './PromptDetail.jsx';

/**
 * 变量批量对照：为同一条 prompt 填多组变量值，并排预览渲染结果。
 * 纯前端模板渲染（无 LLM 调用），便于横向比较不同措辞、挑选最佳。
 */
export default function BatchPanel({ prompt, onToast }) {
  const vars = prompt.variables || [];
  const mkCase = () => Object.fromEntries(vars.map((v) => [v, '']));
  const [cases, setCases] = useState([mkCase(), mkCase()]);

  if (!vars.length) return null;

  const setCell = (ci, name, val) =>
    setCases((cs) => cs.map((c, i) => (i === ci ? { ...c, [name]: val } : c)));
  const addCase = () => setCases((cs) => [...cs, mkCase()]);
  const delCase = (ci) => setCases((cs) => (cs.length > 1 ? cs.filter((_, i) => i !== ci) : cs));

  const copy = async (text) => {
    const ok = await writeClipboard(text);
    onToast(ok ? '已复制该组渲染结果' : '复制失败，请手动选择');
  };

  return (
    <div className="pl-block">
      <h5>
        变量批量对照
        <button className="pl-btn pl-btn-sm pl-ghost" onClick={addCase}>
          <Icon.plus width={13} height={13} /> 加一组
        </button>
      </h5>
      <div className="pl-hint" style={{ marginBottom: 10 }}>
        为每组填入不同变量值，下方并排预览渲染后的 prompt，便于横向对比、择优复制。
      </div>
      <div className="pl-batch">
        {cases.map((c, ci) => {
          const rendered = renderTemplate(prompt.content, c);
          return (
            <div className="pl-batch-col" key={ci}>
              <div className="pl-batch-head">
                <span>组 {ci + 1}</span>
                <span style={{ display: 'flex', gap: 2 }}>
                  <button className="pl-btn pl-btn-sm pl-ghost" onClick={() => copy(rendered)} title="复制本组">
                    <Icon.copy width={13} height={13} />
                  </button>
                  <button
                    className="pl-btn pl-btn-sm pl-ghost"
                    onClick={() => delCase(ci)}
                    disabled={cases.length <= 1}
                    title="删除本组"
                  >
                    <Icon.close width={13} height={13} />
                  </button>
                </span>
              </div>
              {vars.map((v) => (
                <div className="pl-batch-field" key={v}>
                  <label>{`{{${v}}}`}</label>
                  <input value={c[v] || ''} onChange={(e) => setCell(ci, v, e.target.value)} placeholder={v} />
                </div>
              ))}
              <div className="pl-pre pl-batch-out">{rendered}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React from 'react';
import { Icon } from '../icons.jsx';
import { categoryLabel } from '../schema.js';

/** 单张 prompt 卡片。点击卡片打开详情；星标即时收藏。 */
export default function PromptCard({ prompt, onOpen, onToggleFav }) {
  const tags = (prompt.tags || []).slice(0, 3);
  return (
    <div className="pl-card" onClick={() => onOpen(prompt)}>
      <div className="pl-card-top">
        <div className="pl-card-title">{prompt.title}</div>
        <button
          className={'pl-star' + (prompt.favorite ? ' pl-on' : '')}
          title={prompt.favorite ? '取消收藏' : '收藏'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFav(prompt.id);
          }}
        >
          {prompt.favorite ? <Icon.starFill /> : <Icon.star />}
        </button>
      </div>
      {prompt.summary ? <div className="pl-card-sum">{prompt.summary}</div> : null}
      <div className="pl-card-tags">
        <span className="pl-tag-s pl-cat">{categoryLabel(prompt.category)}</span>
        {tags.map((t) => (
          <span key={t} className="pl-tag-s">#{t}</span>
        ))}
      </div>
      <div className="pl-card-foot">
        <span>{(prompt.models || []).join(' · ') || 'Any'}</span>
        <span>{(prompt.variables || []).length ? `${prompt.variables.length} 个变量` : '无变量'}</span>
      </div>
    </div>
  );
}

/**
 * SkillLab.jsx — Skill 研究室主界面：收录、检索、展示 Agent Skills。
 * 设计语言遵循 g-lab DESIGN.md（暖纸色 + 陶土橙、衬线标题、克制留白、手写无图表库）。
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  parseIndex, filterSkills, categoriesOf, tagsOf, validateSkill,
  scoreSkill, installCommand,
} from './registry.js';
import { splitFrontmatter } from './frontmatter.js';
import { renderMarkdown } from './markdown.js';

const BASE = './'; // 相对页面；skills/ 与 dist/ 同级

export default function SkillLab() {
  const [skills, setSkills] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const [openSlug, setOpenSlug] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch(BASE + 'skills/index.json', { cache: 'no-cache' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then((json) => { if (alive) { setSkills(parseIndex(json)); setStatus('ready'); } })
      .catch((e) => { if (alive) { setError(String(e.message || e)); setStatus('error'); } });
    return () => { alive = false; };
  }, []);

  const cats = useMemo(() => categoriesOf(skills), [skills]);
  const tags = useMemo(() => tagsOf(skills), [skills]);
  const shown = useMemo(() => {
    const byText = filterSkills(skills, { query, category });
    return tag ? byText.filter((s) => (s.tags || []).includes(tag)) : byText;
  }, [skills, query, category, tag]);
  const open = useMemo(() => skills.find((s) => s.slug === openSlug) || null, [skills, openSlug]);
  const avgScore = useMemo(() => {
    const scored = skills.filter((s) => typeof s.score === 'number');
    return scored.length ? Math.round(scored.reduce((n, s) => n + s.score, 0) / scored.length) : null;
  }, [skills]);

  return (
    <div className="sl">
      <Style />
      <header className="sl-hd">
        <div className="sl-brand"><span className="sl-ic">🧩</span> Skill 研究室</div>
        <p className="sl-tag">
          收录、整理与展示高质量 <strong>Agent Skills</strong>——每个技能都遵循
          <a href={BASE + 'SPEC.md'} target="_blank" rel="noopener noreferrer"> SKILL.md 业界标准格式</a>，
          即取即用。
        </p>
        <div className="sl-sub">
          Agent Skills · Curated &amp; Showcased
          {avgScore != null && status === 'ready' && (
            <span className="sl-avg"> · 平均质量分 {avgScore}/100</span>
          )}
        </div>
      </header>

      <div className="sl-toolbar">
        <div className="sl-search">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            placeholder="搜索技能：名称 / 描述 / 标签…"
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && <button className="sl-clear" onClick={() => setQuery('')} aria-label="清空">×</button>}
        </div>
        <div className="sl-count">{shown.length} / {skills.length} 个技能</div>
      </div>

      {status === 'ready' && cats.length > 0 && (
        <div className="sl-chips">
          <Chip active={!category} label="全部" count={skills.length} onClick={() => setCategory('')} />
          {cats.map((c) => (
            <Chip key={c.name} active={category === c.name} label={c.name} count={c.count}
              onClick={() => setCategory(category === c.name ? '' : c.name)} />
          ))}
        </div>
      )}

      {status === 'ready' && tags.length > 0 && (
        <div className="sl-tagcloud">
          <span className="sl-tagcloud-k">标签</span>
          {tags.map((t) => (
            <button key={t.name}
              className={'sl-tagchip' + (tag === t.name ? ' on' : '')}
              onClick={() => setTag(tag === t.name ? '' : t.name)}>
              #{t.name}<span className="sl-tagchip-n">{t.count}</span>
            </button>
          ))}
          {tag && <button className="sl-tagclear" onClick={() => setTag('')}>清除标签 ×</button>}
        </div>
      )}

      {status === 'loading' && <div className="sl-note">正在加载技能登记表…</div>}
      {status === 'error' && (
        <div className="sl-err">
          加载失败：{error}
          <div className="sl-err-hint">请通过 HTTP 访问（GitHub Pages 或 <code>python3 -m http.server</code>），不要用 <code>file://</code> 直接打开。</div>
        </div>
      )}

      {status === 'ready' && (
        shown.length === 0
          ? <div className="sl-note">没有匹配的技能，换个关键词试试。</div>
          : <div className="sl-grid">
              {shown.map((s) => <SkillCard key={s.slug} skill={s} onOpen={() => setOpenSlug(s.slug)} />)}
            </div>
      )}

      <footer className="sl-ft">
        想贡献技能？按 <a href={BASE + 'SPEC.md'} target="_blank" rel="noopener noreferrer">SPEC.md</a> 的格式新建
        <code>skills/&lt;name&gt;/SKILL.md</code>，重新构建即可被收录。
        &nbsp;· 隶属 <a href="../../" >g-lab</a> 实验室。
      </footer>

      {open && <SkillModal skill={open} onClose={() => setOpenSlug(null)} />}
    </div>
  );
}

function Chip({ active, label, count, onClick }) {
  return (
    <button className={'sl-chip' + (active ? ' on' : '')} onClick={onClick}>
      {label}<span className="sl-chip-n">{count}</span>
    </button>
  );
}

function SkillCard({ skill, onOpen }) {
  return (
    <button className="sl-card" onClick={onOpen}>
      <div className="sl-card-top">
        <span className="sl-card-cat">{skill.category}</span>
        <span className="sl-card-meta">
          {skill.grade && <GradeBadge grade={skill.grade} score={skill.score} />}
          <span className="sl-card-v">v{skill.version}</span>
        </span>
      </div>
      <div className="sl-card-name">{skill.name}</div>
      <div className="sl-card-desc">{skill.description}</div>
      <div className="sl-card-tags">
        {(skill.tags || []).slice(0, 4).map((t) => <span key={t} className="sl-tagpill">#{t}</span>)}
      </div>
      <div className="sl-card-go">查看技能 →</div>
    </button>
  );
}

function SkillModal({ skill, onClose }) {
  const [state, setState] = useState({ status: 'loading', body: '', front: {} });
  const [copied, setCopied] = useState(false);
  const [rawText, setRawText] = useState('');

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading', body: '', front: {} });
    fetch(BASE + skill.path, { cache: 'no-cache' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then((text) => {
        if (!alive) return;
        setRawText(text);
        const { data, body } = splitFrontmatter(text);
        setState({ status: 'ready', body, front: data });
      })
      .catch((e) => { if (alive) setState({ status: 'error', body: String(e.message || e), front: {} }); });
    return () => { alive = false; };
  }, [skill.path]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const [copiedInstall, setCopiedInstall] = useState(false);
  const install = useMemo(() => installCommand(skill.slug), [skill.slug]);

  const copyText = useCallback(async (text, mark) => {
    try {
      await navigator.clipboard.writeText(text);
      mark(true);
      setTimeout(() => mark(false), 1600);
    } catch { /* 剪贴板不可用时静默 */ }
  }, []);
  const copy = useCallback(() => copyText(rawText, setCopied), [copyText, rawText]);
  const copyInstall = useCallback(() => copyText(install, setCopiedInstall), [copyText, install]);

  const issues = useMemo(
    () => validateSkill({ name: skill.name, description: skill.description }),
    [skill.name, skill.description]
  );

  const quality = useMemo(
    () => state.status === 'ready' ? scoreSkill(skill, state.body) : null,
    [skill, state.status, state.body]
  );

  const bodyHtml = useMemo(
    () => state.status === 'ready' ? renderMarkdown(state.body) : '',
    [state.status, state.body]
  );

  return (
    <div className="sl-ovl" onClick={onClose}>
      <div className="sl-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="sl-x" onClick={onClose} aria-label="关闭">×</button>

        <div className="sl-m-hd">
          <div className="sl-m-cat">{skill.category} · v{skill.version}</div>
          <h2 className="sl-m-name">{skill.name}</h2>
          <p className="sl-m-desc">{skill.description}</p>
          <div className="sl-m-actions">
            <button className="sl-btn sl-btn-pri" onClick={copy}>{copied ? '已复制 ✓' : '复制 SKILL.md'}</button>
            <button className="sl-btn" onClick={copyInstall}>{copiedInstall ? '已复制安装命令 ✓' : '复制安装命令'}</button>
            <a className="sl-btn" href={BASE + skill.path} download={`${skill.slug}-SKILL.md`}>下载</a>
            <a className="sl-btn" href={BASE + skill.path} target="_blank" rel="noopener noreferrer">查看源文件</a>
          </div>
        </div>

        <div className="sl-m-install">
          <div className="sl-m-install-k">安装（克隆仓库后）</div>
          <code className="sl-m-install-cmd">{install}</code>
        </div>

        <div className="sl-m-meta">
          <Meta label="安装位置"><code>~/.claude/skills/{skill.slug}/SKILL.md</code></Meta>
          {skill.license && <Meta label="许可证">{skill.license}</Meta>}
          {skill.author && <Meta label="作者">{skill.author}</Meta>}
          {skill.allowedTools.length > 0 && (
            <Meta label="允许工具">{skill.allowedTools.map((t) => <code key={t} className="sl-tool">{t}</code>)}</Meta>
          )}
          {skill.tags.length > 0 && (
            <Meta label="标签">{skill.tags.map((t) => <span key={t} className="sl-tagpill">#{t}</span>)}</Meta>
          )}
          <Meta label="标准校验">
            {issues.length === 0
              ? <span className="sl-ok">✓ 符合 Agent Skills 标准</span>
              : <span className="sl-warn">{issues.join('；')}</span>}
          </Meta>
        </div>

        {quality && <ScorePanel quality={quality} />}

        <div className="sl-m-body">
          {state.status === 'loading' && <div className="sl-note">正在加载 SKILL.md…</div>}
          {state.status === 'error' && <div className="sl-err">无法加载：{state.body}</div>}
          {state.status === 'ready' && <div className="md" dangerouslySetInnerHTML={{ __html: bodyHtml }} />}
        </div>
      </div>
    </div>
  );
}

function Meta({ label, children }) {
  return (
    <div className="sl-meta-row">
      <div className="sl-meta-k">{label}</div>
      <div className="sl-meta-v">{children}</div>
    </div>
  );
}

function GradeBadge({ grade, score }) {
  const g = String(grade || '').toLowerCase();
  return (
    <span className={'sl-grade sl-grade-' + g} title={score != null ? `质量分 ${score}/100` : ''}>
      {grade}
    </span>
  );
}

function ScorePanel({ quality }) {
  const { score, grade, checks } = quality;
  return (
    <div className="sl-score">
      <div className="sl-score-hd">
        <GradeBadge grade={grade} score={score} />
        <div className="sl-score-num">{score}<span>/100</span></div>
        <div className="sl-score-cap">质量分（对齐 SPEC.md 评分维度）</div>
      </div>
      <div className="sl-score-bar"><i style={{ width: score + '%' }} /></div>
      <ul className="sl-score-list">
        {checks.map((c) => (
          <li key={c.label} className={c.ok ? 'ok' : 'no'} title={c.ok ? '' : c.hint}>
            <span className="sl-score-ic">{c.ok ? '✓' : '○'}</span>
            {c.label}
            {!c.ok && <span className="sl-score-hint">— {c.hint}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Style() {
  return <style>{CSS}</style>;
}

const CSS = `
.sl{--bg:#F6F5F0;--surface:#FFFFFF;--surface-2:#FBFAF6;--fill:#F1EFE8;
  --t1:#26241F;--t2:#83827A;--t3:#B0AFA5;--accent:#CC785C;--accent-2:#B5654A;
  --accent-soft:#F5ECE5;--bd:#ECEAE2;--bd-2:#F0EEE7;--ok:#6E9079;--warn:#BE9356;--danger:#BC6055;
  --serif:'Tiempos Text',Georgia,'Songti SC','STSong',serif;
  --sans:ui-sans-serif,system-ui,-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;
  font-family:var(--sans);color:var(--t1);max-width:1080px;margin:0 auto;padding:8px 4px 64px;line-height:1.6;}
.sl *{box-sizing:border-box;}
.sl-hd{margin:24px 0 28px;}
.sl-brand{font-family:var(--serif);font-size:32px;font-weight:600;letter-spacing:-.5px;display:flex;align-items:center;gap:12px;}
.sl-ic{font-size:30px;}
.sl-tag{color:var(--t2);font-size:15px;margin-top:12px;max-width:680px;}
.sl-tag a{color:var(--accent-2);text-decoration:none;}.sl-tag a:hover{text-decoration:underline;}
.sl-tag strong{color:var(--t1);font-weight:600;}
.sl-sub{font-size:11px;color:var(--t3);letter-spacing:2px;text-transform:uppercase;margin-top:8px;}

.sl-toolbar{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:14px;}
.sl-search{flex:1;min-width:240px;display:flex;align-items:center;gap:8px;background:var(--surface);
  border:1px solid var(--bd);border-radius:10px;padding:9px 12px;color:var(--t3);transition:border-color .15s;}
.sl-search:focus-within{border-color:var(--accent);}
.sl-search input{flex:1;border:0;outline:0;background:transparent;font-size:14px;color:var(--t1);font-family:inherit;}
.sl-search input::placeholder{color:var(--t3);}
.sl-clear{border:0;background:transparent;color:var(--t3);font-size:18px;cursor:pointer;line-height:1;padding:0 2px;}
.sl-clear:hover{color:var(--accent-2);}
.sl-count{font-size:12.5px;color:var(--t3);font-variant-numeric:tabular-nums;white-space:nowrap;}

.sl-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px;}
.sl-chip{font-family:inherit;font-size:12.5px;color:var(--t2);background:var(--surface);border:1px solid var(--bd);
  border-radius:999px;padding:5px 12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all .15s;}
.sl-chip:hover{border-color:var(--accent);color:var(--accent-2);}
.sl-chip.on{background:var(--accent-soft);border-color:var(--accent);color:var(--accent-2);font-weight:600;}
.sl-chip-n{font-size:11px;color:var(--t3);font-variant-numeric:tabular-nums;}
.sl-chip.on .sl-chip-n{color:var(--accent-2);}

.sl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:16px;}
.sl-card{text-align:left;font-family:inherit;cursor:pointer;background:var(--surface);border:1px solid var(--bd);
  border-radius:14px;padding:18px 18px 16px;display:flex;flex-direction:column;gap:9px;transition:border-color .15s,transform .15s,box-shadow .15s;}
.sl-card:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:0 10px 26px -14px rgba(40,36,30,.22);}
.sl-card-top{display:flex;justify-content:space-between;align-items:center;}
.sl-card-cat{font-size:11px;letter-spacing:.4px;text-transform:uppercase;color:var(--accent-2);font-weight:600;}
.sl-card-v{font-size:11px;color:var(--t3);font-variant-numeric:tabular-nums;}
.sl-card-name{font-family:var(--serif);font-size:19px;font-weight:600;letter-spacing:-.2px;}
.sl-card-desc{font-size:13px;color:var(--t2);line-height:1.6;flex:1;
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
.sl-card-tags{display:flex;flex-wrap:wrap;gap:6px;}
.sl-tagpill{font-size:11px;color:var(--t2);background:var(--surface-2);border:1px solid var(--bd-2);border-radius:6px;padding:2px 7px;}
.sl-card-go{margin-top:2px;font-size:12.5px;font-weight:600;color:var(--accent-2);}

.sl-note{color:var(--t2);font-size:14px;padding:40px 4px;text-align:center;}
.sl-err{background:#FBEEEC;border:1px solid #E8C9C3;color:#9A3F36;border-radius:12px;padding:14px 18px;font-size:13.5px;}
.sl-err-hint{margin-top:6px;color:#B07A72;font-size:12.5px;}
.sl-err code,.sl-err-hint code{background:#fff;border:1px solid #E8C9C3;border-radius:5px;padding:1px 5px;}

.sl-ft{margin-top:40px;color:var(--t3);font-size:12.5px;line-height:1.9;border-top:1px solid var(--bd-2);padding-top:18px;}
.sl-ft a{color:var(--accent-2);text-decoration:none;}.sl-ft a:hover{text-decoration:underline;}
.sl-ft code{background:var(--surface-2);border:1px solid var(--bd-2);border-radius:5px;padding:1px 5px;font-size:12px;}

.sl-ovl{position:fixed;inset:0;background:rgba(38,36,31,.42);display:flex;align-items:flex-start;justify-content:center;
  padding:5vh 16px;z-index:50;overflow-y:auto;backdrop-filter:blur(2px);}
.sl-modal{position:relative;width:100%;max-width:760px;background:var(--surface);border:1px solid var(--bd);
  border-radius:18px;padding:28px 30px 30px;box-shadow:0 24px 60px -20px rgba(40,36,30,.4);}
.sl-x{position:absolute;top:16px;right:18px;border:0;background:transparent;font-size:24px;line-height:1;color:var(--t3);cursor:pointer;}
.sl-x:hover{color:var(--accent-2);}
.sl-m-cat{font-size:11px;letter-spacing:.5px;text-transform:uppercase;color:var(--accent-2);font-weight:600;}
.sl-m-name{font-family:var(--serif);font-size:27px;font-weight:600;letter-spacing:-.3px;margin:7px 0 8px;}
.sl-m-desc{color:var(--t2);font-size:14px;line-height:1.65;max-width:600px;}
.sl-m-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:16px;}
.sl-btn{font-family:inherit;font-size:13px;font-weight:500;color:var(--t1);background:var(--surface);border:1px solid var(--bd);
  border-radius:8px;padding:8px 15px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;transition:all .15s;}
.sl-btn:hover{border-color:var(--accent);color:var(--accent-2);}
.sl-btn-pri{background:var(--accent);border-color:var(--accent);color:#fff;box-shadow:0 1px 2px rgba(204,120,92,.25);}
.sl-btn-pri:hover{background:var(--accent-2);border-color:var(--accent-2);color:#fff;}
.sl-btn-pri:active{transform:translateY(1px);}

.sl-m-meta{margin:22px 0;border:1px solid var(--bd-2);border-radius:12px;overflow:hidden;}
.sl-meta-row{display:flex;gap:14px;padding:10px 14px;border-bottom:1px solid var(--bd-2);font-size:13px;}
.sl-meta-row:last-child{border-bottom:0;}
.sl-meta-k{width:88px;flex:none;color:var(--t3);font-size:12px;padding-top:1px;}
.sl-meta-v{flex:1;display:flex;flex-wrap:wrap;gap:6px;align-items:center;color:var(--t1);}
.sl-meta-v code{background:var(--surface-2);border:1px solid var(--bd-2);border-radius:5px;padding:1px 6px;font-size:12px;}
.sl-tool{color:var(--accent-2)!important;}
.sl-ok{color:var(--ok);font-weight:600;}
.sl-warn{color:var(--warn);}

.sl-m-body{margin-top:6px;}
.md{font-size:14px;line-height:1.72;color:var(--t1);}
.md-h1,.md-h2,.md-h3,.md-h4{font-family:var(--serif);font-weight:600;letter-spacing:-.2px;line-height:1.3;margin:22px 0 10px;}
.md-h1{font-size:23px;}.md-h2{font-size:19px;}.md-h3{font-size:16px;}.md-h4{font-size:14.5px;}
.md-p{margin:11px 0;}
.md-ul,.md-ol{margin:11px 0;padding-left:22px;}
.md-ul li,.md-ol li{margin:5px 0;}
.md-code{background:var(--surface-2);border:1px solid var(--bd);border-radius:5px;padding:1px 6px;font-size:12.5px;
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--accent-2);}
.md-pre{background:#33302A;color:#F3EFE7;border-radius:10px;padding:14px 16px;overflow-x:auto;margin:13px 0;}
.md-pre code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;line-height:1.6;background:none;border:0;color:inherit;padding:0;}
.md-a{color:var(--accent-2);text-decoration:none;}.md-a:hover{text-decoration:underline;}
.md-quote{border-left:3px solid var(--accent);background:var(--accent-soft);margin:13px 0;padding:9px 14px;color:var(--t2);border-radius:0 8px 8px 0;}
.md-hr{border:0;border-top:1px solid var(--bd);margin:20px 0;}
.md strong{font-weight:600;}.md em{font-style:italic;}

.sl-avg{color:var(--accent-2);}

.sl-tagcloud{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin:-8px 0 22px;}
.sl-tagcloud-k{font-size:12px;color:var(--t3);margin-right:2px;}
.sl-tagchip{font-family:inherit;font-size:12px;color:var(--t2);background:var(--surface-2);border:1px solid var(--bd-2);
  border-radius:6px;padding:3px 8px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:all .15s;}
.sl-tagchip:hover{border-color:var(--accent);color:var(--accent-2);}
.sl-tagchip.on{background:var(--accent-soft);border-color:var(--accent);color:var(--accent-2);font-weight:600;}
.sl-tagchip-n{font-size:10.5px;color:var(--t3);font-variant-numeric:tabular-nums;}
.sl-tagchip.on .sl-tagchip-n{color:var(--accent-2);}
.sl-tagclear{font-family:inherit;font-size:12px;color:var(--t3);background:transparent;border:0;cursor:pointer;padding:3px 4px;}
.sl-tagclear:hover{color:var(--accent-2);}

.sl-card-meta{display:flex;align-items:center;gap:7px;}
.sl-grade{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;
  border-radius:5px;font-size:11px;font-weight:700;font-family:var(--serif);letter-spacing:.2px;}
.sl-grade-a{background:#E5EEE7;color:#4F7A5E;}
.sl-grade-b{background:#EAF0E6;color:#6E8A4E;}
.sl-grade-c{background:#F6EEDD;color:#A77B33;}
.sl-grade-d{background:#F6E3DF;color:#A8503F;}

.sl-m-install{margin:18px 0 0;background:#33302A;border-radius:10px;padding:11px 14px;display:flex;flex-direction:column;gap:5px;}
.sl-m-install-k{font-size:11px;color:#B8B2A6;letter-spacing:.3px;}
.sl-m-install-cmd{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;color:#F3EFE7;
  word-break:break-all;line-height:1.5;}

.sl-score{margin:20px 0 6px;border:1px solid var(--bd-2);border-radius:12px;padding:16px 16px 12px;background:var(--surface-2);}
.sl-score-hd{display:flex;align-items:center;gap:10px;}
.sl-score-num{font-family:var(--serif);font-size:24px;font-weight:600;font-variant-numeric:tabular-nums;}
.sl-score-num span{font-size:13px;color:var(--t3);font-family:var(--sans);margin-left:1px;}
.sl-score-cap{font-size:12px;color:var(--t2);margin-left:auto;}
.sl-score-bar{height:5px;background:var(--fill);border-radius:3px;overflow:hidden;margin:11px 0 13px;}
.sl-score-bar i{display:block;height:100%;background:var(--accent);border-radius:3px;transition:width .3s;}
.sl-score-list{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:4px 18px;}
.sl-score-list li{font-size:12.5px;color:var(--t1);display:flex;gap:6px;align-items:baseline;}
.sl-score-list li.no{color:var(--t2);}
.sl-score-ic{color:var(--ok);font-weight:700;}
.sl-score-list li.no .sl-score-ic{color:var(--t3);}
.sl-score-hint{color:var(--warn);font-size:11.5px;}

@media (max-width:560px){
  .sl-modal{padding:22px 18px 24px;}
  .sl-m-name{font-size:23px;}
  .sl-meta-row{flex-direction:column;gap:4px;}
  .sl-meta-k{width:auto;}
  .sl-score-list{grid-template-columns:1fr;}
}
`;

/**
 * <CommandPalette> — ⌘K 命令面板：模糊搜索 + 分组 + 最近使用 + 命中高亮 + 键盘操作。
 * 非受控（自带 ⌘K/Ctrl+K 热键）：
 *   <CommandPalette commands={[{ id:'new', label:'新建', hint:'⌘N', group:'文件', onRun:()=>... }]} />
 * 受控：传 open + onClose，并设 hotkey={false} 自行接管热键。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { filterCommands, groupCommands, pickByIds, fuzzyMatchIndices } from './util/command.js';
import { useInjectedStyle } from './util/hooks.js';

const CSS = `
.muse-cmdk-mask{position:fixed;inset:0;background:rgba(40,38,34,.45);display:flex;align-items:flex-start;
  justify-content:center;padding-top:14vh;z-index:60;backdrop-filter:blur(2px);}
.muse-cmdk{width:100%;max-width:540px;background:#FBFAF6;border:1px solid #E5E1D8;border-radius:14px;
  box-shadow:0 24px 60px rgba(0,0,0,.28);overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC',sans-serif;}
.muse-cmdk-input{width:100%;border:none;outline:none;padding:16px 18px;font-size:16px;background:transparent;
  color:#33312C;border-bottom:1px solid #E5E1D8;box-sizing:border-box;}
.muse-cmdk-list{list-style:none;margin:0;padding:6px;max-height:360px;overflow-y:auto;}
.muse-cmdk-group{padding:9px 12px 4px;font-size:11px;color:#9B978C;letter-spacing:.6px;text-transform:uppercase;}
.muse-cmdk-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;
  border-radius:9px;cursor:pointer;font-size:14.5px;color:#33312C;}
.muse-cmdk-item.active{background:#F3E7E0;}
.muse-cmdk-hint{font-size:12px;color:#9B978C;flex:none;}
.muse-cmdk-hl{background:transparent;color:#CC785C;font-weight:700;}
.muse-cmdk-empty{padding:18px 14px;color:#9B978C;font-size:14px;text-align:center;}
`;

function renderLabel(label, q) {
  const s = String(label || '');
  if (!q) return s;
  const idx = fuzzyMatchIndices(q, s);
  if (!idx || !idx.length) return s;
  const set = new Set(idx);
  const out = [];
  for (let i = 0; i < s.length; i++) {
    out.push(set.has(i) ? <mark key={i} className="muse-cmdk-hl">{s[i]}</mark> : s[i]);
  }
  return out;
}

export default function CommandPalette({ commands = [], open: openProp, onClose, hotkey = true, placeholder = '输入命令…', className = '' }) {
  useInjectedStyle('muse-cmdk', CSS);
  const controlled = openProp != null;
  const [openState, setOpenState] = useState(false);
  const open = controlled ? openProp : openState;
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [recentIds, setRecentIds] = useState([]);
  const inputRef = useRef(null);

  const setOpen = (v) => {
    if (!controlled) setOpenState(v);
    if (!v && onClose) onClose();
  };

  // 计算可见命令的扁平列表（键盘导航用）+ 分组结构（渲染用）
  const { flat, sections } = useMemo(() => {
    if (q.trim()) {
      const filtered = filterCommands(commands, q);
      return { flat: filtered, sections: groupCommands(filtered) };
    }
    const recent = pickByIds(commands, recentIds);
    const recentSet = new Set(recentIds);
    const rest = commands.filter((c) => !recentSet.has(c.id));
    const flatList = [...recent, ...rest];
    const secs = (recent.length ? [{ group: '最近', items: recent }] : []).concat(groupCommands(rest));
    return { flat: flatList, sections: secs };
  }, [commands, q, recentIds]);

  const indexOfItem = useMemo(() => {
    const m = new Map();
    flat.forEach((c, i) => m.set(c.id != null ? c.id : c, i));
    return m;
  }, [flat]);

  useEffect(() => {
    if (!hotkey || controlled) return undefined;
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpenState(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hotkey, controlled]);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      const id = setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  if (!open) return null;

  const run = (cmd) => {
    if (!cmd) return;
    if (cmd.id != null) setRecentIds((prev) => [cmd.id, ...prev.filter((x) => x !== cmd.id)].slice(0, 6));
    if (cmd.onRun) cmd.onRun();
    setOpen(false);
  };
  const onKeyDown = (e) => {
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(flat[active]);
    }
  };

  return (
    <div className={`muse-cmdk-mask ${className}`.trim()} onClick={() => setOpen(false)}>
      <div className="muse-cmdk" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="muse-cmdk-input"
          placeholder={placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <ul className="muse-cmdk-list">
          {flat.length ? (
            sections.map((sec) => (
              <React.Fragment key={sec.group || '_'}>
                {sec.group ? <li className="muse-cmdk-group">{sec.group}</li> : null}
                {sec.items.map((c) => {
                  const i = indexOfItem.get(c.id != null ? c.id : c);
                  return (
                    <li
                      key={c.id != null ? c.id : i}
                      className={`muse-cmdk-item ${i === active ? 'active' : ''}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => run(c)}
                    >
                      <span className="muse-cmdk-label">{renderLabel(c.label, q)}</span>
                      {c.hint && <span className="muse-cmdk-hint">{c.hint}</span>}
                    </li>
                  );
                })}
              </React.Fragment>
            ))
          ) : (
            <li className="muse-cmdk-empty">无匹配命令</li>
          )}
        </ul>
      </div>
    </div>
  );
}

/**
 * <CommandPalette> — ⌘K 命令面板：模糊搜索 + 方向键/回车执行。
 * 用法（非受控，自带 ⌘K/Ctrl+K 热键）：
 *   <CommandPalette commands={[{ id:'new', label:'新建', hint:'⌘N', onRun:()=>... }]} />
 * 受控用法：传 open + onClose，并设 hotkey={false} 自行接管热键。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { filterCommands } from './util/command.js';
import { useInjectedStyle } from './util/hooks.js';

const CSS = `
.muse-cmdk-mask{position:fixed;inset:0;background:rgba(40,38,34,.45);display:flex;align-items:flex-start;
  justify-content:center;padding-top:14vh;z-index:60;backdrop-filter:blur(2px);}
.muse-cmdk{width:100%;max-width:540px;background:#FBFAF6;border:1px solid #E5E1D8;border-radius:14px;
  box-shadow:0 24px 60px rgba(0,0,0,.28);overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC',sans-serif;}
.muse-cmdk-input{width:100%;border:none;outline:none;padding:16px 18px;font-size:16px;background:transparent;
  color:#33312C;border-bottom:1px solid #E5E1D8;box-sizing:border-box;}
.muse-cmdk-list{list-style:none;margin:0;padding:6px;max-height:340px;overflow-y:auto;}
.muse-cmdk-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;
  border-radius:9px;cursor:pointer;font-size:14.5px;color:#33312C;}
.muse-cmdk-item.active{background:#F3E7E0;}
.muse-cmdk-hint{font-size:12px;color:#9B978C;flex:none;}
.muse-cmdk-empty{padding:18px 14px;color:#9B978C;font-size:14px;text-align:center;}
`;

export default function CommandPalette({ commands = [], open: openProp, onClose, hotkey = true, placeholder = '输入命令…', className = '' }) {
  useInjectedStyle('muse-cmdk', CSS);
  const controlled = openProp != null;
  const [openState, setOpenState] = useState(false);
  const open = controlled ? openProp : openState;
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  const setOpen = (v) => {
    if (!controlled) setOpenState(v);
    if (!v && onClose) onClose();
  };

  const results = useMemo(() => filterCommands(commands, q), [commands, q]);

  // ⌘K / Ctrl+K 唤起（受控模式下交给父级，设 hotkey=false 即可）
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
    if (cmd && cmd.onRun) cmd.onRun();
    setOpen(false);
  };
  const onKeyDown = (e) => {
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(results[active]);
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
          {results.length ? (
            results.map((c, i) => (
              <li
                key={c.id || i}
                className={`muse-cmdk-item ${i === active ? 'active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(c)}
              >
                <span className="muse-cmdk-label">{c.label}</span>
                {c.hint && <span className="muse-cmdk-hint">{c.hint}</span>}
              </li>
            ))
          ) : (
            <li className="muse-cmdk-empty">无匹配命令</li>
          )}
        </ul>
      </div>
    </div>
  );
}

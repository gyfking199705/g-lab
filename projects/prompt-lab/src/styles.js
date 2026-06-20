/** prompt-lab 全局样式（注入一次）。遵循 g-lab DESIGN.md：暖纸色 + 陶土橙、
 *  衬线标题、发丝边框、几乎无阴影、克制过渡。类名统一 pl- 前缀避免冲突。 */
export const CSS = `
.pl-root{
  --bg:#F6F5F0;--surface:#FFFFFF;--surface-2:#FBFAF6;--fill:#F1EFE8;
  --t1:#26241F;--t2:#83827A;--t3:#B0AFA5;
  --accent:#CC785C;--accent-2:#B5654A;--accent-soft:#F5ECE5;
  --bd:#ECEAE2;--bd-2:#F0EEE7;
  --ok:#6E9079;--warn:#BE9356;--danger:#BC6055;
  --serif:'Tiempos Text',Georgia,'Songti SC','STSong',serif;
  --sans:ui-sans-serif,system-ui,-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;
  --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  color:var(--t1);font-family:var(--sans);line-height:1.6;font-size:13.5px;
  -webkit-font-smoothing:antialiased;
}
.pl-root *{box-sizing:border-box;}
.pl-app{max-width:1180px;margin:0 auto;padding:28px 24px 64px;}

/* header */
.pl-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:22px;}
.pl-brand{font-family:var(--serif);font-size:27px;font-weight:600;letter-spacing:-.4px;display:flex;align-items:center;gap:11px;}
.pl-brand img{width:34px;height:34px;}
.pl-tag{color:var(--t2);font-size:13.5px;margin-top:4px;}
.pl-head-actions{display:flex;gap:8px;flex-wrap:wrap;}

/* buttons */
.pl-btn{display:inline-flex;align-items:center;gap:6px;font-family:var(--sans);font-size:13px;font-weight:500;
  border-radius:8px;padding:7px 13px;border:1px solid var(--bd);background:var(--surface);color:var(--t1);
  cursor:pointer;transition:border-color .15s,background .15s,color .15s,transform .05s;white-space:nowrap;}
.pl-btn:hover{border-color:var(--t3);}
.pl-btn:active{transform:translateY(1px);}
.pl-btn.pl-primary{background:var(--accent);border-color:var(--accent);color:#fff;box-shadow:0 1px 2px rgba(204,120,92,.25);}
.pl-btn.pl-primary:hover{background:var(--accent-2);border-color:var(--accent-2);box-shadow:0 2px 6px rgba(204,120,92,.3);}
.pl-btn.pl-ghost{background:transparent;border-color:transparent;color:var(--t2);padding:6px 9px;}
.pl-btn.pl-ghost:hover{color:var(--t1);background:var(--fill);}
.pl-btn.pl-danger:hover{color:var(--danger);border-color:var(--danger);}
.pl-btn:disabled{opacity:.5;cursor:default;}
.pl-btn-sm{padding:5px 9px;font-size:12.5px;}

/* layout */
.pl-layout{display:grid;grid-template-columns:212px 1fr;gap:24px;align-items:start;}
@media(max-width:760px){.pl-layout{grid-template-columns:1fr;}}

/* sidebar */
.pl-side{position:sticky;top:18px;display:flex;flex-direction:column;gap:18px;}
@media(max-width:760px){.pl-side{position:static;}}
.pl-side h4{font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:var(--t3);margin:0 0 8px;font-weight:600;}
.pl-navlist{display:flex;flex-direction:column;gap:1px;}
.pl-navlist.pl-wrap{flex-direction:row;flex-wrap:wrap;gap:6px;}
.pl-nav{display:flex;align-items:center;justify-content:space-between;gap:8px;text-align:left;
  border:none;background:transparent;color:var(--t2);font-family:var(--sans);font-size:13px;
  padding:6px 9px;border-radius:7px;cursor:pointer;transition:background .15s,color .15s;width:100%;}
.pl-nav:hover{background:var(--fill);color:var(--t1);}
.pl-nav.pl-on{background:var(--accent-soft);color:var(--accent-2);font-weight:500;}
.pl-nav .pl-count{font-size:11.5px;color:var(--t3);font-variant-numeric:tabular-nums;}
.pl-nav.pl-on .pl-count{color:var(--accent-2);}
.pl-chip{border:1px solid var(--bd);background:var(--surface);color:var(--t2);font-size:12px;
  border-radius:999px;padding:3px 10px;cursor:pointer;transition:all .15s;}
.pl-chip:hover{border-color:var(--t3);color:var(--t1);}
.pl-chip.pl-on{background:var(--accent-soft);border-color:var(--accent);color:var(--accent-2);}

/* search + toolbar */
.pl-toolbar{display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;}
.pl-search{flex:1;min-width:180px;display:flex;align-items:center;gap:8px;background:var(--surface);
  border:1px solid var(--bd);border-radius:9px;padding:8px 12px;color:var(--t3);transition:border-color .15s;}
.pl-search:focus-within{border-color:var(--accent);color:var(--accent);}
.pl-search input{flex:1;border:none;outline:none;background:transparent;font-family:var(--sans);
  font-size:13.5px;color:var(--t1);}
.pl-select{border:1px solid var(--bd);background:var(--surface);border-radius:8px;padding:7px 10px;
  font-family:var(--sans);font-size:13px;color:var(--t1);cursor:pointer;}
.pl-meta{color:var(--t3);font-size:12.5px;}

/* cards grid */
.pl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;}
.pl-grid.pl-list{grid-template-columns:1fr;}
.pl-card{background:var(--surface);border:1px solid var(--bd);border-radius:14px;padding:16px 16px 14px;
  cursor:pointer;transition:border-color .15s,transform .15s,box-shadow .15s;display:flex;flex-direction:column;gap:9px;}
.pl-card:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:0 8px 22px -14px rgba(40,36,30,.22);}
.pl-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
.pl-card-title{font-family:var(--serif);font-size:16px;font-weight:600;line-height:1.35;}
.pl-card-sum{color:var(--t2);font-size:13px;line-height:1.55;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.pl-card-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:1px;}
.pl-tag-s{font-size:11px;color:var(--t2);background:var(--fill);border-radius:5px;padding:2px 7px;}
.pl-tag-s.pl-cat{background:var(--accent-soft);color:var(--accent-2);}
.pl-card-foot{display:flex;align-items:center;justify-content:space-between;margin-top:2px;
  padding-top:9px;border-top:1px solid var(--bd-2);color:var(--t3);font-size:11.5px;}
.pl-star{border:none;background:transparent;cursor:pointer;color:var(--t3);padding:2px;display:inline-flex;transition:color .15s;}
.pl-star:hover{color:var(--accent);}
.pl-star.pl-on{color:var(--accent);}

/* empty */
.pl-empty{text-align:center;color:var(--t3);padding:64px 20px;font-family:var(--serif);font-size:16px;}

/* modal / drawer */
.pl-overlay{position:fixed;inset:0;background:rgba(38,36,31,.34);backdrop-filter:blur(1.5px);
  display:flex;justify-content:flex-end;z-index:50;animation:pl-fade .15s ease;}
.pl-overlay.pl-center{align-items:center;justify-content:center;padding:20px;}
@keyframes pl-fade{from{opacity:0}to{opacity:1}}
.pl-drawer{background:var(--bg);width:min(620px,100%);height:100%;overflow-y:auto;
  box-shadow:-12px 0 40px -20px rgba(0,0,0,.3);animation:pl-slide .2s ease;}
@keyframes pl-slide{from{transform:translateX(24px);opacity:.6}to{transform:none;opacity:1}}
.pl-modal{background:var(--bg);width:min(720px,100%);max-height:90vh;overflow-y:auto;border-radius:16px;
  box-shadow:0 24px 60px -24px rgba(0,0,0,.4);animation:pl-pop .16s ease;}
@keyframes pl-pop{from{transform:scale(.98);opacity:.6}to{transform:none;opacity:1}}
.pl-dh{position:sticky;top:0;background:var(--bg);z-index:1;display:flex;align-items:center;justify-content:space-between;
  gap:12px;padding:18px 22px 14px;border-bottom:1px solid var(--bd);}
.pl-dh h3{font-family:var(--serif);font-size:19px;font-weight:600;line-height:1.3;}
.pl-db{padding:18px 22px 26px;display:flex;flex-direction:column;gap:18px;}

/* detail blocks */
.pl-block h5{font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:var(--t3);
  margin:0 0 7px;font-weight:600;display:flex;align-items:center;justify-content:space-between;}
.pl-pre{background:var(--surface);border:1px solid var(--bd);border-radius:10px;padding:12px 14px;
  font-family:var(--mono);font-size:12.5px;line-height:1.65;white-space:pre-wrap;word-break:break-word;color:var(--t1);}
.pl-pre.pl-muted{color:var(--t2);}
.pl-kv{display:flex;flex-wrap:wrap;gap:6px 18px;color:var(--t2);font-size:12.5px;}
.pl-kv b{color:var(--t1);font-weight:500;}
.pl-var-row{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
.pl-var-row label{font-family:var(--mono);font-size:12.5px;color:var(--accent-2);min-width:120px;}
.pl-var-row input{flex:1;border:1px solid var(--bd);border-radius:7px;padding:6px 10px;
  font-family:var(--sans);font-size:13px;background:var(--surface);outline:none;}
.pl-var-row input:focus{border-color:var(--accent);}

/* form */
.pl-field{display:flex;flex-direction:column;gap:6px;}
.pl-field label{font-size:12px;color:var(--t2);font-weight:500;}
.pl-field .pl-hint{font-size:11.5px;color:var(--t3);font-weight:400;}
.pl-input,.pl-textarea{border:1px solid var(--bd);border-radius:8px;padding:8px 11px;font-family:var(--sans);
  font-size:13.5px;background:var(--surface);color:var(--t1);outline:none;transition:border-color .15s;width:100%;}
.pl-textarea{font-family:var(--mono);font-size:12.5px;line-height:1.6;resize:vertical;min-height:88px;}
.pl-input:focus,.pl-textarea:focus{border-color:var(--accent);}
.pl-row2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
@media(max-width:520px){.pl-row2{grid-template-columns:1fr;}}
.pl-multi{display:flex;flex-wrap:wrap;gap:6px;}
.pl-foot{position:sticky;bottom:0;background:var(--bg);border-top:1px solid var(--bd);
  padding:14px 22px;display:flex;justify-content:flex-end;gap:9px;}

/* toast */
.pl-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:#33302A;color:#fff;
  font-size:13px;padding:9px 16px;border-radius:10px;z-index:100;display:flex;align-items:center;gap:7px;
  box-shadow:0 8px 24px -10px rgba(0,0,0,.4);animation:pl-fade .15s ease;}
`;

/**
 * 组件内联样式（类名前缀 mkl-）。遵循仓库共享 DESIGN.md：
 * 暖纸色 #F6F5F0 + 陶土橙 #CC785C、衬线标题、发丝级边框、几乎无阴影、克制留白。
 */
export const STYLE = `
.mkl-root{
  --bg:#F6F5F0;--surface:#FFFFFF;--surface-2:#FBFAF6;--fill:#F1EFE8;
  --t1:#26241F;--t2:#83827A;--t3:#B0AFA5;
  --accent:#CC785C;--accent-2:#B5654A;--accent-soft:#F5ECE5;
  --bd:#ECEAE2;--bd-2:#F0EEE7;
  --ok:#6E9079;--warn:#BE9356;--danger:#BC6055;--tool:#7C8AAE;
  --code-bg:#2B2922;--code-fg:#EDE9E0;
  --serif:'Tiempos Text',Georgia,'Songti SC','STSong',serif;
  --sans:ui-sans-serif,system-ui,-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;
  --mono:'SFMono-Regular',ui-monospace,'JetBrains Mono','Menlo','Consolas',monospace;
  max-width:1080px;margin:0 auto;padding:56px 22px 80px;color:var(--t1);
  font-family:var(--sans);line-height:1.6;-webkit-font-smoothing:antialiased;
}
.mkl-root *{box-sizing:border-box;}
.mkl-root button{font-family:inherit;cursor:pointer;}

/* hero */
.mkl-kicker{font-size:11px;letter-spacing:2.5px;color:var(--t3);text-transform:uppercase;margin-bottom:12px;}
.mkl-hero h1{font-family:var(--serif);font-weight:600;font-size:38px;letter-spacing:-.6px;margin:0 0 14px;}
.mkl-lede{color:var(--t2);font-size:15px;max-width:780px;margin:0 0 20px;}
.mkl-lede b{color:var(--t1);font-weight:600;}
.mkl-statline{display:flex;flex-wrap:wrap;gap:22px;font-size:13px;color:var(--t2);}
.mkl-statline b{font-family:var(--serif);font-size:18px;color:var(--accent-2);font-weight:600;
  font-variant-numeric:tabular-nums;margin-right:5px;}

/* top tabs (gallery / workshop) */
.mkl-tabs{display:inline-flex;gap:4px;background:var(--surface);border:1px solid var(--bd);
  border-radius:11px;padding:4px;margin:30px 0 8px;}
.mkl-tab{border:none;background:none;color:var(--t2);font-size:13.5px;font-weight:600;
  padding:8px 16px;border-radius:8px;transition:background .15s,color .15s;}
.mkl-tab:hover{color:var(--accent-2);}
.mkl-tab.on{background:var(--accent);color:#fff;}

/* category cards */
.mkl-cats{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:18px 0 26px;}
.mkl-catcard{text-align:left;background:var(--surface);border:1px solid var(--bd);border-radius:14px;
  padding:14px 15px;transition:border-color .15s,background .15s,transform .15s;}
.mkl-catcard:hover{border-color:var(--accent);transform:translateY(-2px);}
.mkl-catcard.on{border-color:var(--accent);background:var(--accent-soft);}
.mkl-catcard-h{display:flex;align-items:center;gap:8px;font-weight:600;font-size:14.5px;}
.mkl-catcard-ic{font-size:17px;}
.mkl-catcard-h em{margin-left:auto;font-style:normal;font-family:var(--serif);font-size:15px;
  color:var(--accent-2);font-variant-numeric:tabular-nums;}
.mkl-catcard-d{color:var(--t2);font-size:12px;margin-top:7px;line-height:1.55;}

/* toolbar */
.mkl-toolbar{display:flex;flex-direction:column;gap:12px;margin-bottom:14px;}
.mkl-search{position:relative;display:flex;align-items:center;}
.mkl-search-ic{position:absolute;left:14px;font-size:13px;opacity:.5;}
.mkl-search input{width:100%;border:1px solid var(--bd);background:var(--surface);border-radius:10px;
  padding:11px 38px;font-size:14px;color:var(--t1);outline:none;transition:border-color .15s;}
.mkl-search input:focus{border-color:var(--accent);}
.mkl-search input::placeholder{color:var(--t3);}
.mkl-clearq{position:absolute;right:10px;border:none;background:none;color:var(--t3);font-size:13px;padding:4px;}
.mkl-clearq:hover{color:var(--accent-2);}
.mkl-sortrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.mkl-lbl{font-size:12px;color:var(--t3);}
.mkl-sep{width:1px;height:18px;background:var(--bd);margin:0 4px;}
.mkl-select{border:1px solid var(--bd);background:var(--surface);border-radius:8px;padding:6px 10px;
  font-size:13px;color:var(--t1);outline:none;}
.mkl-select:focus{border-color:var(--accent);}
.mkl-viewtog{display:inline-flex;border:1px solid var(--bd);border-radius:8px;overflow:hidden;}
.mkl-viewtog button{border:none;background:var(--surface);color:var(--t2);font-size:13px;padding:6px 14px;}
.mkl-viewtog button.on{background:var(--accent);color:#fff;}

/* pills */
.mkl-pill{border:1px solid var(--bd);background:var(--surface);color:var(--t2);border-radius:999px;
  padding:5px 12px;font-size:12.5px;transition:all .15s;}
.mkl-pill:hover{border-color:var(--accent);color:var(--accent-2);}
.mkl-pill.on{background:var(--accent);border-color:var(--accent);color:#fff;}
.mkl-tagbar{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin-bottom:18px;}
.mkl-reset{border:none;background:none;color:var(--danger);font-size:12.5px;padding:5px 8px;margin-left:4px;}
.mkl-reset:hover{text-decoration:underline;}
.mkl-count{font-size:13px;color:var(--t2);margin-bottom:16px;}
.mkl-count b{color:var(--t1);font-family:var(--serif);}

/* grid + card */
.mkl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;}
.mkl-card{text-align:left;background:var(--surface);border:1px solid var(--bd);border-radius:14px;
  padding:16px 17px;display:flex;flex-direction:column;gap:9px;transition:border-color .15s,transform .15s,box-shadow .15s;}
.mkl-card:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:0 10px 26px -14px rgba(40,36,30,.2);}
.mkl-card-top{display:flex;align-items:center;justify-content:space-between;}
.mkl-cat{font-size:11.5px;color:var(--t2);font-weight:600;}
.mkl-cat[data-cat=paradigm]{color:var(--accent-2);}
.mkl-cat[data-cat=server]{color:var(--tool);}
.mkl-cat[data-cat=python]{color:var(--ok);}
.mkl-cat[data-cat=technique]{color:var(--warn);}
.mkl-cat[data-cat=guardrail]{color:var(--danger);}
.mkl-mat{font-size:11px;color:var(--t3);border:1px solid var(--bd);border-radius:6px;padding:1px 7px;}
.mkl-card-title{font-family:var(--serif);font-size:17px;font-weight:600;line-height:1.35;}
.mkl-card-sum{font-size:13px;color:var(--t2);line-height:1.55;flex:1;}
.mkl-card-foot{display:flex;gap:16px;}
.mkl-kv{font-size:11.5px;color:var(--t3);display:flex;align-items:center;gap:6px;}
.mkl-meter{display:inline-flex;gap:3px;}
.mkl-meter i{width:7px;height:7px;border-radius:2px;background:var(--bd);display:inline-block;}
.mkl-meter i.f{background:var(--accent);}
.mkl-tags{display:flex;flex-wrap:wrap;gap:6px;}
.mkl-tag{font-size:11px;color:var(--t2);background:var(--surface-2);border:1px solid var(--bd-2);
  border-radius:6px;padding:1px 7px;}

/* matrix */
.mkl-matrix{background:var(--surface);border:1px solid var(--bd);border-radius:16px;padding:18px 18px 14px;}
.mkl-mx-pt{cursor:pointer;}
.mkl-mx-pt:hover circle{opacity:1;}
.mkl-mx-axis{font-size:11px;fill:var(--t2);font-family:var(--sans);}
.mkl-mx-tick{font-size:10px;fill:var(--t3);font-family:var(--sans);}
.mkl-mx-quad{font-size:11px;fill:var(--accent-2);font-family:var(--sans);font-weight:600;}
.mkl-mx-legend{display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin-top:8px;padding-top:12px;
  border-top:1px solid var(--bd-2);font-size:12px;color:var(--t2);}
.mkl-mx-leg{display:inline-flex;align-items:center;gap:6px;}
.mkl-mx-leg i{width:10px;height:10px;border-radius:3px;display:inline-block;}
.mkl-mx-hint{margin-left:auto;color:var(--t3);font-size:11.5px;}

/* drawer */
.mkl-scrim{position:fixed;inset:0;background:rgba(38,36,31,.32);display:flex;justify-content:flex-end;
  z-index:50;animation:mkl-fade .15s ease;}
.mkl-drawer{width:min(560px,94vw);height:100%;overflow-y:auto;background:var(--bg);
  padding:30px 30px 60px;box-shadow:-20px 0 50px -24px rgba(40,36,30,.4);animation:mkl-slide .2s ease;position:relative;}
@keyframes mkl-fade{from{opacity:0}to{opacity:1}}
@keyframes mkl-slide{from{transform:translateX(24px);opacity:.4}to{transform:none;opacity:1}}
.mkl-x{position:absolute;top:18px;right:20px;border:1px solid var(--bd);background:var(--surface);
  width:30px;height:30px;border-radius:8px;color:var(--t2);font-size:13px;}
.mkl-x:hover{border-color:var(--accent);color:var(--accent-2);}
.mkl-d-cat{font-size:12px;font-weight:600;color:var(--accent-2);margin-bottom:8px;}
.mkl-d-cat[data-cat=server]{color:var(--tool);}
.mkl-d-cat[data-cat=python]{color:var(--ok);}
.mkl-d-cat[data-cat=technique]{color:var(--warn);}
.mkl-d-cat[data-cat=guardrail]{color:var(--danger);}
.mkl-d-title{font-family:var(--serif);font-size:25px;font-weight:600;line-height:1.3;margin:0 36px 10px 0;}
.mkl-d-sum{font-size:14.5px;color:var(--t2);margin:0 0 18px;line-height:1.6;}
.mkl-d-meters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:22px;}
.mkl-d-meters>div{flex:1;min-width:120px;background:var(--surface);border:1px solid var(--bd);border-radius:10px;
  padding:10px 12px;display:flex;flex-direction:column;gap:5px;}
.mkl-d-meters span{font-size:11px;color:var(--t3);}
.mkl-d-meters em{font-style:normal;font-size:12.5px;color:var(--t1);}
.mkl-sec{margin-bottom:20px;}
.mkl-sec h3{font-family:var(--serif);font-size:14px;font-weight:600;color:var(--t1);margin:0 0 8px;
  padding-bottom:6px;border-bottom:1px solid var(--bd-2);}
.mkl-sec p{font-size:13.5px;color:var(--t1);line-height:1.7;margin:0;}
.mkl-steps{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:7px;}
.mkl-steps li{font-size:13.5px;color:var(--t1);line-height:1.6;}
.mkl-pit{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;list-style:none;}
.mkl-pit li{font-size:13px;color:var(--t2);line-height:1.6;position:relative;padding-left:16px;}
.mkl-pit li::before{content:'⚠';position:absolute;left:-2px;color:var(--warn);font-size:11px;}
.mkl-refs{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px;}
.mkl-refs a{color:var(--accent-2);text-decoration:none;font-size:13px;}
.mkl-refs a:hover{text-decoration:underline;}

/* empty + footer */
.mkl-empty{text-align:center;padding:70px 20px;color:var(--t2);}
.mkl-empty-ic{font-size:34px;margin-bottom:12px;}
.mkl-foot{margin-top:54px;padding-top:24px;border-top:1px solid var(--bd);color:var(--t3);font-size:12.5px;line-height:1.8;}
.mkl-foot-dim{color:var(--t3);margin-top:8px;}

/* ───────────────── 配置工坊 workshop ───────────────── */
.mkl-ws{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:18px;align-items:start;}
@media(max-width:900px){.mkl-ws{grid-template-columns:1fr;}}
.mkl-panel{background:var(--surface);border:1px solid var(--bd);border-radius:14px;padding:18px 18px 20px;}
.mkl-panel h2{font-family:var(--serif);font-size:16px;font-weight:600;margin:0 0 4px;}
.mkl-panel .mkl-phint{font-size:12px;color:var(--t2);margin:0 0 14px;line-height:1.55;}
.mkl-field{display:flex;flex-direction:column;gap:5px;margin-bottom:12px;}
.mkl-field label{font-size:11.5px;color:var(--t3);font-weight:600;letter-spacing:.3px;}
.mkl-field input,.mkl-field textarea,.mkl-field select{border:1px solid var(--bd);background:var(--surface-2);
  border-radius:8px;padding:8px 10px;font-size:13px;color:var(--t1);outline:none;font-family:var(--sans);
  transition:border-color .15s;}
.mkl-field input:focus,.mkl-field textarea:focus,.mkl-field select:focus{border-color:var(--accent);background:var(--surface);}
.mkl-field textarea{font-family:var(--mono);font-size:12px;line-height:1.5;resize:vertical;min-height:64px;}
.mkl-row2{display:flex;gap:10px;}
.mkl-row2>*{flex:1;}
.mkl-modetog{display:inline-flex;border:1px solid var(--bd);border-radius:8px;overflow:hidden;}
.mkl-modetog button{border:none;background:var(--surface);color:var(--t2);font-size:12.5px;padding:6px 12px;}
.mkl-modetog button.on{background:var(--accent);color:#fff;}

.mkl-import{margin:14px 0 4px;}
.mkl-importtog{border:none;background:none;color:var(--accent-2);font-size:12.5px;font-weight:600;padding:4px 0;}
.mkl-importtog:hover{text-decoration:underline;}
.mkl-importbox{margin-top:8px;}
.mkl-importbox textarea{width:100%;border:1px solid var(--bd);background:var(--surface-2);border-radius:8px;
  padding:9px 10px;font-family:var(--mono);font-size:11.5px;line-height:1.5;color:var(--t1);outline:none;
  resize:vertical;min-height:90px;}
.mkl-importbox textarea:focus{border-color:var(--accent);background:var(--surface);}
.mkl-importmsg{margin-top:8px;font-size:12px;border-radius:8px;padding:7px 11px;line-height:1.5;}
.mkl-importmsg.ok{background:#EEF4EF;border:1px solid #CFE0D4;color:#4B6B55;}
.mkl-importmsg.err{background:#FBEEEC;border:1px solid #E8C9C3;color:#9A3F36;}
.mkl-btn:disabled{opacity:.5;cursor:not-allowed;}

.mkl-routes{display:flex;flex-direction:column;gap:12px;margin-top:6px;}
.mkl-route{border:1px solid var(--bd);border-radius:11px;padding:12px 12px 13px;background:var(--surface-2);position:relative;}
.mkl-route-head{display:flex;gap:8px;align-items:center;margin-bottom:9px;}
.mkl-route-head select{width:92px;flex:none;}
.mkl-route-head input.mkl-path{flex:1;}
.mkl-route-head input.mkl-status{width:64px;flex:none;}
.mkl-route-head input.mkl-delay{width:78px;flex:none;}
.mkl-rmv{border:1px solid var(--bd);background:var(--surface);color:var(--t3);border-radius:7px;
  width:28px;height:30px;flex:none;font-size:13px;}
.mkl-rmv:hover{border-color:var(--danger);color:var(--danger);}
.mkl-route textarea{width:100%;}
.mkl-mini{font-size:10.5px;color:var(--t3);margin-top:4px;}
.mkl-mini.json{color:var(--ok);}
.mkl-mini.text{color:var(--warn);}
.mkl-addrow{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;}
.mkl-btn{border:1px solid var(--bd);background:var(--surface);color:var(--t1);border-radius:8px;
  padding:8px 14px;font-size:13px;font-weight:600;transition:all .15s;}
.mkl-btn:hover{border-color:var(--accent);color:var(--accent-2);}
.mkl-btn.primary{background:var(--accent);border-color:var(--accent);color:#fff;
  box-shadow:0 1px 2px rgba(204,120,92,.25);}
.mkl-btn.primary:hover{background:var(--accent-2);color:#fff;}
.mkl-btn.ghost{background:none;border:none;color:var(--t3);}
.mkl-btn.ghost:hover{color:var(--danger);}

.mkl-out-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
.mkl-otab{border:1px solid var(--bd);background:var(--surface);color:var(--t2);border-radius:8px;
  padding:6px 11px;font-size:12px;font-weight:600;transition:all .15s;}
.mkl-otab:hover{border-color:var(--accent);color:var(--accent-2);}
.mkl-otab.on{background:var(--accent-soft);border-color:var(--accent);color:var(--accent-2);}
.mkl-out-hint{font-size:12px;color:var(--t2);margin:0 0 10px;line-height:1.55;}
.mkl-codewrap{position:relative;}
.mkl-codewrap pre{margin:0;background:var(--code-bg);color:var(--code-fg);border-radius:11px;
  padding:16px 16px;overflow:auto;max-height:460px;font-family:var(--mono);font-size:12px;line-height:1.6;
  white-space:pre;-webkit-overflow-scrolling:touch;}
.mkl-copy{position:absolute;top:10px;right:10px;border:1px solid rgba(237,233,224,.25);
  background:rgba(43,41,34,.7);color:#EDE9E0;border-radius:7px;padding:5px 11px;font-size:11.5px;
  font-weight:600;backdrop-filter:blur(2px);}
.mkl-copy:hover{border-color:var(--accent);color:#fff;}
.mkl-copy.done{border-color:var(--ok);color:#Bfe0c8;}
.mkl-filename{font-size:11px;color:var(--t3);font-family:var(--mono);margin:10px 0 0;}

@media(max-width:560px){
  .mkl-root{padding:40px 16px 64px;}
  .mkl-hero h1{font-size:30px;}
  .mkl-drawer{padding:26px 20px 50px;}
}
`;

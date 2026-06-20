/**
 * 组件内联样式（类名前缀 acl-）。遵循仓库共享 DESIGN.md：
 * 暖纸色 #F6F5F0 + 陶土橙 #CC785C、衬线标题、发丝级边框、几乎无阴影、克制留白。
 */
export const STYLE = `
.acl-root{
  --bg:#F6F5F0;--surface:#FFFFFF;--surface-2:#FBFAF6;--fill:#F1EFE8;
  --t1:#26241F;--t2:#83827A;--t3:#B0AFA5;
  --accent:#CC785C;--accent-2:#B5654A;--accent-soft:#F5ECE5;
  --bd:#ECEAE2;--bd-2:#F0EEE7;
  --ok:#6E9079;--warn:#BE9356;--danger:#BC6055;--tool:#7C8AAE;
  --serif:'Tiempos Text',Georgia,'Songti SC','STSong',serif;
  --sans:ui-sans-serif,system-ui,-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;
  max-width:1080px;margin:0 auto;padding:56px 22px 80px;color:var(--t1);
  font-family:var(--sans);line-height:1.6;-webkit-font-smoothing:antialiased;
}
.acl-root *{box-sizing:border-box;}
.acl-root button{font-family:inherit;cursor:pointer;}

/* hero */
.acl-kicker{font-size:11px;letter-spacing:2.5px;color:var(--t3);text-transform:uppercase;margin-bottom:12px;}
.acl-hero h1{font-family:var(--serif);font-weight:600;font-size:38px;letter-spacing:-.6px;margin:0 0 14px;}
.acl-lede{color:var(--t2);font-size:15px;max-width:760px;margin:0 0 20px;}
.acl-lede b{color:var(--t1);font-weight:600;}
.acl-statline{display:flex;flex-wrap:wrap;gap:22px;font-size:13px;color:var(--t2);}
.acl-statline b{font-family:var(--serif);font-size:18px;color:var(--accent-2);font-weight:600;
  font-variant-numeric:tabular-nums;margin-right:5px;}

/* category cards */
.acl-cats{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:34px 0 26px;}
.acl-catcard{text-align:left;background:var(--surface);border:1px solid var(--bd);border-radius:14px;
  padding:14px 15px;transition:border-color .15s,background .15s,transform .15s;}
.acl-catcard:hover{border-color:var(--accent);transform:translateY(-2px);}
.acl-catcard.on{border-color:var(--accent);background:var(--accent-soft);}
.acl-catcard-h{display:flex;align-items:center;gap:8px;font-weight:600;font-size:14.5px;}
.acl-catcard-ic{font-size:17px;}
.acl-catcard-h em{margin-left:auto;font-style:normal;font-family:var(--serif);font-size:15px;
  color:var(--accent-2);font-variant-numeric:tabular-nums;}
.acl-catcard-d{color:var(--t2);font-size:12px;margin-top:7px;line-height:1.55;}

/* toolbar */
.acl-toolbar{display:flex;flex-direction:column;gap:12px;margin-bottom:14px;}
.acl-search{position:relative;display:flex;align-items:center;}
.acl-search-ic{position:absolute;left:14px;font-size:13px;opacity:.5;}
.acl-search input{width:100%;border:1px solid var(--bd);background:var(--surface);border-radius:10px;
  padding:11px 38px;font-size:14px;color:var(--t1);outline:none;transition:border-color .15s;}
.acl-search input:focus{border-color:var(--accent);}
.acl-search input::placeholder{color:var(--t3);}
.acl-clearq{position:absolute;right:10px;border:none;background:none;color:var(--t3);font-size:13px;padding:4px;}
.acl-clearq:hover{color:var(--accent-2);}
.acl-sortrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.acl-lbl{font-size:12px;color:var(--t3);}
.acl-sep{width:1px;height:18px;background:var(--bd);margin:0 4px;}
.acl-select{border:1px solid var(--bd);background:var(--surface);border-radius:8px;padding:6px 10px;
  font-size:13px;color:var(--t1);outline:none;}
.acl-select:focus{border-color:var(--accent);}
.acl-viewtog{display:inline-flex;border:1px solid var(--bd);border-radius:8px;overflow:hidden;}
.acl-viewtog button{border:none;background:var(--surface);color:var(--t2);font-size:13px;padding:6px 14px;}
.acl-viewtog button.on{background:var(--accent);color:#fff;}

/* pills */
.acl-pill{border:1px solid var(--bd);background:var(--surface);color:var(--t2);border-radius:999px;
  padding:5px 12px;font-size:12.5px;transition:all .15s;}
.acl-pill:hover{border-color:var(--accent);color:var(--accent-2);}
.acl-pill.on{background:var(--accent);border-color:var(--accent);color:#fff;}
.acl-tagbar{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin-bottom:18px;}
.acl-reset{border:none;background:none;color:var(--danger);font-size:12.5px;padding:5px 8px;margin-left:4px;}
.acl-reset:hover{text-decoration:underline;}
.acl-count{font-size:13px;color:var(--t2);margin-bottom:16px;}
.acl-count b{color:var(--t1);font-family:var(--serif);}

/* grid + card */
.acl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;}
.acl-card{text-align:left;background:var(--surface);border:1px solid var(--bd);border-radius:14px;
  padding:16px 17px;display:flex;flex-direction:column;gap:9px;transition:border-color .15s,transform .15s,box-shadow .15s;}
.acl-card:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:0 10px 26px -14px rgba(40,36,30,.2);}
.acl-card-top{display:flex;align-items:center;justify-content:space-between;}
.acl-cat{font-size:11.5px;color:var(--t2);font-weight:600;}
.acl-cat[data-cat=paradigm]{color:var(--accent-2);}
.acl-cat[data-cat=workflow]{color:var(--ok);}
.acl-cat[data-cat=technique]{color:var(--warn);}
.acl-cat[data-cat=tooling]{color:var(--tool);}
.acl-cat[data-cat=guardrail]{color:var(--danger);}
.acl-mat{font-size:11px;color:var(--t3);border:1px solid var(--bd);border-radius:6px;padding:1px 7px;}
.acl-card-badges{display:inline-flex;align-items:center;gap:6px;}
.acl-tplbadge{font-size:10.5px;color:var(--accent-2);background:var(--accent-soft);
  border:1px solid #EBD8CC;border-radius:6px;padding:1px 7px;white-space:nowrap;}
.acl-card-title{font-family:var(--serif);font-size:17px;font-weight:600;line-height:1.35;}
.acl-card-sum{font-size:13px;color:var(--t2);line-height:1.55;flex:1;}
.acl-card-foot{display:flex;gap:16px;}
.acl-kv{font-size:11.5px;color:var(--t3);display:flex;align-items:center;gap:6px;}
.acl-meter{display:inline-flex;gap:3px;}
.acl-meter i{width:7px;height:7px;border-radius:2px;background:var(--bd);display:inline-block;}
.acl-meter i.f{background:var(--accent);}
.acl-tags{display:flex;flex-wrap:wrap;gap:6px;}
.acl-tag{font-size:11px;color:var(--t2);background:var(--surface-2);border:1px solid var(--bd-2);
  border-radius:6px;padding:1px 7px;}

/* matrix */
.acl-matrix{background:var(--surface);border:1px solid var(--bd);border-radius:16px;padding:18px 18px 14px;}
.acl-mx-pt{cursor:pointer;}
.acl-mx-pt:hover circle{opacity:1;}
.acl-mx-axis{font-size:11px;fill:var(--t2);font-family:var(--sans);}
.acl-mx-tick{font-size:10px;fill:var(--t3);font-family:var(--sans);}
.acl-mx-quad{font-size:11px;fill:var(--accent-2);font-family:var(--sans);font-weight:600;}
.acl-mx-legend{display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin-top:8px;padding-top:12px;
  border-top:1px solid var(--bd-2);font-size:12px;color:var(--t2);}
.acl-mx-leg{display:inline-flex;align-items:center;gap:6px;}
.acl-mx-leg i{width:10px;height:10px;border-radius:3px;display:inline-block;}
.acl-mx-hint{margin-left:auto;color:var(--t3);font-size:11.5px;}

/* drawer */
.acl-scrim{position:fixed;inset:0;background:rgba(38,36,31,.32);display:flex;justify-content:flex-end;
  z-index:50;animation:acl-fade .15s ease;}
.acl-drawer{width:min(560px,94vw);height:100%;overflow-y:auto;background:var(--bg);
  padding:30px 30px 60px;box-shadow:-20px 0 50px -24px rgba(40,36,30,.4);animation:acl-slide .2s ease;position:relative;}
@keyframes acl-fade{from{opacity:0}to{opacity:1}}
@keyframes acl-slide{from{transform:translateX(24px);opacity:.4}to{transform:none;opacity:1}}
.acl-x{position:absolute;top:18px;right:20px;border:1px solid var(--bd);background:var(--surface);
  width:30px;height:30px;border-radius:8px;color:var(--t2);font-size:13px;}
.acl-x:hover{border-color:var(--accent);color:var(--accent-2);}
.acl-d-cat{font-size:12px;font-weight:600;color:var(--accent-2);margin-bottom:8px;}
.acl-d-cat[data-cat=workflow]{color:var(--ok);}
.acl-d-cat[data-cat=technique]{color:var(--warn);}
.acl-d-cat[data-cat=tooling]{color:var(--tool);}
.acl-d-cat[data-cat=guardrail]{color:var(--danger);}
.acl-d-title{font-family:var(--serif);font-size:25px;font-weight:600;line-height:1.3;margin:0 36px 10px 0;}
.acl-d-sum{font-size:14.5px;color:var(--t2);margin:0 0 18px;line-height:1.6;}
.acl-d-meters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:22px;}
.acl-d-meters>div{flex:1;min-width:120px;background:var(--surface);border:1px solid var(--bd);border-radius:10px;
  padding:10px 12px;display:flex;flex-direction:column;gap:5px;}
.acl-d-meters span{font-size:11px;color:var(--t3);}
.acl-d-meters em{font-style:normal;font-size:12.5px;color:var(--t1);}
.acl-sec{margin-bottom:20px;}
.acl-sec h3{font-family:var(--serif);font-size:14px;font-weight:600;color:var(--t1);margin:0 0 8px;
  padding-bottom:6px;border-bottom:1px solid var(--bd-2);}
.acl-sec p{font-size:13.5px;color:var(--t1);line-height:1.7;margin:0;}
.acl-steps{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:7px;}
.acl-steps li{font-size:13.5px;color:var(--t1);line-height:1.6;}
.acl-pit{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;list-style:none;}
.acl-pit li{font-size:13px;color:var(--t2);line-height:1.6;position:relative;padding-left:16px;}
.acl-pit li::before{content:'⚠';position:absolute;left:-2px;color:var(--warn);font-size:11px;}
.acl-refs{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px;}
.acl-refs a{color:var(--accent-2);text-decoration:none;font-size:13px;}
.acl-refs a:hover{text-decoration:underline;}

/* count row + export */
.acl-count{display:flex;align-items:center;justify-content:space-between;gap:12px;}
.acl-export{border:1px solid var(--bd);background:var(--surface);color:var(--t2);border-radius:8px;
  padding:6px 13px;font-size:12.5px;transition:all .15s;}
.acl-export:hover:not(:disabled){border-color:var(--accent);color:var(--accent-2);}
.acl-export:disabled{opacity:.45;cursor:not-allowed;}

/* overview chart */
.acl-ov{background:var(--surface);border:1px solid var(--bd);border-radius:16px;padding:18px 18px 12px;}
.acl-ov-title{font-family:var(--serif);font-size:14px;font-weight:600;margin-bottom:10px;}
.acl-ov-title span{font-family:var(--sans);font-weight:400;font-size:11.5px;color:var(--t3);margin-left:8px;}
.acl-ov-row{cursor:pointer;}
.acl-ov-row:hover .acl-ov-lbl{fill:var(--accent-2);}
.acl-ov-lbl{font-size:12.5px;fill:var(--t1);font-family:var(--sans);}
.acl-ov-lbl.on{fill:var(--accent-2);font-weight:600;}
.acl-ov-seg{font-size:11px;fill:#fff;font-family:var(--sans);font-variant-numeric:tabular-nums;}
.acl-ov-num{font-size:13px;fill:var(--t2);font-family:var(--serif);font-variant-numeric:tabular-nums;}
.acl-ov-leg{font-size:11px;fill:var(--t2);font-family:var(--sans);}

/* template block (drawer) */
.acl-tpl-h{display:flex;align-items:center;justify-content:space-between;}
.acl-tpl-label{font-size:12px;color:var(--t2);margin:8px 0 6px;display:flex;align-items:center;gap:8px;}
.acl-tpl-lang{font-size:10px;color:var(--t3);border:1px solid var(--bd);border-radius:5px;padding:0 6px;
  text-transform:uppercase;letter-spacing:.5px;}
.acl-tpl{background:#33302A;color:#F3EFE7;border-radius:10px;padding:14px 15px;overflow-x:auto;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.65;
  white-space:pre;margin:0;}
.acl-copy{border:1px solid var(--bd);background:var(--surface);color:var(--t2);border-radius:7px;
  padding:3px 11px;font-size:11.5px;transition:all .15s;}
.acl-copy:hover{border-color:var(--accent);color:var(--accent-2);}

/* empty + footer */
.acl-empty{text-align:center;padding:70px 20px;color:var(--t2);}
.acl-empty-ic{font-size:34px;margin-bottom:12px;}
.acl-foot{margin-top:54px;padding-top:24px;border-top:1px solid var(--bd);color:var(--t3);font-size:12.5px;line-height:1.8;}
.acl-foot-dim{color:var(--t3);margin-top:8px;}

@media(max-width:560px){
  .acl-root{padding:40px 16px 64px;}
  .acl-hero h1{font-size:30px;}
  .acl-drawer{padding:26px 20px 50px;}
}
`;

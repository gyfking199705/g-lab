/**
 * devx-lab 全站样式（遵循 g-lab DESIGN.md：暖纸色 + 陶土橙、衬线标题、发丝边框、几乎无阴影）。
 * 类名统一前缀 dx-，避免与门户/其他子项目冲突。
 */
export const CSS = `
.dx{--bg:#F6F5F0;--surface:#FFFFFF;--surface-2:#FBFAF6;--fill:#F1EFE8;
  --t1:#26241F;--t2:#83827A;--t3:#B0AFA5;
  --accent:#CC785C;--accent-2:#B5654A;--accent-soft:#F5ECE5;
  --bd:#ECEAE2;--bd-2:#F0EEE7;
  --ok:#6E9079;--warn:#BE9356;--danger:#BC6055;
  --serif:'Tiempos Text',Georgia,'Songti SC','STSong',serif;
  --sans:ui-sans-serif,system-ui,-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;
  font-family:var(--sans);color:var(--t1);max-width:1080px;margin:0 auto;line-height:1.6;
  font-variant-numeric:tabular-nums;}
.dx *{box-sizing:border-box;}
.dx a{color:var(--accent-2);text-decoration:none;}
.dx a:hover{text-decoration:underline;}

/* hero */
.dx-hero{padding:8px 4px 22px;}
.dx-kicker{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--t3);}
.dx-hero h1{font-family:var(--serif);font-weight:600;font-size:32px;letter-spacing:-.5px;margin:8px 0 6px;}
.dx-hero p{color:var(--t2);font-size:14.5px;max-width:680px;}
.dx-stats{display:flex;gap:30px;margin-top:20px;flex-wrap:wrap;}
.dx-stat b{font-family:var(--serif);font-weight:600;font-size:26px;display:block;}
.dx-stat span{font-size:12px;color:var(--t3);}

/* tabs */
.dx-tabs{display:flex;gap:4px;border-bottom:1px solid var(--bd);margin:6px 0 22px;flex-wrap:wrap;}
.dx-tab{appearance:none;background:none;border:none;cursor:pointer;font-family:var(--sans);
  font-size:13.5px;color:var(--t2);padding:10px 14px;border-bottom:2px solid transparent;margin-bottom:-1px;transition:color .15s,border-color .15s;}
.dx-tab:hover{color:var(--t1);}
.dx-tab[aria-selected="true"]{color:var(--accent-2);border-bottom-color:var(--accent);font-weight:600;}

/* toolbar */
.dx-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px;}
.dx-search{flex:1;min-width:200px;}
.dx-input,.dx-select{font-family:var(--sans);font-size:13px;color:var(--t1);background:var(--surface-2);
  border:1px solid var(--bd);border-radius:8px;padding:8px 11px;outline:none;transition:border-color .15s;}
.dx-input{width:100%;}
.dx-input:focus,.dx-select:focus{border-color:var(--accent);}
.dx-select{cursor:pointer;}

/* category chips */
.dx-chips{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:18px;}
.dx-chip{appearance:none;cursor:pointer;font-family:var(--sans);font-size:12.5px;color:var(--t2);
  background:var(--surface);border:1px solid var(--bd);border-radius:20px;padding:5px 12px;transition:all .15s;}
.dx-chip:hover{border-color:var(--accent);color:var(--t1);}
.dx-chip[aria-pressed="true"]{background:var(--accent-soft);border-color:var(--accent);color:var(--accent-2);font-weight:600;}
.dx-chip .c{color:var(--t3);font-size:11px;margin-left:4px;}

/* grid + cards */
.dx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;}
.dx-card{background:var(--surface);border:1px solid var(--bd);border-radius:14px;padding:18px 18px 16px;
  transition:border-color .15s,transform .15s;display:flex;flex-direction:column;}
.dx-card:hover{border-color:#E2D8CE;}
.dx-card-h{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
.dx-card .ic{font-size:20px;line-height:1;}
.dx-card h3{font-family:var(--serif);font-weight:600;font-size:16.5px;margin:0;line-height:1.35;}
.dx-cat{font-size:11px;color:var(--t3);margin-top:2px;}
.dx-fav{appearance:none;background:none;border:none;cursor:pointer;font-size:16px;color:var(--t3);padding:0 2px;line-height:1;transition:color .15s,transform .15s;}
.dx-fav:hover{transform:scale(1.15);}
.dx-fav[aria-pressed="true"]{color:var(--accent);}
.dx-card .sum{font-size:13px;color:var(--t2);margin:10px 0 12px;flex:1;}

/* meters */
.dx-meters{display:flex;gap:14px;margin-bottom:12px;}
.dx-meter{flex:1;}
.dx-meter .lab{font-size:10.5px;color:var(--t3);margin-bottom:4px;letter-spacing:.3px;}
.dx-dots{display:flex;gap:3px;}
.dx-dot{width:100%;height:5px;border-radius:3px;background:var(--fill);}
.dx-dot.on{background:var(--accent);}
.dx-dot.on.muted{background:var(--t3);}

/* badges */
.dx-badges{display:flex;gap:6px;flex-wrap:wrap;}
.dx-badge{font-size:11px;color:var(--t2);background:var(--surface-2);border:1px solid var(--bd);border-radius:6px;padding:2px 8px;}
.dx-badge.fw{cursor:pointer;}
.dx-badge.fw:hover{border-color:var(--accent);color:var(--accent-2);}

/* expandable detail */
.dx-more{appearance:none;background:none;border:none;cursor:pointer;color:var(--accent-2);font-size:12.5px;font-family:var(--sans);padding:0;margin-top:12px;text-align:left;}
.dx-detail{margin-top:12px;border-top:1px solid var(--bd-2);padding-top:12px;}
.dx-detail h4{font-size:11px;color:var(--t3);letter-spacing:.5px;text-transform:uppercase;margin:0 0 6px;font-weight:600;}
.dx-detail ul{margin:0 0 12px;padding-left:18px;}
.dx-detail li{font-size:13px;color:var(--t2);margin-bottom:3px;}
.dx-src{font-size:12px;}

.dx-empty{text-align:center;color:var(--t3);padding:50px 0;font-size:14px;}

/* frameworks */
.dx-fw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:14px;}
.dx-fw{background:var(--surface);border:1px solid var(--bd);border-radius:14px;padding:20px;}
.dx-fw-h{display:flex;align-items:baseline;justify-content:space-between;gap:10px;}
.dx-fw h3{font-family:var(--serif);font-weight:600;font-size:18px;margin:0;}
.dx-fw .yr{font-size:11px;color:var(--t3);}
.dx-fw .full{font-size:12px;color:var(--t2);margin-top:2px;}
.dx-fw .by{font-size:11.5px;color:var(--t3);margin:3px 0 10px;}
.dx-fw .sum{font-size:13px;color:var(--t2);margin-bottom:14px;}
.dx-pillars{display:flex;flex-direction:column;gap:8px;}
.dx-pillar{display:flex;gap:10px;align-items:baseline;}
.dx-pillar .pn{font-size:12.5px;font-weight:600;color:var(--t1);min-width:118px;}
.dx-pillar .pd{font-size:12.5px;color:var(--t2);}
.dx-fw .lk{margin-top:14px;font-size:12.5px;}
.dx-cov{margin:10px 0 4px;}
.dx-cov-bar{position:relative;height:6px;border-radius:4px;background:var(--fill);overflow:hidden;display:flex;}
.dx-cov-bar i{display:block;height:100%;}
.dx-cov-bar i.done{background:var(--ok);}
.dx-cov-bar i.doing{background:var(--warn);opacity:.7;}
.dx-cov-cap{font-size:11.5px;color:var(--t3);margin-top:5px;}
.dx-cov-cap b{color:var(--t2);font-weight:600;}

/* assessment */
.dx-assess{background:var(--surface);border:1px solid var(--bd);border-radius:14px;padding:22px;}
.dx-assess .intro{font-size:13.5px;color:var(--t2);max-width:640px;margin-bottom:20px;}
.dx-metric{padding:14px 0;border-top:1px solid var(--bd-2);}
.dx-metric:first-of-type{border-top:none;}
.dx-metric .mh{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:9px;}
.dx-metric .mn{font-size:14px;font-weight:600;}
.dx-metric .mhint{font-size:12px;color:var(--t3);}
.dx-levels{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;}
.dx-lv{appearance:none;cursor:pointer;font-family:var(--sans);text-align:left;background:var(--surface-2);
  border:1px solid var(--bd);border-radius:9px;padding:9px 10px;transition:all .15s;}
.dx-lv:hover{border-color:var(--accent);}
.dx-lv .lvk{font-size:10px;letter-spacing:.5px;text-transform:uppercase;display:block;margin-bottom:3px;}
.dx-lv .lvv{font-size:12.5px;color:var(--t1);}
.dx-lv[aria-pressed="true"]{background:var(--accent-soft);border-color:var(--accent);}

.dx-result{margin-top:22px;border-top:1px solid var(--bd);padding-top:20px;display:flex;gap:24px;align-items:center;flex-wrap:wrap;}
.dx-gauge-cap{font-family:var(--serif);font-weight:600;font-size:22px;}
.dx-gauge-sub{font-size:12.5px;color:var(--t2);max-width:420px;margin-top:4px;}
.dx-pm{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;}
.dx-pm .tag{font-size:11.5px;border-radius:6px;padding:3px 9px;color:#fff;}

/* hero adoption progress */
.dx-prog{margin-top:20px;max-width:420px;}
.dx-prog-bar{height:7px;border-radius:5px;background:var(--fill);overflow:hidden;}
.dx-prog-bar i{display:block;height:100%;background:var(--ok);border-radius:5px;transition:width .3s;}
.dx-prog-cap{display:flex;justify-content:space-between;font-size:11.5px;color:var(--t3);margin-top:6px;}
.dx-prog-cap b{color:var(--t2);font-weight:600;}

/* adoption status segmented control on card */
.dx-status{display:flex;gap:0;margin-top:12px;border:1px solid var(--bd);border-radius:8px;overflow:hidden;}
.dx-status button{flex:1;appearance:none;cursor:pointer;font-family:var(--sans);font-size:11.5px;color:var(--t2);
  background:var(--surface);border:none;border-left:1px solid var(--bd);padding:6px 4px;transition:background .15s,color .15s;}
.dx-status button:first-child{border-left:none;}
.dx-status button:hover{background:var(--surface-2);}
.dx-status button[aria-pressed="true"]{color:#fff;font-weight:600;}

/* data export / import bar */
.dx-data{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:40px;padding-top:18px;border-top:1px solid var(--bd);}
.dx-data-h{font-size:12.5px;color:var(--t2);margin-right:auto;}

/* copy / export button */
.dx-copy{appearance:none;cursor:pointer;font-family:var(--sans);font-size:12.5px;font-weight:600;
  color:var(--accent-2);background:var(--surface);border:1px solid var(--bd);border-radius:8px;padding:7px 13px;transition:all .15s;}
.dx-copy:hover{border-color:var(--accent);background:var(--accent-soft);}

/* anti-patterns */
.dx-ap-intro{font-size:13.5px;color:var(--t2);max-width:680px;margin-bottom:18px;}
.dx-ap-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:14px;}
.dx-ap-card{background:var(--surface);border:1px solid var(--bd);border-radius:14px;padding:18px;
  border-left:3px solid var(--danger);}
.dx-ap-name{font-family:var(--serif);font-weight:600;font-size:16.5px;margin:0 0 10px;}
.dx-ap-block{margin-bottom:9px;}
.dx-ap-block .lab,.dx-ap-anti .lab{font-size:10.5px;letter-spacing:.5px;text-transform:uppercase;color:var(--t3);
  font-weight:600;display:block;margin-bottom:3px;}
.dx-ap-block p{font-size:13px;color:var(--t2);margin:0;}
.dx-ap-anti{margin-top:12px;border-top:1px solid var(--bd-2);padding-top:10px;}
.dx-ap-anti .chips{display:flex;flex-wrap:wrap;gap:6px;}
.dx-ap-chip{appearance:none;cursor:pointer;font-family:var(--sans);font-size:12px;color:var(--ok);
  background:var(--surface-2);border:1px solid var(--bd);border-radius:7px;padding:4px 9px;transition:all .15s;}
.dx-ap-chip:hover{border-color:var(--ok);background:#EEF3EF;}
.dx-ap-src{margin-top:11px;font-size:12px;}

/* profile (team radar + report) */
.dx-pf-card{display:flex;gap:24px;flex-wrap:wrap;align-items:center;background:var(--surface);
  border:1px solid var(--bd);border-radius:14px;padding:22px;}
.dx-pf-radar{display:flex;flex-direction:column;align-items:center;gap:8px;}
.dx-pf-legend{display:flex;gap:16px;font-size:12px;color:var(--t2);}
.dx-pf-legend span{display:flex;align-items:center;gap:6px;}
.dx-pf-legend .sw{width:14px;height:8px;border-radius:3px;display:inline-block;}
.dx-pf-legend .sw.done{background:rgba(204,120,92,.5);border:1.5px solid #CC785C;}
.dx-pf-legend .sw.active{background:rgba(190,147,86,.25);border:1.5px dashed #BE9356;}
.dx-pf-side{flex:1;min-width:260px;}
.dx-pf-h{font-family:var(--serif);font-weight:600;font-size:18px;margin:0 0 8px;}
.dx-pf-sub{font-size:13px;color:var(--t2);margin:0 0 14px;}
.dx-pf-list{display:flex;flex-direction:column;gap:7px;}
.dx-pf-row{display:flex;align-items:center;gap:10px;font-size:12.5px;}
.dx-pf-row .nm{width:118px;color:var(--t1);flex-shrink:0;}
.dx-pf-row .bar{flex:1;height:6px;border-radius:4px;background:var(--fill);overflow:hidden;}
.dx-pf-row .bar i{display:block;height:100%;background:var(--accent);border-radius:4px;}
.dx-pf-row .pct{width:36px;text-align:right;color:var(--t2);}
.dx-pf-report{display:flex;justify-content:space-between;align-items:center;gap:18px;flex-wrap:wrap;
  margin-top:16px;background:var(--surface);border:1px solid var(--bd);border-radius:14px;padding:20px 22px;}
.dx-pf-actions{display:flex;gap:10px;flex-shrink:0;}

/* roadmap */
.dx-rm-sec{margin-bottom:30px;}
.dx-rm-h{font-family:var(--serif);font-weight:600;font-size:18px;margin:0 0 12px;}
.dx-rm-hint{font-size:13px;color:var(--t2);background:var(--surface-2);border:1px solid var(--bd);
  border-radius:10px;padding:12px 14px;}
.dx-rm-hint.sm{padding:8px 10px;font-size:12px;}
.dx-link{appearance:none;background:none;border:none;cursor:pointer;font-family:var(--sans);font-size:inherit;
  color:var(--accent-2);font-weight:600;padding:0;text-decoration:underline;}
.dx-rm-rx{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;}
.dx-rm-card{background:var(--surface);border:1px solid var(--bd);border-radius:14px;padding:16px;}
.dx-rm-card-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;}
.dx-rm-card-h .mn{font-size:14px;font-weight:600;}
.dx-rm-card-h .lv{font-size:11px;color:#fff;border-radius:6px;padding:2px 8px;}
.dx-rm-sub{font-size:11.5px;color:var(--t3);margin:6px 0 8px;}

.dx-rm-item{display:flex;align-items:center;gap:9px;width:100%;text-align:left;appearance:none;cursor:pointer;
  background:var(--surface-2);border:1px solid var(--bd);border-radius:9px;padding:8px 10px;margin-bottom:6px;
  font-family:var(--sans);transition:border-color .15s,background .15s;}
.dx-rm-item:hover{border-color:var(--accent);background:var(--accent-soft);}
.dx-rm-item .ic{font-size:15px;line-height:1;}
.dx-rm-item .tt{font-size:13px;color:var(--t1);flex:1;}
.dx-rm-item .meta{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.dx-rm-item .roi{font-size:11px;color:var(--t3);}
.dx-rm-item .st{font-size:11px;font-weight:600;}

.dx-rm-waves{display:flex;flex-direction:column;gap:14px;}
.dx-rm-wave{background:var(--surface);border:1px solid var(--bd);border-radius:14px;padding:14px 16px;}
.dx-rm-wave-h{display:flex;align-items:baseline;gap:10px;margin-bottom:10px;}
.dx-rm-wave-h .no{font-family:var(--serif);font-weight:600;font-size:15px;color:var(--accent-2);}
.dx-rm-wave-h .cnt{font-size:11.5px;color:var(--t3);}
.dx-rm-wave-items{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px;}
.dx-rm-row .dx-rm-item{margin-bottom:2px;}
.dx-rm-dep{font-size:11px;color:var(--t3);margin:0 0 4px 4px;}

@media(max-width:560px){
  .dx-levels{grid-template-columns:repeat(2,1fr);}
  .dx-hero h1{font-size:26px;}
}
`;

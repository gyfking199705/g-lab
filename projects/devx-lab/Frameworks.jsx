/**
 * 业界框架视图：把对齐的标准框架（DORA / SPACE / DevEx / DX Core 4 / Team Topologies / Platform）
 * 逐个展开为可读卡片，作为范式库的理论锚点。
 */
import React from 'react';
import { FRAMEWORKS } from './data.js';

export default function Frameworks() {
  return (
    <div>
      <p className="dx-hero" style={{ padding: '0 4px 18px', color: 'var(--t2)', fontSize: 14 }}>
        范式库里的每条实践都对齐到下面这些业界公认的研发效能框架。它们回答的是同一个问题的不同侧面：
        <b style={{ color: 'var(--t1)', fontWeight: 600 }}> 怎样既快又稳，还让开发者体验更好</b>。
      </p>
      <div className="dx-fw-grid">
        {FRAMEWORKS.map((f) => (
          <section className="dx-fw" key={f.id}>
            <div className="dx-fw-h">
              <h3>{f.name}</h3>
              <span className="yr">{f.year}</span>
            </div>
            <div className="full">{f.full}</div>
            <div className="by">{f.by}</div>
            <p className="sum">{f.summary}</p>
            <div className="dx-pillars">
              {f.pillars.map((p, i) => (
                <div className="dx-pillar" key={i}>
                  <span className="pn">{p.name}</span>
                  <span className="pd">{p.desc}</span>
                </div>
              ))}
            </div>
            <div className="lk">
              <a href={f.url} target="_blank" rel="noreferrer noopener">原始资料 ↗</a>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

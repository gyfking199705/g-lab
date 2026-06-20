/**
 * muse-ui 演示画廊（独立页 /ui/）。逐个展示组件 + 一句话用法。
 * 仅用于演示，不打进库；库入口是 ../src/index.js。
 */
import React from 'react';
import { TiltCard, SpotlightCard, MagneticButton, RippleButton, MeshGradient, CountUp } from '../src/index.js';

const CSS = `
.gx{--accent:#CC785C;--ink:#33312C;--t2:#6B675E;--t3:#9B978C;--bd:#E5E1D8;--surface:#FBFAF6;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC',sans-serif;color:var(--ink);max-width:1080px;margin:0 auto;}
.gx *{box-sizing:border-box;}
.gx-hero{border-radius:22px;padding:54px 36px;color:#fff;text-align:center;margin-bottom:14px;}
.gx-hero h1{font-size:44px;margin:0;font-weight:800;letter-spacing:-1px;text-shadow:0 2px 18px rgba(0,0,0,.25);}
.gx-hero p{margin:12px 0 0;font-size:16px;opacity:.92;}
.gx-stats{display:flex;gap:34px;justify-content:center;margin-top:26px;}
.gx-stat{text-align:center;}
.gx-stat b{display:block;font-size:32px;font-weight:800;}
.gx-stat span{font-size:12.5px;opacity:.85;}
.gx-sub{font-size:13px;color:var(--t3);text-align:center;margin-bottom:34px;}
.gx-sec{margin:34px 0;}
.gx-sec-h{display:flex;align-items:baseline;gap:10px;margin-bottom:6px;}
.gx-sec-h h2{font-size:20px;margin:0;font-weight:700;}
.gx-sec-h code{font-size:12.5px;color:var(--accent);background:#F3E7E0;padding:2px 8px;border-radius:6px;}
.gx-sec p{margin:0 0 16px;color:var(--t2);font-size:14px;}
.gx-row{display:flex;gap:16px;flex-wrap:wrap;align-items:center;}
.gx-card{background:var(--surface);border:1px solid var(--bd);border-radius:16px;padding:22px;min-width:180px;flex:1;}
.gx-card h3{margin:0 0 6px;font-size:17px;}
.gx-card small{color:var(--t3);}
.gx-dark{background:linear-gradient(135deg,#2a2824,#3a352e);color:#fff;}
.gx-dark small{color:rgba(255,255,255,.6);}
.gx-num{display:flex;gap:30px;flex-wrap:wrap;}
.gx-num .n{font-size:38px;font-weight:800;color:var(--accent);}
.gx-num .l{font-size:12.5px;color:var(--t3);}
.gx-foot{text-align:center;color:var(--t3);font-size:12.5px;margin:46px 0 24px;line-height:1.8;}
.gx-foot code{background:#F1EFE8;padding:1px 6px;border-radius:5px;}
`;

function Section({ title, tag, desc, children }) {
  return (
    <section className="gx-sec">
      <div className="gx-sec-h">
        <h2>{title}</h2>
        <code>{tag}</code>
      </div>
      <p>{desc}</p>
      <div className="gx-row">{children}</div>
    </section>
  );
}

export default function Gallery() {
  return (
    <div className="gx">
      <style>{CSS}</style>

      <MeshGradient className="gx-hero" colors={['#CC785C', '#5C8A6B', '#6E83C4', '#C9A14A']} speed={0.05} style={{ minHeight: 280 }}>
        <h1>muse-ui ✨</h1>
        <p>UI 组件脑爆 + research 实验室 · 零依赖、复制即用、自带样式、支持「减少动效」</p>
        <div className="gx-stats">
          <div className="gx-stat">
            <b><CountUp value={6} duration={1.2} /></b>
            <span>组件</span>
          </div>
          <div className="gx-stat">
            <b><CountUp value={0} duration={1} /></b>
            <span>运行时依赖</span>
          </div>
          <div className="gx-stat">
            <b><CountUp value={11} duration={1.6} />+</b>
            <span>纯函数单测</span>
          </div>
        </div>
      </MeshGradient>
      <div className="gx-sub">下面每个区块都是真实组件，移动鼠标 / 点击试试 👇</div>

      <Section title="3D 倾斜卡片" tag="<TiltCard>" desc="跟随鼠标做透视倾斜，附带柔光高光。鼠标移到卡片上看看。">
        <TiltCard className="gx-card" style={{ background: 'linear-gradient(135deg,#fff,#F3E7E0)' }}>
          <h3>Tilt me ✨</h3>
          <small>maxDeg=12 · glare</small>
        </TiltCard>
        <TiltCard className="gx-card gx-dark" maxDeg={18}>
          <h3>更大角度</h3>
          <small>maxDeg=18</small>
        </TiltCard>
      </Section>

      <Section title="光斑卡片" tag="<SpotlightCard>" desc="一束跟随指针的柔光，悬停才亮，适合做特性卡片。">
        <SpotlightCard className="gx-card gx-dark" color="rgba(204,120,92,0.5)" size={280}>
          <h3>Spotlight</h3>
          <small>移动鼠标，光斑跟随</small>
        </SpotlightCard>
        <SpotlightCard className="gx-card gx-dark" color="rgba(110,131,196,0.5)">
          <h3>换个颜色</h3>
          <small>color 可自定义</small>
        </SpotlightCard>
      </Section>

      <Section title="磁吸按钮" tag="<MagneticButton>" desc="指针靠近时按钮被吸过去，离开回弹。把鼠标移到附近。">
        <MagneticButton>磁吸我</MagneticButton>
        <MagneticButton strength={0.6} radius={110} style={{ background: '#5C8A6B', boxShadow: '0 6px 20px rgba(92,138,107,.4)' }}>
          更强磁力
        </MagneticButton>
      </Section>

      <Section title="涟漪按钮" tag="<RippleButton>" desc="点击处扩散水波纹（纯 CSS 动画）。点几下试试。">
        <RippleButton>点我有涟漪</RippleButton>
        <RippleButton style={{ background: '#CC785C' }} color="rgba(255,255,255,0.7)">
          暖色款
        </RippleButton>
      </Section>

      <Section title="数字滚动" tag="<CountUp>" desc="数字从 0 缓动滚动到目标值，带千分位与前后缀。">
        <div className="gx-card">
          <div className="gx-num">
            <div>
              <div className="n"><CountUp value={1280000} prefix="¥" duration={2} /></div>
              <div className="l">本月营收</div>
            </div>
            <div>
              <div className="n"><CountUp value={98.6} decimals={1} suffix="%" duration={2} /></div>
              <div className="l">达标率</div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="动态网格渐变" tag="<MeshGradient>" desc="多色径向渐变缓慢漂移的背景，纯 CSS、无 canvas。即上面的 Hero 背景。">
        <MeshGradient style={{ height: 150, flex: 1, minWidth: 260 }} colors={['#6E83C4', '#CC785C', '#5C8A6B']} />
        <MeshGradient style={{ height: 150, flex: 1, minWidth: 260 }} colors={['#C0584A', '#C9A14A']} speed={0.09} />
      </Section>

      <div className="gx-foot">
        <code>npm i muse-ui</code> · <code>import {'{ TiltCard }'} from 'muse-ui'</code>
        <br />零运行时依赖 · 自带样式无需引 CSS · 尊重 prefers-reduced-motion
      </div>
    </div>
  );
}

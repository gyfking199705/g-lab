/**
 * muse-ui 演示画廊（独立页 /ui/）。逐个展示组件 + 一句话用法。
 * 仅用于演示，不打进库；库入口是 ../src/index.js。
 */
import React, { useState, useEffect } from 'react';
import { TiltCard, SpotlightCard, MagneticButton, RippleButton, MeshGradient, CountUp, GradientText, Typewriter, CommandPalette, ScrambleText, Marquee, ConfettiButton, StickyCanvas, Sketchy, Sparkles, Parallax } from '../src/index.js';

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
.gx kbd{background:#F1EFE8;border:1px solid #E5E1D8;border-radius:5px;padding:1px 6px;font-size:12px;font-family:inherit;}
.gx-kbd-note{font-size:13px;color:var(--t3);}
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

const DEMO_COMMANDS = (run) => [
  { id: 'new', label: '新建任务', hint: '⌘N', group: '操作', keywords: 'add task create xinjian', onRun: () => run('新建任务') },
  { id: 'search', label: '全局搜索', hint: '⌘F', group: '操作', keywords: 'find search sousuo', onRun: () => run('全局搜索') },
  { id: 'theme', label: '切换深/浅色主题', group: '偏好', keywords: 'dark light theme zhuti', onRun: () => run('切换主题') },
  { id: 'sync', label: '同步到云端', group: '数据', keywords: 'cloud drive sync tongbu', onRun: () => run('同步到云端') },
  { id: 'export', label: '导出数据', group: '数据', keywords: 'backup json export daochu', onRun: () => run('导出数据') },
];

export default function Gallery() {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [lastCmd, setLastCmd] = useState('');

  useEffect(() => {
    const f = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, []);

  return (
    <div className="gx">
      <style>{CSS}</style>

      <MeshGradient className="gx-hero" colors={['#CC785C', '#5C8A6B', '#6E83C4', '#C9A14A']} speed={0.05} style={{ minHeight: 280 }}>
        <h1>muse-ui ✨</h1>
        <p>UI 组件脑爆 + research 实验室 · 零依赖、复制即用、自带样式、支持「减少动效」</p>
        <div className="gx-stats">
          <div className="gx-stat">
            <b><CountUp value={16} duration={1.2} /></b>
            <span>组件</span>
          </div>
          <div className="gx-stat">
            <b><CountUp value={0} duration={1} /></b>
            <span>运行时依赖</span>
          </div>
          <div className="gx-stat">
            <b><CountUp value={22} duration={1.6} />+</b>
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

      <Section title="渐变文字" tag="<GradientText>" desc="渐变填充文字、缓慢流动，适合标题与强调。">
        <GradientText colors={['#CC785C', '#6E83C4', '#5C8A6B', '#C9A14A']} style={{ fontSize: 36, fontWeight: 800 }}>
          Make it pop ✨
        </GradientText>
      </Section>

      <Section title="打字机" tag="<Typewriter>" desc="单句或多句循环（打字 → 停留 → 退格 → 下一句）；尊重「减少动效」。">
        <div className="gx-card" style={{ fontSize: 18 }}>
          <Typewriter text={['一套任务，三种看法。', '日程 · 甘特 · 番茄。', '复制即用，零依赖。']} cps={14} hold={1} />
        </div>
      </Section>

      <Section title="命令面板 ⌘K" tag="<CommandPalette>" desc="模糊搜索 + 命中高亮 + 分组 + 最近使用 + 方向键/回车/Esc。非受控时自带 ⌘K/Ctrl+K 热键。">
        <RippleButton onClick={() => setCmdOpen(true)}>打开命令面板</RippleButton>
        <span className="gx-kbd-note">
          或按 <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>K</kbd>
          {lastCmd && ` · 上次执行：${lastCmd}`}
        </span>
        <CommandPalette open={cmdOpen} hotkey={false} onClose={() => setCmdOpen(false)} commands={DEMO_COMMANDS(setLastCmd)} />
      </Section>

      <Section title="解码文字" tag="<ScrambleText>" desc="随机字符逐渐还原为目标文本，科技/揭晓感。刷新或重进可重看。">
        <div className="gx-card" style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>
          <ScrambleText text="DECRYPTING · 解码中…" duration={1.6} />
        </div>
      </Section>

      <Section title="跑马灯" tag="<Marquee>" desc="内容无缝循环滚动（复制两份 + 平移取模）。">
        <Marquee speed={70} className="gx-card" style={{ fontSize: 15, color: 'var(--t2)' }}>
          <span>✨ TiltCard</span>
          <span>🎯 CommandPalette</span>
          <span>⌨️ Typewriter</span>
          <span>🎉 ConfettiButton</span>
          <span>🌈 GradientText</span>
          <span>🔢 CountUp</span>
        </Marquee>
      </Section>

      <Section title="礼花按钮" tag="<ConfettiButton>" desc="点击迸发礼花（纯函数粒子 + 重力积分）。点几下试试 🎉">
        <ConfettiButton>🎉 庆祝一下</ConfettiButton>
        <ConfettiButton count={40} style={{ background: '#5C8A6B' }}>更多彩屑</ConfettiButton>
      </Section>

      <Section title="便利贴白板" tag="<StickyCanvas>" desc="脑暴场景核心：双击空白添加便利贴、拖动标题栏移动、点色点换色、写字、✕ 删除。">
        <StickyCanvas
          height={340}
          style={{ width: '100%' }}
          initialNotes={[
            { id: 's1', x: 40, y: 36, text: '想法：⌘K 加最近使用', color: '#FDE68A' },
            { id: 's2', x: 230, y: 90, text: '试试 StickyCanvas 拖我！', color: '#A7F3D0' },
            { id: 's3', x: 430, y: 50, text: '双击空白加一张', color: '#BFDBFE' },
          ]}
        />
      </Section>

      <Section title="手绘风边框" tag="<Sketchy>" desc="把内容裹进抖动的「手绘」矩形，同 seed 形状稳定、不闪烁。换 seed 换笔触。">
        <Sketchy color="#CC785C" seed={3} style={{ fontSize: 15 }}>手写感卡片</Sketchy>
        <Sketchy color="#5C8A6B" seed={11} roughness={3} style={{ fontSize: 15 }}>换个笔触</Sketchy>
        <Sketchy color="#6E83C4" seed={42} style={{ fontSize: 15 }}>seed=42</Sketchy>
      </Section>

      <Section title="星点闪烁" tag="<Sparkles>" desc="在内容四周持续闪烁的星点；位置由 seed 决定，尊重「减少动效」。">
        <Sparkles>
          <span style={{ fontSize: 26, fontWeight: 800, padding: '6px 14px', display: 'inline-block' }}>会发光的标题 ✦</span>
        </Sparkles>
        <Sparkles color="#CC785C" count={18} seed={21}>
          <span style={{ fontSize: 15, color: 'var(--t2)', padding: '10px 16px', display: 'inline-block' }}>悬停也好看</span>
        </Sparkles>
      </Section>

      <Section title="指针视差分层" tag="<Parallax>" desc="子元素通过 data-depth 设置深度系数，鼠标移动时各层产生不同幅度的平移，营造立体视差感。把鼠标移进来试试。">
        <Parallax maxPx={28} className="gx-card gx-dark" style={{ minHeight: 160, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div data-depth="0.15" style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: 'rgba(110,131,196,0.18)', top: '10%', left: '8%' }} />
          <div data-depth="0.4" style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', background: 'rgba(204,120,92,0.22)', bottom: '12%', right: '10%' }} />
          <div data-depth="0.8" style={{ position: 'relative', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>depth=0.8</div>
            <div style={{ fontSize: 12.5, opacity: 0.7, marginTop: 4 }}>前景层移动最多</div>
          </div>
          <div data-depth="0.2" style={{ position: 'absolute', bottom: 12, left: 16, fontSize: 12, opacity: 0.5 }}>depth=0.2 背景层</div>
        </Parallax>
        <Parallax maxPx={36} className="gx-card" style={{ minHeight: 160, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#F3E7E0,#fff)' }}>
          <div data-depth="-0.3" style={{ position: 'absolute', fontSize: 56, top: 8, right: 16, opacity: 0.12, userSelect: 'none' }}>✦</div>
          <div data-depth="0.6" style={{ position: 'absolute', fontSize: 32, bottom: 8, left: 16, opacity: 0.15, userSelect: 'none' }}>◆</div>
          <div data-depth="1" style={{ position: 'relative', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#CC785C' }}>depth=1</div>
            <div style={{ fontSize: 12.5, color: '#9B978C', marginTop: 4 }}>负 depth 反向漂移</div>
          </div>
        </Parallax>
      </Section>

      <div className="gx-foot">
        <code>npm i muse-ui</code> · <code>import {'{ TiltCard }'} from 'muse-ui'</code>
        <br />16 个组件 · 零运行时依赖 · 自带样式无需引 CSS · 尊重 prefers-reduced-motion
      </div>
    </div>
  );
}

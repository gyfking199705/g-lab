/**
 * muse-ui · 礼花粒子（纯函数，可单测）
 * 生成与逐帧推进粒子；rand 可注入以便确定性测试。
 */
const CONFETTI_COLORS = ['#CC785C', '#5C8A6B', '#6E83C4', '#C9A14A', '#C0584A'];

/**
 * 生成 n 个粒子（默认朝上扇形迸发）。
 * @param {number} n
 * @param {{rand?:()=>number, colors?:string[], speed?:number, spread?:number, angle?:number}} [opts]
 */
export function makeParticles(n = 26, opts = {}) {
  const rand = opts.rand || Math.random;
  const colors = opts.colors || CONFETTI_COLORS;
  const speed = opts.speed == null ? 340 : opts.speed;
  const spread = opts.spread == null ? Math.PI : opts.spread; // 扇形张角
  const base = opts.angle == null ? -Math.PI / 2 : opts.angle; // 朝上
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = base + (rand() - 0.5) * spread;
    const v = speed * (0.5 + rand() * 0.7);
    out.push({
      x: 0,
      y: 0,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      rot: rand() * 360,
      vr: (rand() - 0.5) * 600,
      color: colors[Math.floor(rand() * colors.length)] || colors[0],
      size: 6 + rand() * 6,
    });
  }
  return out;
}

/** 逐帧推进一个粒子（重力下落 + 旋转），返回新对象（不可变）。 */
export function stepParticle(p, dt, gravity = 900) {
  return {
    ...p,
    x: p.x + p.vx * dt,
    y: p.y + p.vy * dt,
    vy: p.vy + gravity * dt,
    rot: p.rot + p.vr * dt,
  };
}

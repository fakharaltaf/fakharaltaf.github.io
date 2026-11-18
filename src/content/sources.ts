// "View source of this moment": the real code behind what's on screen, simplified to the part
// that matters, each linked to the file in the repo.
export const REPO = 'https://github.com/fakharaltaf/fakharaltaf.github.io/blob/main/'

export type Source = { title: string; file: string; code: string }

export const sources: Record<string, Source> = {
  cursor: {
    title: 'One value drives the whole camera',
    file: 'src/world/zoom.ts',
    code: `// Every input writes target; the loop springs value toward it.
export function tick(dt: number) {
  if (!zoom.holding && idleFor() > 900) zoom.target = nearestCenter(zoom.target)
  stepSpring(zoom, zoom.target, dt) // semi-implicit Euler, sub-stepped
}`,
  },
  line: {
    title: 'The camera follows the caret while the line types itself',
    file: 'src/world/layout.ts',
    code: `export const typedChars = (t0: number) =>
  Math.round(LINE.length * remap(t0, 0.05, 0.85))

// Zoom is interpolated in log space: constant perceived speed
// across five orders of magnitude.
const logH = lerp(Math.log(a.height), Math.log(b.height), t)
if (i === 0) focus[0] = lerp(caretX(typedChars(t)), b.focus[0], ease(t))`,
  },
  script: {
    title: 'The line is literally one row of the script',
    file: 'src/world/layout.ts',
    code: `export const SLUG_ROW = SCRIPT.indexOf(LINE)
export const rowY = (row: number) => (SLUG_ROW - row) * LH
// Same canvas code draws both, so the hand-off is pixel-identical.`,
  },
  project: {
    title: 'Demos render into a DOM element’s rectangle of the same canvas',
    file: 'src/world/Render.tsx',
    code: `r.render(scene, camera) // the world
for (const v of views) {
  const b = v.el.getBoundingClientRect()
  r.setViewport(b.left, b.top, b.width, b.height)
  r.setScissor(b.left, b.top, b.width, b.height)
  r.setScissorTest(true)
  r.clearDepth()
  r.render(v.scene, v.camera) // the demo, same loop, same renderer
}`,
  },
  constellation: {
    title: 'Stars hang on springs: home, plus one per shared skill',
    file: 'src/world/physics.ts',
    code: `b.addForce(scale(sub(home, pos), HOME_K), true)
for (const [i, j, rest] of threads) {
  const d = dist(pos[i], pos[j])
  const k = (THREAD_K * (d - rest)) / d
  bodies[i].addForce(scale(delta, k), true)
  bodies[j].addForce(scale(delta, -k), true)
}
world.step() // Rapier, compiled to WASM, loaded only now`,
  },
  person: {
    title: 'Particles morph between shapes in one TSL vertex program',
    file: 'src/world/Particles.tsx',
    code: `const ti = smoothstep(delay, delay.add(0.6), u.t) // each particle leaves on its own schedule
let p = mix(from.xyz, to.xyz, ti)
  .add(starOffset.mul(starWeight))      // physics, per star
  .add(wander.mul(sin(ti.mul(PI)).mul(u.scatter)))
// Letters: rotate about their centre by the Rapier body's angle.`,
  },
  outro: {
    title: 'Every level is a pure function of p',
    file: 'src/world/timeline.ts',
    code: `export function frameAt(p: number) {
  const t = [0, 1, 2, 3, 4, 5].map((i) => transition(i, p))
  return {
    particles: remap(t[2], 0.15, 0.4) * (1 - remap(t[5], 0.85, 1)),
    outroCaret: remap(t[5], 0.8, 1),
    // ...so scrolling back plays everything backwards, for free.
  }
}`,
  },
  raremind: {
    title: 'Rarer answers dive deeper',
    file: 'src/demos/raremind/logic.ts',
    code: `export const DIVE = { common: 40, uncommon: 120, rare: 300, ultra: 700 }
export function tierFor(share: number): Tier {
  if (share >= 8) return 'common'
  if (share >= 2) return 'uncommon'
  if (share >= 0.5) return 'rare'
  return 'ultra'
}`,
  },
  agrarian: {
    title: 'Deterministic: the RNG state lives in the farm',
    file: 'src/demos/agrarian/sim.ts',
    code: `function rand(state: number): [number, number] {
  const s = (state + 0x6d2b79f5) | 0 // mulberry32, as a pure step
  ...
  return [value, s]
}
// same seed + same clicks = the same farm, every time (it's tested)`,
  },
  'claude-trace': {
    title: 'Word-level diffs, by longest common subsequence',
    file: 'src/demos/claude-trace/session.ts',
    code: `for (let i = A.length - 1; i >= 0; i--)
  for (let j = B.length - 1; j >= 0; j--)
    dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : max(dp[i + 1][j], dp[i][j + 1])`,
  },
  monitoring: {
    title: 'Attention: looking at the board, not at the floor',
    file: 'src/demos/monitoring/Monitoring.tsx',
    code: `const forward = max(0, cos(p.yaw)) * max(0, 1 - abs(p.pitch))
p.attention += ((yawning ? 0.1 : forward) - p.attention) * min(1, dt * 2)`,
  },
  svype: {
    title: 'Weak throws spring back; strong ones fly',
    file: 'src/demos/svype/Svype.tsx',
    code: `if (abs(c.vx) > 700 || abs(c.x) > width * 0.38) fling(sign(c.x || c.vx) * max(abs(c.vx), 1400))
else c.mode = 'spring' // k = 620, damping = 42`,
  },
  'lna-bot': {
    title: 'First matching rule wins',
    file: 'src/demos/lna-bot/LnaBot.tsx',
    code: `export const classify = (row: Row) => RULES.findIndex((rule) => rule.when(row))`,
  },
  automation: {
    title: 'Done twice: one tiny state machine per action',
    file: 'src/automation/machine.ts',
    code: `case 'seenOnce':
  return e.type === 'PERFORMED' && e.by === 'visitor' ? 'scripting' : s
case 'scripting':
  return e.type === 'SCRIPT_TYPED' ? 'automated' : s`,
  },
}

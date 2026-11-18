// Particle keyframes. Every particle has a position + colour in each of five shapes; the shader
// morphs between two of them. Shapes are built once on the CPU from the same layout as the world.
import { person } from '../content/copy.ts'
import { projects } from '../content/projects.ts'
import { Color } from 'three/webgpu'
import { brand, palette } from '../styles/tokens.ts'
import { type Pt, opaquePixels, scriptCanvas, textPixels } from './canvases.ts'
import {
  type Box,
  FRAME,
  PIN_HEAD,
  PIN_R,
  PIN_SHRINK,
  PIN_TIP,
  SCRIPT_BOX,
  STARS,
  nameAnchor,
} from './layout.ts'

export const SHAPES = 5 // script, project, constellation, person, outro
export const STRIDE = SHAPES * 4

/** Visual size of each shape, used to scale the mid-flight scatter. */
export const SHAPE_SIZE = [SCRIPT_BOX.w, FRAME.w, FRAME.w * 5, PIN_R * 4, PIN_R * 4]

export function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type P = { x: number; y: number; z: number; size: number; c: Color; a: number }
const col = (hex: string) => new Color(hex) // sRGB hex → linear working colour space

export function buildShapes(n: number, portrait: boolean) {
  const rnd = mulberry32(7)
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd())
  const pick = <T>(a: readonly T[]) => a[Math.floor(rnd() * a.length)]!
  const ink = col(palette.dark.ink)
  const muted = col(palette.dark.muted)
  const anchor = col(brand.anchor)

  const fromPixels = (pts: Pt[], size: number, a = 1): P => {
    const q = pick(pts)
    return { x: q.x, y: q.y, z: 0, size, c: new Color().setRGB(q.r, q.g, q.b, 'srgb'), a }
  }
  const onSegment = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    size: number,
    c: Color,
    a: number,
    z1 = 0,
    z2 = 0,
  ): P => {
    const t = rnd()
    return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t, z: z1 + (z2 - z1) * t, size, c, a }
  }
  const onRect = (b: Box, size: number, c: Color, a: number): P => {
    const per = 2 * (b.w + b.h)
    let d = rnd() * per
    const l = b.x - b.w / 2
    const btm = b.y - b.h / 2
    if (d < b.w) return { x: l + d, y: btm, z: 0, size, c, a }
    d -= b.w
    if (d < b.h) return { x: l + b.w, y: btm + d, z: 0, size, c, a }
    d -= b.h
    if (d < b.w) return { x: l + b.w - d, y: btm + b.h, z: 0, size, c, a }
    d -= b.w
    return { x: l, y: btm + b.h - d, z: 0, size, c, a }
  }
  /** Fill `count` slots from weighted generators, then shuffle so any index range is a fair sample. */
  const mix = (gens: [number, () => P][]): P[] => {
    const total = gens.reduce((s, [w]) => s + w, 0)
    const out: P[] = []
    for (const [w, g] of gens)
      for (let i = 0, m = Math.round((w / total) * n); i < m; i++) out.push(g())
    while (out.length < n) out.push(gens[0]![1]())
    out.length = n
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1))
      ;[out[i], out[j]] = [out[j]!, out[i]!]
    }
    return out
  }

  // 0: the script's own glyphs.
  const code = opaquePixels(scriptCanvas(32, true), 1)
  const s0 = mix([[1, () => fromPixels(code, 1.5)]])

  // 1: the project: an architecture sketch with the script as one module, bottom-left.
  const L = FRAME.x - FRAME.w / 2
  const B = FRAME.y - FRAME.h / 2
  const fx = (u: number) => L + u * FRAME.w
  const fy = (v: number) => B + v * FRAME.h
  const box = (u0: number, v0: number, u1: number, v1: number): Box => ({
    x: fx((u0 + u1) / 2),
    y: fy((v0 + v1) / 2),
    w: (u1 - u0) * FRAME.w,
    h: (v1 - v0) * FRAME.h,
  })
  const raremind = projects[0]!
  const scriptSlot: Box = { ...SCRIPT_BOX, w: SCRIPT_BOX.w * 1.3, h: SCRIPT_BOX.h * 1.6 }
  const screen = box(0.04, 0.34, 0.62, 0.84)
  const modules: [Box, string][] = [
    [box(0.68, 0.62, 0.96, 0.84), 'client · React'],
    [box(0.68, 0.34, 0.96, 0.56), 'api · Fastify'],
    [box(0.68, 0.06, 0.96, 0.28), 'db · PostgreSQL'],
    [box(0.2, 0.06, 0.5, 0.28), 'ocean · Three.js'],
  ]
  const em = FRAME.h * 0.03
  const labels = modules.flatMap(([b, t]) =>
    textPixels(t, {
      x: b.x - b.w / 2 + em,
      y: b.y + b.h / 2 - em * 1.3,
      em,
      align: 'left',
      mono: true,
      weight: 500,
    }),
  )
  labels.push(
    ...textPixels('scripts/tidy.ts', {
      x: scriptSlot.x - scriptSlot.w / 2,
      y: scriptSlot.y + scriptSlot.h / 2 + em * 1.1,
      em: em * 0.8,
      align: 'left',
      mono: true,
      weight: 500,
    }),
  )
  const title = textPixels(raremind.title, {
    x: fx(0.04),
    y: fy(0.92),
    em: FRAME.h * 0.07,
    align: 'left',
    weight: 650,
  })
  const wires: [number, number, number, number][] = [
    [fx(0.82), fy(0.62), fx(0.82), fy(0.56)],
    [fx(0.82), fy(0.34), fx(0.82), fy(0.28)],
    [fx(0.62), fy(0.73), fx(0.68), fy(0.73)],
    [fx(0.5), fy(0.17), fx(0.68), fy(0.17)],
    [scriptSlot.x + scriptSlot.w / 2, scriptSlot.y, fx(0.2), scriptSlot.y],
  ]
  const s1Pre = mix([
    [10, () => onRect(FRAME, 1.4, muted, 0.9)],
    [4, () => onSegment(L, fy(0.88), L + FRAME.w, fy(0.88), 1.1, muted, 0.6)],
    [10, () => onRect(screen, 1.3, anchor, 0.8)],
    [14, () => onRect(pick(modules)[0], 1.3, muted, 0.85)],
    [6, () => onRect(scriptSlot, 1.3, anchor, 0.9)],
    [12, () => fromPixels(labels, 1.4, 0.95)],
    [14, () => ({ ...fromPixels(title, 1.8), c: ink })],
    [
      5,
      () => {
        const w = pick(wires)
        return onSegment(w[0], w[1], w[2], w[3], 1.1, anchor, 0.7)
      },
    ],
  ])
  // The first 18% of particles keep their script position: the script stays put as a module.
  const s1 = s1Pre.map((p, i) => (i < n * 0.18 ? s0[i]! : p))

  // 2: the constellation. Stars + threads for every pair of projects that share a skill.
  const S = FRAME.w * 1.3
  const threads: [number, number][] = []
  projects.forEach((a, i) =>
    projects.forEach((b, j) => {
      if (j <= i) return
      const shared = a.skills.filter((s) => b.skills.includes(s)).length
      for (let k = 0; k < shared; k++) threads.push([i, j])
    }),
  )
  const starP = (core: boolean): P => {
    const s = pick(STARS).pos
    const sd = core ? 0.018 * S : 0.09 * S
    return {
      x: s[0] + gauss() * sd,
      y: s[1] + gauss() * sd,
      z: s[2] + gauss() * sd,
      size: core ? 2.6 : 1.3,
      c: core ? ink : anchor,
      a: core ? 1 : 0.55,
    }
  }
  const s2 = mix([
    [22, () => starP(true)],
    [30, () => starP(false)],
    [
      48,
      () => {
        const [i, j] = pick(threads)
        const a = STARS[i]!.pos
        const b = STARS[j]!.pos
        const p = onSegment(a[0], a[1], b[0], b[1], 1.1, anchor, 0.45, a[2], b[2])
        p.x += gauss() * S * 0.006
        p.y += gauss() * S * 0.006
        return p
      },
    ],
  ])

  // 3: the person. The constellation shrinks into a map pin's head; the name assembles beside it.
  const d = Math.hypot(PIN_TIP[0] - PIN_HEAD[0], PIN_TIP[1] - PIN_HEAD[1])
  const phi = Math.acos(PIN_R / d)
  const pinP = (): P => {
    const arc = (2 * Math.PI - 2 * phi) * PIN_R
    const side = Math.sqrt(d * d - PIN_R * PIN_R)
    const r = rnd() * (arc + 2 * side)
    if (r < arc) {
      const a = -Math.PI / 2 + phi + r / PIN_R
      return {
        x: PIN_HEAD[0] + PIN_R * Math.cos(a),
        y: PIN_HEAD[1] + PIN_R * Math.sin(a),
        z: 0,
        size: 1.6,
        c: anchor,
        a: 0.95,
      }
    }
    const left = r - arc < side
    const a = left ? -Math.PI / 2 - phi : -Math.PI / 2 + phi
    const tx = PIN_HEAD[0] + PIN_R * Math.cos(a)
    const ty = PIN_HEAD[1] + PIN_R * Math.sin(a)
    const p = onSegment(tx, ty, PIN_TIP[0], PIN_TIP[1], 1.6, anchor, 0.95)
    return p
  }
  const na = nameAnchor(portrait)
  const name = textPixels(person.name, {
    x: na.x,
    y: na.y,
    em: na.em,
    align: portrait ? 'center' : 'left',
    weight: 650,
  })
  const s3 = s2.map((p, i): P => {
    if (i < n * 0.45) {
      return {
        ...p,
        x: PIN_HEAD[0] + (p.x - PIN_HEAD[0]) * PIN_SHRINK,
        y: PIN_HEAD[1] + (p.y - PIN_HEAD[1]) * PIN_SHRINK,
        z: p.z * PIN_SHRINK,
      }
    }
    return i < n * 0.63 ? pinP() : { ...fromPixels(name, 1.9), c: ink }
  })

  // 4: the outro. Everything collapses to one bright point, which becomes the cursor again.
  const s4 = s3.map((): P => ({
    x: PIN_HEAD[0] + gauss() * PIN_R * 0.012,
    y: PIN_HEAD[1] + gauss() * PIN_R * 0.012,
    z: 0,
    size: 1.2,
    c: anchor,
    a: 0.8,
  }))

  const pos = new Float32Array(n * STRIDE)
  const color = new Float32Array(n * STRIDE)
  ;[s0, s1, s2, s3, s4].forEach((shape, k) =>
    shape.forEach((p, i) => {
      const o = i * STRIDE + k * 4
      pos[o] = p.x
      pos[o + 1] = p.y
      pos[o + 2] = p.z
      pos[o + 3] = p.size
      color[o] = p.c.r
      color[o + 1] = p.c.g
      color[o + 2] = p.c.b
      color[o + 3] = p.a
    }),
  )
  return { pos, color }
}

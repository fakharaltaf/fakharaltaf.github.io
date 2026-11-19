// Particle keyframes. Every particle has a position + colour in each of five shapes; the shader
// morphs between two of them. Shapes are built once on the CPU from the same layout as the world.
import { levels, person } from '../content/copy.ts'
import { projects } from '../content/projects.ts'
import { Color } from 'three/webgpu'
import { brand, palette } from '../styles/tokens.ts'
import { mulberry32 } from '../systems/random.ts'
import { letters } from './physicsState.ts'
import { type Pt, opaquePixels, scriptCanvas, textPixels } from './canvases.ts'
import {
  type Box,
  FRAME,
  PIN_HEAD,
  PIN_R,
  PIN_SHRINK,
  PIN_TIP,
  SCREEN,
  SCRIPT_BOX,
  SCRIPT_TITLE_Y,
  FILES_X0,
  LINE_X0,
  STARS,
  frameBox,
  nameAnchor,
} from './layout.ts'

export const SHAPES = 5 // script, project, constellation, person, outro
export const STRIDE = SHAPES * 4

/** Visual size of each shape, used to scale the mid-flight scatter. */
export const SHAPE_SIZE = [SCRIPT_BOX.w, FRAME.w, FRAME.w * 5, PIN_R * 4, PIN_R * 4]

type P = {
  x: number
  y: number
  z: number
  size: number
  c: Color
  a: number
  /** Constellation binding: stars a, b and position t between them (a = -1: unbound). */
  sa?: number
  sb?: number
  st?: number
  /** Index of the name letter this particle belongs to (person level). */
  letter?: number
}
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
  // The panel around it, in particles too: outline, header rule, the code | files divider, titles.
  const SB = SCRIPT_BOX
  const barY = SCRIPT_TITLE_Y - 1.3
  const divX = FILES_X0 - 2.5
  const head = { x: 0, y: SCRIPT_TITLE_Y, em: 0.8, align: 'left' as const, weight: 500, mono: true }
  const titles = [
    ...textPixels(levels.script.file, { ...head, x: LINE_X0 }),
    ...textPixels('~/Downloads', { ...head, x: FILES_X0 }),
  ]
  const s0 = mix([
    [24, () => fromPixels(code, 1.5)],
    [3, () => onRect(SB, 1.2, muted, 0.7)],
    [1, () => onSegment(SB.x - SB.w / 2, barY, SB.x + SB.w / 2, barY, 1.1, muted, 0.5)],
    [0.6, () => onSegment(divX, barY, divX, SB.y - SB.h / 2, 1.1, muted, 0.5)],
    [1.4, () => ({ ...fromPixels(titles, 1.3), c: muted })],
  ])

  // 1: the project: the live demo's screen on top, the modules that run it along the bottom,
  // and the script as one of them, bottom-left, exactly where it already was.
  const L = FRAME.x - FRAME.w / 2
  const fx = (u: number) => L + u * FRAME.w
  const fy = (v: number) => FRAME.y - FRAME.h / 2 + v * FRAME.h
  const raremind = projects[0]!
  const scriptSlot: Box = { ...SCRIPT_BOX, w: SCRIPT_BOX.w * 1.3, h: SCRIPT_BOX.h * 1.8 }
  const screen = SCREEN
  const modules: [Box, string][] = [
    [frameBox(0.17, 0.04, 0.38, 0.22), 'ocean · Three.js'],
    [frameBox(0.41, 0.04, 0.6, 0.22), 'client · React'],
    [frameBox(0.63, 0.04, 0.8, 0.22), 'api · Fastify'],
    [frameBox(0.83, 0.04, 0.97, 0.22), 'db · PostgreSQL'],
  ]
  const em = FRAME.h * 0.026
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
    x: fx(0.03),
    y: fy(0.93),
    em: FRAME.h * 0.055,
    align: 'left',
    weight: 700,
  })
  const wires: [number, number, number, number][] = [
    [scriptSlot.x + scriptSlot.w / 2, scriptSlot.y, fx(0.17), scriptSlot.y],
    [fx(0.38), fy(0.13), fx(0.41), fy(0.13)],
    [fx(0.6), fy(0.13), fx(0.63), fy(0.13)],
    [fx(0.8), fy(0.13), fx(0.83), fy(0.13)],
    [fx(0.5), fy(0.22), fx(0.5), fy(0.3)],
  ]
  const s1Pre = mix([
    [10, () => onRect(FRAME, 1.4, muted, 0.9)],
    [4, () => onSegment(L, fy(0.885), L + FRAME.w, fy(0.885), 1.1, muted, 0.6)],
    [12, () => onRect(screen, 1.3, anchor, 0.8)],
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
    const k = Math.floor(rnd() * STARS.length)
    const s = STARS[k]!.pos
    const sd = core ? 0.018 * S : 0.09 * S
    return {
      sa: k,
      sb: k,
      st: 0,
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
        // Bind to both ends (t along the thread) so it stretches when either star moves.
        const len2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 || 1
        p.sa = i
        p.sb = j
        p.st = ((p.x - a[0]) * (b[0] - a[0]) + (p.y - a[1]) * (b[1] - a[1])) / len2
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
    weight: 700,
  })
  // Split the name into letters (physics bodies at the person level) by measured advances.
  const nameLeft = Math.min(...name.map((q) => q.x))
  const nameRight = Math.max(...name.map((q) => q.x))
  const probe = document.createElement('canvas').getContext('2d')!
  probe.font = '700 100px Figtree, ui-sans-serif, system-ui, sans-serif'
  const full = probe.measureText(person.name).width
  const scale = (nameRight - nameLeft) / full
  const edges = [...person.name].map(
    (_, k) => nameLeft + probe.measureText(person.name.slice(0, k)).width * scale,
  )
  edges.push(nameRight + 1)
  const glyphs = [...person.name].flatMap((ch, k) => (ch === ' ' ? [] : [k]))
  letters.em = na.em
  letters.boxes = glyphs.map((k) => {
    const mine = name.filter((q) => q.x >= edges[k]! && q.x < edges[k + 1]!)
    const ys = mine.map((q) => q.y)
    const top = Math.max(...ys)
    const bottom = Math.min(...ys)
    return {
      cx: (edges[k]! + edges[k + 1]!) / 2,
      cy: (top + bottom) / 2,
      w: edges[k + 1]! - edges[k]!,
      h: top - bottom,
    }
  })
  const letterOf = (x: number) => {
    const k = edges.findIndex((e, j) => x >= e && x < edges[j + 1]!)
    return glyphs.indexOf(k)
  }
  const s3 = s2.map((p, i): P => {
    if (i < n * 0.45) {
      return {
        ...p,
        x: PIN_HEAD[0] + (p.x - PIN_HEAD[0]) * PIN_SHRINK,
        y: PIN_HEAD[1] + (p.y - PIN_HEAD[1]) * PIN_SHRINK,
        z: p.z * PIN_SHRINK,
      }
    }
    if (i < n * 0.63) return { ...pinP(), sa: -1 }
    const q = fromPixels(name, 1.9)
    return { ...q, c: ink, sa: -1, letter: letterOf(q.x) }
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
  // Bindings: (starA, starB, t, inPinHead) and (letter, 0, 0, 0). -1 means unbound.
  const bind = new Float32Array(n * 8)
  s2.forEach((p, i) => {
    bind[i * 8] = p.sa ?? -1
    bind[i * 8 + 1] = p.sb ?? -1
    bind[i * 8 + 2] = p.st ?? 0
    bind[i * 8 + 3] = s3[i]!.sa !== -1 ? 1 : 0
    bind[i * 8 + 4] = s3[i]!.letter ?? -1
  })
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
  return { pos, color, bind }
}

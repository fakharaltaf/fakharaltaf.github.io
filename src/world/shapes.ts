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
  MODULE_UV,
  PIN_HEAD,
  PIN_R,
  PIN_SHRINK,
  PIN_TIP,
  SCREEN,
  SCRIPT_BOX,
  SCRIPT_TITLE_Y,
  FILES_X0,
  LH,
  LINE_W,
  LINE_X0,
  SLUG_ROW,
  STARS,
  frameBox,
  nameAnchor,
  rowY,
} from './layout.ts'

export const SHAPES = 6 // line, script, project, constellation, person, outro
export const STRIDE = SHAPES * 4

/** Visual size of each shape, used to scale the mid-flight scatter. */
export const SHAPE_SIZE = [
  SCRIPT_BOX.w * 0.6,
  SCRIPT_BOX.w,
  FRAME.w,
  FRAME.w * 5,
  PIN_R * 4,
  PIN_R * 4,
]

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

  // Line (version b) and 0: the script's own glyphs.
  const code = opaquePixels(scriptCanvas(32, true), 1)
  // The panel around the code, in particles too: outline, header rule, divider, titles.
  const SB = SCRIPT_BOX
  const barY = SCRIPT_TITLE_Y - 1.3
  const divX = FILES_X0 - 2.5
  const head = {
    x: 0,
    y: SCRIPT_TITLE_Y,
    em: 0.8,
    align: 'left' as const,
    weight: 500,
    mono: true,
  }
  const titles = [
    ...textPixels(levels.script.file, { ...head, x: LINE_X0 }),
    ...textPixels('~/Downloads', { ...head, x: FILES_X0 }),
  ]
  const s0 = mix([
    [26, () => fromPixels(code, 1.5)],
    [3, () => onRect(SB, 1.2, muted, 0.7)],
    [1, () => onSegment(SB.x - SB.w / 2, barY, SB.x + SB.w / 2, barY, 1.1, muted, 0.5)],
    [0.6, () => onSegment(divX, barY, divX, SB.y - SB.h / 2, 1.1, muted, 0.5)],
    [1.4, () => ({ ...fromPixels(titles, 1.3), c: muted })],
  ])
  // The line: every particle starts here, on the glyphs of the one typed row (which is the
  // script's own row, so its particles don't move). The script then flies out of it.
  const slugY = rowY(SLUG_ROW)
  const line = code.filter((q) => Math.abs(q.y - slugY) < LH / 2)
  const sL0 = s0.map(() => fromPixels(line, 1.3, 0.5))
  // Where each particle waits as background before the line is typed.
  const field = Array.from({ length: n }, () => [
    LINE_X0 - 24 + rnd() * (LINE_W + 48),
    (rnd() * 2 - 1) * 20,
  ])

  // 1: the project: the live demo's screen on top, the modules that run it along the bottom,
  // and the script as one of them, bottom-left, exactly where it already was.
  const L = FRAME.x - FRAME.w / 2
  const fx = (u: number) => L + u * FRAME.w
  const fy = (v: number) => FRAME.y - FRAME.h / 2 + v * FRAME.h
  const raremind = projects[0]!
  const scriptSlot: Box = { ...SCRIPT_BOX, w: SCRIPT_BOX.w * 1.3, h: SCRIPT_BOX.h * 1.8 }
  const screen = SCREEN
  // Their labels are crisp DOM text (FrameModules): particle text that small can't be read.
  const modules = MODULE_UV.map((uv) => frameBox(...uv))
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
    [14, () => onRect(pick(modules), 1.3, muted, 0.85)],
    [6, () => onRect(scriptSlot, 1.3, anchor, 0.9)],
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

  // RareMind's frame is made of RareMind's own star. The first K particles are RareMind's: the
  // line, the script, its frame, and in the galaxy its star (faint, so the star doesn't outshine
  // the others). The rest are the galaxy: invisible through the opening, already in place at the
  // project level (its threads run behind the frame), and still between project and galaxy.
  // So zooming out, or browsing away, the frame collapses into its star, as every project does.
  const K = Math.floor(n * 0.5)
  const RM = STARS.findIndex((st) => st.id === 'raremind')
  const hm = STARS[RM]!.pos
  const boost = (p: P, k: number): P => ({ ...p, a: Math.min(1, p.a * k) })
  for (let i = 0; i < n; i++) {
    if (i < K) {
      const core = rnd() < 0.42
      const sd = core ? 0.018 * S : 0.09 * S
      s2[i] = {
        sa: RM,
        sb: RM,
        st: 0,
        x: hm[0] + gauss() * sd,
        y: hm[1] + gauss() * sd,
        z: hm[2] + gauss() * sd,
        size: core ? 2.2 : 1.1,
        c: core ? ink : anchor,
        a: core ? 0.1 : 0.06,
      }
      s0[i] = boost(s0[i]!, 1.6)
      s1[i] = i < n * 0.18 ? s0[i]! : boost(s1[i]!, 1.5) // the script slot stays put
      sL0[i] = boost(sL0[i]!, 1.6)
    } else {
      s2[i] = boost(s2[i]!, 1.6) // half as many particles draw the galaxy: make each brighter
      s1[i] = { ...s2[i]! }
      s0[i] = { ...s2[i]!, a: 0 }
      sL0[i] = { ...s2[i]!, x: field[i]![0]!, y: field[i]![1]!, z: 0, a: 0 }
    }
  }
  const sL = sL0

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
    // Pin head: the galaxy particles (a miniature constellation). Outline and name: the rest.
    if (i >= n * 0.55) {
      return {
        ...p,
        x: PIN_HEAD[0] + (p.x - PIN_HEAD[0]) * PIN_SHRINK,
        y: PIN_HEAD[1] + (p.y - PIN_HEAD[1]) * PIN_SHRINK,
        z: p.z * PIN_SHRINK,
      }
    }
    if (i >= n * 0.37) return { ...pinP(), sa: -1 }
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
  // Bindings: (starA, starB, t, inPinHead) and (letter, fieldX, fieldY, backgroundOnly). -1 = unbound.
  const bind = new Float32Array(n * 8)
  s2.forEach((p, i) => {
    bind[i * 8] = p.sa ?? -1
    bind[i * 8 + 1] = p.sb ?? -1
    bind[i * 8 + 2] = p.st ?? 0
    bind[i * 8 + 3] = s3[i]!.sa !== -1 ? 1 : 0
    bind[i * 8 + 4] = s3[i]!.letter ?? -1
    // Where this particle waits, as background, until its character is typed.
    bind[i * 8 + 5] = field[i]![0]!
    bind[i * 8 + 6] = field[i]![1]!
    bind[i * 8 + 7] = i >= K ? 1 : 0 // background only: fades as the typing passes, never joins the line
  })
  ;[sL, s0, s1, s2, s3, s4].forEach((shape, k) =>
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

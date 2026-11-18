// Code drawn onto canvases at exact universe coordinates, so the Level 1 line, the Level 2
// script and the particles sampled from them all line up to the pixel.
import { levels } from '../content/copy.ts'
import { highlightLine } from '../ui/code/highlight.ts'
import { palette, syntax } from '../styles/tokens.ts'
import {
  CW,
  FILES_W,
  FILES_X0,
  LH,
  LINE,
  LINE_X0,
  SCRIPT,
  SCRIPT_BOX,
  SCRIPT_TITLE_Y,
  rowY,
} from './layout.ts'

const MONO = '"JetBrains Mono", ui-monospace, monospace'

export type Region = { left: number; top: number; w: number; h: number } // universe units
export type Drawn = { canvas: HTMLCanvasElement; region: Region; ppu: number }

function make(region: Region, ppu: number) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(region.w * ppu)
  canvas.height = Math.ceil(region.h * ppu)
  const ctx = canvas.getContext('2d', { willReadFrequently: false })
  if (!ctx) throw new Error('2d canvas unavailable')
  // Universe → canvas: x right, y up. One unit = ppu px.
  const X = (x: number) => (x - region.left) * ppu
  const Y = (y: number) => (region.top - y) * ppu
  return { canvas, ctx, X, Y }
}

type Ctx = ReturnType<typeof make>

function drawCodeLine(c: Ctx, ppu: number, line: string, y: number, maxChars = Infinity) {
  c.ctx.font = `400 ${ppu}px ${MONO}`
  c.ctx.textBaseline = 'middle'
  let col = 0
  for (const tok of highlightLine(line)) {
    if (col >= maxChars) break
    const text = tok.text.slice(0, Math.max(0, maxChars - col))
    c.ctx.fillStyle = syntax[tok.kind]
    // Fixed advance per character: positions match the layout even if the font hasn't loaded.
    for (let i = 0; i < text.length; i++)
      c.ctx.fillText(text[i]!, c.X(LINE_X0 + (col + i) * CW), c.Y(y))
    col += text.length
  }
}

// ---- Level 1 ---------------------------------------------------------------

export const LINE_REGION: Region = { left: LINE_X0 - 0.5, top: 1, w: -LINE_X0 + 1.5, h: 2 }

export function lineCanvas(ppu = 88) {
  const c = make(LINE_REGION, ppu)
  return {
    canvas: c.canvas,
    region: LINE_REGION,
    ppu,
    draw(chars: number) {
      c.ctx.clearRect(0, 0, c.canvas.width, c.canvas.height)
      drawCodeLine(c, ppu, LINE, 0, chars)
    },
  }
}

// ---- Level 2 ---------------------------------------------------------------

export const SCRIPT_REGION: Region = {
  left: SCRIPT_BOX.x - SCRIPT_BOX.w / 2,
  top: SCRIPT_BOX.y + SCRIPT_BOX.h / 2,
  w: SCRIPT_BOX.w,
  h: SCRIPT_BOX.h,
}

/** The script card: frame, title bar and code. `bare` draws code only (for particle sampling). */
export function scriptCanvas(ppu = 32, bare = false): Drawn {
  const c = make(SCRIPT_REGION, ppu)
  const { ctx } = c
  const p = palette.dark
  if (!bare) {
    ctx.fillStyle = p.surface
    ctx.fillRect(0, 0, c.canvas.width, c.canvas.height)
    ctx.strokeStyle = p.line
    ctx.lineWidth = Math.max(1, ppu * 0.06)
    ctx.strokeRect(0, 0, c.canvas.width, c.canvas.height)
    const barY = SCRIPT_TITLE_Y - 1.3
    ctx.beginPath()
    ctx.moveTo(0, c.Y(barY))
    ctx.lineTo(c.canvas.width, c.Y(barY))
    ctx.moveTo(c.X(FILES_X0 - 2.5), c.Y(barY))
    ctx.lineTo(c.X(FILES_X0 - 2.5), c.canvas.height)
    ctx.stroke()
    ctx.font = `500 ${ppu * 0.8}px ${MONO}`
    ctx.textBaseline = 'middle'
    ctx.fillStyle = p.muted
    ctx.fillText(levels.script.file, c.X(LINE_X0), c.Y(SCRIPT_TITLE_Y))
    ctx.fillText('~/Downloads', c.X(FILES_X0), c.Y(SCRIPT_TITLE_Y))
  }
  SCRIPT.forEach((line, row) => drawCodeLine(c, ppu, line, rowY(row)))
  return { canvas: c.canvas, region: SCRIPT_REGION, ppu }
}

// The files panel animates on its own small canvas so the big script texture never re-uploads.
export const FILES_REGION: Region = {
  left: FILES_X0 - 0.5,
  top: rowY(0) + LH / 2,
  w: FILES_W + 1,
  h: SCRIPT.length * LH,
}

const STEP = 0.7 // seconds per rename in fast-forward

export function filesCanvas(ppu = 32) {
  const c = make(FILES_REGION, ppu)
  const files = levels.script.files
  const cycle = files.length * STEP + 1.8
  let lastKey = ''
  return {
    canvas: c.canvas,
    region: FILES_REGION,
    ppu,
    /** Returns true if pixels changed (so the texture needs an upload). */
    draw(seconds: number): boolean {
      const t = seconds % cycle
      const active = Math.floor(t / STEP)
      const frac = (t % STEP) / STEP
      const key = `${active}:${Math.floor(frac * 12)}`
      if (key === lastKey) return false
      lastKey = key
      const { ctx } = c
      ctx.clearRect(0, 0, c.canvas.width, c.canvas.height)
      ctx.font = `400 ${ppu * 0.8}px ${MONO}`
      ctx.textBaseline = 'middle'
      files.forEach(([from, to], i) => {
        const y = c.Y(rowY(i + 1))
        const x = c.X(FILES_X0)
        if (i < active || (i === active && frac > 0.85)) {
          ctx.fillStyle = palette.dark.anchorInk
          ctx.fillText('✓', x, y)
          ctx.fillStyle = palette.dark.ink
          ctx.fillText(to, x + ppu * 1.4, y)
        } else if (i === active) {
          const n = Math.round(to.length * Math.min(1, frac / 0.8))
          ctx.fillStyle = palette.dark.ink
          ctx.fillText(to.slice(0, n), x + ppu * 1.4, y)
          ctx.fillStyle = palette.dark.anchorInk
          ctx.fillRect(x + ppu * 1.4 + n * ppu * 0.8 * CW, y - ppu * 0.45, ppu * 0.09, ppu * 0.9)
        } else {
          ctx.fillStyle = palette.dark.muted
          ctx.fillText(from, x + ppu * 1.4, y)
        }
      })
      return true
    },
  }
}

// ---- Sampling --------------------------------------------------------------

export type Pt = { x: number; y: number; r: number; g: number; b: number }

/** Every opaque pixel of a canvas as a universe-space point (strided to keep it cheap). */
export function opaquePixels(d: Drawn, stride = 1): Pt[] {
  const ctx = d.canvas.getContext('2d')
  if (!ctx) return []
  const { width, height } = d.canvas
  const data = ctx.getImageData(0, 0, width, height).data
  const out: Pt[] = []
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const i = (y * width + x) * 4
      if (data[i + 3]! < 140) continue
      out.push({
        x: d.region.left + (x + 0.5) / d.ppu,
        y: d.region.top - (y + 0.5) / d.ppu,
        r: data[i]! / 255,
        g: data[i + 1]! / 255,
        b: data[i + 2]! / 255,
      })
    }
  }
  return out
}

/** Text rendered at an arbitrary universe position/size, returned as opaque pixels. */
export function textPixels(
  text: string,
  o: {
    x: number
    y: number
    em: number
    align: 'left' | 'center'
    weight?: number
    mono?: boolean
  },
): Pt[] {
  const ppu = 72 / o.em // ~72px per em, whatever the universe scale
  const family = o.mono ? MONO : 'Figtree, ui-sans-serif, system-ui, sans-serif'
  const probe = document.createElement('canvas').getContext('2d')
  if (!probe) return []
  probe.font = `${o.weight ?? 600} 72px ${family}`
  const wPx = probe.measureText(text).width + 8
  const w = wPx / ppu
  const left = o.align === 'center' ? o.x - w / 2 : o.x
  const region = { left, top: o.y + o.em * 0.75, w, h: o.em * 1.5 }
  const c = make(region, ppu)
  c.ctx.font = probe.font
  c.ctx.textBaseline = 'middle'
  c.ctx.fillStyle = '#fff'
  c.ctx.fillText(text, 4, c.Y(o.y))
  return opaquePixels({ canvas: c.canvas, region, ppu }, 2)
}

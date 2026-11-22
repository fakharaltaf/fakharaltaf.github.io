import { describe, expect, it } from 'vitest'
import { highlightLine } from '../../src/ui/code/highlight'
import {
  CENTERS,
  LEVELS,
  chainPosition,
  levelAt,
  nearestCenter,
  stepCenter,
  transition,
} from '../../src/world/levels'
import {
  FRAME,
  LINE,
  SCRIPT_BOX,
  SLUG_ROW,
  STARS,
  cameraAt,
  restCams,
} from '../../src/world/layout'
import { stepSpring } from '../../src/world/zoom'

describe('level mapping', () => {
  it('every rest point maps to its own level', () => {
    for (const l of LEVELS) expect(levelAt(CENTERS[l])).toBe(l)
  })
  it('chain position is the level index at rest points and monotonic between', () => {
    LEVELS.forEach((l, i) => expect(chainPosition(CENTERS[l])).toBeCloseTo(i))
    let prev = -1
    for (let p = 0; p <= 1; p += 0.001) {
      const c = chainPosition(p)
      expect(c).toBeGreaterThanOrEqual(prev)
      prev = c
    }
  })
  it('transitions hold still near rest points', () => {
    expect(transition(1, CENTERS.line + 0.01)).toBe(0)
    expect(transition(1, CENTERS.script - 0.01)).toBe(1)
  })
  it('steps and snaps to rest points', () => {
    expect(stepCenter(0, 1)).toBe(CENTERS.line)
    expect(stepCenter(CENTERS.line, -1)).toBe(0)
    expect(stepCenter(1, 1)).toBe(1)
    expect(nearestCenter(0.4)).toBe(CENTERS.project)
  })
})

describe('spring', () => {
  it('settles on target without overshooting much, even with a huge dt', () => {
    const s = { value: 0, velocity: 0 }
    let max = 0
    for (let i = 0; i < 240; i++) {
      stepSpring(s, 1, 1 / 60)
      max = Math.max(max, s.value)
    }
    expect(s.value).toBe(1)
    expect(max).toBeLessThan(1.02)
    stepSpring(s, 0, 5) // tab came back after 5s: clamped, no explosion
    expect(Number.isFinite(s.value)).toBe(true)
    expect(s.value).toBeGreaterThan(0)
  })
})

describe('universe layout', () => {
  it('the line is a row of the script, the script sits inside the frame', () => {
    expect(SLUG_ROW).toBeGreaterThanOrEqual(0)
    expect(LINE.length).toBeGreaterThan(10)
    const inside = (a: typeof SCRIPT_BOX, b: typeof FRAME) =>
      a.x - a.w / 2 > b.x - b.w / 2 &&
      a.x + a.w / 2 < b.x + b.w / 2 &&
      a.y - a.h / 2 > b.y - b.h / 2 &&
      a.y + a.h / 2 < b.y + b.h / 2
    expect(inside(SCRIPT_BOX, FRAME)).toBe(true)
  })
  it('RareMind star sits where its frame was', () => {
    const rm = STARS.find((s) => s.id === 'raremind')
    expect(rm?.pos[0]).toBe(FRAME.x)
    expect(rm?.pos[1]).toBe(FRAME.y)
  })
  it('camera zooms out monotonically from cursor to outro', () => {
    for (const aspect of [16 / 9, 390 / 844]) {
      const rest = restCams({ aspect, vw: aspect * 800, vh: 800, caretPx: 176 })
      let prev = 0
      for (let p = 0; p <= 1; p += 0.002) {
        const h = cameraAt(p, rest).height
        expect(h).toBeGreaterThanOrEqual(prev * 0.999999)
        prev = h
      }
      expect(cameraAt(1, rest).height / cameraAt(0, rest).height).toBeGreaterThan(1e4)
    }
  })
})

describe('highlighter', () => {
  it('colours the Level 1 line and keeps every character', () => {
    const toks = highlightLine(LINE)
    expect(toks.map((t) => t.text).join('')).toBe(LINE)
    expect(toks.find((t) => t.text === 'const')?.kind).toBe('keyword')
    expect(toks.some((t) => t.kind === 'string' && t.text.startsWith('/['))).toBe(true)
    expect(toks.find((t) => t.text.includes('toLowerCase'))?.kind).toBe('fn')
  })
  it('treats a slash after an identifier as division', () => {
    expect(highlightLine('a / b / c').every((t) => t.kind !== 'string')).toBe(true)
  })
})

describe('settling', () => {
  it('stays on a level for a nudge, carries on for a clear move, either way', async () => {
    const { settle, zoom } = await import('../../src/world/zoom')
    zoom.anchor = CENTERS.project
    expect(settle(CENTERS.project + 0.02)).toBe(CENTERS.project) // a nudge
    expect(settle(CENTERS.project + 0.06)).toBe(CENTERS.constellation) // half a swipe out
    expect(zoom.anchor).toBe(CENTERS.constellation)
    expect(settle(CENTERS.constellation - 0.06)).toBe(CENTERS.project) // and back in
  })
})

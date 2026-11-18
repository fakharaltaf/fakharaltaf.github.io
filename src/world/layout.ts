// The universe: where every level physically sits, in one coordinate system.
// Units: 1 = one em of code at Level 1. Each level is roughly an order of magnitude bigger
// than the last and literally contains it, so zooming out is a real camera move, not a cut.
import { levels } from '../content/copy.ts'
import { projects } from '../content/projects.ts'
import { CENTERS, LEVELS, type LevelId, ease, remap, transition } from './levels.ts'

export const CW = 0.6 // JetBrains Mono advance width, in em
export const LH = 1.6 // script line height
export const CARET_H = 1.15
export const CARET_W = 0.12

export type Box = { x: number; y: number; w: number; h: number } // centre + size
export type Vec2 = [number, number]

// ---- Level 1: the line. It ends at x = 0; the caret starts at its first column.
export const LINE = levels.line.code
export const LINE_W = LINE.length * CW
export const LINE_X0 = -LINE_W

/** Characters typed so far, from the cursor → line transition progress. */
export const typedChars = (t0: number) => Math.round(LINE.length * remap(t0, 0.05, 0.85))
export const caretX = (typed: number) => LINE_X0 + typed * CW

// ---- Level 2: the script. The Level 1 line is one of its rows, at y = 0, same x.
export const SCRIPT = levels.script.code
export const SLUG_ROW = SCRIPT.indexOf(LINE)
export const rowY = (row: number) => (SLUG_ROW - row) * LH
const CODE_W = Math.max(...SCRIPT.map((l) => l.length)) * CW
export const FILES_W = 26
export const FILES_X0 = LINE_X0 + CODE_W + 5
const PAD = 2.4
const TITLE_H = 2.6
export const SCRIPT_BOX: Box = (() => {
  const left = LINE_X0 - PAD
  const right = FILES_X0 + FILES_W + PAD
  const top = rowY(0) + LH / 2 + TITLE_H
  const bottom = rowY(SCRIPT.length - 1) - LH / 2 - PAD
  return { x: (left + right) / 2, y: (top + bottom) / 2, w: right - left, h: top - bottom }
})()
export const SCRIPT_TITLE_Y = rowY(0) + LH / 2 + TITLE_H / 2

// ---- Level 3: the project. The script is one module, bottom-left, of a running project.
const F = SCRIPT_BOX.w * 10.5
export const FRAME: Box = {
  x: SCRIPT_BOX.x - SCRIPT_BOX.w / 2 - F * 0.04 + F / 2,
  y: SCRIPT_BOX.y - SCRIPT_BOX.h / 2 - F * 0.04 + (F * 0.6) / 2,
  w: F,
  h: F * 0.6,
}

// ---- Level 4: the constellation. RareMind's star sits exactly where its frame was.
const S = FRAME.w * 1.3
const STAR_OFFSETS: Record<string, [number, number, number]> = {
  raremind: [0, 0, 0],
  agrarian: [-3.1, 1.5, -1.1],
  'claude-trace': [2.6, 2.2, 0.8],
  monitoring: [4.0, -1.1, -0.6],
  svype: [-1.7, -2.5, 1.0],
  'lna-bot': [1.5, -2.3, -1.6],
}
export const STARS = projects.map((p) => {
  const o = STAR_OFFSETS[p.id] ?? [0, 0, 0]
  return { id: p.id, pos: [FRAME.x + o[0] * S, FRAME.y + o[1] * S, o[2] * S] as const }
})
const xs = STARS.map((s) => s.pos[0])
const ys = STARS.map((s) => s.pos[1])
export const CONSTELLATION: Box = {
  x: (Math.min(...xs) + Math.max(...xs)) / 2,
  y: (Math.min(...ys) + Math.max(...ys)) / 2,
  w: Math.max(...xs) - Math.min(...xs) + S * 1.6,
  h: Math.max(...ys) - Math.min(...ys) + S * 1.6,
}

// ---- Level 5: the person. The constellation shrinks into the head of a map pin over Lahore.
export const PIN_R = Math.max(CONSTELLATION.w, CONSTELLATION.h) * 0.52
export const PIN_SHRINK = 0.62
export const PIN_HEAD: Vec2 = [CONSTELLATION.x, CONSTELLATION.y]
export const PIN_TIP: Vec2 = [PIN_HEAD[0], PIN_HEAD[1] - PIN_R * 2.5]

/** Where the name sits relative to the pin. Portrait stacks it under; landscape puts it right. */
export function nameAnchor(portrait: boolean): { x: number; y: number; em: number } {
  return portrait
    ? { x: PIN_HEAD[0], y: PIN_TIP[1] - PIN_R * 0.75, em: PIN_R * 0.42 }
    : { x: PIN_HEAD[0] + PIN_R * 1.35, y: PIN_HEAD[1] + PIN_R * 0.25, em: PIN_R * 0.62 }
}

function personBox(portrait: boolean): Box {
  const n = nameAnchor(portrait)
  const nameW = 12 * n.em * 0.6
  if (portrait) {
    const top = PIN_HEAD[1] + PIN_R
    const bottom = n.y - n.em
    return {
      x: PIN_HEAD[0],
      y: (top + bottom) / 2,
      w: Math.max(PIN_R * 2, nameW) * 1.1,
      h: top - bottom,
    }
  }
  const left = PIN_HEAD[0] - PIN_R
  const right = n.x + nameW
  const top = PIN_HEAD[1] + PIN_R
  return { x: (left + right) / 2, y: (top + PIN_TIP[1]) / 2, w: right - left, h: top - PIN_TIP[1] }
}

// ---- Camera ----------------------------------------------------------------

export type View = { aspect: number; vh: number; caretPx: number }
export type Cam = { focus: Vec2; height: number } // height = universe units visible vertically

/** Fit a box, optionally leaving room for a DOM card (left on landscape, bottom on portrait). */
function fit(box: Box, view: View, card: boolean, margin = 1.12): Cam {
  const portrait = view.aspect < 1
  // Landscape card: content lives in the band 40%–90% of the width (HUD sits right of it).
  const usableW = card && !portrait ? 0.5 : 0.9
  const usableH = card && portrait ? 0.42 : 1
  const height = Math.max((box.h * margin) / usableH, (box.w * margin) / (view.aspect * usableW))
  const width = height * view.aspect
  const focus: Vec2 = [box.x, box.y]
  if (card && !portrait) focus[0] = box.x - width * 0.15
  // Portrait card: content lives in the band between the skip link and the card (50%–92%).
  if (card && portrait) focus[1] = box.y - height * 0.21
  return { focus, height }
}

export function restCams(view: View): Record<LevelId, Cam> {
  const portrait = view.aspect < 1
  const person = fit(personBox(portrait), view, true)
  return {
    cursor: { focus: [LINE_X0 + CARET_W / 2, 0], height: (view.vh * CARET_H) / view.caretPx },
    // Portrait can't fit 72 characters legibly: show the line's end (where the caret is) and
    // the script's running half, and let the rest run off the left edge.
    line: portrait
      ? fit({ x: -LINE_W * 0.233, y: 0, w: LINE_W * 0.6, h: 6 }, view, false, 1)
      : fit({ x: LINE_X0 + LINE_W / 2, y: 0, w: LINE_W + 5, h: 6 }, view, false),
    script: portrait
      ? fit(
          { x: FILES_X0 - 4, y: SCRIPT_BOX.y, w: SCRIPT_BOX.w * 0.62, h: SCRIPT_BOX.h },
          view,
          false,
          1,
        )
      : fit(SCRIPT_BOX, view, false, 1.15),
    project: fit(FRAME, view, true, 1.08),
    constellation: fit(CONSTELLATION, view, false, 1.05),
    person,
    outro: { focus: [PIN_HEAD[0], PIN_HEAD[1]], height: person.height * 3 },
  }
}

/**
 * Camera for any p: zoom is interpolated in log space (constant perceived speed across
 * orders of magnitude); focus moves with the same eased progress.
 */
export function cameraAt(p: number, rest: Record<LevelId, Cam>): Cam {
  let i = 0
  while (i < LEVELS.length - 2 && p > CENTERS[LEVELS[i + 1]!]) i++
  const a = rest[LEVELS[i]!]
  const b = rest[LEVELS[i + 1]!]
  const t = transition(i, p)
  const logH = Math.log(a.height) + (Math.log(b.height) - Math.log(a.height)) * t
  // Focus leads slightly early on the way out so the new context centres before it lands.
  const tf = Math.min(1, t * 1.15)
  const focus: Vec2 = [
    a.focus[0] + (b.focus[0] - a.focus[0]) * tf,
    a.focus[1] + (b.focus[1] - a.focus[1]) * tf,
  ]
  // While the line types itself, the camera follows the caret, then settles on the whole line.
  if (i === 0) focus[0] = caretX(typedChars(t)) + (b.focus[0] - caretX(typedChars(t))) * ease(t)
  return { focus, height: Math.exp(logH) }
}

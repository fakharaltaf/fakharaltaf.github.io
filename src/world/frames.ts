// Version c: a project's frame (outline, header, screen, modules, script slot, wires) as line
// segments relative to its star, cut into equal-length pieces so a random piece is a fair sample.
import { type Box, FRAME, SCREEN, SCRIPT_BOX, frameBox } from './layout.ts'

export const FRAME_PIECES = 128

const rect = (b: Box): number[][] => {
  const l = b.x - b.w / 2,
    r = b.x + b.w / 2,
    t = b.y + b.h / 2,
    d = b.y - b.h / 2
  return [
    [l, d, r, d],
    [r, d, r, t],
    [r, t, l, t],
    [l, t, l, d],
  ]
}

/** (x1, y1, x2, y2) per piece, relative to the frame's centre (the star). */
export const framePieces: [number, number, number, number][] = (() => {
  const fx = (u: number) => FRAME.x - FRAME.w / 2 + u * FRAME.w
  const fy = (v: number) => FRAME.y - FRAME.h / 2 + v * FRAME.h
  const script: Box = { ...SCRIPT_BOX, w: SCRIPT_BOX.w * 1.3, h: SCRIPT_BOX.h * 1.8 }
  const segs = [
    ...rect(FRAME),
    [fx(0), fy(0.885), fx(1), fy(0.885)],
    ...rect(SCREEN),
    ...[
      frameBox(0.17, 0.04, 0.38, 0.22),
      frameBox(0.41, 0.04, 0.6, 0.22),
      frameBox(0.63, 0.04, 0.8, 0.22),
      frameBox(0.83, 0.04, 0.97, 0.22),
    ].flatMap(rect),
    ...rect(script),
    [script.x + script.w / 2, script.y, fx(0.17), script.y],
    [fx(0.38), fy(0.13), fx(0.41), fy(0.13)],
    [fx(0.6), fy(0.13), fx(0.63), fy(0.13)],
    [fx(0.8), fy(0.13), fx(0.83), fy(0.13)],
    [fx(0.5), fy(0.22), fx(0.5), fy(0.3)],
  ]
  const len = (s: number[]) => Math.hypot(s[2]! - s[0]!, s[3]! - s[1]!)
  const total = segs.reduce((a, s) => a + len(s), 0)
  const out: [number, number, number, number][] = []
  for (const s of segs) {
    const n = Math.max(1, Math.round((len(s) / total) * FRAME_PIECES))
    for (let k = 0; k < n; k++) {
      const a = k / n,
        b = (k + 1) / n
      out.push([
        s[0]! + (s[2]! - s[0]!) * a - FRAME.x,
        s[1]! + (s[3]! - s[1]!) * a - FRAME.y,
        s[0]! + (s[2]! - s[0]!) * b - FRAME.x,
        s[1]! + (s[3]! - s[1]!) * b - FRAME.y,
      ])
    }
  }
  while (out.length < FRAME_PIECES) out.push(out[out.length % segs.length]!)
  return out.slice(0, FRAME_PIECES)
})()

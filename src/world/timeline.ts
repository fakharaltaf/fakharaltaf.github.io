// What every layer of the world looks like at progress p. Pure, so it's testable and reversible:
// scrubbing backwards plays every transition backwards.
import { typedChars } from './layout.ts'
import { chainPosition, remap, transition } from './levels.ts'

export type Frame = ReturnType<typeof frameAt>

export function frameAt(p: number) {
  const t = [0, 1, 2, 3, 4, 5].map((i) => transition(i, p)) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ]
  const chain = chainPosition(p)

  // Particles: which two shapes, and how far between them.
  const seg = Math.min(3, Math.max(0, Math.floor(chain) - 2))
  const segT = [remap(t[2], 0.35, 1), t[3], t[4], remap(t[5], 0, 0.8)][seg]!

  return {
    t,
    chain,
    typed: typedChars(t[0]),
    typing: t[0] > 0.05 && t[0] < 0.85,
    caret: 1 - remap(t[2], 0.2, 0.45),
    line: 1 - remap(t[1], 0.15, 0.4),
    script: remap(t[1], 0.15, 0.4) * (1 - remap(t[2], 0.2, 0.45)),
    files: remap(t[1], 0.35, 0.7) * (1 - remap(t[2], 0.1, 0.35)),
    particles: remap(t[2], 0.15, 0.4) * (1 - remap(t[5], 0.85, 1)),
    seg, // morph from shape seg to seg + 1
    segT,
    outroCaret: remap(t[5], 0.8, 1),
  }
}

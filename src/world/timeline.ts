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
  // Shapes: 0 line, 1 script, 2 project, 3 constellation, 4 person, 5 outro.
  const seg = Math.min(4, Math.max(0, Math.floor(chain) - 1))
  // Every morph runs with its camera move, from the start, so you watch the particles travel.
  const segT = [t[1], t[2], t[3], t[4], remap(t[5], 0, 0.8)][seg]!

  return {
    t,
    chain,
    typed: typedChars(t[0]),
    typing: t[0] > 0.05 && t[0] < 0.85,
    caret: 1 - remap(t[2], 0.2, 0.45),
    files: remap(t[1], 0.35, 0.7) * (1 - remap(t[2], 0.1, 0.35)),
    particles: 1 - remap(t[5], 0.85, 1),
    /** The particle universe proper (project onward): the background dust hands over to it. */
    universe: remap(t[2], 0.15, 0.4) * (1 - remap(t[5], 0.85, 1)),
    seg, // morph from shape seg to seg + 1
    segT,
    outroCaret: remap(t[5], 0.8, 1),
  }
}

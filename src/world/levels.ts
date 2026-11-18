// Levels own ranges of the single zoom progress value p ∈ [0, 1].
// Each level has a rest point (its centre); everything between two rest points is a transition.
import { levels as levelCopy } from '../content/copy.ts'

export const LEVELS = [
  'cursor',
  'line',
  'script',
  'project',
  'constellation',
  'person',
  'outro',
] as const
export type LevelId = (typeof LEVELS)[number]

/** Rest points. The visitor's camera snaps to these when input stops. */
export const CENTERS: Record<LevelId, number> = {
  cursor: 0,
  line: 0.12,
  script: 0.25,
  project: 0.41,
  constellation: 0.6,
  person: 0.79,
  outro: 1,
}

const centers = LEVELS.map((l) => CENTERS[l])
/** Half-width of the still zone around each rest point. */
const HOLD = 0.02

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const remap = (v: number, a: number, b: number) => clamp01((v - a) / (b - a))
export const ease = (t: number) => t * t * (3 - 2 * t)

export const levelName = (id: LevelId) => levelCopy[id].name

/** The level whose range contains p (ranges split halfway between rest points). */
export function levelAt(p: number): LevelId {
  let best: LevelId = 'cursor'
  for (let i = 0; i < LEVELS.length; i++) {
    const lo = i === 0 ? -Infinity : (centers[i - 1]! + centers[i]!) / 2
    if (p >= lo) best = LEVELS[i]!
  }
  return best
}

/** Nearest rest point to p. */
export function nearestCenter(p: number): number {
  return CENTERS[levelAt(p)]
}

/** Next/previous rest point strictly beyond p in a direction. */
export function stepCenter(p: number, dir: 1 | -1): number {
  const eps = 1e-3
  if (dir > 0) return centers.find((c) => c > p + eps) ?? 1
  return [...centers].reverse().find((c) => c < p - eps) ?? 0
}

/**
 * Transition progress from level i to level i+1, 0 before, 1 after, eased in between.
 * transition(0, p) is cursor → line, transition(5, p) is person → outro.
 */
export function transition(i: number, p: number): number {
  const a = centers[i]! + HOLD
  const b = centers[i + 1]! - HOLD
  return ease(remap(p, a, b))
}

/** Position along the level chain as a float: 2.5 = halfway from script to project. */
export function chainPosition(p: number): number {
  let x = 0
  for (let i = 0; i < LEVELS.length - 1; i++) x += transition(i, p)
  return x
}

export function isLevelId(s: string): s is LevelId {
  return (LEVELS as readonly string[]).includes(s)
}

// Shared, rapier-free state that the physics module writes and the renderer/UI read.
// Lives apart from physics.ts so the world can read it without loading the WASM engine.
import { STARS } from './layout.ts'

/** Per-star displacement from home, universe units (x, y, z). */
export const starOffsets = new Float32Array(STARS.length * 3)

export type LetterBox = { cx: number; cy: number; w: number; h: number }
/** The name's letters as laid out for the current orientation (set by the particle builder). */
export const letters: { boxes: LetterBox[]; em: number } = { boxes: [], em: 1 }
/** Per-letter (dx, dy, angle, 0), universe units / radians. */
export const letterXforms = new Float32Array(32 * 4)
export const MAX_LETTERS = 32
/** True while the visitor holds a star (cursor repulsion pauses so the star stays whole). */
export const grab = { active: false }

export const starPos = (i: number): [number, number, number] => {
  const s = STARS[i]!.pos
  return [
    s[0] + starOffsets[i * 3]!,
    s[1] + starOffsets[i * 3 + 1]!,
    s[2] + starOffsets[i * 3 + 2]!,
  ]
}

// Dev-only handle for inspecting physics from the console and test scripts.
if (import.meta.env.DEV) Object.assign(globalThis, { __phys: { starOffsets, letterXforms } })

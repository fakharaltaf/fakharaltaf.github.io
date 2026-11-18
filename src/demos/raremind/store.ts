import { create } from 'zustand'
import { type Scored, score } from './logic.ts'

export const ROUND_SECONDS = 25
export const TRENCH_M = 10_935 // Challenger Deep, roughly

type Round = {
  phase: 'idle' | 'playing' | 'over'
  endsAt: number
  said: string[]
  depth: number
  last: Scored | null
  start: () => void
  submit: (raw: string) => Scored | null
  expire: (now: number) => void
}

export const useRound = create<Round>((set, get) => ({
  phase: 'idle',
  endsAt: 0,
  said: [],
  depth: 0,
  last: null,
  start: () =>
    set({
      phase: 'playing',
      endsAt: performance.now() + ROUND_SECONDS * 1000,
      said: [],
      last: null,
    }),
  submit(raw) {
    if (get().phase === 'idle') get().start()
    const { phase, said, depth } = get()
    if (phase !== 'playing') return null
    const s = score(raw, said)
    set({
      last: s,
      ...(s.kind === 'hit'
        ? { said: [...said, s.name.toLowerCase()], depth: depth + s.metres }
        : {}),
    })
    return s
  },
  expire(now) {
    if (get().phase === 'playing' && now >= get().endsAt) set({ phase: 'over' })
  },
}))

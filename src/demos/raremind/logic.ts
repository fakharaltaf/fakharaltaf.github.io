// Scoring: rarer correct answers dive deeper. Pure, so it's tested without a browser.
import { ALIASES, ANSWERS, EXCLUDED } from './data.ts'

export const TIERS = ['common', 'uncommon', 'rare', 'ultra'] as const
export type Tier = (typeof TIERS)[number]

/** Metres the submarine dives for each tier. */
export const DIVE: Record<Tier, number> = { common: 40, uncommon: 120, rare: 300, ultra: 700 }

export function tierFor(share: number): Tier {
  if (share >= 8) return 'common'
  if (share >= 2) return 'uncommon'
  if (share >= 0.5) return 'rare'
  return 'ultra'
}

export function normalize(raw: string): string {
  let s = raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z ]/g, '')
  s = ALIASES[s] ?? s
  if (ANSWERS.some((a) => a.name.toLowerCase() === s)) return s
  // Plurals: "mangoes", "cherries", "grapes".
  for (const cut of [s.replace(/ies$/, 'y'), s.replace(/es$/, ''), s.replace(/s$/, '')]) {
    const k = ALIASES[cut] ?? cut
    if (ANSWERS.some((a) => a.name.toLowerCase() === k) || EXCLUDED.includes(k)) return k
  }
  return s
}

export type Scored =
  | { kind: 'hit'; name: string; share: number; tier: Tier; metres: number }
  | { kind: 'excluded' | 'unknown' | 'duplicate' | 'empty'; text: string }

export function score(raw: string, said: readonly string[]): Scored {
  const key = normalize(raw)
  if (!key) return { kind: 'empty', text: raw }
  if (said.includes(key)) return { kind: 'duplicate', text: raw }
  if (EXCLUDED.includes(key)) return { kind: 'excluded', text: raw }
  const hit = ANSWERS.find((a) => a.name.toLowerCase() === key)
  if (!hit) return { kind: 'unknown', text: raw.trim() }
  const tier = tierFor(hit.share)
  return { kind: 'hit', name: hit.name, share: hit.share, tier, metres: DIVE[tier] }
}

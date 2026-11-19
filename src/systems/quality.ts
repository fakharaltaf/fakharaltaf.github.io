// Adaptive quality: start from a device guess, measure real frame times, settle on a tier that
// holds the frame rate. The visitor can override it ("auto" or a fixed tier).
import { create } from 'zustand'

export const TIERS = [
  { particles: 12_000, dpr: 1 },
  { particles: 22_000, dpr: 1.25 },
  { particles: 42_000, dpr: 1.75 },
  { particles: 60_000, dpr: 2 },
] as const
export type Tier = 0 | 1 | 2 | 3

const KEY = 'zo:quality:v1'
const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
const saved = (): Tier | 'auto' => {
  try {
    const v = localStorage.getItem(KEY)
    return v === null || v === 'auto' ? 'auto' : (Math.min(3, Math.max(0, Number(v))) as Tier)
  } catch {
    return 'auto'
  }
}

export const useQuality = create<{ mode: Tier | 'auto'; tier: Tier }>(() => {
  const mode = saved()
  return { mode, tier: mode === 'auto' ? (coarse ? 1 : 2) : mode }
})

export function setQualityMode(mode: Tier | 'auto') {
  try {
    localStorage.setItem(KEY, String(mode))
  } catch {
    /* fine */
  }
  useQuality.setState((s) => ({ mode, tier: mode === 'auto' ? s.tier : mode }))
}

let quietUntil = 0
/** Ignore frame times for a while (e.g. a whole site loading in an iframe). */
export function holdQuality(ms: number) {
  quietUntil = Math.max(quietUntil, performance.now() + ms)
}
export const qualityHeld = () => performance.now() < quietUntil

/**
 * Pure decision: given recent frame times (ms) and the current tier, which tier next?
 * Down a tier if the median frame misses 30 fps-ish budgets for this device class;
 * up a tier only with lots of headroom. Hysteresis keeps it from flapping.
 */
export function decideTier(frames: number[], tier: Tier, mobile = coarse): Tier {
  if (frames.length < 8) return tier
  const sorted = [...frames].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]!
  const budget = mobile ? 33 : 17.5 // 30 fps on phones, 60 on laptops
  // Far behind (software rendering, very old GPUs): drop two tiers at once.
  if (median > budget * 3 && tier > 1) return (tier - 2) as Tier
  if (median > budget * 1.25 && tier > 0) return (tier - 1) as Tier
  if (median < budget * 0.55 && tier < 3) return (tier + 1) as Tier
  return tier
}

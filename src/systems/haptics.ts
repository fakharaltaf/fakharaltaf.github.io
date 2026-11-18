// Short vibrations for key moments, on devices that support them. Silently skipped elsewhere.
const PATTERNS = { fling: [12], unlock: [10, 40, 18], tap: [6] } as const

export function haptic(kind: keyof typeof PATTERNS) {
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    navigator.vibrate?.([...PATTERNS[kind]])
  } catch {
    /* no vibration API: nothing to do */
  }
}

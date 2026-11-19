// The real site in the demo window: a tiny state machine, kept pure so it's testable.
export type LiveState = 'loading' | 'loaded' | 'failed'
export type LiveEvent = { type: 'load'; readable: boolean } | { type: 'timeout' }

/** Give up on a site that hasn't loaded in this long. */
export const LIVE_TIMEOUT_MS = 8000

export function liveStep(s: LiveState, e: LiveEvent): LiveState {
  if (s !== 'loading') return s // settled: a late load or timeout changes nothing
  // Same origin: a blocked or broken frame shows the browser's error page, which we can't read.
  if (e.type === 'load') return e.readable ? 'loaded' : 'failed'
  return 'failed'
}

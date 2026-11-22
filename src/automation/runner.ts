// Runs automated actions by themselves, politely: one at a time, rate-limited, only where the
// visitor can see them, and never while they're busy, the tab is hidden or motion is reduced.
import { scripts } from '../content/scripts.ts'
import { levelAt } from '../world/levels.ts'
import { useWorld } from '../world/store.ts'
import { onFrame, zoom } from '../world/zoom.ts'
import type { ActionId } from './machine.ts'
import { useAutomation } from './store.ts'

type Run = () => void | Promise<void>
const handlers = new Map<ActionId, Run>()

/** UI that owns an action registers how to perform it without the visitor. Returns unregister. */
export function registerAction(id: ActionId, run: Run) {
  handlers.set(id, run)
  return () => {
    if (handlers.get(id) === run) handlers.delete(id)
  }
}

/** Perform an action once, as the script (used right after the panel finishes typing). */
export function runNow(id: ActionId) {
  logRun(id)
  void handlers.get(id)?.()
}

/** Stamp the log line for this script. */
const logRun = (id: ActionId) =>
  useAutomation.setState((s) => ({ lastRun: { ...s.lastRun, [id]: Date.now() } }))

const GLOBAL_GAP_MS = 1500
const BUSY_MS = 2500 // the visitor counts as busy this long after any input

export function startRunner(): () => void {
  let lastHuman = 0
  let globalNext = 0
  let running = false
  const nextAt = new Map<ActionId, number>()
  const human = () => (lastHuman = performance.now())
  const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
  events.forEach((t) => addEventListener(t, human, { passive: true, capture: true }))

  const unsub = onFrame((p) => {
    const now = performance.now()
    if (running || now < globalNext || document.hidden || zoom.holding) return
    if (useWorld.getState().reducedMotion || now - lastHuman < BUSY_MS) return
    const { statuses, panel } = useAutomation.getState()
    if (panel) return // a script is being written or shown; one thing at a time
    const level = levelAt(p)
    for (const [id, run] of handlers) {
      const script = scripts[id]
      if (statuses[id] !== 'automated' || !script) continue
      if (script.levels !== 'any' && !script.levels.includes(level)) continue
      const due = nextAt.get(id)
      if (due === undefined) {
        // First sighting: wait a full cadence (with jitter) so it doesn't fire the moment it's armed.
        nextAt.set(id, now + script.cadenceMs * (0.5 + Math.random() * 0.5))
        continue
      }
      if (now < due) continue
      nextAt.set(id, now + script.cadenceMs * (0.85 + Math.random() * 0.3))
      globalNext = now + GLOBAL_GAP_MS
      running = true
      logRun(id)
      Promise.resolve(run()).finally(() => (running = false))
      return
    }
  })
  return () => {
    unsub()
    events.forEach((t) => removeEventListener(t, human, { capture: true }))
  }
}

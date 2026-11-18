// URL hash <-> zoom. Every level and project has a hash; loading one flies there; back/forward work.
// Arriving at a level by zooming replaces the hash (no history spam); deliberate jumps push.
import { projects } from '../content/projects.ts'
import { CENTERS, type LevelId, isLevelId, levelAt } from './levels.ts'
import { flyTo, onFrame, zoom } from './zoom.ts'

export function targetForHash(hash: string): number | null {
  const id = decodeURIComponent(hash.replace(/^#/, ''))
  if (!id) return CENTERS.cursor
  if (isLevelId(id)) return CENTERS[id]
  // shortcut: every project lands on the project level until stage 5 adds per-project flights.
  if (projects.some((p) => p.id === id)) return CENTERS.project
  return null
}

const hashFor = (l: LevelId) => (l === 'cursor' ? location.pathname + location.search : `#${l}`)

/** Deliberate navigation (HUD, terminal): fly and add a history entry. */
export function navigate(level: LevelId) {
  history.pushState(null, '', hashFor(level))
  flyTo(CENTERS[level])
}

export function bindHash(): () => void {
  const go = () => {
    const t = targetForHash(location.hash)
    if (t !== null) flyTo(t)
  }
  // Loading a hash flies there from the cursor, after the first frames so the move is visible.
  const initial = targetForHash(location.hash)
  const first = setTimeout(() => initial !== null && flyTo(initial), 400)
  addEventListener('popstate', go)

  let shown: LevelId = 'cursor'
  const unsub = onFrame((p) => {
    const atRest = Math.abs(zoom.velocity) < 1e-3 && Math.abs(p - zoom.target) < 1e-3
    if (!atRest) return
    const level = levelAt(p)
    if (level === shown) return
    shown = level
    const current = location.hash.slice(1)
    // Keep a project hash while resting on the project level.
    if (level === 'project' && projects.some((x) => x.id === current)) return
    if (current !== (level === 'cursor' ? '' : level))
      history.replaceState(null, '', hashFor(level))
  })
  return () => {
    clearTimeout(first)
    removeEventListener('popstate', go)
    unsub()
  }
}

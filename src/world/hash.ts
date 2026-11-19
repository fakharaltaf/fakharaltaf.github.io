// URL hash <-> zoom. Every level and project has a hash; loading one flies there; back/forward work.
// Arriving at a level by zooming replaces the hash (no history spam); deliberate jumps push.
import { projects } from '../content/projects.ts'
import { CENTERS, type LevelId, isLevelId, levelAt } from './levels.ts'
import { dive, diveInto, flyTo, onFrame, undive, zoom } from './zoom.ts'

export function targetForHash(hash: string): number | null {
  const id = decodeURIComponent(hash.replace(/^#/, ''))
  if (!id) return CENTERS.cursor
  if (isLevelId(id)) return CENTERS[id]
  // RareMind is the Level 3 project; every other project is a dive from its star.
  if (id === 'raremind') return CENTERS.project
  if (projects.some((p) => p.id === id)) return CENTERS.constellation
  return null
}

/** Go wherever a hash points, diving into a project's star if it names one. */
function follow(hash: string) {
  const id = decodeURIComponent(hash.replace(/^#/, ''))
  const t = targetForHash(hash)
  if (t === null) return
  if (id !== 'raremind' && projects.some((p) => p.id === id)) return diveInto(id)
  if (dive.id) undive()
  flyTo(t)
}

/** Open a project: RareMind by zooming, the rest by diving into their star. Adds history. */
export function openProject(id: string) {
  history.pushState(null, '', `#${id}`)
  follow(`#${id}`)
}

/**
 * The catalogue: from any project, step to the next or previous one (wrapping). Returns false
 * when no project is open, so the caller can let the input do whatever it normally does.
 */
export function browseProjects(dir: 1 | -1): boolean {
  const current =
    dive.id && dive.target === 1 ? dive.id : levelAt(zoom.target) === 'project' ? 'raremind' : null
  if (!current) return false
  const i = projects.findIndex((p) => p.id === current)
  const next = projects[(i + dir + projects.length) % projects.length]!
  history.replaceState(null, '', `#${next.id}`) // browsing isn't a trail of history entries
  follow(`#${next.id}`)
  return true
}

const hashFor = (l: LevelId) => (l === 'cursor' ? location.pathname + location.search : `#${l}`)

/** Deliberate navigation (HUD, terminal): fly and add a history entry. */
export function navigate(level: LevelId) {
  history.pushState(null, '', hashFor(level))
  flyTo(CENTERS[level])
}

export function bindHash(): () => void {
  const go = () => follow(location.hash)
  // Loading a hash flies there from the cursor, after the first frames so the move is visible.
  const initial = location.hash
  const first = setTimeout(() => follow(initial), 400)
  addEventListener('popstate', go)

  let shown: LevelId | 'dive' = 'cursor'
  const unsub = onFrame((p) => {
    const atRest = Math.abs(zoom.velocity) < 1e-3 && Math.abs(p - zoom.target) < 1e-3
    if (!atRest) return
    if (dive.id) {
      if (dive.value > 0.99 && location.hash !== `#${dive.id}`)
        history.replaceState(null, '', `#${dive.id}`)
      shown = 'dive' // so backing out rewrites the hash to #constellation
      return
    }
    const level = levelAt(p)
    if (level === shown) return
    shown = level
    const current = location.hash.slice(1)
    // Keep RareMind's hash while resting on the project level.
    if (level === 'project' && current === 'raremind') return
    if (current !== (level === 'cursor' ? '' : level))
      history.replaceState(null, '', hashFor(level))
  })
  return () => {
    clearTimeout(first)
    removeEventListener('popstate', go)
    unsub()
  }
}

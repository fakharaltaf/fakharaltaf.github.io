// URL hash <-> zoom. Every level and project has a hash; loading one flies there; back/forward work.
// Arriving at a level by zooming replaces the hash (no history spam); deliberate jumps push.
import { projects } from '../content/projects.ts'
import { CENTERS, type LevelId, isLevelId, levelAt } from './levels.ts'
import { TOUR } from './layout.ts'
import { BROWSE } from './browse-version.ts'
import { dive, diveInto, flyTo, land, onFrame, undive, zoom } from './zoom.ts'

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
  if (dive.from || leaving) return true // mid-flight: finish this trip first
  const i = TOUR.indexOf(current)
  const next = TOUR[(i + dir + TOUR.length) % TOUR.length]!
  history.replaceState(null, '', `#${next}`) // browsing isn't a trail of history entries
  // Browsing is always a flight between stars, RareMind's included.
  // (b: RareMind is browsed like any other project: its star, no frame.)
  if (dive.id)
    return (diveInto(next), next === 'raremind' && BROWSE !== 'b' && landOnRareMind(), true)
  // On the RareMind level itself: first let its frame dissolve into its star (zoom out with
  // the camera held on RareMind's screen), then fly from there.
  leaving = true
  dive.id = 'raremind'
  dive.target = 1
  dive.value = 1 // the camera holds on this exact view from the first frame (no lurch)
  dive.velocity = 0
  flyTo(CENTERS.constellation)
  const unsub = onFrame(() => {
    if (dive.value < 0.98 || Math.abs(zoom.value - CENTERS.constellation) > 0.01) return
    unsub()
    leaving = false
    diveInto(next)
  })
  return true
}
let leaving = false

/**
 * After the flight to RareMind's star, become the RareMind level itself (the same screen you
 * get by zooming in): the camera stays put while the star's particles grow into its frame.
 */
function landOnRareMind() {
  leaving = true // no browsing until it's landed
  const wait = onFrame(() => {
    if (dive.from || dive.id !== 'raremind' || dive.value < 0.98) return
    wait()
    land.active = true
    dive.id = null
    dive.value = dive.target = dive.velocity = 0
    zoom.target = CENTERS.project
    zoom.lastInput = performance.now()
    const done = onFrame(() => {
      if (Math.abs(zoom.value - CENTERS.project) > 0.004) return
      done()
      land.active = false
      leaving = false
    })
  })
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

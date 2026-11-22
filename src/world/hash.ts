// URL hash <-> zoom. Every level and project has a hash; loading one flies there; back/forward work.
// Arriving at a level by zooming replaces the hash (no history spam); deliberate jumps push.
import { projects } from '../content/projects.ts'
import { CENTERS, HOLD, type LevelId, isLevelId, levelAt } from './levels.ts'
import { TOUR } from './layout.ts'
import { BROWSE } from './browse-version.ts'
import { dive, diveHooks, diveInto, flyTo, onFrame, rmForm, undive, zoom } from './zoom.ts'

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
  if (dive.from || forming) return true // mid-flight: finish this trip first
  const i = TOUR.indexOf(current)
  const next = TOUR[(i + dir + TOUR.length) % TOUR.length]!
  history.replaceState(null, '', `#${next}`) // browsing isn't a trail of history entries
  // Browsing is always a flight between stars, RareMind's included.
  const onLevel = !dive.id
  if (onLevel) {
    // On the RareMind level: start from a dive at RareMind's star, which has this exact view.
    dive.id = 'raremind'
    dive.target = dive.value = 1
    dive.velocity = 0
  }
  diveInto(next)
  // RareMind's frame shrinks into its star as the flight leaves, and grows out of it as the flight
  // arrives, in step with the demos, like every other project. (b: RareMind has no frame.)
  if (onLevel) shapeRareMind('leave')
  if (next === 'raremind' && BROWSE !== 'b') shapeRareMind('arrive')
  return true
}
let forming = false

/**
 * Zooming in from any project carries on down the same chain as RareMind's: fly to RareMind (the
 * browse flight), then straight on into its script. Ignored mid-flight.
 */
diveHooks.zoomIn = () => {
  if (!dive.id || dive.target !== 1 || dive.from || forming) return
  if (dive.id === 'raremind' || BROWSE === 'b') {
    // Already at RareMind's star: just carry on in.
    undive()
    flyTo(CENTERS.script)
    return
  }
  history.replaceState(null, '', '#raremind')
  diveInto('raremind')
  shapeRareMind('arrive', () => flyTo(CENTERS.script))
}

/** The share of the flight RareMind's frame takes to dissolve (start) or form (end). */
const LEAVE_UNTIL = 0.4
const ARRIVE_FROM = 0.55

/** Zoom position whose particle shape is that much frame (1) or star (0). The camera ignores it
 * during a flight, so it only drives the morph. Skips the level's hold so nothing pauses. */
function formAt(k: number) {
  if (k >= 1) return CENTERS.project
  if (k <= 0) return CENTERS.constellation
  const a = CENTERS.project + HOLD
  const b = CENTERS.constellation - HOLD
  return a + (b - a) * (1 - k)
}

function setForm(k: number) {
  rmForm.v = k
  zoom.value = zoom.target = formAt(k)
  zoom.velocity = 0
  zoom.lastInput = performance.now()
}

function shapeRareMind(way: 'leave' | 'arrive', then?: () => void) {
  forming = true
  const target = dive.id
  const unsub = onFrame(() => {
    if (dive.id !== target) {
      // Interrupted (backed out, another browse): let go.
      unsub()
      forming = false
      rmForm.v = 0
      return
    }
    const t = dive.from ? dive.swap : 1
    if (way === 'leave') {
      const k = Math.max(0, 1 - t / LEAVE_UNTIL)
      setForm(k)
      if (k > 0) return
      rmForm.v = 0
      unsub()
      forming = false
      return
    }
    setForm(Math.min(1, Math.max(0, (t - ARRIVE_FROM) / (1 - ARRIVE_FROM))))
    if (dive.from || dive.value < 0.98) return
    // Landed with the frame formed: become the RareMind level (identical view), so it's the same
    // screen you get by zooming in.
    unsub()
    dive.id = null
    dive.value = dive.target = dive.velocity = 0
    setForm(1)
    rmForm.v = 0
    forming = false
    then?.()
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

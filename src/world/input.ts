// Every way of zooming feeds the same target value: wheel, trackpad pinch, touch swipe/pinch,
// mouse drag, keys. Returns an unbind function.
import { CENTERS, stepCenter } from './levels.ts'
import { useDemos } from '../demos/store.ts'
import { browseProjects } from './hash.ts'
import { dive, flyTo, nudge, undive, zoom } from './zoom.ts'

/** Pointer in normalised device coords (-1..1), for parallax and particle repulsion. */
export const pointerNdc = { x: 0, y: 0, active: false }

const WHEEL = 0.00016
const PINCH_WHEEL = 0.004
const KEY_STEP = 0.03

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))

/** In reduced-motion mode every gesture is one discrete step between rest points. */
function stepOrNudge(dp: number) {
  if (zoom.discrete) flyTo(stepCenter(zoom.target, dp > 0 ? 1 : -1))
  else nudge(dp)
}

export function bindInputs(surface: HTMLElement): () => void {
  const off: (() => void)[] = []
  const on = <K extends keyof WindowEventMap>(
    t: Window | HTMLElement,
    type: K,
    fn: (e: WindowEventMap[K]) => void,
    opts?: AddEventListenerOptions,
  ) => {
    t.addEventListener(type, fn as EventListener, opts)
    off.push(() => t.removeEventListener(type, fn as EventListener, opts))
  }

  // Wheel + trackpad (pinch arrives as ctrl+wheel). One discrete step per gesture when reduced.
  let wheelLock = 0
  // A trackpad gesture (including its momentum) is one run of wheel events with no gap over
  // GAP ms. Each gesture picks an axis once: sideways browses projects (exactly once), up/down
  // zooms. Momentum only ever fades, so a sideways delta that jumps up is a new swipe even
  // without a gap. Times come from the events themselves: on a busy device they're handled
  // late, and that lag must not split one swipe into several.
  const GAP = 250
  let wheelAt = -Infinity
  let wheelAxis: 'x' | 'y' | null = null
  let wheelX = 0
  let wheelY = 0
  let lastAbsX = 0
  let browsed = false
  on(
    window,
    'wheel',
    (e) => {
      if (isTyping(e.target)) return
      // Let overlays that scroll (a long card on a small screen) scroll normally.
      const scroller = e.target instanceof Element ? e.target.closest('.card') : null
      if (scroller && scroller.scrollHeight > scroller.clientHeight) return
      e.preventDefault()
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1
      const dy = e.deltaY * unit
      const dx = e.deltaX * unit
      const now = e.timeStamp
      const push = wheelAxis === 'x' && Math.abs(dx) > Math.max(8, lastAbsX * 1.6)
      // Still fading after a browse: the same swipe's momentum, even if it arrived late.
      const tail = browsed && !push && now - wheelAt < 1000
      if ((now - wheelAt > GAP && !tail) || push) {
        wheelAxis = push ? 'x' : null
        wheelX = wheelY = 0
        browsed = false
      }
      wheelAt = now
      lastAbsX = Math.abs(dx)
      if (!e.ctrlKey && wheelAxis === null) {
        wheelX += dx
        wheelY += dy
        if (Math.abs(wheelX) + Math.abs(wheelY) < 8) return // too little to tell yet
        wheelAxis = Math.abs(wheelX) > Math.abs(wheelY) ? 'x' : 'y'
      }
      if (wheelAxis === 'x' && !e.ctrlKey) {
        wheelX += dx
        if (!browsed && Math.abs(wheelX) > 60 && !useDemos.getState().expanded) {
          browsed = true // one project per gesture, however long its momentum runs
          browseProjects(wheelX > 0 ? 1 : -1)
        }
        return
      }
      if (zoom.discrete) {
        const now = performance.now()
        if (now < wheelLock || Math.abs(dy) < 4) return
        wheelLock = now + 650
        stepOrNudge(dy)
        return
      }
      nudge(dy * (e.ctrlKey ? PINCH_WHEEL : WHEEL))
    },
    { passive: false },
  )

  // Pointers: one = vertical drag zooms (swipe up = zoom out); two = pinch.
  const pts = new Map<number, { x: number; y: number }>()
  let lastDist = 0
  let vel = 0
  let lastT = 0
  let dragAccum = 0
  let stepped = false
  let start = { x: 0, y: 0 }
  // Same idea for a drag: it's sideways (browse) or up/down (zoom), decided once it's moved.
  let dragAxis: 'x' | 'y' | null = null
  on(surface, 'pointerdown', (e) => {
    surface.setPointerCapture(e.pointerId)
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pts.size === 1) {
      start = { x: e.clientX, y: e.clientY }
      dragAxis = null
    }
    zoom.holding = true
    vel = 0
    dragAccum = 0
    stepped = false
    lastT = e.timeStamp
    if (pts.size === 2) {
      const [a, b] = [...pts.values()]
      lastDist = Math.hypot(a!.x - b!.x, a!.y - b!.y)
    }
  })
  on(window, 'pointermove', (e) => {
    pointerNdc.x = (e.clientX / innerWidth) * 2 - 1
    pointerNdc.y = -(e.clientY / innerHeight) * 2 + 1
    pointerNdc.active = e.pointerType === 'mouse' || pts.has(e.pointerId)
    const prev = pts.get(e.pointerId)
    if (!prev) return
    const next = { x: e.clientX, y: e.clientY }
    pts.set(e.pointerId, next)
    const dtMs = Math.max(1, e.timeStamp - lastT)
    lastT = e.timeStamp
    if (pts.size >= 2) {
      const [a, b] = [...pts.values()]
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y)
      // Fingers apart = zoom in.
      if (lastDist > 0) stepOrNudgeContinuous(-Math.log(dist / lastDist) * 0.35)
      lastDist = dist
      return
    }
    if (dragAxis === null) {
      const mx = next.x - start.x
      const my = next.y - start.y
      if (Math.hypot(mx, my) < 10) return
      dragAxis = Math.abs(mx) > Math.abs(my) * 1.2 ? 'x' : 'y'
    }
    if (dragAxis === 'x') return // a sideways drag never zooms; it browses on release
    const dp = (prev.y - next.y) / (innerHeight * 4)
    vel = dp / dtMs
    stepOrNudgeContinuous(dp)
  })
  function stepOrNudgeContinuous(dp: number) {
    if (!zoom.discrete) return nudge(dp)
    dragAccum += dp
    if (!stepped && Math.abs(dragAccum) > 0.03) {
      stepOrNudge(dragAccum)
      stepped = true // one step per gesture
    }
  }
  const release = (e: PointerEvent) => {
    const single = pts.size === 1
    if (!pts.delete(e.pointerId)) return
    if (pts.size < 2) lastDist = 0
    // A sideways swipe flips through the projects (swipe left = next, like turning a page).
    const sx = e.clientX - start.x
    const sy = e.clientY - start.y
    if (single && dragAxis === 'x' && Math.abs(sx) > 60 && Math.abs(sx) > Math.abs(sy))
      browseProjects(sx < 0 ? 1 : -1)
    if (pts.size === 0) {
      zoom.holding = false
      if (e.pointerType !== 'mouse') pointerNdc.active = false // a lifted finger stops repelling
      // Momentum: a flick keeps travelling a little.
      if (!zoom.discrete && performance.now() - lastT < 80) nudge(vel * 220)
    }
  }
  on(window, 'pointerup', release)

  // Touch swipes that start on top of the world (the demo window, the card) browse too; drags
  // on the 3D surface are handled above. Demos with their own drags stop the event first.
  // Mouse drags on overlays are left alone so text can still be selected.
  let touchStart: { id: number; x: number; y: number } | null = null
  on(window, 'pointerdown', (e) => {
    const t = e.target
    touchStart =
      e.pointerType !== 'mouse' && t instanceof Element && !surface.contains(t) && !isTyping(t)
        ? { id: e.pointerId, x: e.clientX, y: e.clientY }
        : null
  })
  on(window, 'pointerup', (e) => {
    if (!touchStart || touchStart.id !== e.pointerId) return
    const sx = e.clientX - touchStart.x
    const sy = e.clientY - touchStart.y
    touchStart = null
    if (Math.abs(sx) > 60 && Math.abs(sx) > Math.abs(sy) * 1.2 && !useDemos.getState().expanded)
      browseProjects(sx < 0 ? 1 : -1)
  })
  on(document.documentElement, 'pointerleave', () => (pointerNdc.active = false))
  on(window, 'pointercancel', release)

  on(window, 'keydown', (e) => {
    if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
    const onControl =
      e.target instanceof HTMLElement && e.target.closest('button, a, [role="button"]')
    switch (e.key) {
      case 'ArrowDown':
      case 's':
      case 'S':
        stepOrNudge(KEY_STEP)
        break
      case 'ArrowUp':
      case 'w':
      case 'W':
        stepOrNudge(-KEY_STEP)
        break
      case 'ArrowRight':
      case 'ArrowLeft':
        if (onControl || useDemos.getState().expanded) return
        if (!browseProjects(e.key === 'ArrowRight' ? 1 : -1)) return
        break
      case 'PageDown':
        flyTo(stepCenter(zoom.target, 1))
        break
      case 'PageUp':
        flyTo(stepCenter(zoom.target, -1))
        break
      case ' ':
        if (onControl) return
        flyTo(stepCenter(zoom.target, e.shiftKey ? -1 : 1))
        break
      case 'Home':
        flyTo(CENTERS.cursor)
        break
      case 'End':
        flyTo(CENTERS.outro)
        break
      case 'Escape':
        // Back out one step: full screen demo, then the terminal handles itself, then a dive.
        if (useDemos.getState().expanded) useDemos.setState({ expanded: false })
        else if (document.querySelector('.terminal:not(.is-auto)')) return
        else if (dive.id) undive()
        else return
        break
      default:
        return
    }
    e.preventDefault()
  })

  return () => off.forEach((f) => f())
}

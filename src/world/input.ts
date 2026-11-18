// Every way of zooming feeds the same target value: wheel, trackpad pinch, touch swipe/pinch,
// mouse drag, keys. Returns an unbind function.
import { CENTERS, stepCenter } from './levels.ts'
import { flyTo, nudge, zoom } from './zoom.ts'

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
  on(surface, 'pointerdown', (e) => {
    surface.setPointerCapture(e.pointerId)
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
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
    if (!pts.delete(e.pointerId)) return
    if (pts.size < 2) lastDist = 0
    if (pts.size === 0) {
      zoom.holding = false
      if (e.pointerType !== 'mouse') pointerNdc.active = false // a lifted finger stops repelling
      // Momentum: a flick keeps travelling a little.
      if (!zoom.discrete && performance.now() - lastT < 80) nudge(vel * 220)
    }
  }
  on(window, 'pointerup', release)
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
      default:
        return
    }
    e.preventDefault()
  })

  return () => off.forEach((f) => f())
}

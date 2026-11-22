// The single zoom value. Every input writes `target`; the render loop springs `value` toward it.
// Plain mutable state on purpose: it changes every frame and must never trigger React renders.
import { spring } from '../styles/tokens.ts'
import { CENTERS, clamp01, nearestCenter, stepCenter } from './levels.ts'

export const zoom = {
  target: 0,
  value: 0,
  velocity: 0,
  /** ms timestamp of the last user input; drives snap-to-rest. */
  lastInput: 0,
  /** True while a finger/mouse is held, so we don't snap mid-gesture. */
  holding: false,
  /** Reduced motion: no spring; each step is a short crossfade instead of a camera move. */
  discrete: false,
  /** 1 = world fully shown. Dips to 0 and back during a discrete step. */
  fade: 1,
  /** The level centre it last came to rest on, so settling can favour the way you moved. */
  anchor: 0,
}

/**
 * Diving into a star: a second, independent camera move layered on the constellation level.
 * value 0 = constellation, 1 = inside that project's frame.
 */
export const dive = {
  id: null as string | null,
  target: 0,
  value: 0,
  velocity: 0,
  /** Browsing from one project to the next while inside: the camera glides from `from`. */
  from: null as string | null,
  swap: 1,
}

const SWAP_S = 1.3 // seconds for the flight from one project to the next

/** Camera state of the current frame, for projecting world boxes onto DOM overlays. */
export const view = {
  focus: [0, 0] as [number, number],
  height: 1,
  vw: 1,
  vh: 1,
  scale: 1,
  /** Universe point → CSS px through the real (possibly orbiting) camera. Set by the world. */
  project: (x: number, y: number, z = 0): [number, number] => [x, y + z],
  /** CSS px → universe point on the plane at universe depth z. Set by the world. */
  unproject: (px: number, py: number, z = 0): [number, number] => [px, py + z],
}

const SNAP_AFTER_MS = 900

export function diveInto(id: string) {
  if (dive.id && dive.id !== id && dive.target === 1 && dive.value > 0.5) {
    dive.from = dive.id
    dive.swap = 0
  }
  dive.id = id
  dive.target = 1
  flyTo(CENTERS.constellation)
}

/** The flight between two projects: which one is on show, and how visible it is (0..1). */
export function swapView(): { id: string | null; fade: number } {
  if (!dive.from) return { id: dive.id, fade: 1 }
  const s = dive.swap
  // The old project fades as the camera pulls back; the new one appears as it settles in.
  return s < 0.5
    ? { id: dive.from, fade: 1 - Math.min(1, s / 0.15) }
    : { id: dive.id, fade: Math.max(0, (s - 0.8) / 0.2) }
}

/** 0 at rest, 1 at the top of the flight: the galaxy shows through while you travel. */
export const swapLift = () => (dive.from ? Math.sin(Math.PI * dive.swap) : 0)

export function undive() {
  dive.target = 0
}

export function nudge(dp: number, now = performance.now()) {
  // Inside a dive, zooming out backs out of the project; zooming further in has nowhere to go.
  if (dive.id) {
    if (dp > 0) undive()
    return
  }
  zoom.target = clamp01(zoom.target + dp)
  zoom.lastInput = now
}

export function flyTo(p: number, now = performance.now()) {
  if (dive.id && p !== CENTERS.constellation) undive()
  zoom.target = clamp01(p)
  zoom.lastInput = now
}

/**
 * Advance the spring by dt seconds. Pure on its inputs so it can be tested without a browser.
 * Semi-implicit Euler, sub-stepped so a long frame (tab switch, GC pause) can't explode it.
 */
export function stepSpring(
  s: { value: number; velocity: number },
  target: number,
  dt: number,
  k: { stiffness: number; damping: number } = spring.camera,
) {
  // Up to 0.5s per frame (sub-stepped): slow devices keep real-time speed; a tab switch can't explode it.
  let remaining = Math.min(dt, 0.5)
  while (remaining > 0) {
    const h = Math.min(remaining, 1 / 120)
    const accel = k.stiffness * (target - s.value) - k.damping * s.velocity
    s.velocity += accel * h
    s.value += s.velocity * h
    remaining -= h
  }
  if (Math.abs(target - s.value) < 1e-5 && Math.abs(s.velocity) < 1e-4) {
    s.value = target
    s.velocity = 0
  }
}

/**
 * Where to come to rest: the nearest level, except that a clear move away from the level you
 * were resting on carries on to the next one (one trackpad swipe covers about half the gap, and
 * snapping back made it feel like nothing happened).
 */
export function settle(p: number): number {
  let c = nearestCenter(p)
  if (c === zoom.anchor && Math.abs(p - c) > 0.035) c = stepCenter(c, p > c ? 1 : -1)
  zoom.anchor = c
  return c
}

/** One frame of zoom: snap-to-rest when idle, then spring (or jump, in discrete mode). */
export function tick(dt: number, now = performance.now()) {
  if (dive.id) {
    if (zoom.discrete) dive.value = dive.target
    else stepSpring(dive, dive.target, dt, spring.gentle)
    if (dive.swap < 1) dive.swap = zoom.discrete ? 1 : Math.min(1, dive.swap + dt / SWAP_S)
    if (dive.swap >= 1) dive.from = null
    if (dive.target === 0 && dive.value < 0.002) {
      dive.id = null
      dive.value = 0
      dive.velocity = 0
    }
  }
  if (!zoom.holding && now - zoom.lastInput > SNAP_AFTER_MS) zoom.target = settle(zoom.target)
  if (zoom.discrete) {
    zoom.velocity = 0
    if (zoom.value !== zoom.target) {
      zoom.fade = Math.max(0, zoom.fade - dt / 0.16)
      if (zoom.fade === 0) zoom.value = zoom.target
    } else {
      zoom.fade = Math.min(1, zoom.fade + dt / 0.24)
    }
    return
  }
  zoom.fade = 1
  stepSpring(zoom, zoom.target, dt)
}

type Listener = (p: number) => void
const listeners = new Set<Listener>()
/** DOM chrome subscribes here instead of running its own requestAnimationFrame. */
export function onFrame(fn: Listener) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
export function emitFrame(p: number) {
  for (const fn of listeners) fn(p)
}

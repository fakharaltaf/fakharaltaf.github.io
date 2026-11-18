// The single zoom value. Every input writes `target`; the render loop springs `value` toward it.
// Plain mutable state on purpose: it changes every frame and must never trigger React renders.
import { spring } from '../styles/tokens.ts'
import { CENTERS, clamp01, nearestCenter } from './levels.ts'

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
}

/**
 * Diving into a star: a second, independent camera move layered on the constellation level.
 * value 0 = constellation, 1 = inside that project's frame.
 */
export const dive = { id: null as string | null, target: 0, value: 0, velocity: 0 }

/** Camera state of the current frame, for projecting world boxes onto DOM overlays. */
export const view = {
  focus: [0, 0] as [number, number],
  height: 1,
  vw: 1,
  vh: 1,
  scale: 1,
  /** Universe point → CSS px through the real (possibly orbiting) camera. Set by the world. */
  project: (x: number, y: number, z = 0): [number, number] => [x, y + z],
}

const SNAP_AFTER_MS = 900

export function diveInto(id: string) {
  dive.id = id
  dive.target = 1
  flyTo(CENTERS.constellation)
}

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
  let remaining = Math.min(dt, 0.1)
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

/** One frame of zoom: snap-to-rest when idle, then spring (or jump, in discrete mode). */
export function tick(dt: number, now = performance.now()) {
  if (dive.id) {
    if (zoom.discrete) dive.value = dive.target
    else stepSpring(dive, dive.target, dt, spring.gentle)
    if (dive.target === 0 && dive.value < 0.002) {
      dive.id = null
      dive.value = 0
      dive.velocity = 0
    }
  }
  if (!zoom.holding && now - zoom.lastInput > SNAP_AFTER_MS) {
    zoom.target = nearestCenter(zoom.target)
  }
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

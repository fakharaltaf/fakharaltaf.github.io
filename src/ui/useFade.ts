import { useEffect, useRef } from 'react'
import { type Frame, frameAt } from '../world/timeline.ts'
import { onFrame } from '../world/zoom.ts'

/**
 * Drive a DOM overlay's visibility from the zoom timeline, inside the shared render loop.
 * Hidden overlays are `inert`, so Tab only ever cycles through the current level.
 */
export function useFade<T extends HTMLElement>(opacity: (f: Frame) => number, rise = 14) {
  const ref = useRef<T>(null)
  useEffect(() => {
    let last = -1
    return onFrame((p) => {
      const el = ref.current
      if (!el) return
      const o = Math.round(opacity(frameAt(p)) * 100) / 100
      if (o === last) return
      last = o
      el.style.opacity = String(o)
      el.style.translate = `0 ${((1 - o) * rise).toFixed(1)}px`
      el.style.visibility = o > 0 ? 'visible' : 'hidden'
      el.inert = o < 0.5
    })
    // opacity is a stable module-level function at every call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return ref
}

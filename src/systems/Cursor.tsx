// A context-aware cursor: a ring that says what a click or drag will do here (zoom, drag, play,
// open, fling) and leans toward buttons and links. Mouse only; never mounted on touch.
import { useEffect, useRef } from 'react'
import { cursorLabels } from '../content/copy.ts'
import { starPos } from '../world/physicsState.ts'
import { STARS } from '../world/layout.ts'
import { frameAt } from '../world/timeline.ts'
import { dive, onFrame, view, zoom } from '../world/zoom.ts'

type Mode = keyof typeof cursorLabels | 'link' | 'text' | 'none'
const INTERACTIVE = 'a, button, select, [role="application"], [tabindex]:not([tabindex="-1"])'

export function Cursor() {
  const ring = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    document.documentElement.classList.add('has-cursor')
    const ptr = { x: -100, y: -100, target: null as Element | null, down: false }
    const pos = { x: -100, y: -100, w: 34, h: 34 }
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      ptr.x = e.clientX
      ptr.y = e.clientY
      ptr.target = e.target as Element
    }
    const down = () => (ptr.down = true)
    const up = () => (ptr.down = false)
    const leave = () => (ptr.target = null)
    addEventListener('pointermove', move, { passive: true })
    addEventListener('pointerdown', down)
    addEventListener('pointerup', up)
    document.documentElement.addEventListener('pointerleave', leave)

    let lastMode: Mode = 'none'
    const unsub = onFrame((p) => {
      const r = ring.current
      const l = label.current
      if (!r || !l) return
      const t = ptr.target
      let mode: Mode = 'none'
      let snap: DOMRect | null = null
      // Right on a star (constellation): it can be grabbed, whatever sits on top of it.
      const f = frameAt(p)
      const onStar =
        f.chain > 3.7 &&
        f.chain < 4.3 &&
        !dive.id &&
        STARS.some((_, i) => {
          const [sx, sy] = view.project(...starPos(i))
          return Math.hypot(sx - ptr.x, sy - ptr.y) < 24
        })
      if (t && onStar) mode = ptr.down ? 'fling' : 'drag'
      else if (t) {
        const tagged = t.closest('[data-cursor]')
        const interactive = t.closest(INTERACTIVE)
        if (t.closest('input, textarea')) mode = 'text'
        else if (
          tagged &&
          (!interactive || !tagged.contains(interactive) || interactive === tagged)
        )
          mode = tagged.getAttribute('data-cursor') as Mode
        else if (interactive) {
          mode = 'link'
          const b = interactive.getBoundingClientRect()
          if (b.width < 260 && b.height < 90) snap = b
        } else mode = 'zoom'
      }
      // Magnetic: lean toward the control and take its shape.
      const tx = snap ? ptr.x + (snap.left + snap.width / 2 - ptr.x) * 0.35 : ptr.x
      const ty = snap ? ptr.y + (snap.top + snap.height / 2 - ptr.y) * 0.35 : ptr.y
      const tw = snap ? snap.width + 10 : mode === 'text' ? 4 : 34
      const th = snap ? snap.height + 10 : mode === 'text' ? 4 : 34
      const k = zoom.discrete ? 1 : 0.32
      pos.x += (tx - pos.x) * k
      pos.y += (ty - pos.y) * k
      pos.w += (tw - pos.w) * k
      pos.h += (th - pos.h) * k
      r.style.transform = `translate(${(pos.x - pos.w / 2).toFixed(1)}px, ${(pos.y - pos.h / 2).toFixed(1)}px)`
      r.style.width = `${pos.w.toFixed(1)}px`
      r.style.height = `${pos.h.toFixed(1)}px`
      if (mode !== lastMode) {
        lastMode = mode
        r.dataset.mode = mode
        l.textContent = mode in cursorLabels ? cursorLabels[mode as keyof typeof cursorLabels] : ''
      }
    })
    return () => {
      unsub()
      removeEventListener('pointermove', move)
      removeEventListener('pointerdown', down)
      removeEventListener('pointerup', up)
      document.documentElement.removeEventListener('pointerleave', leave)
      document.documentElement.classList.remove('has-cursor')
    }
  }, [])

  return (
    <div ref={ring} className="cursor" data-mode="none" aria-hidden="true">
      <span ref={label} />
    </div>
  )
}

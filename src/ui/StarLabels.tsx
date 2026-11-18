// At the constellation, every star is a real button: Tab to it, Enter to fly in.
import { useEffect, useRef } from 'react'
import { levels } from '../content/copy.ts'
import { projects } from '../content/projects.ts'
import { track } from '../automation/store.ts'
import { openProject } from '../world/hash.ts'
import { STARS } from '../world/layout.ts'
import { starPos } from '../world/physicsState.ts'
import { remap } from '../world/levels.ts'
import { frameAt } from '../world/timeline.ts'
import { dive, onFrame, view } from '../world/zoom.ts'

export function StarLabels() {
  const wrap = useRef<HTMLDivElement>(null)
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    let last = -1
    return onFrame((p) => {
      const f = frameAt(p)
      const o =
        Math.round(remap(f.t[3], 0.75, 1) * (1 - remap(f.t[4], 0, 0.25)) * (1 - dive.value) * 100) /
        100
      const w = wrap.current
      if (!w) return
      if (o !== last) {
        last = o
        w.style.opacity = String(o)
        w.style.visibility = o > 0 ? 'visible' : 'hidden'
        w.inert = o < 0.5
      }
      if (o <= 0) return
      STARS.forEach((_, i) => {
        const el = refs.current[i]
        if (!el) return
        const [x, y] = view.project(...starPos(i))
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
        // Near the right edge (and the HUD), the label sits on the star's left.
        el.classList.toggle('flip', x > view.vw * 0.68)
      })
    })
  }, [])

  return (
    <div ref={wrap} className="star-labels">
      {projects.map((p, i) => (
        <button
          key={p.id}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="button"
          className="star-label"
          aria-label={levels.project.openStar(p.title)}
          onClick={() => {
            track('openProject')
            openProject(p.id)
          }}
        >
          <span aria-hidden="true">{p.short ?? p.title}</span>
        </button>
      ))}
    </div>
  )
}

// Hover a thread between two stars: which skill(s) it stands for, and every project that has it.
import { useEffect, useRef, useState } from 'react'
import { levels } from '../content/copy.ts'
import { projects } from '../content/projects.ts'
import { skills } from '../content/skills.ts'
import { starPos } from '../world/physicsState.ts'
import { frameAt } from '../world/timeline.ts'
import { dive, onFrame, view } from '../world/zoom.ts'

const PAIRS = projects.flatMap((a, i) =>
  projects.flatMap((b, j) => {
    if (j <= i) return []
    const shared = a.skills.filter((s) => b.skills.includes(s))
    return shared.length
      ? [
          {
            i,
            j,
            lines: shared.map((s) =>
              levels.constellation.thread(
                skills[s],
                projects.filter((p) => p.skills.includes(s)).map((p) => p.short ?? p.title),
              ),
            ),
          },
        ]
      : []
  }),
)

/** Distance from point p to segment ab, all in px. */
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)))
  return { d: Math.hypot(px - (ax + t * dx), py - (ay + t * dy)), t }
}

export function ThreadTips() {
  const [tip, setTip] = useState<{ x: number; y: number; lines: string[] } | null>(null)
  const pointer = useRef({ x: -1e4, y: -1e4 })

  useEffect(() => {
    const move = (e: PointerEvent) => (pointer.current = { x: e.clientX, y: e.clientY })
    addEventListener('pointermove', move, { passive: true })
    let lastKey = ''
    const unsub = onFrame((p) => {
      const f = frameAt(p)
      const live = f.chain > 3.85 && f.chain < 4.15 && !dive.id
      const { x, y } = pointer.current
      let best: (typeof PAIRS)[number] | null = null
      let bestD = 10
      if (live) {
        for (const pair of PAIRS) {
          const a = view.project(...starPos(pair.i))
          const b = view.project(...starPos(pair.j))
          const { d, t } = segDist(x, y, a[0], a[1], b[0], b[1])
          // Not on the stars themselves: those are for grabbing.
          if (d < bestD && t > 0.08 && t < 0.92) {
            best = pair
            bestD = d
          }
        }
      }
      const key = best ? `${best.i}-${best.j}` : ''
      if (key !== lastKey || best) {
        lastKey = key
        setTip(best ? { x, y, lines: best.lines } : null)
      }
    })
    return () => {
      removeEventListener('pointermove', move)
      unsub()
    }
  }, [])

  if (!tip) return null
  return (
    <div
      className="thread-tip"
      style={{ transform: `translate(${tip.x + 14}px, ${tip.y + 14}px)` }}
      role="tooltip"
    >
      {tip.lines.map((l) => (
        <p key={l}>{l}</p>
      ))}
    </div>
  )
}

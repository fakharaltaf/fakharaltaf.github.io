// Svype, playable: a stack of job cards you fling left or right. Rotation follows the throw;
// a weak throw springs back. A few swipes in, a summary of your matches.
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { demosSvype as t } from '../../content/copy.ts'
import { registerAction } from '../../automation/runner.ts'
import { track } from '../../automation/store.ts'
import { spring } from '../../styles/tokens.ts'
import { useWorld } from '../../world/store.ts'
import { onFrame } from '../../world/zoom.ts'
import type { DemoProps } from '../store.ts'
import { haptic } from '../../systems/haptics.ts'
import './svype.css'

// Simulated listings. No real companies, by design.
const JOBS = [
  {
    title: 'Integrations engineer',
    where: 'Travel tech · Remote',
    match: 92,
    tags: ['APIs', 'TypeScript', 'Webhooks'],
  },
  {
    title: 'Solutions engineer',
    where: 'B2B SaaS · Hybrid',
    match: 88,
    tags: ['Demos', 'Architecture', 'Customers'],
  },
  {
    title: 'Backend engineer',
    where: 'Logistics · Remote',
    match: 86,
    tags: ['AWS Lambda', 'Node.js', 'Queues'],
  },
  {
    title: 'Junior ML engineer',
    where: 'Health · Remote',
    match: 81,
    tags: ['Python', 'ONNX', 'Vision'],
  },
  {
    title: 'Full stack engineer',
    where: 'Fintech · On-site',
    match: 74,
    tags: ['React', 'PostgreSQL', 'Auth'],
  },
  {
    title: 'Frontend engineer',
    where: 'Agency · On-site',
    match: 58,
    tags: ['CSS', 'Figma', 'Deadlines'],
  },
  {
    title: 'Rockstar ninja developer',
    where: 'Unclear · Unclear',
    match: 12,
    tags: ['Passion', 'Hustle', 'Unpaid'],
  },
] as const
const SUMMARY_AFTER = 4

type By = 'visitor' | 'script'
type Card = {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  mode: 'rest' | 'drag' | 'spring' | 'fly'
  by: By
}
const atRest = (): Card => ({ x: 0, y: 0, vx: 0, vy: 0, rot: 0, mode: 'rest', by: 'visitor' })

export default function Svype({ host }: DemoProps) {
  const [top, setTop] = useState(0)
  const [liked, setLiked] = useState<number[]>([])
  const [swiped, setSwiped] = useState(0)
  const el = useRef<HTMLDivElement>(null)
  const card = useRef<Card>(atRest())
  const drag = useRef({ id: -1, lastX: 0, lastY: 0, lastT: 0 })
  const width = () => el.current?.parentElement?.clientWidth ?? 300

  const finish = (dir: 1 | -1, by: By) => {
    if (dir > 0) setLiked((l) => [...l, top])
    setSwiped((s) => s + 1)
    setTop((i) => i + 1)
    card.current = atRest()
    if (by === 'visitor') {
      track('swipeCard')
      haptic('fling')
    }
  }
  const finishRef = useRef(finish)
  useEffect(() => {
    finishRef.current = finish
  })

  /** Throw the top card. Velocity in px/s. */
  const fling = (vx: number, by: By) => {
    const c = card.current
    c.mode = 'fly'
    c.by = by
    c.vx = vx
    c.vy = -Math.abs(vx) * 0.12
  }

  // One integrator for the top card, driven by the shared frame loop.
  useEffect(() => {
    let last = performance.now()
    return onFrame(() => {
      const now = performance.now()
      const dt = Math.min(0.04, (now - last) / 1000)
      last = now
      const c = card.current
      const w = width()
      if (c.mode === 'spring') {
        const k = spring.snappy
        c.vx += (-k.stiffness * c.x - k.damping * c.vx) * dt
        c.vy += (-k.stiffness * c.y - k.damping * c.vy) * dt
        c.x += c.vx * dt
        c.y += c.vy * dt
        if (Math.abs(c.x) < 0.5 && Math.abs(c.vx) < 5)
          Object.assign(c, { x: 0, y: 0, vx: 0, vy: 0, mode: 'rest' })
      } else if (c.mode === 'fly') {
        c.x += c.vx * dt
        c.y += c.vy * dt
        c.vy += 900 * dt
        if (Math.abs(c.x) > w * 1.2) finishRef.current(c.x > 0 ? 1 : -1, c.by)
      }
      if (c.mode !== 'drag') c.rot = (c.x / w) * 22
      const node = el.current
      if (node)
        node.style.transform = `translate(${c.x}px, ${c.y}px) rotate(${c.rot.toFixed(2)}deg)`
    })
  }, [host])

  const throwCard = (dir: 1 | -1, by: By) => {
    if (top >= JOBS.length || card.current.mode === 'fly') return
    if (useWorld.getState().reducedMotion) return finish(dir, by)
    fling(dir * Math.max(1400, width() * 3), by)
  }

  const autoSwipe = useEffectEvent(() => {
    const job = JOBS[top]
    if (job) throwCard(job.match >= 70 ? 1 : -1, 'script')
  })
  useEffect(() => registerAction('swipeCard', () => autoSwipe()), [])

  const onDown = (e: React.PointerEvent) => {
    if (card.current.mode === 'fly') return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { id: e.pointerId, lastX: e.clientX, lastY: e.clientY, lastT: e.timeStamp }
    card.current.mode = 'drag'
    card.current.vx = 0
  }
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (d.id !== e.pointerId || card.current.mode !== 'drag') return
    const c = card.current
    const dtS = Math.max(0.001, (e.timeStamp - d.lastT) / 1000)
    const dx = e.clientX - d.lastX
    c.x += dx
    c.y += (e.clientY - d.lastY) * 0.35
    // Velocity is smoothed, and rotation leans into it: a hard throw tilts harder.
    c.vx = c.vx * 0.6 + (dx / dtS) * 0.4
    c.rot = (c.x / width()) * 22 + Math.max(-12, Math.min(12, c.vx * 0.008))
    Object.assign(d, { lastX: e.clientX, lastY: e.clientY, lastT: e.timeStamp })
  }
  const onUp = (e: React.PointerEvent) => {
    if (drag.current.id !== e.pointerId) return
    drag.current.id = -1
    const c = card.current
    const w = width()
    // Strong enough? Off it goes. Otherwise, back to the stack.
    if (Math.abs(c.vx) > 700 || Math.abs(c.x) > w * 0.38)
      fling(Math.sign(c.x || c.vx) * Math.max(Math.abs(c.vx), 1400), 'visitor')
    else c.mode = 'spring'
  }

  const done = swiped >= SUMMARY_AFTER || top >= JOBS.length
  return (
    <div
      className="sv"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
        e.preventDefault()
        e.stopPropagation()
        if (!done) throwCard(e.key === 'ArrowRight' ? 1 : -1, 'visitor')
      }}
    >
      {done ? (
        <div className="sv-summary">
          <p className="sv-title">{t.summaryTitle}</p>
          {liked.length ? (
            <ul>
              {liked.map((i) => (
                <li key={i}>
                  <span>{JOBS[i]!.title}</span>{' '}
                  <span className="sv-pct">{t.match(JOBS[i]!.match)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>{t.summaryEmpty}</p>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setTop(0)
              setLiked([])
              setSwiped(0)
            }}
          >
            {t.again}
          </button>
        </div>
      ) : (
        <>
          <div className="sv-stack">
            {JOBS.slice(top, top + 3)
              .map((job, k) => (
                <div
                  key={top + k}
                  ref={k === 0 ? el : undefined}
                  className={`sv-card${k === 0 ? ' top' : ''}`}
                  style={
                    k ? { transform: `translateY(${k * 8}px) scale(${1 - k * 0.04})` } : undefined
                  }
                  onPointerDown={k === 0 ? onDown : undefined}
                  onPointerMove={k === 0 ? onMove : undefined}
                  onPointerUp={k === 0 ? onUp : undefined}
                  onPointerCancel={k === 0 ? onUp : undefined}
                  aria-hidden={k > 0}
                >
                  <p className="sv-where">{job.where}</p>
                  <p className="sv-job">{job.title}</p>
                  <div className="sv-match">
                    <span style={{ width: `${job.match}%` }} />
                  </div>
                  <p className="sv-pct">{t.match(job.match)}</p>
                  <ul className="sv-tags">
                    {job.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                </div>
              ))
              .reverse()}
          </div>
          <div className="sv-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => throwCard(-1, 'visitor')}
            >
              {t.pass}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => throwCard(1, 'visitor')}
            >
              {t.like}
            </button>
          </div>
          <p className="sv-hint">
            {t.hint} {t.hintKeys}
          </p>
        </>
      )}
      <p className="sv-sim">{t.simulated}</p>
    </div>
  )
}

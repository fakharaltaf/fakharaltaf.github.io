// Multi-person monitoring, playable: synthetic geometric faces wander a room. Each gets a
// stable ID, a gaze ray, a head-pose gizmo and an attention score; now and then one yawns.
// No camera, no real people: the faces are drawn, the "detections" are their own state.
import { useEffect, useRef, useState } from 'react'
import { demosMonitoring as t } from '../../content/copy.ts'
import { brand, palette } from '../../styles/tokens.ts'
import { mulberry32 } from '../../systems/random.ts'
import { useWorld } from '../../world/store.ts'
import { onFrame } from '../../world/zoom.ts'
import type { DemoProps } from '../store.ts'
import './monitoring.css'

type Person = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  yaw: number // head turn, radians
  pitch: number
  gaze: number // gaze direction, radians
  attention: number // 0..1, smoothed
  yawnUntil: number
  hue: number
}

const MAX = 30
const rnd = mulberry32(30)

function spawn(id: number): Person {
  return {
    id,
    x: 0.1 + rnd() * 0.8,
    y: 0.2 + rnd() * 0.65,
    vx: (rnd() - 0.5) * 0.04,
    vy: (rnd() - 0.5) * 0.03,
    yaw: 0,
    pitch: 0,
    gaze: rnd() * Math.PI * 2,
    attention: 0.7,
    yawnUntil: 0,
    hue: rnd(),
  }
}

export default function Monitoring({ host }: DemoProps) {
  const [count, setCount] = useState(8)
  const [flagged, setFlagged] = useState(0)
  const canvas = useRef<HTMLCanvasElement>(null)
  const people = useRef<Person[]>(Array.from({ length: MAX }, (_, i) => spawn(i + 1)))
  const countRef = useRef(count)

  useEffect(() => {
    countRef.current = count
  }, [count])

  useEffect(() => {
    let last = performance.now()
    let time = 0
    return onFrame(() => {
      const c = canvas.current
      const ctx = c?.getContext('2d')
      if (!c || !ctx || Number(host.dataset.fade) <= 0) return
      const now = performance.now()
      const reduced = useWorld.getState().reducedMotion
      const dt = reduced ? 0 : Math.min(0.05, (now - last) / 1000)
      last = now
      time += dt
      const dpr = Math.min(2, devicePixelRatio)
      const w = c.clientWidth
      const h = c.clientHeight
      if (c.width !== Math.round(w * dpr)) c.width = Math.round(w * dpr)
      if (c.height !== Math.round(h * dpr)) c.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      // The room: a floor grid, faint.
      ctx.strokeStyle = 'rgba(233,240,238,0.05)'
      ctx.lineWidth = 1
      for (let gx = 0; gx < w; gx += 40) {
        ctx.beginPath()
        ctx.moveTo(gx, 0)
        ctx.lineTo(gx, h)
        ctx.stroke()
      }

      const n = countRef.current
      const r = Math.max(9, Math.min(26, Math.sqrt((w * h) / (n * 18))))
      let yawning = 0
      for (let i = 0; i < n; i++) {
        const p = people.current[i]!
        // Wander, bounce off walls, look around.
        p.x += p.vx * dt
        p.y += p.vy * dt
        if (p.x < 0.06 || p.x > 0.94) p.vx *= -1
        if (p.y < 0.16 || p.y > 0.9) p.vy *= -1
        p.yaw = Math.sin(time * 0.6 + p.hue * 9) * 0.9
        p.pitch = Math.sin(time * 0.45 + p.hue * 5) * 0.4
        p.gaze = Math.atan2(
          Math.sin(p.yaw) * 0.8 + p.vy * 3,
          Math.cos(p.yaw) * 0.5 + p.vx * 8 + 0.2,
        )
        // Attention: looking roughly forward (toward the "board" at the top) scores high.
        const forward = Math.max(0, Math.cos(p.yaw)) * Math.max(0, 1 - Math.abs(p.pitch))
        const yawn = now < p.yawnUntil
        p.attention += ((yawn ? 0.1 : forward) - p.attention) * Math.min(1, dt * 2)
        if (!reduced && !yawn && rnd() < dt * 0.025) p.yawnUntil = now + 2600
        if (yawn) yawning++

        const x = p.x * w
        const y = p.y * h
        // Face: a circle, eyes offset by yaw, a mouth that opens when yawning.
        ctx.fillStyle = `hsl(${160 + p.hue * 40} 12% ${28 + p.hue * 10}%)`
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
        const ex = Math.sin(p.yaw) * r * 0.35
        const ey = -r * 0.15 + p.pitch * r * 0.2
        ctx.fillStyle = palette.dark.ink
        for (const s of [-1, 1]) {
          ctx.beginPath()
          ctx.arc(x + ex + s * r * 0.32, y + ey, r * 0.1, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.beginPath()
        ctx.ellipse(x + ex, y + r * 0.42, r * 0.22, yawn ? r * 0.22 : r * 0.04, 0, 0, Math.PI * 2)
        ctx.fill()

        // Detection overlay.
        const flag = yawn
        ctx.strokeStyle = flag ? brand.action : brand.anchor
        ctx.lineWidth = 1.25
        ctx.strokeRect(x - r * 1.3, y - r * 1.3, r * 2.6, r * 2.6)
        ctx.fillStyle = flag ? brand.action : brand.anchor
        ctx.font = `500 ${Math.max(9, r * 0.5)}px "JetBrains Mono", monospace`
        ctx.fillText(`#${p.id}${flag ? ` ${t.yawn}` : ''}`, x - r * 1.3, y - r * 1.45)
        // Gaze ray.
        ctx.strokeStyle = 'rgba(233,240,238,0.55)'
        ctx.beginPath()
        ctx.moveTo(x + ex, y + ey)
        ctx.lineTo(x + ex + Math.cos(p.gaze) * r * 2.2, y + ey + Math.sin(p.gaze) * r * 2.2)
        ctx.stroke()
        // Head-pose gizmo: three short axes.
        const gx = x + r * 1.05
        const gy = y + r * 1.05
        const axes: [number, number, string][] = [
          [Math.cos(p.yaw), Math.sin(p.yaw) * 0.3, '#e88a69'],
          [Math.sin(p.pitch) * 0.3, -Math.cos(p.pitch), '#4fd1a3'],
          [Math.sin(p.yaw) * 0.6, 0.5, '#9fc9bc'],
        ]
        for (const [ax, ay, col] of axes) {
          ctx.strokeStyle = col
          ctx.beginPath()
          ctx.moveTo(gx, gy)
          ctx.lineTo(gx + ax * r * 0.5, gy + ay * r * 0.5)
          ctx.stroke()
        }
        // Attention bar.
        ctx.fillStyle = 'rgba(233,240,238,0.15)'
        ctx.fillRect(x - r * 1.3, y + r * 1.42, r * 2.6, 3)
        ctx.fillStyle = flag ? brand.action : brand.anchor
        ctx.fillRect(x - r * 1.3, y + r * 1.42, r * 2.6 * p.attention, 3)
      }
      setFlagged(yawning)
    })
  }, [host])

  return (
    <div className="mo">
      <canvas
        ref={canvas}
        className="mo-room"
        role="img"
        aria-label={t.srSummary(count, flagged)}
      />
      <div className="mo-top">
        <p className="mo-count">{t.people(count)}</p>
        <label className="mo-slider">
          <span>{t.slider}</span>
          <input
            type="range"
            min={1}
            max={MAX}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </label>
      </div>
      <div className="mo-bottom">
        <p>{t.legend}</p>
        <p className="mo-note">{t.synthetic}</p>
      </div>
    </div>
  )
}

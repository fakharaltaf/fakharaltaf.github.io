// "How this works" (live renderer stats), "View source of this moment", wireframe (X) and the
// shortcuts sheet (?). Engineering, shown rather than described.
import { useEffect, useRef, useState } from 'react'
import { hud, shortcuts } from '../content/copy.ts'
import { REPO, sources } from '../content/sources.ts'
import { automatedCount, useAutomation } from '../automation/store.ts'
import { useDemos } from '../demos/store.ts'
import { highlightLine } from './code/highlight.ts'
import { type Tier, TIERS, setQualityMode, useQuality } from '../systems/quality.ts'
import { stats } from '../systems/stats.ts'
import { useWorld } from '../world/store.ts'
import { onFrame } from '../world/zoom.ts'

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))

export function useEngineering() {
  const [show, setShow] = useState({ stats: false, source: false, keys: false })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'x' || e.key === 'X') stats.wireframe = !stats.wireframe
      else if (e.key === '?') setShow((s) => ({ ...s, keys: !s.keys }))
      else if (e.key === 'Escape') setShow((s) => (s.keys ? { ...s, keys: false } : s))
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])
  return [show, setShow] as const
}

function StatsPanel() {
  const text = useRef<HTMLDListElement>(null)
  const graph = useRef<HTMLCanvasElement>(null)
  const backend = useWorld((s) => s.backend)
  const { mode, tier } = useQuality()
  const automated = useAutomation((s) => automatedCount(s.statuses))
  const [wire, setWire] = useState(stats.wireframe)

  useEffect(() => {
    let last = 0
    return onFrame(() => {
      setWire(stats.wireframe) // the X key flips it outside React
      const now = performance.now()
      if (now - last < 250) return
      last = now
      const dl = text.current
      if (dl) {
        const set = (k: string, v: string) => {
          const el = dl.querySelector<HTMLElement>(`[data-k="${k}"]`)
          if (el) el.textContent = v
        }
        set('fps', stats.fps.toFixed(0))
        set('frame', `${stats.frameMs.toFixed(1)} ms`)
        set('drawCalls', String(stats.drawCalls))
        set('triangles', stats.triangles.toLocaleString('en'))
        set('particles', stats.particles.toLocaleString('en'))
      }
      const c = graph.current
      const ctx = c?.getContext('2d')
      if (!c || !ctx) return
      const { history, head } = stats
      ctx.clearRect(0, 0, c.width, c.height)
      ctx.strokeStyle = 'rgba(233,240,238,0.15)'
      const y16 = c.height - (16.7 / 50) * c.height
      ctx.beginPath()
      ctx.moveTo(0, y16)
      ctx.lineTo(c.width, y16)
      ctx.stroke()
      ctx.strokeStyle = '#1D9E75'
      ctx.beginPath()
      for (let i = 0; i < history.length; i++) {
        const v = history[(head + i) % history.length]!
        const x = (i / (history.length - 1)) * c.width
        const y = c.height - Math.min(1, v / 50) * c.height
        if (i) ctx.lineTo(x, y)
        else ctx.moveTo(x, y)
      }
      ctx.stroke()
    })
  }, [])

  const rows: [string, string, string][] = [
    ['fps', hud.stats.fps, '0'],
    ['frame', hud.stats.frame, '0'],
    ['drawCalls', hud.stats.drawCalls, '0'],
    ['triangles', hud.stats.triangles, '0'],
    ['particles', hud.stats.particles, '0'],
  ]
  return (
    <section className="eng-stats" aria-label={hud.howItWorks}>
      <canvas ref={graph} width={220} height={44} aria-hidden="true" />
      <dl ref={text}>
        {rows.map(([k, label, v]) => (
          <div key={k}>
            <dt>{label}</dt>
            <dd data-k={k}>{v}</dd>
          </div>
        ))}
        <div>
          <dt>{hud.stats.backend}</dt>
          <dd>{backend ? hud.backend[backend] : '—'}</dd>
        </div>
        <div>
          <dt>{hud.stats.automated}</dt>
          <dd>{automated}</dd>
        </div>
      </dl>
      <label className="eng-quality">
        <span>{hud.stats.quality}</span>
        <select
          value={mode === 'auto' ? 'auto' : String(mode)}
          onChange={(e) =>
            setQualityMode(e.target.value === 'auto' ? 'auto' : (Number(e.target.value) as Tier))
          }
        >
          <option value="auto">
            {hud.qualityAuto} ({hud.quality[tier]})
          </option>
          {TIERS.map((_, i) => (
            <option key={i} value={i}>
              {hud.quality[i]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="btn btn-quiet"
        aria-pressed={wire}
        onClick={() => (stats.wireframe = !stats.wireframe)}
      >
        {hud.wireframe} (X)
      </button>
    </section>
  )
}

function SourcePanel() {
  const level = useWorld((s) => s.level)
  const present = useDemos((s) => s.present)
  const live = useDemos((s) => (s.present ? !!s.live[s.present] : false))
  const scripting = useAutomation((s) => s.panel !== null)
  const key = scripting
    ? 'automation'
    : live && level === 'project'
      ? 'live'
      : present && (level === 'project' || level === 'constellation')
        ? present
        : level
  const src = sources[key] ?? sources[level]!
  return (
    <section className="eng-source" aria-label={hud.viewSourceLong}>
      <p className="eng-title">{src.title}</p>
      <pre>
        <code>
          {src.code.split('\n').map((line, i) => (
            <span key={i}>
              {highlightLine(line).map((t, j) => (
                <span key={j} className={`tok-${t.kind}`}>
                  {t.text}
                </span>
              ))}
              {'\n'}
            </span>
          ))}
        </code>
      </pre>
      <a href={REPO + src.file} target="_blank" rel="noopener">
        {src.file} <span aria-hidden="true">↗</span>
        <span className="sr-only"> ({hud.openOnGitHub})</span>
      </a>
    </section>
  )
}

function ShortcutSheet({ onClose }: { onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null)
  useEffect(() => close.current?.focus(), [])
  return (
    <div className="eng-keys" role="dialog" aria-modal="true" aria-label={shortcuts.title}>
      <p className="eng-title">{shortcuts.title}</p>
      <dl>
        {shortcuts.items.map((s) => (
          <div key={s.label}>
            <dt>
              {s.keys.map((k) => (
                <kbd key={k}>{k}</kbd>
              ))}
            </dt>
            <dd>{s.label}</dd>
          </div>
        ))}
      </dl>
      <button ref={close} type="button" className="btn btn-primary" onClick={onClose}>
        {shortcuts.close}
      </button>
    </div>
  )
}

export function Engineering() {
  const [show, setShow] = useEngineering()
  return (
    <>
      <div className="eng-toggles">
        <button
          type="button"
          className="btn btn-quiet"
          aria-pressed={show.stats}
          onClick={() => setShow((s) => ({ ...s, stats: !s.stats }))}
        >
          {hud.howItWorks}
        </button>
        <button
          type="button"
          className="btn btn-quiet"
          aria-pressed={show.source}
          onClick={() => setShow((s) => ({ ...s, source: !s.source }))}
        >
          {hud.viewSource}
        </button>
      </div>
      {show.stats && <StatsPanel />}
      {show.source && <SourcePanel />}
      {show.keys && <ShortcutSheet onClose={() => setShow((s) => ({ ...s, keys: false }))} />}
    </>
  )
}

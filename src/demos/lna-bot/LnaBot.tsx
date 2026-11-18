// LNA Bot, playable: drag a learning need into the rules engine; the first rule that matches
// fires, lights up, and recommends how to deliver the training.
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { demosLna as t } from '../../content/copy.ts'
import { registerAction } from '../../automation/runner.ts'
import { track } from '../../automation/store.ts'
import './lna.css'

type Level = 'Basic' | 'Intermediate' | 'Advanced'
type Row = { competency: string; trainees: number; level: Level }

// Sample rows. Simplified rules, same shape as the real configurable engine.
const ROWS: Row[] = [
  { competency: 'Data analysis', trainees: 18, level: 'Intermediate' },
  { competency: 'Negotiation', trainees: 4, level: 'Advanced' },
  { competency: 'Excel basics', trainees: 26, level: 'Basic' },
  { competency: 'Cloud security', trainees: 6, level: 'Advanced' },
  { competency: 'Python scripting', trainees: 3, level: 'Intermediate' },
  { competency: 'Customer service', trainees: 12, level: 'Basic' },
]

export const RULES: { code: string; when: (r: Row) => boolean; outcome: string }[] = [
  { code: 'trainees >= 15', when: (r) => r.trainees >= 15, outcome: 'In-house cohort' },
  {
    code: 'level == "Advanced"',
    when: (r) => r.level === 'Advanced',
    outcome: 'External specialist',
  },
  { code: 'trainees <= 4', when: (r) => r.trainees <= 4, outcome: 'E-learning licence' },
  { code: 'True', when: () => true, outcome: 'In-house workshop' },
]

export const classify = (r: Row) => RULES.findIndex((rule) => rule.when(r))

export default function LnaBot() {
  const [done, setDone] = useState<Record<number, number>>({}) // row → rule index
  const [last, setLast] = useState<number | null>(null)
  const [ghost, setGhost] = useState<{ i: number; x: number; y: number } | null>(null)
  const engine = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLDivElement>(null)

  const send = (i: number, by: 'visitor' | 'script') => {
    if (done[i] !== undefined) return
    setDone((d) => ({ ...d, [i]: classify(ROWS[i]!) }))
    setLast(i)
    if (by === 'visitor') track('dragRow')
  }

  const autoSend = useEffectEvent(() => {
    const i = ROWS.findIndex((_, k) => done[k] === undefined)
    if (i >= 0) send(i, 'script')
  })
  useEffect(() => registerAction('dragRow', () => autoSend()), [])

  const rel = (e: React.PointerEvent) => {
    const r = root.current?.getBoundingClientRect()
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) }
  }
  const overEngine = (e: React.PointerEvent) => {
    const b = engine.current?.getBoundingClientRect()
    return (
      !!b && e.clientX > b.left && e.clientX < b.right && e.clientY > b.top && e.clientY < b.bottom
    )
  }

  const fired = last !== null ? done[last] : undefined
  return (
    <div className="lna" ref={root}>
      <div className="lna-table">
        <p className="lna-h">{t.table}</p>
        <table>
          <thead>
            <tr>
              <th>{t.cols.competency}</th>
              <th>{t.cols.trainees}</th>
              <th>{t.cols.level}</th>
              <th aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => (
              <tr
                key={r.competency}
                className={done[i] !== undefined ? 'sent' : ''}
                data-cursor={done[i] === undefined ? 'drag' : undefined}
                onPointerDown={(e) => {
                  if (done[i] !== undefined || (e.target as Element).closest('button')) return
                  e.stopPropagation()
                  e.currentTarget.setPointerCapture(e.pointerId)
                  setGhost({ i, ...rel(e) })
                }}
                onPointerMove={(e) => ghost?.i === i && setGhost({ i, ...rel(e) })}
                onPointerUp={(e) => {
                  if (ghost?.i !== i) return
                  if (overEngine(e)) send(i, 'visitor')
                  setGhost(null)
                }}
                onPointerCancel={() => setGhost(null)}
              >
                <td>{r.competency}</td>
                <td>{r.trainees}</td>
                <td>{r.level}</td>
                <td>
                  {done[i] === undefined ? (
                    <button
                      type="button"
                      className="btn btn-quiet lna-send"
                      aria-label={t.send(r.competency)}
                      onClick={() => send(i, 'visitor')}
                    >
                      →
                    </button>
                  ) : (
                    <span className="lna-out">{RULES[done[i]!]!.outcome}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="lna-hint">{t.hint}</p>
      </div>

      <div className={`lna-engine${ghost ? ' armed' : ''}`} ref={engine} aria-live="polite">
        <p className="lna-h">{t.engine}</p>
        <pre>
          <span className="tok-keyword">rules</span> = [{'\n'}
          {RULES.map((rule, k) => (
            <span key={k} className={`lna-rule${fired === k ? ' fired' : ''}`}>
              {'  '}(<span className="tok-string">{rule.code}</span>,{' '}
              <span className="tok-type">"{rule.outcome}"</span>),{'\n'}
            </span>
          ))}
          ]
        </pre>
        {last !== null && fired !== undefined ? (
          <p className="lna-result">
            <span className="lna-label">{t.fired}</span> {RULES[fired]!.code}
            <br />
            <span className="lna-label">{t.outcome}</span> {ROWS[last]!.competency}:{' '}
            {RULES[fired]!.outcome}
          </p>
        ) : (
          <p className="lna-result muted">{t.drop}</p>
        )}
        {Object.keys(done).length > 0 && (
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => {
              setDone({})
              setLast(null)
            }}
          >
            {t.reset}
          </button>
        )}
        <p className="lna-sim">{t.simulated}</p>
      </div>

      {ghost && (
        <div className="lna-ghost" style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">
          {ROWS[ghost.i]!.competency}
        </div>
      )}
    </div>
  )
}

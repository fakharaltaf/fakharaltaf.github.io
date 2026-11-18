// The running tally: what runs by itself now, a toggle for each, and the milestone reactions.
import { useEffect } from 'react'
import { automation } from '../content/copy.ts'
import { useWorld } from '../world/store.ts'
import type { ActionId } from './machine.ts'
import { automatedCount, useAutomation } from './store.ts'

const SHOW_MS = 4200

export function Tray() {
  const statuses = useAutomation((s) => s.statuses)
  const note = useAutomation((s) => s.note)
  const { send, clearNote } = useAutomation.getState()
  const reduced = useWorld((s) => s.reducedMotion)
  const count = automatedCount(statuses)

  useEffect(() => {
    if (!note) return
    const t = setTimeout(clearNote, SHOW_MS)
    return () => clearTimeout(t)
  }, [note, clearNote])

  const listed = (Object.keys(statuses) as ActionId[]).filter(
    (id) => statuses[id] === 'automated' || statuses[id] === 'disabled',
  )
  if (!listed.length && !note) return null

  return (
    <section className="tray" aria-label={automation.trayLabel}>
      <p className="note" role="status">
        {note ?? ''}
      </p>
      {listed.length > 0 && (
        <>
          <p className="counter">{automation.counter(count)}</p>
          {reduced && count > 0 && <p className="paused">{automation.pausedReducedMotion}</p>}
          <ul>
            {listed.map((id) => {
              const on = statuses[id] === 'automated'
              return (
                <li key={id} className={on ? 'on' : 'off'}>
                  <span className="auto-badge" title={automation.markerTooltip}>
                    {automation.marker}
                  </span>
                  <span className="name">{automation.names[id]}</span>
                  <button
                    type="button"
                    className="btn btn-quiet"
                    aria-pressed={!on}
                    onClick={() => send(id, { type: 'TOGGLE' })}
                  >
                    {on ? automation.disable : automation.enable}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}

// The running tally: what runs by itself now, a toggle for each, and the milestone reactions.
import { useEffect, useId, useRef, useState } from 'react'
import { automation } from '../content/copy.ts'
import { scripts } from '../content/scripts.ts'
import { useWorld } from '../world/store.ts'
import type { ActionId } from './machine.ts'
import { automatedCount, useAutomation } from './store.ts'

const SHOW_MS = 4200

export function Tray() {
  const statuses = useAutomation((s) => s.statuses)
  const note = useAutomation((s) => s.note)
  const lastRun = useAutomation((s) => s.lastRun)
  const { send, clearNote } = useAutomation.getState()
  const reduced = useWorld((s) => s.reducedMotion)
  const count = automatedCount(statuses)
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLElement>(null)
  const listId = useId()

  // An open list closes on Escape or a click anywhere else.
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation() // closing the list, not backing out of a project
      setOpen(false)
    }
    addEventListener('pointerdown', away, true)
    addEventListener('keydown', esc, true)
    return () => {
      removeEventListener('pointerdown', away, true)
      removeEventListener('keydown', esc, true)
    }
  }, [open])

  useEffect(() => {
    if (!note) return
    const t = setTimeout(clearNote, SHOW_MS)
    return () => clearTimeout(t)
  }, [note, clearNote])

  const listed = (Object.keys(statuses) as ActionId[]).filter(
    (id) => statuses[id] === 'automated' || statuses[id] === 'disabled',
  )
  if (!listed.length && !note) return null

  // One line in the HUD column; the full list opens beside it on demand.
  return (
    <section ref={box} className="tray" aria-label={automation.trayLabel}>
      <p className="note" role="status">
        {note ?? ''}
      </p>
      {listed.length > 0 && (
        <>
          <button
            type="button"
            className="btn btn-quiet tray-toggle"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen(!open)}
          >
            <span className="wide-only">{automation.toggle(count)}</span>
            <span className="narrow-only" aria-hidden="true">
              {automation.toggleShort(count)}
            </span>
          </button>
          <div id={listId} className="tray-list" hidden={!open}>
            {/* A log tail, not a settings list: each script's file and when it last ran. */}
            <p className="log-head">{automation.logHead(count)}</p>
            {reduced && count > 0 && <p className="paused">{automation.pausedReducedMotion}</p>}
            <ul>
              {listed.map((id) => {
                const on = statuses[id] === 'automated'
                const label = on ? automation.disable : automation.enable
                const ran = lastRun[id]
                return (
                  <li key={id} className={on ? 'on' : 'off'}>
                    <button
                      type="button"
                      className="btn log-line"
                      aria-pressed={!on}
                      aria-label={`${automation.names[id]}: ${label}`}
                      onClick={() => send(id, { type: 'TOGGLE' })}
                    >
                      {/* Keyed on the run time, so the line flashes again every time it fires.
                          Hover or focus swaps the time for what a click does. */}
                      <span className="log-time" aria-hidden="true">
                        <time key={ran ?? 0} className={ran ? 'ran' : undefined}>
                          {on && ran ? clock(ran) : '--:--:--'}
                        </time>
                        <span className="log-act">{on ? automation.stop : automation.rerun}</span>
                      </span>
                      <span className="log-file" aria-hidden="true">
                        {scripts[id]?.file ?? id}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}
    </section>
  )
}

/** 24-hour wall-clock time, like a log line. */
const clock = (ms: number) => new Date(ms).toTimeString().slice(0, 8)

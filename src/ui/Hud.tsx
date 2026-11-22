// Zoom HUD: a slim vertical scale with a notch per level. Click a notch to fly there.
import { useEffect, useRef, useState } from 'react'
import { hints, hud, levels } from '../content/copy.ts'
import { navigate } from '../world/hash.ts'
import { CENTERS, LEVELS, levelName } from '../world/levels.ts'
import { Tray } from '../automation/Tray.tsx'
import { useSettings } from '../systems/settings.ts'
import { useWorld } from '../world/store.ts'
import { onFrame, zoom } from '../world/zoom.ts'

export function Hud() {
  const level = useWorld((s) => s.level)
  const backend = useWorld((s) => s.backend)
  const dot = useRef<HTMLSpanElement>(null)
  const sound = useSettings((s) => s.sound)

  useEffect(
    () =>
      onFrame((p) => {
        dot.current?.style.setProperty('--p', p.toFixed(4))
      }),
    [],
  )

  return (
    // One column down the right edge: the automation log, the zoom rail, then sound. Stacked
    // in flow, so none of them can overlap another.
    <nav className="hud" aria-label={hud.label}>
      <Tray />
      <div className="hud-rail">
        <span className="hud-track" aria-hidden="true" />
        <span className="hud-dot" ref={dot} aria-hidden="true" />
        <ol>
          {LEVELS.map((l) => (
            <li key={l} style={{ '--y': CENTERS[l] } as React.CSSProperties}>
              <button
                type="button"
                className="notch"
                aria-label={hud.flyTo(levelName(l))}
                aria-current={l === level ? 'step' : undefined}
                onClick={() => navigate(l)}
              >
                <span className="notch-label" aria-hidden="true">
                  {levelName(l)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div className="hud-foot">
        <button
          type="button"
          className="btn btn-quiet sound-toggle"
          aria-pressed={sound}
          onClick={() => {
            // Never automated: a script that toggles sound would cut the music off.
            useSettings.setState({ sound: !sound })
          }}
        >
          {/* Name stays "Sound"; aria-pressed carries the state for screen readers. */}
          <span className="wide-only">{hud.sound.label}</span>
          <span className="narrow-only" aria-hidden="true">
            ♪
          </span>
          <span aria-hidden="true"> · {sound ? hud.sound.onShort : hud.sound.offShort}</span>
        </button>
        {backend && <p className="hud-backend">{hud.backend[backend]}</p>}
      </div>
    </nav>
  )
}

/** Tells screen readers where the camera is, once it settles on a new level. */
export function Announcer() {
  const level = useWorld((s) => s.level)
  const l = levels[level]
  return (
    <p className="sr-only" aria-live="polite">
      {`${hud.here(l.name)}. ${l.srHeading}.`}
    </p>
  )
}

const HINT_KEY = 'zo:hinted'

/** If the visitor sits on the cursor for a while, say once how to move. */
export function IdleHint() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    try {
      if (localStorage.getItem(HINT_KEY)) return
    } catch {
      /* storage blocked: show the hint anyway */
    }
    const timer = setTimeout(() => {
      if (zoom.target > 0.01) return
      setShow(true)
      try {
        localStorage.setItem(HINT_KEY, '1')
      } catch {
        /* fine */
      }
    }, 7000)
    const unsub = onFrame((p) => {
      if (p > 0.02) {
        clearTimeout(timer)
        setShow(false)
      }
    })
    return () => {
      clearTimeout(timer)
      unsub()
    }
  }, [])
  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
  return (
    <p className={`hint${show ? ' on' : ''}`} aria-hidden={!show}>
      {touch ? hints.idleTouch : hints.idle}
    </p>
  )
}

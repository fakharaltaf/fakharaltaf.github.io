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
    // One column down the right edge: the zoom rail, the automation log, then now playing.
    // Stacked in flow, so none of them can overlap another.
    <nav className="hud" aria-label={hud.label}>
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
      <Tray />
      <div className="hud-foot">
        {/* Now playing: the song, its level bars, and a mute switch. */}
        <div className={`now-playing${sound ? ' on' : ''}`}>
          <p className="np-title">{hud.nowPlaying.title}</p>
          <p className="np-artist">{hud.nowPlaying.artist}</p>
          <span className="np-bars" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <button
            type="button"
            className="btn btn-quiet sound-toggle"
            aria-pressed={sound}
            aria-label={hud.sound.label}
            title={sound ? hud.sound.mute : hud.sound.unmute}
            // Never automated: a script that toggles sound would cut the music off.
            onClick={() => useSettings.setState({ sound: !sound })}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor" />
              {sound ? (
                <path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6 6 0 0 1 0 9" />
              ) : (
                <path d="M11 5.5l4 5M15 5.5l-4 5" />
              )}
            </svg>
          </button>
        </div>
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

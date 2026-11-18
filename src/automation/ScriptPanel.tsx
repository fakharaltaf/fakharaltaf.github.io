// The moment people talk about: the second time you do something, a panel slides in and writes
// the code that does it for you, typo and all, then runs it.
import { useEffect, useMemo, useRef, useState } from 'react'
import { automation } from '../content/copy.ts'
import { scripts } from '../content/scripts.ts'
import { highlightLine } from '../ui/code/highlight.ts'
import { useWorld } from '../world/store.ts'
import { onFrame } from '../world/zoom.ts'
import { sfx } from '../systems/audio.ts'
import { haptic } from '../systems/haptics.ts'
import { runNow } from './runner.ts'
import { useAutomation } from './store.ts'
import { finalText, keystrokes } from './typing.ts'

const LINGER_MS = 5000

export function ScriptPanel() {
  const panel = useAutomation((s) => s.panel)
  const status = useAutomation((s) => (s.panel ? s.statuses[s.panel.id] : null))
  const { send, setPanelPhase, closePanel } = useAutomation.getState()
  const reduced = useWorld((s) => s.reducedMotion)
  const script = panel ? scripts[panel.id] : undefined
  const keys = useMemo(
    () => (script ? keystrokes(script.source, script.file.length) : []),
    [script],
  )
  // [panel id, keystrokes typed]: tied to the id so a new script starts from zero.
  const [progress, setProgress] = useState<[string, number]>(['', 0])
  const hovering = useRef(false)
  const typing = panel?.phase === 'typing'

  // Typing runs off the shared frame loop; it finishes by moving the panel to "running".
  useEffect(() => {
    if (!panel || !typing) return
    const id = panel.id
    if (reduced || !keys.length) {
      const t = setTimeout(() => setPanelPhase('running'), 600)
      return () => clearTimeout(t)
    }
    let i = 0
    let due = performance.now() + 450 // let the panel slide in first
    let finished: ReturnType<typeof setTimeout> | undefined
    const unsub = onFrame(() => {
      const now = performance.now()
      const start = i
      while (i < keys.length && now >= due) due += keys[i++]!.delay
      if (i === start) return
      setProgress([id, i])
      sfx.key()
      if (i === keys.length) finished = setTimeout(() => setPanelPhase('running'), 500)
    })
    return () => {
      unsub()
      clearTimeout(finished)
    }
  }, [panel, typing, keys, reduced, setPanelPhase])

  // Running: perform the action once, visibly, as the script.
  useEffect(() => {
    if (panel?.phase !== 'running') return
    sfx.unlock()
    haptic('unlock')
    if (!reduced) runNow(panel.id) // reduced motion: automated, but nothing runs by itself
    const t = setTimeout(() => setPanelPhase('done'), 1200)
    return () => clearTimeout(t)
  }, [panel, reduced, setPanelPhase])

  // Done: linger, then slide away (but not out from under a pointer or focus).
  useEffect(() => {
    if (panel?.phase !== 'done') return
    const t = setInterval(() => !hovering.current && closePanel(), LINGER_MS)
    return () => clearInterval(t)
  }, [panel, closePanel])

  if (!panel || !script) return null
  const typed = progress[0] === panel.id ? progress[1] : 0
  const text = !typing || reduced ? finalText(script.source) : (keys[typed - 1]?.text ?? '')
  const label = typing
    ? automation.status.typing
    : panel.phase === 'running'
      ? automation.status.running
      : status === 'disabled'
        ? automation.status.disabled
        : automation.status.automated

  return (
    <aside
      className="script-panel"
      aria-label={script.file}
      onPointerEnter={() => (hovering.current = true)}
      onPointerLeave={() => (hovering.current = false)}
      onFocus={() => (hovering.current = true)}
      onBlur={() => (hovering.current = false)}
    >
      <header>
        <span className="file">{script.file}</span>
        <span className={`state state-${panel.phase}`} role="status">
          {label}
        </span>
      </header>
      <p className="lead">
        {panel.phase === 'done'
          ? automation.panelDone
          : automation.panelLead(automation.actions[panel.id])}
      </p>
      <pre aria-hidden={typing}>
        <code>
          {text.split('\n').map((line, i, all) => (
            <span key={i} className="code-line">
              {highlightLine(line).map((tok, j) => (
                <span key={j} className={`tok-${tok.kind}`}>
                  {tok.text}
                </span>
              ))}
              {typing && i === all.length - 1 && <span className="type-caret" />}
              {'\n'}
            </span>
          ))}
        </code>
      </pre>
      {!typing && (
        <footer>
          <button
            type="button"
            className="btn btn-quiet"
            aria-pressed={status === 'disabled'}
            onClick={() => send(panel.id, { type: 'TOGGLE' })}
          >
            {status === 'disabled' ? automation.enable : automation.disable}
          </button>
        </footer>
      )}
    </aside>
  )
}

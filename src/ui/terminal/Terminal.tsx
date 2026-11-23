// The hidden terminal. Opens with / or `. The visitor's sessions take focus; the script's
// sessions (once "open terminal" is automated) never do: they're inert, show an "auto" badge
// and close themselves.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { person, terminal as t } from '../../content/copy.ts'
import { AUTO_TERMINAL_COMMANDS } from '../../content/scripts.ts'
import { registerAction } from '../../automation/runner.ts'
import { track, useAutomation } from '../../automation/store.ts'
import { useSettings } from '../../systems/settings.ts'
import { navigate } from '../../world/hash.ts'
import { CENTERS, stepCenter } from '../../world/levels.ts'
import { flyTo, zoom } from '../../world/zoom.ts'
import { type Effect, complete, run } from './parser.ts'

type Line = { kind: 'in' | 'out'; text: string }
type Mode = 'closed' | 'visitor' | 'script'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const isTyping = (el: Element | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

export function Terminal() {
  const [mode, setMode] = useState<Mode>('closed')
  const [lines, setLines] = useState<Line[]>([{ kind: 'out', text: t.banner }])
  const [input, setInput] = useState('')
  const modeRef = useRef<Mode>('closed')
  const inputRef = useRef<HTMLInputElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<Element | null>(null)
  const cmdHistory = useRef<string[]>([])
  const histIdx = useRef(-1)
  const unknown = useRef(0)

  // Read through a function so TS doesn't narrow it across awaits.
  const currentMode = (): Mode => modeRef.current
  const setModeBoth = (m: Mode) => {
    modeRef.current = m
    setMode(m)
  }

  const close = useCallback(() => {
    if (modeRef.current === 'visitor' && returnFocus.current instanceof HTMLElement)
      returnFocus.current.focus()
    setModeBoth('closed')
  }, [])

  const openForVisitor = useCallback(() => {
    if (modeRef.current !== 'visitor') {
      returnFocus.current = document.activeElement
      track('openTerminal')
    }
    setModeBoth('visitor')
  }, [])

  // Focus in the same commit as the open, so a fast "/whoami" never leaks keys to the zoom controls.
  useLayoutEffect(() => {
    if (mode === 'visitor') inputRef.current?.focus()
  }, [mode])

  const apply = useCallback(
    (e: Effect) => {
      switch (e.type) {
        case 'zoom':
          return flyTo(stepCenter(zoom.target, e.dir))
        case 'goto':
          if (!e.project) return navigate(e.level)
          history.pushState(null, '', `#${e.project}`)
          return flyTo(CENTERS[e.level])
        case 'sound':
          return useSettings.setState({ sound: e.on })
        case 'automateAll':
          return useAutomation.getState().automateAll()
        case 'reset':
          return useAutomation.getState().reset()
        case 'mail':
          setTimeout(() => (location.href = `mailto:${person.links.email}`), e.delayMs)
          return
        case 'clear':
          return setLines([])
        case 'exit':
          setTimeout(close, 350)
          return
        case 'visit':
          setTimeout(() => (location.href = e.href), 350)
          return
      }
    },
    [close],
  )

  const submit = useCallback(
    (cmd: string) => {
      const res = run(cmd, {
        atStart: zoom.target <= 0.001,
        atEnd: zoom.target >= 0.999,
        unknownCount: unknown.current,
      })
      if (res.unknown) unknown.current++
      setLines((ls) => [
        ...ls,
        { kind: 'in', text: cmd },
        ...res.lines.map((text) => ({ kind: 'out' as const, text })),
      ])
      res.effects.forEach(apply)
    },
    [apply],
  )

  // Global open/close keys.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if ((e.key === '/' || e.key === '`') && !isTyping(document.activeElement)) {
        e.preventDefault()
        openForVisitor()
      } else if (e.key === 'Escape' && modeRef.current !== 'closed') {
        close()
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [openForVisitor, close])

  // The automated version: exactly what scripts.openTerminal says it does.
  useEffect(
    () =>
      registerAction('openTerminal', async () => {
        if (modeRef.current !== 'closed') return
        setModeBoth('script')
        await sleep(450)
        const cmd =
          AUTO_TERMINAL_COMMANDS[Math.floor(Math.random() * AUTO_TERMINAL_COMMANDS.length)]!
        for (let i = 1; i <= cmd.length; i++) {
          if (currentMode() !== 'script') return // the visitor took over
          setInput(cmd.slice(0, i))
          await sleep(55 + Math.random() * 60)
        }
        await sleep(220)
        if (currentMode() !== 'script') return
        setInput('')
        submit(cmd)
        await sleep(3500)
        if (currentMode() === 'script') setModeBoth('closed')
      }),
    [submit],
  )

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [lines])

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const h = cmdHistory.current
    if (e.key === 'Enter') {
      if (input.trim()) h.push(input)
      histIdx.current = -1
      submit(input)
      setInput('')
    } else if (e.key === 'ArrowUp' && h.length) {
      e.preventDefault()
      histIdx.current = histIdx.current < 0 ? h.length - 1 : Math.max(0, histIdx.current - 1)
      setInput(h[histIdx.current] ?? '')
    } else if (e.key === 'ArrowDown' && histIdx.current >= 0) {
      e.preventDefault()
      histIdx.current = histIdx.current + 1 >= h.length ? -1 : histIdx.current + 1
      setInput(histIdx.current < 0 ? '' : (h[histIdx.current] ?? ''))
    } else if (e.key === 'Escape') {
      close()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      setInput(complete(input))
    }
    e.stopPropagation() // arrows and W/S belong to the terminal while it has focus
  }

  if (mode === 'closed') return null
  const auto = mode === 'script'
  return (
    <div
      className={`terminal${auto ? ' is-auto' : ''}`}
      role="dialog"
      aria-label={t.title}
      inert={auto}
      onPointerDown={auto ? undefined : (e) => e.stopPropagation()}
    >
      <header className="terminal-bar">
        <span>{t.prompt.replace(/\$$/, '')}</span>
        {auto && <span className="auto-badge">{t.autoBadge}</span>}
        <button type="button" className="btn-quiet terminal-x" aria-label={t.close} onClick={close}>
          ×
        </button>
      </header>
      <div className="terminal-log" ref={logRef} aria-live={auto ? 'off' : 'polite'}>
        {lines.map((l, i) => (
          <p key={i} className={l.kind}>
            {l.kind === 'in' && <span className="prompt">{t.prompt} </span>}
            {l.text}
          </p>
        ))}
      </div>
      <label className="terminal-input">
        <span className="prompt" aria-hidden="true">
          {t.prompt}
        </span>
        <span className="sr-only">{t.inputLabel}</span>
        <input
          ref={inputRef}
          value={input}
          readOnly={auto}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
        />
      </label>
    </div>
  )
}

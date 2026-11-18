// Claude Trace, playable: a session streams in line by line, tool calls fold open, edits arrive
// as word-level diffs, and the sidebar counts tokens as they land.
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { demosTrace as t } from '../../content/copy.ts'
import { registerAction } from '../../automation/runner.ts'
import { track } from '../../automation/store.ts'
import { onFrame } from '../../world/zoom.ts'
import type { DemoProps } from '../store.ts'
import { SESSION, wordDiff } from './session.ts'
import './trace.css'

const STEP_MS = 1100
const RESTART_MS = 6000

export default function ClaudeTrace({ host }: DemoProps) {
  const [shown, setShown] = useState(0)
  const [open, setOpen] = useState<Set<number>>(new Set())
  const log = useRef<HTMLOListElement>(null)

  // Stream one event at a time while visible; loop after a pause, like replaying a tail.
  useEffect(() => {
    let next = performance.now() + 600
    let n = 0
    return onFrame(() => {
      if (Number(host.dataset.fade) < 0.5) return
      const now = performance.now()
      if (now < next) return
      if (n >= SESSION.length) {
        n = 0
        setOpen(new Set())
      } else n++
      setShown(n)
      next = now + (n >= SESSION.length ? RESTART_MS : STEP_MS)
    })
  }, [host])

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' })
  }, [shown, open])

  const totals = useMemo(() => {
    const seen = SESSION.slice(0, shown)
    return {
      input: seen.reduce((s, e) => s + e.tokens[0], 0),
      output: seen.reduce((s, e) => s + e.tokens[1], 0),
      tools: seen.filter((e) => e.kind === 'tool').length,
    }
  }, [shown])

  const toggle = (i: number, by: 'visitor' | 'script') => {
    setOpen((s) => {
      const n = new Set(s)
      if (n.has(i)) n.delete(i)
      else n.add(i)
      return n
    })
    if (by === 'visitor') track('expandToolCall')
  }

  const autoExpand = useEffectEvent(() => {
    const i = SESSION.findIndex((e, k) => k < shown && e.kind === 'tool' && !open.has(k))
    if (i >= 0) toggle(i, 'script')
  })
  useEffect(() => registerAction('expandToolCall', () => autoExpand()), [])

  return (
    <div className="ct">
      <div className="ct-main">
        <header className="ct-bar">
          <span>{t.file}</span>
          <span className={shown < SESSION.length ? 'ct-live' : ''}>
            {shown < SESSION.length ? t.tailing : t.ended}
          </span>
        </header>
        <ol className="ct-log" ref={log} aria-live="off">
          {SESSION.slice(0, shown).map((e, i) => {
            if (e.kind === 'user' || e.kind === 'assistant')
              return (
                <li key={i} className={`ct-msg ct-${e.kind}`}>
                  <span className="ct-who">{e.kind === 'user' ? t.you : t.agent}</span>
                  <span>{e.text}</span>
                </li>
              )
            if (e.kind === 'tool') {
              const isOpen = open.has(i)
              return (
                <li key={i} className="ct-tool">
                  <button
                    type="button"
                    className="ct-toggle"
                    aria-expanded={isOpen}
                    aria-label={t.expand(e.name)}
                    onClick={() => toggle(i, 'visitor')}
                  >
                    <span aria-hidden="true">{isOpen ? '▾' : '▸'}</span> <b>{e.name}</b> {e.args}
                  </button>
                  {isOpen && (
                    <dl className="ct-detail">
                      <dt>{t.args}</dt>
                      <dd>{e.args}</dd>
                      <dt>{t.result}</dt>
                      <dd>{e.result}</dd>
                    </dl>
                  )}
                </li>
              )
            }
            if (e.kind !== 'edit') return null
            return (
              <li key={i} className="ct-edit">
                <span className="ct-who">
                  {t.edit} {e.path}
                </span>
                <code>
                  {wordDiff(e.before, e.after).map((p, k) => (
                    <span key={k} className={`d-${p.op}`} style={{ animationDelay: `${k * 45}ms` }}>
                      {p.text}
                    </span>
                  ))}
                </code>
              </li>
            )
          })}
          {shown < SESSION.length && <li className="ct-cursor" aria-hidden="true" />}
        </ol>
      </div>
      <aside className="ct-side">
        <dl>
          <dt>{t.sidebar.input}</dt>
          <dd>{totals.input.toLocaleString('en')}</dd>
          <dt>{t.sidebar.output}</dt>
          <dd>{totals.output.toLocaleString('en')}</dd>
          <dt>{t.sidebar.tools}</dt>
          <dd>{totals.tools}</dd>
          <dt>{t.sidebar.ratio}</dt>
          <dd>{totals.input ? (totals.output / totals.input).toFixed(3) : '—'}</dd>
        </dl>
        <p className="ct-sim">{t.simulated}</p>
      </aside>
    </div>
  )
}

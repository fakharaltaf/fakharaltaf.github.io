// RareMind, playable: one question, 25 seconds, rarer answers send the submarine deeper.
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { demos } from '../../content/copy.ts'
import { registerAction } from '../../automation/runner.ts'
import { sfx } from '../../systems/audio.ts'
import { track } from '../../automation/store.ts'
import { addView } from '../../world/views.ts'
import { useWorld } from '../../world/store.ts'
import { onFrame } from '../../world/zoom.ts'
import type { DemoProps } from '../store.ts'
import { ANSWERS } from './data.ts'
import { TIERS, type Tier, type Scored } from './logic.ts'
import { createOcean } from './ocean.ts'
import { ROUND_SECONDS, TRENCH_M, useRound } from './store.ts'
import './raremind.css'

const t = demos.raremind
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function resultText(s: Scored | null): string {
  if (!s) return ''
  switch (s.kind) {
    case 'hit':
      return t.hit(s.name, s.share, t.tiers[s.tier], s.metres)
    case 'excluded':
      return t.excluded
    case 'unknown':
      return t.unknown(s.text)
    case 'duplicate':
      return t.duplicate
    case 'empty':
      return t.empty
  }
}

export default function RareMind({ host }: DemoProps) {
  const round = useRound()
  const reduced = useWorld((s) => s.reducedMotion)
  const [value, setValue] = useState('')
  const [secs, setSecs] = useState(ROUND_SECONDS)
  const [meter, setMeter] = useState(-1) // how many tier segments are lit
  const [depthShown, setDepthShown] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const scripted = useRef(false)

  // The ocean renders into this demo's rectangle of the shared canvas.
  useEffect(() => {
    const ocean = createOcean(
      () => useRound.getState().depth,
      () => useWorld.getState().reducedMotion,
    )
    const remove = addView({
      el: host,
      scene: ocean.scene,
      camera: ocean.camera,
      update: ocean.update,
    })
    const unsub = onFrame(() => {
      const now = performance.now()
      const r = useRound.getState()
      r.expire(now)
      if (r.phase === 'playing') setSecs(Math.max(0, Math.ceil((r.endsAt - now) / 1000)))
      setDepthShown(Math.round(ocean.shownDepth()))
    })
    return () => {
      unsub()
      remove()
      ocean.dispose()
    }
  }, [host])

  /** Light the rarity meter up tier by tier, then hold on the answer's tier. */
  const animateMeter = async (tier: Tier) => {
    const target = TIERS.indexOf(tier)
    if (useWorld.getState().reducedMotion) return setMeter(target)
    for (let i = 0; i <= target; i++) {
      setMeter(i)
      await sleep(150)
    }
  }

  const submit = (raw: string, by: 'visitor' | 'script') => {
    const s = useRound.getState().submit(raw)
    if (!s) return
    if (by === 'visitor' && s.kind !== 'empty') track('submitAnswer')
    // Only the visitor's own answers ping: automations never make noise.
    if (by === 'visitor' && s.kind === 'hit')
      sfx.ping(Math.min(1, useRound.getState().depth / 6000))
    setMeter(-1)
    if (s.kind === 'hit') void animateMeter(s.tier)
  }

  // Automated: exactly what the submit-answer script describes.
  const autoAnswer = useEffectEvent(async () => {
    // Never type over something the visitor has half-written.
    if (scripted.current || input.current?.value) return
    scripted.current = true
    try {
      const r = useRound.getState()
      if (r.phase !== 'playing') r.start()
      const said = useRound.getState().said
      const rare = ANSWERS.filter((a) => a.share < 2 && !said.includes(a.name.toLowerCase()))
      const pick = rare[Math.floor(Math.random() * rare.length)]
      if (!pick) return
      for (let i = 1; i <= pick.name.length; i++) {
        setValue(pick.name.slice(0, i))
        await sleep(70 + Math.random() * 60)
      }
      await sleep(250)
      setValue('')
      submit(pick.name, 'script')
    } finally {
      scripted.current = false
    }
  })
  useEffect(() => registerAction('submitAnswer', () => autoAnswer()), [])

  const over = round.phase === 'over'
  const timeLeft = round.phase === 'playing' ? secs : ROUND_SECONDS
  return (
    <div className="rm">
      <div className="rm-q">
        <p className="rm-label">{t.label}</p>
        <p className="rm-question">{t.question}</p>
      </div>

      <div className="rm-gauge" aria-live="off">
        <p className="rm-label">{t.depthLabel}</p>
        <p className="rm-depth">{t.metres(depthShown)}</p>
        {round.depth >= TRENCH_M && <p className="rm-note">{t.trench}</p>}
        {round.said.length > 0 && (
          <ul className="rm-said" aria-label={t.saidLabel}>
            {round.said.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="rm-bottom">
        <ol className="rm-meter" aria-hidden="true">
          {TIERS.map((tier, i) => (
            <li key={tier} className={i <= meter ? `lit lit-${i}` : ''}>
              {t.tiers[tier]}
            </li>
          ))}
        </ol>
        <p className="rm-result" role="status">
          {over ? t.timeUp : resultText(round.last)}
        </p>
        {over ? (
          <button type="button" className="btn btn-primary" onClick={() => round.start()}>
            {t.again}
          </button>
        ) : (
          <form
            className="rm-form"
            onSubmit={(e) => {
              e.preventDefault()
              submit(value, 'visitor')
              setValue('')
            }}
          >
            <label className="sr-only" htmlFor="raremind-answer">
              {t.inputLabel}
            </label>
            <input
              id="raremind-answer"
              ref={input}
              value={value}
              placeholder={t.placeholder}
              autoComplete="off"
              spellCheck={false}
              maxLength={40}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => useRound.getState().phase === 'idle' && useRound.getState().start()}
            />
            <button type="submit" className="btn btn-primary">
              {t.submit}
            </button>
            <span className={`rm-timer${reduced ? '' : ' live'}`} aria-label={t.seconds(timeLeft)}>
              {t.seconds(timeLeft)}
            </span>
          </form>
        )}
        <p className="rm-sim">{t.simulated}</p>
      </div>
    </div>
  )
}

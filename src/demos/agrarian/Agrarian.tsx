// Agrarian, playable: plant one field, watch harvests compound into a village. Seeded and
// deterministic, so the same seed and the same clicks always grow the same farm.
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { demosAgrarian as t } from '../../content/copy.ts'
import { registerAction } from '../../automation/runner.ts'
import { track } from '../../automation/store.ts'
import { addView } from '../../world/views.ts'
import { onFrame } from '../../world/zoom.ts'
import type { DemoProps } from '../store.ts'
import { createFarm } from './farm3d.ts'
import { type Farm, SIZE, YEAR_DAYS, idx, newFarm, nextPlot, plant, seasonOf, step } from './sim.ts'
import './agrarian.css'

const DAY_S = 0.45
const FAST_DAY_S = 0.06
const START_SEED = 4821

export default function Agrarian({ host }: DemoProps) {
  const [farm, setFarm] = useState<Farm>(() => newFarm(START_SEED))
  const [cursor, setCursor] = useState(-1)
  const [event, setEvent] = useState('')
  const [fast, setFast] = useState(0) // days left to fast-forward
  const farmRef = useRef(farm)
  const cursorRef = useRef(cursor)
  const fastRef = useRef(0)
  const pickRef = useRef<(x: number, y: number) => number>(() => -1)

  const commit = (next: Farm) => {
    const prev = farmRef.current
    farmRef.current = next
    setFarm(next)
    const count = (f: Farm, k: string) => f.tiles.filter((x) => x.kind === k).length
    if (count(next, 'barn') > count(prev, 'barn')) setEvent(t.events.barn)
    else if (next.tractor && !prev.tractor) setEvent(t.events.tractor)
    else if (count(next, 'house') > count(prev, 'house')) setEvent(t.events.house)
  }

  useEffect(() => {
    const f3d = createFarm(
      () => farmRef.current,
      () => cursorRef.current,
    )
    pickRef.current = f3d.pick
    const remove = addView({ el: host, scene: f3d.scene, camera: f3d.camera, update: f3d.update })
    let acc = 0
    let last = performance.now()
    const unsub = onFrame(() => {
      const now = performance.now()
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (Number(host.dataset.fade) < 0.5) return // only grows while you can see it
      acc += dt
      const per = fastRef.current > 0 ? FAST_DAY_S : DAY_S
      while (acc >= per) {
        acc -= per
        commit(step(farmRef.current))
        if (fastRef.current > 0) {
          fastRef.current--
          setFast(fastRef.current)
        }
      }
    })
    return () => {
      unsub()
      remove()
      f3d.dispose()
    }
  }, [host])

  const plantAt = (i: number, by: 'visitor' | 'script') => {
    if (i < 0 || farmRef.current.tiles[i]?.kind !== 'grass') return
    commit(plant(farmRef.current, i))
    if (by === 'visitor') track('plantField')
  }

  const autoPlant = useEffectEvent(() => plantAt(nextPlot(farmRef.current), 'script'))
  useEffect(() => registerAction('plantField', () => autoPlant()), [])

  const toNdc = (e: React.PointerEvent<HTMLElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1]
  }

  const moveCursor = (i: number) => {
    cursorRef.current = i
    setCursor(i)
  }

  const onKey = (e: React.KeyboardEvent) => {
    const c = cursor < 0 ? idx(4, 4) : cursor
    const x = c % SIZE
    const y = Math.floor(c / SIZE)
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }
    const m = moves[e.key]
    if (m) {
      moveCursor(
        idx(Math.min(SIZE - 1, Math.max(0, x + m[0])), Math.min(SIZE - 1, Math.max(0, y + m[1]))),
      )
    } else if (e.key === 'Enter' || e.key === ' ') {
      plantAt(c, 'visitor')
    } else return
    e.preventDefault()
    e.stopPropagation() // arrows belong to the farm while it has focus, not the zoom
  }

  const season = seasonOf(farm.day)
  const year = Math.floor(farm.day / YEAR_DAYS) + 1
  const fields = farm.tiles.filter((x) => x.kind === 'field').length
  return (
    <div className="ag">
      <div
        className="ag-plot"
        tabIndex={0}
        role="application"
        aria-label={t.gridLabel}
        onKeyDown={onKey}
        onPointerMove={(e) => moveCursor(pickRef.current(...toNdc(e)))}
        onPointerLeave={() => moveCursor(-1)}
        onPointerDown={(e) => {
          e.stopPropagation()
          plantAt(pickRef.current(...toNdc(e)), 'visitor')
        }}
      />
      <div className="ag-hud">
        <p className="ag-when">{t.when(year, t.seasons[season])}</p>
        <p className="ag-coins">{t.coins(farm.coins)}</p>
        <p className="ag-seed">
          {t.seed(farm.seed)}
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => {
              fastRef.current = 0
              setFast(0)
              setEvent('')
              commit(newFarm(1 + Math.floor(Math.random() * 9999)))
            }}
          >
            {t.newSeed}
          </button>
        </p>
      </div>
      <div className="ag-bottom">
        <p className="ag-event" role="status">
          {event || (fields === 0 ? t.hint : t.sameSeed)}
        </p>
        <p className="ag-keys">{t.hintKeys}</p>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={fast > 0}
          onClick={() => {
            fastRef.current = YEAR_DAYS
            setFast(YEAR_DAYS)
          }}
        >
          {fast > 0 ? t.fastForwarding : t.fastForward}
        </button>
      </div>
    </div>
  )
}

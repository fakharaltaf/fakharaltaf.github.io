// Easter eggs: the Konami code (the whole site fast-forwards like a script) and the ending
// you get for automating everything (the site runs itself, then says the quiet part).
import { useEffect } from 'react'
import { create } from 'zustand'
import { eggs } from '../content/copy.ts'
import { runNow } from '../automation/runner.ts'
import { ACTION_IDS, useAutomation } from '../automation/store.ts'
import { CENTERS, LEVELS } from '../world/levels.ts'
import { useWorld } from '../world/store.ts'
import { flyTo, zoom } from '../world/zoom.ts'

export const useEggs = create<{ ending: boolean; toast: string | null }>(() => ({
  ending: false,
  toast: null,
}))

const KONAMI = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
]
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function toast(text: string, ms = 3800) {
  useEggs.setState({ toast: text })
  setTimeout(() => useEggs.getState().toast === text && useEggs.setState({ toast: null }), ms)
}

/** Fly the whole journey, level by level, like the site is driving itself. */
async function tour(stepMs: number) {
  for (const l of LEVELS) {
    flyTo(CENTERS[l])
    zoom.lastInput = performance.now() + stepMs // no snapping mid-tour
    await sleep(stepMs)
  }
}

export function Eggs() {
  const toastText = useEggs((s) => s.toast)

  // Konami: everything that's automated runs once, and the camera fast-forwards out and back.
  useEffect(() => {
    let i = 0
    const onKey = async (e: KeyboardEvent) => {
      i =
        e.key === KONAMI[i] || e.key.toLowerCase() === KONAMI[i]
          ? i + 1
          : e.key === KONAMI[0]
            ? 1
            : 0
      if (i < KONAMI.length) return
      i = 0
      toast(eggs.konami)
      if (useWorld.getState().reducedMotion) return
      const from = zoom.target
      for (const id of ACTION_IDS)
        if (useAutomation.getState().statuses[id] === 'automated') runNow(id)
      flyTo(1)
      zoom.lastInput = performance.now() + 2500
      await sleep(2200)
      flyTo(from)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

  // Automate everything: once per visit, the site runs itself to the end.
  useEffect(
    () =>
      useAutomation.subscribe((s) => {
        const all = ACTION_IDS.every((id) => s.statuses[id] === 'automated')
        if (!all || useEggs.getState().ending) return
        useEggs.setState({ ending: true })
        toast(eggs.endingTour, 6000)
        void tour(useWorld.getState().reducedMotion ? 600 : 1500)
      }),
    [],
  )

  return (
    <p className={`egg-toast${toastText ? ' on' : ''}`} role="status">
      {toastText ?? ''}
    </p>
  )
}

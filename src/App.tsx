import { Component, type ReactNode, Suspense, lazy, useEffect, useRef } from 'react'
import { errors, site } from './content/copy.ts'
import { startRunner } from './automation/runner.ts'
import { ScriptPanel } from './automation/ScriptPanel.tsx'
import { Tray } from './automation/Tray.tsx'
import { Announcer, Hud, IdleHint } from './ui/Hud.tsx'
import { Terminal } from './ui/terminal/Terminal.tsx'
import { DemoHost } from './demos/DemoHost.tsx'
import { Overlays } from './ui/Overlays.tsx'
import { StarLabels } from './ui/StarLabels.tsx'
import { ThreadTips } from './ui/ThreadTips.tsx'
import { frameAt } from './world/timeline.ts'
import { onFrame } from './world/zoom.ts'
import { bindHash } from './world/hash.ts'
import { bindInputs } from './world/input.ts'
import { useWorld } from './world/store.ts'
import { emitFrame, tick, zoom } from './world/zoom.ts'
import { setHum, sfx } from './systems/audio.ts'
import { Cursor } from './systems/Cursor.tsx'
import './ui/app.css'

// three.js and everything 3D live in their own chunk; the CSS caret covers the wait.
const World = lazy(() =>
  Promise.all([
    import('./world/World.tsx'),
    // Particles sample real glyphs: wait for the fonts (never longer than 2.5s).
    Promise.race([
      Promise.all([
        document.fonts.load('700 72px Figtree'),
        document.fonts.load('400 32px "JetBrains Mono"'),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]),
  ]).then(([m]) => m),
)

class WorldBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    useWorld.setState({ failed: true })
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <p className="fallback">
        {errors.noWebgl} <a href="/plain/">{site.plainTitle}</a>
      </p>
    )
  }
}

export function App() {
  const ready = useWorld((s) => s.ready)
  const reduced = useWorld((s) => s.reducedMotion)
  const surface = useRef<HTMLDivElement>(null)
  // Custom cursor only for a real mouse; touch keeps the platform's behaviour.
  const fine = typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches

  useEffect(() => {
    document.documentElement.classList.toggle('world-ready', ready)
    if (ready) document.querySelector('[data-boot-status]')?.remove()
  }, [ready])

  useEffect(() => {
    zoom.discrete = reduced
  }, [reduced])

  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => useWorld.setState({ reducedMotion: mq.matches })
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => (surface.current ? bindInputs(surface.current) : undefined), [])
  useEffect(() => bindHash(), [])
  useEffect(() => startRunner(), [])

  // Sound: the hum follows the zoom (sampled, not every frame), and visitor clicks tick.
  useEffect(() => {
    let last = 0
    const unsub = onFrame((p) => {
      const now = performance.now()
      if (now - last < 200) return
      last = now
      setHum(p)
    })
    const click = (e: MouseEvent) => {
      if (e.isTrusted && (e.target as Element).closest?.('.btn, .notch, .star-label, button'))
        sfx.click()
    }
    addEventListener('click', click, true)
    return () => {
      unsub()
      removeEventListener('click', click, true)
    }
  }, [])

  // Rapier (WASM) loads the first time the camera nears the constellation, never before.
  useEffect(() => {
    let loading = false
    const unsub = onFrame((p) => {
      if (loading || frameAt(p).chain < 3.2) return
      loading = true
      void import('./world/physics.ts').then((m) => m.startPhysics())
    })
    return unsub
  }, [])

  // If the 3D world can't start, the DOM layer still needs a frame loop (zoom, typing, automations).
  const failed = useWorld((s) => s.failed)
  useEffect(() => {
    if (!failed) return
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      tick((now - last) / 1000)
      last = now
      emitFrame(zoom.value)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [failed])

  return (
    <>
      <div ref={surface} className="surface">
        <WorldBoundary>
          <Suspense fallback={null}>
            <World />
          </Suspense>
        </WorldBoundary>
      </div>
      <Overlays />
      <StarLabels />
      <ThreadTips />
      <DemoHost />
      <Hud />
      <IdleHint />
      <Announcer />
      <Tray />
      <ScriptPanel />
      <Terminal />
      {fine && <Cursor />}
    </>
  )
}

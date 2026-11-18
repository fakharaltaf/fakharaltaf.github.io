import { Component, type ReactNode, Suspense, lazy, useEffect, useRef } from 'react'
import { errors, site } from './content/copy.ts'
import { startRunner } from './automation/runner.ts'
import { ScriptPanel } from './automation/ScriptPanel.tsx'
import { Tray } from './automation/Tray.tsx'
import { Announcer, Hud, IdleHint } from './ui/Hud.tsx'
import { Terminal } from './ui/terminal/Terminal.tsx'
import { Overlays } from './ui/Overlays.tsx'
import { bindHash } from './world/hash.ts'
import { bindInputs } from './world/input.ts'
import { useWorld } from './world/store.ts'
import { emitFrame, tick, zoom } from './world/zoom.ts'
import './ui/app.css'

// three.js and everything 3D live in their own chunk; the CSS caret covers the wait.
const World = lazy(() => import('./world/World.tsx'))

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
      <Hud />
      <IdleHint />
      <Announcer />
      <Tray />
      <ScriptPanel />
      <Terminal />
    </>
  )
}

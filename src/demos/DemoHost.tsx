// Hosts whichever project demo the camera is near. The host element tracks the demo's screen in
// the 3D world every frame, so the demo flies in with the camera; "Full screen" hands it off to a
// screen-space overlay through a View Transition (or a plain swap where unsupported).
import {
  type ComponentType,
  type LazyExoticComponent,
  Suspense,
  lazy,
  useEffect,
  useState,
} from 'react'
import { flushSync } from 'react-dom'
import { levels } from '../content/copy.ts'
import { projects } from '../content/projects.ts'
import { SCREEN, projectBox, screenFor } from '../world/layout.ts'
import { remap } from '../world/levels.ts'
import { frameAt } from '../world/timeline.ts'
import { dive, onFrame, swapView, view } from '../world/zoom.ts'
import { type DemoProps, useDemos } from './store.ts'

const LiveFrame = lazy(() => import('./LiveFrame.tsx'))
/**
 * Projects with a live site show it instead of the built-in demo. Flip this to bring back the
 * Demo | Real site toggle (built-in demo by default; the real site opens full screen).
 */
const SHOW_DEMO_BUTTON = false

const DEMOS: Record<string, LazyExoticComponent<ComponentType<DemoProps>>> = {
  raremind: lazy(() => import('./raremind/RareMind.tsx')),
  agrarian: lazy(() => import('./agrarian/Agrarian.tsx')),
  'claude-trace': lazy(() => import('./claude-trace/ClaudeTrace.tsx')),
  monitoring: lazy(() => import('./monitoring/Monitoring.tsx')),
  svype: lazy(() => import('./svype/Svype.tsx')),
  'lna-bot': lazy(() => import('./lna-bot/LnaBot.tsx')),
}

/** Opacity of the hosted demo for the current frame, and which project it is. */
export function demoFade(p: number): { id: string | null; fade: number } {
  if (dive.id) {
    // Browsing: the old demo fades as the camera pulls back, the new one as it settles in.
    const swap = swapView()
    return { id: dive.value > 0.05 ? swap.id : null, fade: remap(dive.value, 0.55, 1) * swap.fade }
  }
  const f = frameAt(p)
  // Mount a little early (from the script level) so RareMind is ready when it arrives.
  const id = f.chain > 2.3 && f.chain < 3.7 ? 'raremind' : null
  return { id, fade: remap(f.t[2], 0.75, 1) * (1 - remap(f.t[3], 0, 0.25)) }
}

export function setExpanded(expanded: boolean) {
  const apply = () => flushSync(() => useDemos.setState({ expanded }))
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (document.startViewTransition && !reduce) document.startViewTransition(apply)
  else apply()
}

export function DemoHost() {
  const present = useDemos((s) => s.present)
  const expanded = useDemos((s) => s.expanded)
  const liveOn = useDemos((s) => (s.present ? !!s.live[s.present] : false))
  const [host, setHost] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!host) return
    let lastFade = -1
    return onFrame((p) => {
      const { id, fade } = demoFade(p)
      const s = useDemos.getState()
      if (id !== s.present) useDemos.setState({ present: id, expanded: id ? s.expanded : false })
      if (!id) return
      const f = s.expanded ? 1 : Math.round(fade * 100) / 100
      if (f !== lastFade) {
        lastFade = f
        host.dataset.fade = String(f)
        host.style.opacity = String(f)
        host.style.visibility = f > 0 ? 'visible' : 'hidden'
        host.inert = f < 0.5
      }
      if (s.expanded) return
      const r = projectBox(id === 'raremind' ? SCREEN : screenFor(id), view)
      host.style.transform = `translate(${r.left.toFixed(1)}px, ${r.top.toFixed(1)}px)`
      host.style.width = `${r.width.toFixed(1)}px`
      host.style.height = `${r.height.toFixed(1)}px`
      // Too small to play in place (phones): show a preview and one big button instead.
      // (Not mid-flight between projects: the window shrinks briefly, it isn't a phone.)
      if (!dive.from) host.classList.toggle('compact', r.width < 460)
    })
  }, [host])

  // Leaving the demo (zooming away) always drops full screen.
  useEffect(() => {
    if (!present && expanded) useDemos.setState({ expanded: false })
  }, [present, expanded])

  const project = projects.find((p) => p.id === present)
  const Demo = present ? DEMOS[present] : undefined
  const live = project?.live && (liveOn || !SHOW_DEMO_BUTTON) ? project.live : undefined
  const setLive = (on: boolean) => {
    if (!present) return
    useDemos.setState((s) => ({ live: { ...s.live, [present]: on } }))
    // A whole game needs the room; the window in the world is a preview size.
    if (on && !expanded) setExpanded(true)
  }
  return (
    <div
      ref={setHost}
      className={`demo-host${expanded ? ' expanded' : ''}`}
      data-fade="0"
      role="region"
      data-cursor="play"
      aria-label={project?.title}
      style={{ viewTransitionName: 'demo' }}
    >
      {host && project && (
        <>
          {live ? (
            <Suspense fallback={<p className="demo-loading">{levels.project.liveLoading}</p>}>
              <LiveFrame
                key={project.id}
                project={project}
                url={live.url}
                expanded={expanded}
                onOpen={() => setExpanded(true)}
              />
            </Suspense>
          ) : Demo ? (
            <Suspense fallback={<p className="demo-loading">{levels.project.loadingDemo}</p>}>
              <Demo host={host} expanded={expanded} />
            </Suspense>
          ) : (
            <div className="demo-poster">
              <p>{levels.project.noDemo}</p>
            </div>
          )}
          {!live && Demo && (
            <p className="demo-badge">
              {levels.project.demoShowing},&nbsp;
              <a href={project.links.code} target="_blank" rel="noreferrer">
                {levels.project.demoReal} ↗
              </a>
            </p>
          )}
          {project.live && SHOW_DEMO_BUTTON && (
            <div className="demo-views" role="group" aria-label={levels.project.viewLabel}>
              {[false, true].map((on) => (
                <button
                  key={String(on)}
                  type="button"
                  className={`btn ${!!live === on ? 'btn-primary' : 'btn-secondary'}`}
                  aria-pressed={!!live === on}
                  onClick={() => setLive(on)}
                >
                  {on ? levels.project.viewLive : levels.project.viewDemo}
                </button>
              ))}
            </div>
          )}
          {Demo && (
            <button
              type="button"
              className="btn btn-secondary demo-expand"
              aria-pressed={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? levels.project.collapse : levels.project.expand}
            </button>
          )}
        </>
      )}
    </div>
  )
}

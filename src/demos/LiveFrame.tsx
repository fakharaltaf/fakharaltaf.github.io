// The project's real, deployed site, running inside the demo window. Only mounted once the
// visitor asks for it; unmounting (back to Demo, or zooming away) drops the whole page.
import { useEffect, useLayoutEffect, useReducer, useRef } from 'react'
import { levels } from '../content/copy.ts'
import type { Project } from '../content/projects.ts'
import { holdQuality } from '../systems/quality.ts'
import { LIVE_TIMEOUT_MS, liveStep } from './live.ts'

const t = levels.project
/** The window is often wide and short: lay the game out at least this tall, then shrink to fit. */
const PREVIEW_H = 820 // in the world, a preview
const PLAY_H = 640 // full screen, where text has to stay readable

type Props = { project: Project; url: string; expanded: boolean; onOpen: () => void }

export default function LiveFrame({ project, url, expanded, onOpen }: Props) {
  const [state, send] = useReducer(liveStep, 'loading')
  const frame = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    holdQuality(4000) // a whole app booting next door isn't the 3D world being slow
    const timer = setTimeout(() => send({ type: 'timeout' }), LIVE_TIMEOUT_MS)
    // Unmounting removes the iframe, which unloads the page. Don't blank src here: React's dev
    // double-mount runs this cleanup and then keeps the same element, leaving it empty.
    return () => clearTimeout(timer)
  }, [])

  // Pointer coordinates stay right under a CSS scale, so the scaled game is still playable.
  // Scale the frame directly (no React state): the window resizes every frame while flying in.
  useLayoutEffect(() => {
    const box = frame.current?.parentElement
    if (!box) return
    const fit = () => {
      const f = frame.current
      if (!f) return
      const { width, height } = box.getBoundingClientRect()
      const s = height ? Math.min(1, height / (expanded ? PLAY_H : PREVIEW_H)) : 1
      f.style.width = s < 1 ? `${Math.round(width / s)}px` : ''
      f.style.height = s < 1 ? `${Math.round(height / s)}px` : ''
      f.style.transform = s < 1 ? `scale(${s.toFixed(4)})` : ''
    }
    const ro = new ResizeObserver(fit)
    ro.observe(box)
    fit()
    return () => ro.disconnect()
  }, [expanded])

  const onLoad = () => {
    // Same origin (production): a blocked or failed page can't be read, so check. Cross-origin
    // (local dev) gives no signal either way, so a load counts as loaded.
    let readable = new URL(url, location.href).origin !== location.origin
    try {
      readable ||= !!frame.current?.contentDocument?.body
    } catch {
      /* the browser's error page */
    }
    send({ type: 'load', readable })
  }

  return (
    <div className="live" data-state={state}>
      <div className="live-view">
        {state !== 'failed' && (
          <iframe
            ref={frame}
            src={url}
            title={t.liveTitle(project.title)}
            referrerPolicy="strict-origin-when-cross-origin"
            allow="fullscreen"
            // Same origin, so this is a seatbelt, not a wall: it mainly stops top-level navigation.
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
            onLoad={onLoad}
          />
        )}
      </div>
      {/* In the world it's a live preview: an interactive frame would swallow the zoom wheel. */}
      {!expanded && state !== 'failed' && (
        <button type="button" className="live-open" onClick={onOpen}>
          <span className="sr-only">{t.livePlay(project.title)}</span>
        </button>
      )}
      {state !== 'loaded' && (
        <p className="live-status" role="status">
          {state === 'loading' ? t.liveLoading : t.liveFailed}
        </p>
      )}
      <p className="live-bar">
        <span>{project.live?.note}</span>
        <a className="btn btn-primary" href={url} target="_blank" rel="noopener">
          {t.liveOpen} ↗
        </a>
      </p>
    </div>
  )
}

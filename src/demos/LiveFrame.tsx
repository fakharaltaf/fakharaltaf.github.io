// The project's real, deployed site, running inside the demo window. Only mounted once the
// visitor asks for it; unmounting (back to Demo, or zooming away) drops the whole page.
import { useEffect, useReducer, useRef } from 'react'
import { levels } from '../content/copy.ts'
import type { Project } from '../content/projects.ts'
import { holdQuality } from '../systems/quality.ts'
import { LIVE_TIMEOUT_MS, liveStep } from './live.ts'

const t = levels.project

export default function LiveFrame({ project, url }: { project: Project; url: string }) {
  const [state, send] = useReducer(liveStep, 'loading')
  const frame = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    holdQuality(4000) // a whole app booting next door isn't the 3D world being slow
    const timer = setTimeout(() => send({ type: 'timeout' }), LIVE_TIMEOUT_MS)
    // Unmounting removes the iframe, which unloads the page. Don't blank src here: React's dev
    // double-mount runs this cleanup and then keeps the same element, leaving it empty.
    return () => clearTimeout(timer)
  }, [])

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
      {state !== 'loaded' && (
        <p className="live-status" role="status">
          {state === 'loading' ? t.liveLoading : t.liveFailed}
        </p>
      )}
      <p className="live-bar">
        <span>{t.liveCarry}</span>
        <a className="btn btn-primary" href={url} target="_blank" rel="noopener">
          {t.liveOpen} ↗
        </a>
      </p>
    </div>
  )
}

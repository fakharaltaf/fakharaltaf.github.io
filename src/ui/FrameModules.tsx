// The labels inside a project frame's boxes, as real text laid over the particle outlines. They
// track the boxes in the world every frame and fade with the demo, like DemoHost.
import { useEffect, useRef } from 'react'
import { projects } from '../content/projects.ts'
import { levels } from '../content/copy.ts'
import { demoFade } from '../demos/DemoHost.tsx'
import { useDemos } from '../demos/store.ts'
import { type Box, MODULE_UV, SCRIPT_BOX, frameBox, frameFor, projectBox } from '../world/layout.ts'
import { onFrame, view } from '../world/zoom.ts'

const SCRIPT_SLOT: Box = { ...SCRIPT_BOX, w: SCRIPT_BOX.w * 1.3, h: SCRIPT_BOX.h * 1.8 }

export function FrameModules() {
  const root = useRef<HTMLDivElement>(null)
  const present = useDemos((s) => s.present)
  const project = projects.find((p) => p.id === present)

  useEffect(() => {
    const el = root.current
    if (!el || !project) return
    const boxes = [...el.children] as HTMLElement[]
    return onFrame((p) => {
      const { id, fade } = demoFade(p)
      const shown = id === project.id && !useDemos.getState().expanded ? fade : 0
      el.style.opacity = String(Math.round(shown * 100) / 100)
      el.style.visibility = shown > 0 ? 'visible' : 'hidden'
      if (!shown) return
      const frame = frameFor(project.id)
      // One text size for every box, from the frame's size on screen; too small to read: hidden.
      const size = projectBox(frame, view).width / 55
      el.style.fontSize = `${size.toFixed(2)}px`
      el.hidden = size < 8
      const all = [...MODULE_UV.map((uv) => frameBox(...uv, frame)), SCRIPT_SLOT]
      boxes.forEach((b, i) => {
        const r = projectBox(all[i]!, view)
        b.style.transform = `translate(${r.left.toFixed(1)}px, ${r.top.toFixed(1)}px)`
        b.style.width = `${r.width.toFixed(1)}px`
        b.style.height = `${r.height.toFixed(1)}px`
      })
    })
  }, [project])

  if (!project) return null
  return (
    <div ref={root} className="frame-modules" aria-hidden="true">
      {project.modules.map(([part, tech, what]) => (
        <div key={part} className="frame-module">
          <p className="fm-part">{part}</p>
          {tech && <p className="fm-tech">{tech}</p>}
          <p className="fm-what">{what}</p>
        </div>
      ))}
      <div className="frame-module fm-script">
        {project.id === 'raremind' && <p className="fm-part">scripts/{levels.script.file}</p>}
      </div>
    </div>
  )
}

// The labels inside a project frame's boxes, as real text laid over the particle outlines. They
// track the boxes in the world every frame and fade with the demo, like DemoHost.
import { useEffect, useRef } from 'react'
import { projects } from '../content/projects.ts'
import { levels } from '../content/copy.ts'
import { demoFade } from '../demos/DemoHost.tsx'
import { useDemos } from '../demos/store.ts'
import {
  type Box,
  FRAME,
  MODULE_UV,
  SCRIPT_BOX,
  frameBox,
  frameFor,
  projectBox,
} from '../world/layout.ts'
import { BROWSE } from '../world/browse-version.ts'
import { dive, onFrame, view } from '../world/zoom.ts'

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
      // Only where there's a particle frame to sit in: RareMind's level (any frame, with ?browse=c).
      const framed = BROWSE === 'c' || (project.id === 'raremind' && !dive.id)
      const shown = framed && id === project.id && !useDemos.getState().expanded ? fade : 0
      el.style.opacity = String(Math.round(shown * 100) / 100)
      el.style.visibility = shown > 0 ? 'visible' : 'hidden'
      if (!shown) return
      const frame = frameFor(project.id)
      // One text size for every box, from the frame's size on screen; too small to read: hidden.
      const size = projectBox(frame, view).width / 55
      el.style.fontSize = `${size.toFixed(2)}px`
      el.hidden = size < 8
      const all = [
        ...MODULE_UV.map((uv) => frameBox(...uv, frame)),
        {
          ...SCRIPT_SLOT, // sits in RareMind's frame: move it to this one
          x: SCRIPT_SLOT.x + frame.x - FRAME.x,
          y: SCRIPT_SLOT.y + frame.y - FRAME.y,
        },
      ]
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
        <p className="fm-part">
          {project.script ? project.script.file : `scripts/${levels.script.file}`}
        </p>
        {/* RareMind's script box holds the tidy.ts particles; the others show their own file. */}
        {project.script && <pre className="fm-code">{project.script.code.join('\n')}</pre>}
      </div>
    </div>
  )
}

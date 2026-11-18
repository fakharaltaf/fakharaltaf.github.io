// The one 3D world. WebGPU first (three's WebGPURenderer falls back to WebGL2 on its own).
// The camera stays near the origin; the universe is scaled and shifted around it instead, so
// float precision holds across the ~10^5x zoom range.
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  CanvasTexture,
  Color,
  type Group,
  Mesh,
  MeshBasicNodeMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  WebGPURenderer,
} from 'three/webgpu'
import { brand, palette } from '../styles/tokens.ts'
import { type Drawn, type Region, filesCanvas, lineCanvas, scriptCanvas } from './canvases.ts'
import { CARET_H, CARET_W, cameraAt, caretX, restCams } from './layout.ts'
import { pointerNdc } from './input.ts'
import { levelAt } from './levels.ts'
import { Particles, makeUniforms } from './Particles.tsx'
import { SHAPE_SIZE } from './shapes.ts'
import { useWorld } from './store.ts'
import { frameAt } from './timeline.ts'
import { emitFrame, tick, zoom } from './zoom.ts'

const CAM_Z = 10
const FOV = 50
const VIEW_H = 2 * CAM_Z * Math.tan(((FOV / 2) * Math.PI) / 180)

function plane(region: Region, tex: CanvasTexture | null, color?: string) {
  const m = new MeshBasicNodeMaterial({ transparent: true, depthWrite: false })
  if (tex) {
    tex.colorSpace = SRGBColorSpace
    tex.anisotropy = 4
    m.map = tex
  }
  if (color) m.color = new Color(color)
  const mesh = new Mesh(new PlaneGeometry(region.w, region.h), m)
  mesh.position.set(region.left + region.w / 2, region.top - region.h / 2, 0)
  return mesh
}

const texOf = (d: Pick<Drawn, 'canvas'>) => new CanvasTexture(d.canvas)

function Scene({ particleCount }: { particleCount: number }) {
  const root = useRef<Group>(null)
  const { size, camera } = useThree()
  const pointer = pointerNdc
  const portrait = size.width < size.height
  const u = useMemo(() => makeUniforms(), [])

  const rest = useMemo(
    () =>
      restCams({
        aspect: size.width / size.height,
        vh: size.height,
        caretPx: Math.min(260, Math.max(120, size.width * 0.22)),
      }),
    [size.width, size.height],
  )

  const parts = useMemo(() => {
    const line = lineCanvas()
    const script = scriptCanvas()
    const files = filesCanvas()
    const lineTex = texOf(line)
    const filesTex = texOf(files)
    return {
      line,
      files,
      lineTex,
      filesTex,
      lineMesh: plane(line.region, lineTex),
      scriptMesh: plane(script.region, texOf(script)),
      filesMesh: plane(files.region, filesTex),
      caret: plane({ left: 0, top: CARET_H / 2, w: CARET_W, h: CARET_H }, null, brand.anchor),
    }
  }, [])

  useEffect(
    () => () => {
      for (const m of [parts.lineMesh, parts.scriptMesh, parts.filesMesh, parts.caret]) {
        m.geometry.dispose()
        m.material.map?.dispose()
        m.material.dispose()
      }
    },
    [parts],
  )

  const lastLevel = useRef(useWorld.getState().level)
  const orbit = useRef({ yaw: 0, pitch: 0 })
  const lastFade = useRef(1)
  const typed = useRef(-1)

  useFrame((state, dt) => {
    tick(dt)
    const p = zoom.value
    const f = frameAt(p)
    const cam = cameraAt(p, rest)
    const s = VIEW_H / cam.height
    const g = root.current
    if (!g) return
    g.scale.setScalar(s)
    g.position.set(-cam.focus[0] * s, -cam.focus[1] * s, 0)

    // Gentle parallax from the pointer; stronger where the world is actually 3D.
    const rm = zoom.discrete
    const depth = rm ? 0 : 0.05 + 0.3 * Math.min(1, Math.max(0, f.chain - 3))
    const o = orbit.current
    o.yaw += (pointer.x * depth - o.yaw) * Math.min(1, dt * 3)
    o.pitch += (pointer.y * depth * 0.5 - o.pitch) * Math.min(1, dt * 3)
    camera.position.set(
      Math.sin(o.yaw) * CAM_Z,
      Math.sin(o.pitch) * CAM_Z,
      Math.cos(o.yaw) * Math.cos(o.pitch) * CAM_Z,
    )
    camera.lookAt(0, 0, 0)

    // Level 0–1: the caret types the line.
    const { line, lineTex, lineMesh, scriptMesh, filesMesh, caret } = parts
    if (f.typed !== typed.current) {
      line.draw(f.typed)
      lineTex.needsUpdate = true
      typed.current = f.typed
    }
    const blinkOn = f.typing || state.clock.elapsedTime % 1.06 < 0.53
    caret.position.x = caretX(f.typed) + CARET_W / 2 + 0.03
    caret.material.opacity = f.caret * (blinkOn ? 1 : 0)
    caret.visible = f.caret > 0
    lineMesh.material.opacity = f.line
    lineMesh.visible = f.line > 0 && f.typed > 0
    scriptMesh.material.opacity = f.script
    scriptMesh.visible = f.script > 0
    filesMesh.material.opacity = f.files
    filesMesh.visible = f.files > 0
    if (filesMesh.visible && parts.files.draw(state.clock.elapsedTime))
      parts.filesTex.needsUpdate = true

    // Particles.
    const unitsPerPx = cam.height / size.height
    u.opacity.value = f.particles
    u.from.forEach((w, k) => (w.value = k === f.seg ? 1 : 0))
    u.to.forEach((w, k) => (w.value = k === f.seg + 1 ? 1 : 0))
    u.t.value = f.segT
    u.scatter.value = rm ? 0 : Math.sin(Math.PI * f.segT) * SHAPE_SIZE[f.seg + 1]! * 0.05
    u.shimmer.value = rm ? 0 : unitsPerPx * 1.5
    u.radius.value = rm || !pointer.active ? 0 : unitsPerPx * 70
    u.pointer.value.set(
      cam.focus[0] + pointer.x * cam.height * (size.width / size.height) * 0.5,
      cam.focus[1] + pointer.y * cam.height * 0.5,
      0,
    )

    const level = levelAt(p)
    if (level !== lastLevel.current) {
      lastLevel.current = level
      useWorld.setState({ level })
    }
    if (zoom.fade !== lastFade.current) {
      lastFade.current = zoom.fade
      document.documentElement.style.setProperty('--world-fade', zoom.fade.toFixed(3))
    }
    emitFrame(p)
  }, -1)

  return (
    <group ref={root}>
      <primitive object={parts.scriptMesh} />
      <primitive object={parts.filesMesh} />
      <primitive object={parts.lineMesh} />
      <primitive object={parts.caret} />
      <Particles count={particleCount} portrait={portrait} u={u} />
    </group>
  )
}

// Dev-only handle for scrubbing the timeline from the console and from screenshot scripts.
if (import.meta.env.DEV) Object.assign(window, { __zoom: zoom })

export default function World() {
  const mobile = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
  // shortcut: fixed counts per device class; the adaptive quality manager replaces this in stage 8.
  const particleCount = mobile ? 18000 : 42000

  return (
    <Canvas
      className="world"
      flat
      dpr={[1, mobile ? 1.5 : 2]}
      camera={{ fov: FOV, near: 0.01, far: 100, position: [0, 0, CAM_Z] }}
      gl={async ({ canvas }) => {
        const forceWebGL = new URLSearchParams(location.search).has('webgl')
        const r = new WebGPURenderer({
          canvas: canvas as HTMLCanvasElement,
          antialias: true,
          forceWebGL,
        })
        await r.init()
        return r
      }}
      onCreated={({ gl, scene }) => {
        scene.background = new Color(palette.dark.canvas)
        const backend = (gl as unknown as WebGPURenderer).backend as { isWebGPUBackend?: boolean }
        const isGPU = backend.isWebGPUBackend === true
        useWorld.setState({ backend: isGPU ? 'webgpu' : 'webgl2' })
        // Hand off from the CSS boot caret on the next frame, once the 3D caret is on screen.
        requestAnimationFrame(() => useWorld.setState({ ready: true }))
      }}
    >
      <Scene particleCount={particleCount} />
    </Canvas>
  )
}

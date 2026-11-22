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
  Vector3,
  type Vector4,
  WebGPURenderer,
} from 'three/webgpu'
import { brand, palette } from '../styles/tokens.ts'
import { type Drawn, type Region, filesCanvas } from './canvases.ts'
import {
  CARET_H,
  CARET_W,
  LINE_W,
  LINE_X0,
  STARS,
  blendCam,
  cameraAt,
  caretX,
  fit,
  restCams,
  screenFor,
} from './layout.ts'
import { pointerNdc } from './input.ts'
import { levelAt, remap } from './levels.ts'
import { Particles, REPEL_PX, makeUniforms } from './Particles.tsx'
import { Dust, makeDustUniforms } from './Dust.tsx'
import { SHAPE_SIZE } from './shapes.ts'
import { useWorld } from './store.ts'
import { frameAt } from './timeline.ts'
import { MAX_LETTERS, grab, letterXforms, letters, starOffsets } from './physicsState.ts'
import { Render } from './Render.tsx'
import { TIERS, decideTier, qualityHeld, useQuality } from '../systems/quality.ts'
import { stats } from '../systems/stats.ts'
import { dive, emitFrame, land, swapLift, swapView, tick, view, zoom } from './zoom.ts'
import { BROWSE } from './browse-version.ts'

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
const tmp = new Vector3()

function Scene({ particleCount }: { particleCount: number }) {
  const root = useRef<Group>(null)
  const { size, camera } = useThree()
  const pointer = pointerNdc
  const portrait = size.width < size.height
  const u = useMemo(() => makeUniforms(), [])
  const d = useMemo(() => makeDustUniforms(), [])

  const viewInfo = useMemo(
    () => ({
      aspect: size.width / size.height,
      vw: size.width,
      vh: size.height,
      caretPx: Math.min(260, Math.max(120, size.width * 0.22)),
    }),
    [size.width, size.height],
  )
  const rest = useMemo(() => restCams(viewInfo), [viewInfo])

  const parts = useMemo(() => {
    const files = filesCanvas()
    const filesTex = texOf(files)
    return {
      files,
      filesTex,
      filesMesh: plane(files.region, filesTex),
      caret: plane({ left: 0, top: CARET_H / 2, w: CARET_W, h: CARET_H }, null, brand.anchor),
    }
  }, [])

  useEffect(
    () => () => {
      for (const m of [parts.filesMesh, parts.caret]) {
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

  useFrame((state, dt) => {
    tick(dt)
    const p = zoom.value
    const f = frameAt(p)
    let cam = cameraAt(p, rest)
    if (dive.id && dive.value > 0) {
      // RareMind's "inside" is its own level's view, so browsing there and zooming in match.
      const insideOf = (id: string) =>
        id === 'raremind' ? rest.project : fit(screenFor(id), viewInfo, true, 1.06)
      let inside = insideOf(dive.id)
      if (dive.from) {
        // Browsing: pull back until both projects are in view, travel, settle in on the new one.
        const a = insideOf(dive.from)
        const t = dive.swap
        const e = t * t * t * (t * (6 * t - 15) + 10) // most of the travel happens mid-flight
        // Mid-flight the view is wide enough to hold both stars, with room around them.
        const dx = Math.abs(inside.focus[0] - a.focus[0])
        const dy = Math.abs(inside.focus[1] - a.focus[1])
        const base = Math.sqrt(a.height * inside.height)
        const lift = Math.max(2, (1.6 * Math.max(dx / viewInfo.aspect, dy)) / base)
        const logH =
          Math.log(a.height) +
          (Math.log(inside.height) - Math.log(a.height)) * e +
          Math.log(lift) * Math.sin(Math.PI * t)
        inside = {
          focus: [
            a.focus[0] + (inside.focus[0] - a.focus[0]) * e,
            a.focus[1] + (inside.focus[1] - a.focus[1]) * e,
          ],
          height: Math.exp(logH),
        }
      }
      cam = blendCam(cam, inside, dive.value)
    }
    if (land.active) cam = rest.project
    const s = VIEW_H / cam.height
    view.focus = cam.focus
    view.height = cam.height
    view.vw = size.width
    view.vh = size.height
    view.scale = s
    const g = root.current
    if (!g) return
    // Inside a project the galaxy goes flat: zoomed right in, a star's depth would throw it far
    // from its window (the window is placed on the z = 0 plane). Out at the galaxy it's 3D.
    // (Also flat up to the project level, whose particles now include RareMind's threads.)
    const depthScale = s * (1 - dive.value) * Math.min(1, Math.max(0, f.chain - 3))
    g.scale.set(s, s, depthScale)
    g.position.set(-cam.focus[0] * s, -cam.focus[1] * s, 0)

    // Parallax from the pointer, only where the world is actually 3D. Flat levels stay exact so
    // DOM overlays (demos, labels) line up with the world to the pixel.
    const rm = zoom.discrete
    const depth = rm ? 0 : 0.3 * Math.min(1, Math.max(0, f.chain - 3.3)) * (1 - dive.value)
    const o = orbit.current
    o.yaw += (pointer.x * depth - o.yaw) * Math.min(1, dt * 3)
    o.pitch += (pointer.y * depth * 0.5 - o.pitch) * Math.min(1, dt * 3)
    camera.position.set(
      Math.sin(o.yaw) * CAM_Z,
      Math.sin(o.pitch) * CAM_Z,
      Math.cos(o.yaw) * Math.cos(o.pitch) * CAM_Z,
    )
    camera.lookAt(0, 0, 0)

    // Level 0–1: the caret types the line (the line itself is particles).
    const { filesMesh, caret } = parts
    const blinkOn = f.typing || state.clock.elapsedTime % 1.06 < 0.53
    caret.position.x = caretX(f.typed) + CARET_W / 2 + 0.03
    caret.material.opacity = f.caret * (blinkOn ? 1 : 0)
    caret.visible = f.caret > 0
    filesMesh.material.opacity = f.files
    filesMesh.visible = f.files > 0
    if (filesMesh.visible && parts.files.draw(state.clock.elapsedTime))
      parts.filesTex.needsUpdate = true

    // Particles.
    const unitsPerPx = cam.height / size.height
    u.opacity.value = f.particles * (1 - 0.6 * dive.value * (1 - swapLift()))
    for (let i = 0; i < u.stars.array.length; i++)
      (u.stars.array[i] as Vector4).set(
        starOffsets[i * 3]!,
        starOffsets[i * 3 + 1]!,
        starOffsets[i * 3 + 2]!,
        0,
      )
    for (let i = 0; i < letters.boxes.length && i < MAX_LETTERS; i++)
      (u.letterXf.array[i] as Vector4).set(
        letterXforms[i * 4]!,
        letterXforms[i * 4 + 1]!,
        letterXforms[i * 4 + 2]!,
        0,
      )
    u.from.forEach((w, k) => (w.value = k === f.seg ? 1 : 0))
    u.to.forEach((w, k) => (w.value = k === f.seg + 1 ? 1 : 0))
    u.t.value = f.segT
    // A slight drift mid-flight, not a cloud: each particle visibly travels to its new place.
    u.scatter.value = rm ? 0 : Math.sin(Math.PI * f.segT) * SHAPE_SIZE[f.seg + 1]! * 0.012
    u.shimmer.value = rm ? 0 : unitsPerPx * 1.5
    // Where the caret is, continuously (not per character), so the flight is smooth.
    u.sweepX.value = LINE_X0 + (LINE_W + 1) * remap(f.t[0], 0.05, 0.85)
    // Version c: the project you're in (or flying to) assembles its frame from its star.
    if (BROWSE === 'c') {
      const sv = swapView()
      const k = STARS.findIndex((st) => st.id === sv.id)
      u.frameStar.value = sv.id && sv.id !== 'raremind' && !land.active ? k : -1
      u.frameW.value = dive.value * sv.fade
    }
    u.radius.value = rm || !pointer.active || grab.active ? 0 : unitsPerPx * REPEL_PX
    u.pointer.value.set(pointer.x, pointer.y, 0) // compared on screen, in the shader
    u.halfPx.value.set(size.width / 2, size.height / 2, 0)
    // Dust: screen-filling before the universe forms, gone once the real particles take over.
    const planePerPx = VIEW_H / size.height
    // The particles themselves are the opening background; the dust only returns at the end.
    d.opacity.value = remap(f.t[5], 0.85, 1) * (1 - dive.value)
    d.flow.value = p * 5
    d.half.value.set((VIEW_H / 2) * (size.width / size.height), VIEW_H / 2, 0)
    d.push.value = rm || !pointer.active || grab.active ? 0 : planePerPx * REPEL_PX
    d.wander.value = rm ? 0 : planePerPx * 3

    const level = levelAt(p)
    if (level !== lastLevel.current) {
      lastLevel.current = level
      useWorld.setState({ level })
    }
    g.updateMatrixWorld()
    camera.updateMatrixWorld()
    view.project = (x, y, z = 0) => {
      tmp.set(x, y, z).applyMatrix4(g.matrixWorld).project(camera)
      return [((tmp.x + 1) / 2) * size.width, ((1 - tmp.y) / 2) * size.height]
    }
    view.unproject = (px, py, z = 0) => {
      tmp.set((px / size.width) * 2 - 1, -(py / size.height) * 2 + 1, 0.5).unproject(camera)
      const dir = tmp.sub(camera.position).normalize()
      const planeZ = z * depthScale // the root only scales (and flattens) and translates in x/y
      const k = (planeZ - camera.position.z) / dir.z
      const wx = camera.position.x + dir.x * k
      const wy = camera.position.y + dir.y * k
      return [(wx - g.position.x) / s, (wy - g.position.y) / s]
    }
    if (zoom.fade !== lastFade.current) {
      lastFade.current = zoom.fade
      document.documentElement.style.setProperty('--world-fade', zoom.fade.toFixed(3))
    }
    emitFrame(p)
  }, -1)

  return (
    <>
      {/* Outside the universe root: dust is pinned to the screen, not to any level. */}
      <Dust count={Math.round(particleCount * 0.1)} u={u} d={d} />
      <group ref={root}>
        <primitive object={parts.filesMesh} />
        <primitive object={parts.caret} />
        <Particles count={particleCount} portrait={portrait} u={u} />
      </group>
    </>
  )
}

// Dev-only handle for scrubbing the timeline from the console and from screenshot scripts.
if (import.meta.env.DEV) Object.assign(window, { __zoom: zoom })

/** Measures real frame times and moves the quality tier (auto mode only, at most twice). */
function QualityGovernor() {
  const frames = useRef<number[]>([])
  const started = useRef(0)
  const windowStart = useRef(0)
  const changes = useRef(0)
  useFrame((_, dt) => {
    const now = performance.now()
    if (!started.current) started.current = now
    // Skip the first second (shader compiles, font loads), then judge 3-second windows.
    if (now - started.current < 1000 || document.hidden) return
    if (qualityHeld()) {
      frames.current = []
      windowStart.current = 0
      return
    }
    frames.current.push(dt * 1000)
    // Judge every 3 seconds of real time (not N frames: a slow device would wait forever).
    if (!windowStart.current) windowStart.current = now
    if (now - windowStart.current < 3000) return
    windowStart.current = now
    const { mode, tier } = useQuality.getState()
    const next = decideTier(frames.current, tier)
    frames.current = []
    if (mode !== 'auto' || changes.current >= 2 || next === tier) return
    // After the first adjustment, only ever step down: rebuilding particles is a visible hitch.
    if (changes.current > 0 && next > tier) return
    changes.current++
    useQuality.setState({ tier: next })
  })
  return null
}

/** WebGPU only when there's a real hardware adapter; software fallbacks render better as WebGL2. */
async function webgpuUnsuitable(): Promise<boolean> {
  if (new URLSearchParams(location.search).has('webgl')) return true
  try {
    const adapter = await navigator.gpu?.requestAdapter()
    if (!adapter) return true
    const a = adapter as GPUAdapter & {
      isFallbackAdapter?: boolean
      info?: { isFallbackAdapter?: boolean }
    }
    return a.isFallbackAdapter === true || a.info?.isFallbackAdapter === true
  } catch {
    return true
  }
}

export default function World() {
  const gpuFailed = useWorld((s) => s.gpuFailed)
  const tier = useQuality((s) => s.tier)
  const particleCount = TIERS[tier].particles
  stats.particles = particleCount

  return (
    <Canvas
      className="world"
      flat
      dpr={[1, TIERS[tier].dpr]}
      camera={{ fov: FOV, near: 0.01, far: 100, position: [0, 0, CAM_Z] }}
      key={gpuFailed ? 'webgl2' : 'auto'}
      gl={async ({ canvas }) => {
        const forceWebGL = gpuFailed || (await webgpuUnsuitable())
        const r = new WebGPURenderer({
          canvas: canvas as HTMLCanvasElement,
          antialias: true,
          forceWebGL,
        })
        await r.init()
        // A GPU that fails mid-visit (lost device, uncaught errors) hands over to WebGL2.
        const device = (r.backend as { device?: GPUDevice }).device
        if (device) {
          const fallBack = () => useWorld.setState({ gpuFailed: true, ready: false })
          void device.lost.then((info) => info.reason !== 'destroyed' && fallBack())
          device.addEventListener('uncapturederror', fallBack, { once: true })
        }
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
      <Render />
      <QualityGovernor />
    </Canvas>
  )
}

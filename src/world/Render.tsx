// Takes over R3F's render step: the world first, then every live demo view, scissored into
// its DOM element's rectangle.
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type {
  Material,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Sprite,
  WebGPURenderer,
} from 'three/webgpu'
import { pushFrame, stats } from '../systems/stats.ts'
import { views } from './views.ts'

export function Render() {
  const wire = useRef(false)
  useFrame(({ gl, scene, camera, size }, dt) => {
    const r = gl as unknown as WebGPURenderer
    // One frame = world + every demo view, so the counters reset once per frame, by hand.
    r.info.autoReset = false
    r.info.reset()
    pushFrame(dt * 1000)
    if (stats.wireframe !== wire.current) {
      wire.current = stats.wireframe
      const set = (o: Object3D) => {
        const m = (o as Mesh).material as Material | undefined
        if (m && 'wireframe' in m && !(o as Sprite).isSprite)
          (m as MeshBasicMaterial).wireframe = stats.wireframe
      }
      scene.traverse(set)
      for (const v of views) v.scene.traverse(set)
    }
    r.autoClear = true
    r.render(scene, camera)
    if (!views.size) return
    r.autoClear = false
    for (const v of views) {
      const fade = Number(v.el.dataset.fade ?? 0)
      if (fade <= 0) continue
      const b = v.el.getBoundingClientRect()
      if (b.width < 2 || b.height < 2 || b.bottom < 0 || b.top > size.height) continue
      v.update?.(dt, b.width, b.height)
      if (v.cover) {
        v.cover.material.opacity = 1 - fade
        v.cover.visible = fade < 1
      }
      // WebGPURenderer's viewport/scissor origin is top-left on both backends (it flips for GL).
      r.setViewport(b.left, b.top, b.width, b.height)
      r.setScissor(b.left, b.top, b.width, b.height)
      r.setScissorTest(true)
      r.clearDepth()
      r.render(v.scene, v.camera)
    }
    r.setScissorTest(false)
    r.setViewport(0, 0, size.width, size.height)
    r.autoClear = true
    stats.drawCalls = r.info.render.drawCalls
    stats.triangles = r.info.render.triangles
  }, 1)
  return null
}

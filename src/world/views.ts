// 3D demos render into the rectangle of a DOM element, on the same canvas, in the same frame
// as the world (scissored viewports). One renderer, one loop; the DOM decides where.
import {
  type Camera,
  Color,
  Mesh,
  MeshBasicNodeMaterial,
  type Object3D,
  PlaneGeometry,
  type Scene,
} from 'three/webgpu'
import { palette } from '../styles/tokens.ts'

export type DemoView = {
  el: HTMLElement
  scene: Scene
  camera: Camera
  /** Called right before rendering, with the element's size in CSS px. */
  update?: (dt: number, width: number, height: number) => void
  /** Set by the renderer from el.dataset.fade, so a demo can fade with its DOM overlay. */
  cover?: Mesh<PlaneGeometry, MeshBasicNodeMaterial>
}

export const views = new Set<DemoView>()

export function addView(v: DemoView) {
  // A canvas-coloured sheet in front of the camera: scissored 3D can't use CSS opacity.
  const cover = new Mesh(
    new PlaneGeometry(1000, 1000),
    new MeshBasicNodeMaterial({
      color: new Color(palette.dark.canvas),
      transparent: true,
      depthTest: false,
    }),
  )
  cover.renderOrder = 1e6
  cover.position.z = -0.5
  cover.frustumCulled = false
  ;(v.camera as Object3D).add(cover)
  if (!v.camera.parent) v.scene.add(v.camera)
  v.cover = cover
  views.add(v)
  return () => {
    views.delete(v)
    ;(v.camera as Object3D).remove(cover)
    cover.geometry.dispose()
    cover.material.dispose()
  }
}

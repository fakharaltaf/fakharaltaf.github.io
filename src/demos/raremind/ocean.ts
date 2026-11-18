// The ocean column: a research submarine that dives deeper with every rare answer.
// Light and colour fall away with depth; bubbles stream off the hull while it descends.
import {
  BoxGeometry,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  InstancedMesh,
  Mesh,
  MeshBasicNodeMaterial,
  MeshLambertNodeMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  AdditiveBlending,
} from 'three/webgpu'
import { brand, palette } from '../../styles/tokens.ts'
import { mulberry32 } from '../../systems/random.ts'

const M_PER_UNIT = 20
const STOPS: [number, string][] = [
  [0, '#1f6f60'],
  [200, '#134a40'],
  [1000, '#0a2a24'],
  [4000, '#05140f'],
  [11000, '#020706'],
]

/** Water colour at a depth: interpolated on a log scale, because light dies fast then slowly. */
export function waterColor(depth: number, out = new Color()) {
  const d = Math.max(0, depth)
  for (let i = 1; i < STOPS.length; i++) {
    const [d1, c1] = STOPS[i]!
    if (d <= d1 || i === STOPS.length - 1) {
      const [d0, c0] = STOPS[i - 1]!
      const t = Math.min(1, (Math.log1p(d) - Math.log1p(d0)) / (Math.log1p(d1) - Math.log1p(d0)))
      return out.set(c0).lerp(new Color(c1), t)
    }
  }
  return out.set(STOPS[0]![1])
}

export function createOcean(getDepth: () => number, reduced: () => boolean) {
  const scene = new Scene()
  const camera = new PerspectiveCamera(38, 2, 0.1, 200)
  const rnd = mulberry32(11)

  const water = new MeshBasicNodeMaterial({ color: new Color(STOPS[0]![1]) })
  const back = new Mesh(new PlaneGeometry(400, 400), water)
  back.position.z = -30
  camera.add(back) // the water always fills the view
  scene.add(camera)

  const hemi = new HemisphereLight('#bfe8dc', '#03100c', 1.6)
  const sun = new DirectionalLight('#ffffff', 1.4)
  sun.position.set(2, 6, 4)
  scene.add(hemi, sun)

  // The submarine, from primitives. Coral: it's the one thing on screen doing something.
  const sub = new Group()
  const hullMat = new MeshLambertNodeMaterial({ color: new Color(brand.action) })
  const darkMat = new MeshLambertNodeMaterial({ color: new Color('#3b2016') })
  const hull = new Mesh(new CapsuleGeometry(0.42, 1.6, 6, 16), hullMat)
  hull.rotation.z = Math.PI / 2
  const tower = new Mesh(new BoxGeometry(0.5, 0.42, 0.32), hullMat)
  tower.position.set(0.15, 0.5, 0)
  const fin = new Mesh(new BoxGeometry(0.08, 0.7, 0.08), darkMat)
  fin.position.set(-1.25, 0, 0)
  const prop = new Group()
  for (let i = 0; i < 3; i++) {
    const blade = new Mesh(new BoxGeometry(0.04, 0.45, 0.12), darkMat)
    blade.rotation.x = (i * Math.PI * 2) / 3
    prop.add(blade)
  }
  prop.position.set(-1.4, 0, 0)
  const portMat = new MeshBasicNodeMaterial({ color: new Color(palette.dark.ink) })
  for (const x of [-0.35, 0.1, 0.55]) {
    const port = new Mesh(new SphereGeometry(0.09, 10, 8), portMat)
    port.position.set(x, 0.05, 0.4)
    sub.add(port)
  }
  // Headlight: matters more the deeper it goes.
  const beamMat = new MeshBasicNodeMaterial({
    color: new Color('#d9fff3'),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const beam = new Mesh(new ConeGeometry(1.6, 5, 24, 1, true), beamMat)
  beam.rotation.z = Math.PI / 2
  beam.position.set(3.4, -0.2, 0)
  sub.add(hull, tower, fin, prop, beam)
  scene.add(sub)

  // Bubbles off the hull, marine snow drifting past. CPU-updated instances: there are few.
  const dummy = new Object3D()
  const bubbleMat = new MeshBasicNodeMaterial({
    color: new Color('#cfeee5'),
    transparent: true,
    opacity: 0.55,
  })
  const BUBBLES = 70
  const bubbles = new InstancedMesh(new SphereGeometry(0.05, 6, 4), bubbleMat, BUBBLES)
  const bub = Array.from({ length: BUBBLES }, () => ({ x: 0, y: -1e3, z: 0, v: 0, life: 0 }))
  const snowMat = new MeshBasicNodeMaterial({
    color: new Color('#9fc9bc'),
    transparent: true,
    opacity: 0.35,
  })
  const SNOW = 160
  const snow = new InstancedMesh(new SphereGeometry(0.025, 4, 3), snowMat, SNOW)
  const fl = Array.from({ length: SNOW }, () => ({
    x: (rnd() - 0.5) * 22,
    y: (rnd() - 0.5) * 14,
    z: (rnd() - 0.5) * 8,
  }))
  // Depth ruler: a tick every 50 m, recycled around the camera.
  const tickMat = new MeshBasicNodeMaterial({
    color: new Color(palette.dark.ink),
    transparent: true,
    opacity: 0.12,
  })
  const TICKS = 14
  const ticks = new InstancedMesh(new PlaneGeometry(1, 0.012), tickMat, TICKS)
  scene.add(bubbles, snow, ticks)

  let shown = getDepth() // displayed depth springs toward the real one
  let vel = 0
  let time = 0
  let spawnAcc = 0
  const tint = new Color()

  function update(dt: number, w: number, h: number) {
    const t = Math.min(dt, 0.05)
    time += t
    camera.aspect = w / h
    camera.updateProjectionMatrix()

    const target = getDepth()
    if (reduced()) {
      shown = target
      vel = 0
    } else {
      const a = 4 * (target - shown) - 3.2 * vel
      vel += a * t
      shown += vel * t
    }
    const y = -shown / M_PER_UNIT
    const descending = Math.max(0, vel / M_PER_UNIT)

    sub.position.set(0, y + Math.sin(time * 1.3) * 0.06, 0)
    sub.rotation.z = -Math.min(0.5, descending * 0.12) + Math.sin(time * 0.9) * 0.02
    sub.rotation.y = -0.35
    prop.rotation.x += t * (4 + descending * 6)
    // Tall screens pull back so the whole hull fits across.
    camera.position.set(0.6, y + 0.5, 8.5 * Math.max(1, 0.95 / camera.aspect))
    camera.lookAt(0.6, y, 0)

    const deep = Math.min(1, Math.log1p(shown) / Math.log1p(4000))
    water.color.copy(waterColor(shown, tint))
    hemi.intensity = 1.6 * (1 - deep * 0.85)
    sun.intensity = 1.4 * (1 - deep)
    beamMat.opacity = 0.05 + deep * 0.13

    spawnAcc += t * (2 + descending * 30)
    for (const b of bub) {
      if (b.life <= 0 && spawnAcc >= 1) {
        spawnAcc -= 1
        Object.assign(b, {
          x: -1.3 + rnd() * 0.3,
          y: sub.position.y + (rnd() - 0.5) * 0.3,
          z: (rnd() - 0.5) * 0.4,
          v: 0.6 + rnd() * 0.8,
          life: 3,
        })
      }
      if (b.life > 0) {
        b.life -= t
        b.y += b.v * t
        b.x += Math.sin(time * 3 + b.v * 10) * 0.004
      }
    }
    bub.forEach((b, i) => {
      dummy.position.set(b.x, b.life > 0 ? b.y : -1e4, b.z)
      dummy.scale.setScalar(0.6 + (3 - b.life) * 0.3)
      dummy.updateMatrix()
      bubbles.setMatrixAt(i, dummy.matrix)
    })
    bubbles.instanceMatrix.needsUpdate = true
    fl.forEach((f, i) => {
      // Wrap snow around the camera so the column feels endless.
      const wy = ((((f.y - y + time * 0.05) % 14) + 21) % 14) - 7
      dummy.position.set(f.x, y + wy, f.z)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      snow.setMatrixAt(i, dummy.matrix)
    })
    snow.instanceMatrix.needsUpdate = true
    const step = 50 / M_PER_UNIT
    const base = Math.floor(y / step) * step
    for (let i = 0; i < TICKS; i++) {
      dummy.position.set(4.2, base + (i - TICKS / 2) * step, -1)
      dummy.scale.set(i % 2 ? 0.5 : 1.1, 1, 1)
      dummy.updateMatrix()
      ticks.setMatrixAt(i, dummy.matrix)
    }
    ticks.instanceMatrix.needsUpdate = true
  }

  function dispose() {
    scene.traverse((o) => {
      if (o instanceof Mesh || o instanceof InstancedMesh) {
        o.geometry.dispose()
        ;(o.material as MeshBasicNodeMaterial).dispose()
      }
    })
  }

  return { scene, camera, update, dispose, shownDepth: () => shown }
}

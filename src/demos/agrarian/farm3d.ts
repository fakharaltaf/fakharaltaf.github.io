// Isometric low-poly farm. Reads the sim state each frame; rebuilds instances only when it changes.
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  InstancedMesh,
  Mesh,
  MeshBasicNodeMaterial,
  MeshLambertNodeMaterial,
  Object3D,
  OrthographicCamera,
  Plane,
  PlaneGeometry,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
} from 'three/webgpu'
import { brand } from '../../styles/tokens.ts'
import { type Farm, SIZE, seasonOf } from './sim.ts'

const GRASS = {
  spring: '#5d8f4e',
  summer: '#4a7d3f',
  autumn: '#8f7c3e',
  winter: '#b9c7c1',
} as const
const SOIL = new Color('#5a3c25')
const SPROUT = new Color('#7fb050')
const RIPE = new Color('#d9b44a')
const CROPS_PER_TILE = 4
const half = (SIZE - 1) / 2
export const tileCenter = (i: number) =>
  new Vector3((i % SIZE) - half, 0, Math.floor(i / SIZE) - half)

export function createFarm(get: () => Farm, cursor: () => number) {
  const scene = new Scene()
  const camera = new OrthographicCamera(-8, 8, 5, -5, 0.1, 100)
  camera.position.set(12, 11, 12)
  camera.lookAt(0, 0, 0)
  const bg = new Mesh(
    new PlaneGeometry(400, 400),
    new MeshBasicNodeMaterial({ color: new Color('#0e1614') }),
  )
  bg.position.z = -60
  camera.add(bg)
  scene.add(camera)
  scene.add(new HemisphereLight('#e8f3ee', '#2a2014', 1.5))
  const sun = new DirectionalLight('#fff4e0', 1.8)
  sun.position.set(6, 10, 3)
  scene.add(sun)

  const N = SIZE * SIZE
  const dummy = new Object3D()
  const ground = new InstancedMesh(
    new BoxGeometry(0.96, 0.25, 0.96),
    new MeshLambertNodeMaterial(),
    N,
  )
  const crops = new InstancedMesh(
    new ConeGeometry(0.11, 0.42, 5),
    new MeshLambertNodeMaterial(),
    N * CROPS_PER_TILE,
  )
  const roofMat = new MeshLambertNodeMaterial({ color: new Color('#3b2016') })
  const barn = new Group()
  barn.add(
    new Mesh(
      new BoxGeometry(0.78, 0.5, 0.66),
      new MeshLambertNodeMaterial({ color: new Color('#9a3f24') }),
    ),
  )
  const barnRoof = new Mesh(new ConeGeometry(0.62, 0.38, 4), roofMat)
  barnRoof.position.y = 0.44
  barnRoof.rotation.y = Math.PI / 4
  barn.add(barnRoof)
  const HOUSES = 6
  const houses = new InstancedMesh(
    new BoxGeometry(0.5, 0.36, 0.5),
    new MeshLambertNodeMaterial({ color: new Color('#e9f0ee') }),
    HOUSES,
  )
  const roofs = new InstancedMesh(new ConeGeometry(0.42, 0.3, 4), roofMat, HOUSES)
  const tractor = new Group()
  const body = new Mesh(
    new BoxGeometry(0.34, 0.2, 0.22),
    new MeshLambertNodeMaterial({ color: new Color(brand.action) }),
  )
  body.position.y = 0.2
  const cab = new Mesh(
    new BoxGeometry(0.16, 0.16, 0.18),
    new MeshLambertNodeMaterial({ color: new Color('#e9f0ee') }),
  )
  cab.position.set(-0.06, 0.36, 0)
  const wheelGeo = new CylinderGeometry(0.09, 0.09, 0.26, 10)
  const wheelMat = new MeshLambertNodeMaterial({ color: new Color('#1a1a1a') })
  for (const x of [-0.11, 0.12]) {
    const w = new Mesh(wheelGeo, wheelMat)
    w.rotation.x = Math.PI / 2
    w.position.set(x, 0.1, 0)
    tractor.add(w)
  }
  tractor.add(body, cab)
  const cursorMesh = new Mesh(
    new BoxGeometry(1.02, 0.04, 1.02),
    new MeshBasicNodeMaterial({
      color: new Color(brand.anchor),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  )
  scene.add(ground, crops, barn, houses, roofs, tractor, cursorMesh)

  let shown: Farm | null = null
  let time = 0
  const col = new Color()

  function rebuild(f: Farm) {
    const season = seasonOf(f.day)
    const grass = new Color(GRASS[season])
    let h = 0
    barn.visible = false
    f.tiles.forEach((t, i) => {
      const c = tileCenter(i)
      dummy.position.set(c.x, -0.125, c.z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      ground.setMatrixAt(i, dummy.matrix)
      ground.setColorAt(i, t.kind === 'field' ? SOIL : grass)
      for (let k = 0; k < CROPS_PER_TILE; k++) {
        const j = i * CROPS_PER_TILE + k
        const g = t.kind === 'field' ? t.growth : 0
        dummy.position.set(c.x + (k % 2 ? 0.2 : -0.2), 0.0, c.z + (k < 2 ? 0.2 : -0.2))
        dummy.scale.set(1, g < 0.05 ? 0.0001 : 0.3 + g * 0.9, 1)
        dummy.position.y = (0.42 * dummy.scale.y) / 2
        dummy.updateMatrix()
        crops.setMatrixAt(j, dummy.matrix)
        crops.setColorAt(j, col.copy(SPROUT).lerp(RIPE, Math.max(0, (g - 0.5) * 2)))
      }
      if (t.kind === 'barn') {
        barn.visible = true
        barn.position.set(c.x, 0.25, c.z)
      }
      if (t.kind === 'house' && h < HOUSES) {
        dummy.scale.setScalar(1)
        dummy.position.set(c.x, 0.18, c.z)
        dummy.updateMatrix()
        houses.setMatrixAt(h, dummy.matrix)
        dummy.position.y = 0.51
        dummy.rotation.y = Math.PI / 4
        dummy.updateMatrix()
        roofs.setMatrixAt(h, dummy.matrix)
        h++
      }
    })
    houses.count = h
    roofs.count = h
    for (const m of [ground, crops, houses, roofs]) {
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
    tractor.visible = f.tractor
  }

  function update(dt: number, w: number, h: number) {
    time += Math.min(dt, 0.05)
    // Fit the 9×9 plot in any aspect: wide shows margins, tall zooms out.
    const halfW = Math.max(7.4, 5.2 * (w / h))
    const halfH = halfW / (w / h)
    camera.left = -halfW
    camera.right = halfW
    camera.top = halfH + 0.6
    camera.bottom = -halfH + 0.6
    camera.updateProjectionMatrix()

    const f = get()
    if (f !== shown) {
      shown = f
      rebuild(f)
    }
    // The tractor potters around the fields.
    const fields = f.tiles.map((t, i) => (t.kind === 'field' ? i : -1)).filter((i) => i >= 0)
    if (f.tractor && fields.length) {
      const u = (time * 0.35) % fields.length
      const a = tileCenter(fields[Math.floor(u)]!)
      const b = tileCenter(fields[(Math.floor(u) + 1) % fields.length]!)
      const k = u % 1
      tractor.position.lerpVectors(a, b, k)
      tractor.rotation.y = Math.atan2(-(b.z - a.z), b.x - a.x)
    }
    const c = cursor()
    cursorMesh.visible = c >= 0
    if (c >= 0) cursorMesh.position.copy(tileCenter(c)).setY(0.03)
  }

  // Click → tile, through the real camera.
  const ray = new Raycaster()
  const plane = new Plane(new Vector3(0, 1, 0), 0)
  const hit = new Vector3()
  function pick(ndcX: number, ndcY: number): number {
    ray.setFromCamera(new Vector2(ndcX, ndcY), camera)
    if (!ray.ray.intersectPlane(plane, hit)) return -1
    const x = Math.round(hit.x + half)
    const z = Math.round(hit.z + half)
    return x < 0 || z < 0 || x >= SIZE || z >= SIZE ? -1 : z * SIZE + x
  }

  function dispose() {
    scene.traverse((o) => {
      if (o instanceof Mesh) {
        o.geometry.dispose()
        ;(o.material as MeshBasicNodeMaterial).dispose()
      }
    })
  }

  return { scene, camera, update, pick, dispose }
}

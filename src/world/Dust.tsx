// Fine dust for the levels before the particle universe forms (cursor, line, script): the same
// green dots and the same hole around the cursor, so the effect runs through the whole zoom.
// It fills the screen, drifts inward as you zoom out, and hands over as the real particles arrive.
import { useEffect, useMemo } from 'react'
import {
  AdditiveBlending,
  Color,
  type Node,
  PointsNodeMaterial,
  Sprite,
  Vector3,
} from 'three/webgpu'
import {
  cameraProjectionMatrix,
  cos,
  exp2,
  float,
  fract,
  hash,
  instanceIndex,
  length,
  max,
  modelViewMatrix,
  sin,
  smoothstep,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl'
import { brand } from '../styles/tokens.ts'
import { REPEL_PX, type ParticleUniforms } from './Particles.tsx'

export function makeDustUniforms() {
  return {
    opacity: uniform(0),
    flow: uniform(0), // grows with zoom; each unit is one trip from the edge to the centre
    half: uniform(new Vector3(1, 1, 0)), // half the visible plane, world units (x, y)
    push: uniform(0), // how far the cursor pushes, world units (0 = off)
    wander: uniform(0), // idle drift, world units (0 under reduced motion)
  }
}
export type DustUniforms = ReturnType<typeof makeDustUniforms>

const SPAN = 3 // radii shrink by 2^SPAN on the way in

export function Dust({ count, u, d }: { count: number; u: ParticleUniforms; d: DustUniforms }) {
  const sprite = useMemo(() => {
    const a = hash(instanceIndex)
    const b = hash(instanceIndex.add(7919))
    const c = hash(instanceIndex.add(104729))
    // Log-radial flow: every grain heads for the centre as you zoom out, and wraps to the edge.
    const s = fract(b.add(d.flow))
    const rMax = length(d.half.xy).mul(1.1)
    const r = exp2(s.mul(-SPAN)).mul(rMax)
    const ang = a.mul(Math.PI * 2)
    const drift = vec2(sin(time.mul(0.31).add(c.mul(40))), cos(time.mul(0.27).add(a.mul(40))))
    let p: Node<'vec3'> = vec3(
      vec2(cos(ang), sin(ang)).mul(r).add(drift.mul(d.wander)),
      0,
    ) as unknown as Node<'vec3'>

    // The same hole as the main particles, measured on screen.
    const clip = cameraProjectionMatrix.mul(modelViewMatrix).mul(vec4(p, 1))
    const dv = clip.xy.div(clip.w.max(1e-6)).sub(u.pointer.xy).mul(u.halfPx.xy)
    const dist = length(dv).max(1e-6)
    const push = max(float(0), float(REPEL_PX).sub(dist)).div(REPEL_PX)
    p = vec3(p.xy.add(dv.div(dist).mul(push.mul(push).mul(d.push).mul(0.55))), p.z)

    const m = new PointsNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    m.sizeAttenuation = false
    m.positionNode = p
    m.sizeNode = c.mul(1.6).add(1).mul(u.sizeScale)
    const round = smoothstep(0.5, 0.15, length(uv().sub(vec2(0.5))))
    // Fade in at the edge, out near the centre (where the log flow bunches grains up).
    const life = smoothstep(0, 0.12, s).mul(smoothstep(1, 0.6, s))
    const tint = new Color(brand.anchor)
    m.colorNode = vec4(tint.r, tint.g, tint.b, 1)
    m.opacityNode = c.mul(0.45).add(0.25).mul(life).mul(round).mul(d.opacity)

    const sp = new Sprite(m)
    sp.count = count
    sp.frustumCulled = false
    sp.renderOrder = -1 // under the text
    return sp
  }, [count, u, d])

  useEffect(() => () => sprite.material.dispose(), [sprite])
  return <primitive object={sprite} />
}

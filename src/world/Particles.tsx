// GPU particles: tens of thousands of instanced sprites morphing between five shapes.
// The morph, the mid-flight scatter and cursor repulsion all run in one TSL vertex program,
// which compiles to WGSL on WebGPU and GLSL on the WebGL2 fallback. No compute shaders needed.
import { useEffect, useMemo } from 'react'
import {
  AdditiveBlending,
  InstancedInterleavedBuffer,
  type Node,
  PointsNodeMaterial,
  Sprite,
  Vector3,
} from 'three/webgpu'
import {
  float,
  hash,
  instanceIndex,
  instancedBufferAttribute,
  length,
  max,
  mix,
  mx_noise_vec3,
  smoothstep,
  sin,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl'
import { SHAPES, STRIDE, buildShapes } from './shapes.ts'

export type ParticleUniforms = ReturnType<typeof makeUniforms>

export function makeUniforms() {
  return {
    from: Array.from({ length: SHAPES }, (_, k) => uniform(k === 0 ? 1 : 0)),
    to: Array.from({ length: SHAPES }, (_, k) => uniform(k === 0 ? 1 : 0)),
    t: uniform(0),
    opacity: uniform(0),
    scatter: uniform(0), // universe units of mid-flight drift
    shimmer: uniform(0), // universe units of idle drift
    pointer: uniform(new Vector3(1e9, 1e9, 0)),
    radius: uniform(0), // repulsion radius, universe units
    sizeScale: uniform(1),
  }
}

export function Particles({
  count,
  portrait,
  u,
}: {
  count: number
  portrait: boolean
  u: ParticleUniforms
}) {
  const sprite = useMemo(() => {
    const { pos, color } = buildShapes(count, portrait)
    // Must be an InstancedInterleavedBuffer: three only steps a plain typed array per vertex.
    // The typings return an untyped Node for interleaved attributes; the layout is vec4 by construction.
    const posBuf = new InstancedInterleavedBuffer(pos, STRIDE)
    const colBuf = new InstancedInterleavedBuffer(color, STRIDE)
    const attr = (buf: InstancedInterleavedBuffer, k: number) =>
      instancedBufferAttribute(buf, 'vec4', STRIDE, k * 4) as unknown as Node<'vec4'>
    const P = Array.from({ length: SHAPES }, (_, k) => attr(posBuf, k))
    const C = Array.from({ length: SHAPES }, (_, k) => attr(colBuf, k))
    const pick = (attrs: typeof P, w: typeof u.from) =>
      attrs.slice(1).reduce((acc, a, k) => acc.add(a.mul(w[k + 1]!)), attrs[0]!.mul(w[0]!))

    const a = pick(P, u.from)
    const b = pick(P, u.to)
    const ca = pick(C, u.from)
    const cb = pick(C, u.to)

    // Each particle leaves on its own schedule, so shapes dissolve and re-form instead of tweening.
    const seed = hash(instanceIndex)
    const delay = seed.mul(0.4)
    const ti = smoothstep(delay, delay.add(0.6), u.t)
    const arc = sin(ti.mul(Math.PI))
    const wander = mx_noise_vec3(
      vec3(seed.mul(97.1), hash(instanceIndex.add(7)).mul(53.3), time.mul(0.25)),
    )
    let p = mix(a.xyz, b.xyz, ti)
      .add(wander.mul(arc.mul(u.scatter)))
      .add(wander.mul(u.shimmer))
    // Cursor repulsion in the XY plane.
    const d = p.xy.sub(u.pointer.xy)
    const dist = length(d).max(1e-6)
    const push = max(float(0), u.radius.sub(dist)).div(u.radius.max(1e-6))
    p = vec3(p.xy.add(d.div(dist).mul(push.mul(push).mul(u.radius).mul(0.55))), p.z)

    const m = new PointsNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    m.sizeAttenuation = false
    m.positionNode = p
    m.sizeNode = mix(a.w, b.w, ti).mul(u.sizeScale)
    const round = smoothstep(0.5, 0.15, length(uv().sub(vec2(0.5))))
    const c = mix(ca, cb, ti)
    m.colorNode = vec4(c.rgb, 1)
    m.opacityNode = c.a.mul(round).mul(u.opacity)

    const s = new Sprite(m)
    s.count = count
    s.frustumCulled = false
    return s
  }, [count, portrait, u])

  useEffect(
    () => () => {
      sprite.material.dispose() // Sprite geometry is shared by three; never dispose it
    },
    [sprite],
  )

  return <primitive object={sprite} />
}

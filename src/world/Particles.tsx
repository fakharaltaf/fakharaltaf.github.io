// GPU particles: tens of thousands of instanced sprites morphing between five shapes.
// The morph, the mid-flight scatter and cursor repulsion all run in one TSL vertex program,
// which compiles to WGSL on WebGPU and GLSL on the WebGL2 fallback. No compute shaders needed.
import { useEffect, useMemo } from 'react'
import {
  AdditiveBlending,
  Color,
  InstancedInterleavedBuffer,
  type Node,
  PointsNodeMaterial,
  Sprite,
  Vector3,
  Vector4,
} from 'three/webgpu'
import {
  cameraProjectionMatrix,
  float,
  fract,
  hash,
  modelViewMatrix,
  instanceIndex,
  cos,
  instancedBufferAttribute,
  int,
  length,
  max,
  mix,
  mx_noise_vec3,
  smoothstep,
  sin,
  step,
  time,
  uniform,
  uniformArray,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl'
import { brand, palette } from '../styles/tokens.ts'
import { FX } from './browse-version.ts'
import { LINE_W, LINE_X0, PIN_SHRINK, STARS } from './layout.ts'
import { FRAME_PIECES, framePieces } from './frames.ts'
import { MAX_LETTERS, letters } from './physicsState.ts'
import { SHAPES, STRIDE, buildShapes } from './shapes.ts'

/** Radius of the cursor's hole in the particles, in CSS px. */
export const REPEL_PX = 70

const RM_STAR = STARS.findIndex((s) => s.id === 'raremind')

export type ParticleUniforms = ReturnType<typeof makeUniforms>

export function makeUniforms() {
  return {
    from: Array.from({ length: SHAPES }, (_, k) => uniform(k === 0 ? 1 : 0)),
    to: Array.from({ length: SHAPES }, (_, k) => uniform(k === 0 ? 1 : 0)),
    t: uniform(0),
    opacity: uniform(0),
    scatter: uniform(0), // universe units of mid-flight drift
    shimmer: uniform(0), // universe units of idle drift
    pointer: uniform(new Vector3(1e9, 1e9, 0)), // NDC (x, y)
    halfPx: uniform(new Vector3(1, 1, 0)), // half the canvas in CSS px (x, y)
    radius: uniform(0), // repulsion radius, universe units
    sweepX: uniform(1e9), // version c: universe x the typing has swept to (runs a little past the end)
    sizeScale: uniform(1),
    /** Physics: per-star offsets and per-letter (dx, dy, angle). Written every frame. */
    stars: uniformArray(
      STARS.map(() => new Vector4()),
      'vec4',
    ),
    /** Version c: the frame a star's particles form when you're inside its project. */
    frameStar: uniform(-1), // which star (index), -1 = none
    frameW: uniform(0), // 0 = all star, 1 = all frame
    starHome: uniformArray(
      STARS.map((st) => new Vector4(st.pos[0], st.pos[1], st.pos[2], 0)),
      'vec4',
    ),
    framePieces: uniformArray(
      framePieces.map((q) => new Vector4(...q)),
      'vec4',
    ),
    letterXf: uniformArray(
      Array.from({ length: MAX_LETTERS }, () => new Vector4()),
      'vec4',
    ),
    letterCenter: uniformArray(
      Array.from({ length: MAX_LETTERS }, () => new Vector4()),
      'vec4',
    ),
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
    const { pos, color, bind } = buildShapes(count, portrait)
    letters.boxes.forEach((b, i) => {
      if (i < MAX_LETTERS) (u.letterCenter.array[i] as Vector4).set(b.cx, b.cy, 0, 0)
    })
    // Must be an InstancedInterleavedBuffer: three only steps a plain typed array per vertex.
    // The typings return an untyped Node for interleaved attributes; the layout is vec4 by construction.
    const posBuf = new InstancedInterleavedBuffer(pos, STRIDE)
    const colBuf = new InstancedInterleavedBuffer(color, STRIDE)
    const attr = (buf: InstancedInterleavedBuffer, k: number) =>
      instancedBufferAttribute(buf, 'vec4', STRIDE, k * 4) as unknown as Node<'vec4'>
    const P = Array.from({ length: SHAPES }, (_, k) => attr(posBuf, k))
    const C = Array.from({ length: SHAPES }, (_, k) => attr(colBuf, k))
    const bindBuf = new InstancedInterleavedBuffer(bind, 8)
    const B0 = instancedBufferAttribute(bindBuf, 'vec4', 8, 0) as unknown as Node<'vec4'>
    const B1 = instancedBufferAttribute(bindBuf, 'vec4', 8, 4) as unknown as Node<'vec4'>
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
    // How much of this particle is in the constellation (S2) or the person (S3) right now.
    const w2 = mix(u.from[3]!, u.to[3]!, ti)
    const w3 = mix(u.from[4]!, u.to[4]!, ti)
    // The opening: before its character is typed, each particle waits in the background field;
    // as the typing sweeps past its x it flies into the line (with a slight curve on the way).
    const fieldW = u.from[0]!
    // Background-only particles (B1.w) have no place in the line: they fade out as the typing
    // passes a random point along it, instead of flying in.
    const sx = mix(
      P[0]!.x.add(seed.mul(0.6)),
      hash(instanceIndex.add(53)).mul(LINE_W).add(LINE_X0),
      B1.w,
    )
    const arrive = smoothstep(sx.sub(2.5), sx, u.sweepX) // lands as the caret reaches it
    const inFlight = sin(arrive.mul(Math.PI)).mul(fieldW)
    // Field position rides in the bind buffer (vertex inputs are capped at 16); brightness and
    // size come from the seed.
    const fieldA = hash(instanceIndex.add(11)).mul(0.45).add(0.35)
    const fieldS = hash(instanceIndex.add(13)).mul(1.1).add(1)
    const fromPos = mix(a.xyz, mix(vec3(B1.y, B1.z, 0), a.xyz, arrive), fieldW).add(
      wander.mul(inFlight).mul(1.5),
    )
    const tint = new Color(brand.anchor)
    const fromCol = mix(ca, mix(vec4(tint.r, tint.g, tint.b, fieldA), ca, arrive), fieldW)
    const fromSize = mix(a.w, mix(fieldS, a.w, arrive), fieldW)
    let base = mix(fromPos, b.xyz, ti)
    // Stars and threads follow the physics; inside the pin they move at the pin's scale.
    // Uniform-array elements are untyped in the typings; every array here is vec4.
    const at = (arr: typeof u.stars, i: Node<'int'>) => arr.element(i) as unknown as Node<'vec4'>
    const starOff = mix(
      at(u.stars, int(max(B0.x, 0))).xyz,
      at(u.stars, int(max(B0.y, 0))).xyz,
      B0.z,
    )
    const starW = w2.add(w3.mul(B0.w).mul(PIN_SHRINK)).mul(step(0, B0.x))
    base = base.add(starOff.mul(starW))
    // Version c: inside a project, nearly all of its star's particles fly out to its frame.
    const ownStar = step(0, B0.x).mul(float(1).sub(step(0.5, B0.x.sub(B0.y).abs())))
    const isFrameStar = float(1).sub(step(0.5, B0.x.sub(u.frameStar).abs()))
    // RareMind's half of the particles (B1.w = 0) waits in the galaxy as a faint copy of its
    // star; some of it is lent to the other frames, so their lines are as fine and full as its own.
    const lent = float(1)
      .sub(B1.w)
      .mul(float(1).sub(step(0.5, B0.x.sub(RM_STAR).abs())))
      .mul(step(hash(instanceIndex.add(47)), float(0.45)))
      .mul(step(0, u.frameStar))
    const mine = ownStar
      .mul(isFrameStar)
      .mul(step(hash(instanceIndex.add(31)), float(0.92))) // the star itself is behind the window
      .add(lent)
      .min(1)
    const piece = at(u.framePieces, int(hash(instanceIndex.add(37)).mul(FRAME_PIECES).floor()))
    // The frame's dots drift slowly along its lines, round the window (off with ?fx=off).
    const along = fract(hash(instanceIndex.add(41)).add(time.mul(FX ? 0.06 : 0)))
    const home = at(u.starHome, int(max(u.frameStar, 0))).xy
    const homeOff = at(u.stars, int(max(u.frameStar, 0))).xy
    const onFrame = home.add(mix(piece.xy, piece.zw, along)).add(homeOff)
    // Lent particles wait round the visited project's own star (they're faint there), so its
    // frame grows out of that star, not RareMind's.
    const rmHome = at(u.starHome, int(RM_STAR)).xy.add(at(u.stars, int(RM_STAR)).xy)
    base = vec3(base.xy.add(home.add(homeOff).sub(rmHome).mul(lent).mul(w2)), base.z)
    // Each particle leaves on its own schedule, like every other morph.
    const go = smoothstep(seed.mul(0.4), seed.mul(0.4).add(0.6), u.frameW).mul(mine).mul(w2)
    base = vec3(mix(base.xy, onFrame, go), base.z.mul(float(1).sub(go)))
    // Name letters: rotate about the letter's centre, then translate. Only at the person level.
    const li = int(max(B1.x, 0))
    const xf = at(u.letterXf, li)
    const ctr = at(u.letterCenter, li).xy
    const rel = base.xy.sub(ctr)
    const rot = vec2(
      rel.x.mul(cos(xf.z)).sub(rel.y.mul(sin(xf.z))),
      rel.x.mul(sin(xf.z)).add(rel.y.mul(cos(xf.z))),
    )
    base = vec3(mix(base.xy, ctr.add(rot).add(xf.xy), w3.mul(step(0, B1.x))), base.z)
    let p = base.add(wander.mul(arc.mul(u.scatter))).add(wander.mul(u.shimmer))
    // Cursor repulsion, measured on screen where the cursor is. Particles sit at different
    // depths, so measuring on one world plane drifted off the cursor toward the edges.
    const clip = cameraProjectionMatrix.mul(modelViewMatrix).mul(vec4(p, 1))
    const d = clip.xy.div(clip.w.max(1e-6)).sub(u.pointer.xy).mul(u.halfPx.xy)
    const dist = length(d).max(1e-6)
    const push = max(float(0), float(REPEL_PX).sub(dist)).div(REPEL_PX)
    p = vec3(p.xy.add(d.div(dist).mul(push.mul(push).mul(u.radius).mul(0.55))), p.z)

    const m = new PointsNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    m.sizeAttenuation = false
    m.positionNode = p
    // On the frame, a star's particles become a thin dotted line, like RareMind's frame; a few
    // become a faint wide glow along it (off with ?fx=off).
    const glow = step(hash(instanceIndex.add(43)), float(FX ? 0.12 : 0))
    m.sizeNode = mix(mix(fromSize, b.w, ti), mix(float(1.2), float(7), glow), go).mul(u.sizeScale)
    const round = smoothstep(0.5, 0.15, length(uv().sub(vec2(0.5))))
    const muted = new Color(palette.dark.muted)
    const frameCol = mix(
      vec4(muted.r, muted.g, muted.b, sin(along.mul(Math.PI)).mul(0.35).add(0.55)),
      vec4(tint.r, tint.g, tint.b, 0.06),
      glow,
    )
    const c = mix(mix(fromCol, cb, ti), frameCol, go)
    m.colorNode = vec4(c.rgb, 1)
    // RareMind's frame shrinking into its star (or growing out of it): its particles dim while
    // they travel, so the dense script module reads as a haze, not a bright streak.
    const rmStar = float(1)
      .sub(step(0.5, B0.x.sub(RM_STAR).abs()))
      .mul(float(1).sub(step(0.5, B0.y.sub(RM_STAR).abs())))
    const projGalaxy = u.from[2]!.mul(u.to[3]!).add(u.from[3]!.mul(u.to[2]!))
    const moving = smoothstep(0, 0.08, ti).mul(float(1).sub(smoothstep(0.93, 1, ti)))
    const travelDim = float(1).sub(moving.mul(0.85).mul(rmStar).mul(projGalaxy))
    // Lent particles cross the galaxy to get there: faint on the way, not a streak.
    const enRoute = float(1).sub(lent.mul(go).mul(float(1).sub(go)).mul(3.6))
    m.opacityNode = c.a.mul(round).mul(u.opacity).mul(travelDim).mul(enRoute)

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

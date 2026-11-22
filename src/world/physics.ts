// Real physics where things are tactile: Rapier (WASM), loaded only when the camera nears the
// constellation. Stars hang on springs (home + every thread), can be grabbed, flung, and bump
// into each other. At the person level, the letters of the name stand on a line and can be
// knocked over; left alone, they set themselves back up.
import * as RAPIER from '@dimforge/rapier3d'
import { projects } from '../content/projects.ts'
import { registerAction } from '../automation/runner.ts'
import { track } from '../automation/store.ts'
import { haptic } from '../systems/haptics.ts'
import { CONSTELLATION, FRAME, STARS } from './layout.ts'
import { openProject } from './hash.ts'
import { MAX_LETTERS, grab, letterXforms, letters, starOffsets, starPos } from './physicsState.ts'
import { useWorld } from './store.ts'
import { frameAt } from './timeline.ts'
import { dive, onFrame, view } from './zoom.ts'

const S = FRAME.w * 1.3 // star physics unit
const C = [CONSTELLATION.x, CONSTELLATION.y, 0] as const
const STEP = 1 / 60
const HOME_K = 7
const THREAD_K = 2.2
const GRAB_PX = 36

let started = false
let flingNow: (() => void) | null = null

/** Fling a random star (used by the automation). */
export function flingRandomStar() {
  flingNow?.()
}

export async function startPhysics() {
  if (started) return
  started = true

  // ---- Stars -----------------------------------------------------------------
  const stars = new RAPIER.World({ x: 0, y: 0, z: 0 })
  const homes = STARS.map(
    (s) => [(s.pos[0] - C[0]) / S, (s.pos[1] - C[1]) / S, s.pos[2] / S] as const,
  )
  const bodies = homes.map((h) => {
    const b = stars.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(h[0], h[1], h[2])
        .setLinearDamping(1.4)
        .setCcdEnabled(true),
    )
    // Mass ≈ 1, so spring constants read as frequencies and stay stable at 60 Hz.
    stars.createCollider(RAPIER.ColliderDesc.ball(0.17).setDensity(48).setRestitution(0.7), b)
    return b
  })
  const pairs: [number, number, number][] = []
  projects.forEach((a, i) =>
    projects.forEach((b, j) => {
      if (j > i && a.skills.some((s) => b.skills.includes(s))) {
        const d = Math.hypot(
          homes[i]![0] - homes[j]![0],
          homes[i]![1] - homes[j]![1],
          homes[i]![2] - homes[j]![2],
        )
        pairs.push([i, j, d])
      }
    }),
  )

  // ---- Letters -----------------------------------------------------------------
  const lw = new RAPIER.World({ x: 0, y: -28, z: 0 })
  let letterBodies: {
    body: RAPIER.RigidBody
    home: [number, number]
    quietSince: number
    returning: boolean
  }[] = []
  let ground: RAPIER.RigidBody | null = null
  let builtFor: unknown = null
  const pusher = lw.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 100, 0),
  )
  lw.createCollider(RAPIER.ColliderDesc.ball(0.32), pusher)
  const buildLetters = () => {
    letterBodies.forEach((l) => lw.removeRigidBody(l.body))
    if (ground) lw.removeRigidBody(ground)
    const { boxes, em } = letters
    const base = Math.min(...boxes.map((b) => b.cy - b.h / 2))
    ground = lw.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, base / em - 0.5, 0))
    lw.createCollider(RAPIER.ColliderDesc.cuboid(200, 0.5, 2), ground)
    letterBodies = boxes.slice(0, MAX_LETTERS).map((b) => {
      const home: [number, number] = [b.cx / em, b.cy / em]
      const body = lw.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(home[0], home[1], 0)
          .enabledTranslations(true, true, false)
          .enabledRotations(false, false, true)
          .setLinearDamping(1.5)
          .setAngularDamping(1.5),
      )
      lw.createCollider(
        RAPIER.ColliderDesc.cuboid((b.w / em) * 0.42, (b.h / em) * 0.5, 0.3)
          .setFriction(0.8)
          .setRestitution(0.1),
        body,
      )
      return { body, home, quietSince: performance.now(), returning: false }
    })
    builtFor = letters.boxes
  }

  // ---- Pointer -------------------------------------------------------------------
  let px = -1e4
  let py = -1e4
  let grabbed = -1
  let downAt = { x: 0, y: 0, t: 0 }
  let dragged = false
  let chain = 0

  const onMove = (e: PointerEvent) => {
    px = e.clientX
    py = e.clientY
    if (grabbed >= 0 && Math.hypot(px - downAt.x, py - downAt.y) > 6) dragged = true
  }
  const onDown = (e: PointerEvent) => {
    px = e.clientX
    py = e.clientY
    if (chain < 3.7 || chain > 4.3 || dive.id || useWorld.getState().reducedMotion) return
    let best = -1
    let bestD = GRAB_PX
    STARS.forEach((_, i) => {
      const [x, y] = view.project(...starPos(i))
      const d = Math.hypot(x - px, y - py)
      if (d < bestD) {
        best = i
        bestD = d
      }
    })
    if (best < 0) return
    grabbed = best
    grab.active = true
    dragged = false
    downAt = { x: px, y: py, t: e.timeStamp }
    e.stopPropagation() // a star grab is not a zoom drag
  }
  const onUp = (e: PointerEvent) => {
    if (grabbed < 0) return
    const b = bodies[grabbed]!
    const v = b.linvel()
    const speed = Math.hypot(v.x, v.y)
    if (!dragged && e.timeStamp - downAt.t < 350) {
      // A tap on a star opens it.
      track('openProject')
      openProject(projects[grabbed]!.id)
    } else if (speed > 1.2) {
      track('flingStar')
      haptic('fling')
    }
    grabbed = -1
    grab.active = false
  }
  // A drag must not also click the label button under the star.
  const swallowClick = (e: MouseEvent) => {
    if (dragged) {
      e.stopPropagation()
      e.preventDefault()
      dragged = false
    }
  }
  addEventListener('pointermove', onMove, { passive: true })
  addEventListener('pointerdown', onDown, { capture: true })
  addEventListener('pointerup', onUp)
  addEventListener('click', swallowClick, { capture: true })

  registerAction('flingStar', () => flingNow?.())
  flingNow = () => {
    const i = Math.floor(Math.random() * bodies.length)
    const a = Math.random() * Math.PI * 2
    bodies[i]!.applyImpulse({ x: Math.cos(a) * 1.6, y: Math.sin(a) * 1.6, z: 0 }, true)
  }

  // ---- Step ------------------------------------------------------------------------
  let acc = 0
  let last = performance.now()
  onFrame((p) => {
    const now = performance.now()
    acc = Math.min(acc + (now - last) / 1000, STEP * 4)
    last = now
    const f = frameAt(p)
    chain = f.chain
    const reduced = useWorld.getState().reducedMotion
    const starsOn = chain > 3.3 && chain < 5.6 && !reduced
    const lettersOn = chain > 4.6 && !reduced
    if (letters.boxes !== builtFor && letters.boxes.length) buildLetters()

    while (acc >= STEP) {
      acc -= STEP
      if (starsOn) {
        bodies.forEach((b, i) => {
          const t = b.translation()
          const h = homes[i]!
          b.resetForces(true)
          b.addForce(
            { x: -HOME_K * (t.x - h[0]), y: -HOME_K * (t.y - h[1]), z: -HOME_K * (t.z - h[2]) },
            true,
          )
        })
        for (const [i, j, rest] of pairs) {
          const a = bodies[i]!.translation()
          const b = bodies[j]!.translation()
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dz = b.z - a.z
          const d = Math.hypot(dx, dy, dz) || 1
          const k = (THREAD_K * (d - rest)) / d
          bodies[i]!.addForce({ x: k * dx, y: k * dy, z: k * dz }, true)
          bodies[j]!.addForce({ x: -k * dx, y: -k * dy, z: -k * dz }, true)
        }
        // Only once it's really a drag: a tap that opens the star mustn't yank it towards the
        // pointer first, or it springs back and wobbles all through the dive.
        if (grabbed >= 0 && dragged) {
          const b = bodies[grabbed]!
          const t = b.translation()
          const [ux, uy] = view.unproject(px, py, STARS[grabbed]!.pos[2])
          b.setLinvel(
            { x: ((ux - C[0]) / S - t.x) * 14, y: ((uy - C[1]) / S - t.y) * 14, z: 0 },
            true,
          )
        }
        stars.step()
      }
      if (lettersOn && letterBodies.length) {
        const em = letters.em
        const [ux, uy] = view.unproject(px, py, 0)
        pusher.setNextKinematicTranslation({ x: ux / em, y: uy / em, z: 0 })
        for (const l of letterBodies) {
          const t = l.body.translation()
          const r = l.body.rotation()
          const off =
            Math.hypot(t.x - l.home[0], t.y - l.home[1]) +
            Math.abs(2 * Math.asin(Math.max(-1, Math.min(1, r.z))))
          // The clock restarts whenever the pointer is touching it; 2.5s untouched, it stands back up.
          const touching = Math.hypot(t.x - ux / em, t.y - uy / em) < 1.4
          if (touching || off < 0.02) l.quietSince = now
          if (off > 0.02 && !touching && now - l.quietSince > 2500) l.returning = true
          if (l.returning) {
            const k = 0.12
            const nx = t.x + (l.home[0] - t.x) * k
            const ny = t.y + (l.home[1] - t.y) * k
            const angle = 2 * Math.asin(Math.max(-1, Math.min(1, r.z))) * (1 - k)
            l.body.setTranslation({ x: nx, y: ny, z: 0 }, true)
            l.body.setRotation({ x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2) }, true)
            l.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
            l.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
            if (off < 0.01) {
              l.returning = false
              l.body.setTranslation({ x: l.home[0], y: l.home[1], z: 0 }, true)
              l.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
            }
          }
        }
        lw.step()
        // A hard swipe knocks letters over; it shouldn't launch them into orbit.
        for (const l of letterBodies) {
          const v = l.body.linvel()
          const sp = Math.hypot(v.x, v.y)
          if (sp > 9) l.body.setLinvel({ x: (v.x / sp) * 9, y: (v.y / sp) * 9, z: 0 }, true)
        }
      }
    }

    // Publish to the renderer and the UI.
    bodies.forEach((b, i) => {
      const t = b.translation()
      const on = starsOn ? 1 : 0
      starOffsets[i * 3] = on * (t.x * S + C[0] - STARS[i]!.pos[0])
      starOffsets[i * 3 + 1] = on * (t.y * S + C[1] - STARS[i]!.pos[1])
      starOffsets[i * 3 + 2] = on * (t.z * S - STARS[i]!.pos[2])
    })
    letterBodies.forEach((l, i) => {
      const t = l.body.translation()
      const r = l.body.rotation()
      const em = letters.em
      letterXforms[i * 4] = (t.x - l.home[0]) * em
      letterXforms[i * 4 + 1] = (t.y - l.home[1]) * em
      letterXforms[i * 4 + 2] = 2 * Math.atan2(r.z, r.w)
    })
  })
}

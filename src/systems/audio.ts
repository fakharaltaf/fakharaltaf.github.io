// Every sound on the site is synthesised here with the Web Audio API. No audio files.
// Off by default; nothing is created until the visitor turns it on (inside a gesture).
import { useSettings } from './settings.ts'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let hum: { a: OscillatorNode; b: OscillatorNode; filter: BiquadFilterNode; gain: GainNode } | null =
  null
let lastTick = 0

const MASTER = 0.14

function ensure(): AudioContext | null {
  if (!useSettings.getState().sound) return null
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = MASTER
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** An envelope'd oscillator blip. */
function blip(
  freq: number,
  dur: number,
  type: OscillatorType = 'sine',
  gain = 0.5,
  glideTo?: number,
) {
  const c = ensure()
  if (!c || !master) return
  const t = c.currentTime
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + dur + 0.02)
}

/** A short filtered noise burst: keys, clicks. */
function noise(dur: number, freq: number, gain: number) {
  const c = ensure()
  if (!c || !master) return
  const len = Math.max(1, Math.floor(c.sampleRate * dur))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = freq
  f.Q.value = 1.4
  const g = c.createGain()
  g.gain.value = gain
  src.connect(f).connect(g).connect(master)
  src.start()
}

export const sfx = {
  click: () => blip(1250, 0.05, 'triangle', 0.25),
  /** One keystroke of a script typing itself. Rate-limited so fast typing doesn't buzz. */
  key: () => {
    const now = performance.now()
    if (now - lastTick < 28) return
    lastTick = now
    noise(0.012, 2400 + Math.random() * 1600, 0.35)
  },
  /** RareMind's sonar: a ping with one echo. */
  ping: (deep = 0) => {
    blip(1180 - deep * 300, 0.9, 'sine', 0.35, 900 - deep * 250)
    setTimeout(() => blip(1180 - deep * 300, 0.7, 'sine', 0.12, 900 - deep * 250), 260)
  },
  /** An automation just got written: two notes, up. */
  unlock: () => {
    blip(523.25, 0.18, 'triangle', 0.3)
    setTimeout(() => blip(783.99, 0.32, 'triangle', 0.3), 110)
  },
  thud: () => blip(110, 0.18, 'sine', 0.4, 55),
}

/** The low hum: deepens as you zoom out. p ∈ [0, 1]. */
export function setHum(p: number) {
  const on = useSettings.getState().sound && !document.hidden
  if (!on) {
    if (hum && ctx) hum.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.2)
    return
  }
  const c = ensure()
  if (!c || !master) return
  if (!hum) {
    const a = c.createOscillator()
    const b = c.createOscillator()
    const filter = c.createBiquadFilter()
    const gain = c.createGain()
    a.type = 'sine'
    b.type = 'triangle'
    filter.type = 'lowpass'
    filter.frequency.value = 320
    gain.gain.value = 0
    a.connect(filter)
    b.connect(filter)
    filter.connect(gain).connect(master)
    a.start()
    b.start()
    hum = { a, b, filter, gain }
  }
  const t = c.currentTime
  const f = 72 - 34 * p // deeper further out
  hum.a.frequency.setTargetAtTime(f, t, 0.3)
  hum.b.frequency.setTargetAtTime(f * 1.503, t, 0.3) // a slightly sour fifth
  hum.filter.frequency.setTargetAtTime(380 - 220 * p, t, 0.3)
  hum.gain.gain.setTargetAtTime(0.22, t, 0.4)
}

// Turning sound on happens inside a click or a typed command, so the context may start now.
useSettings.subscribe((s, prev) => {
  if (s.sound && !prev.sound) {
    ensure()
    sfx.click()
  }
  if (!s.sound && hum && ctx) hum.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.1)
})

// A returning visitor with sound on: the browser needs one gesture before it may play.
addEventListener('pointerdown', () => useSettings.getState().sound && ensure(), { once: true })

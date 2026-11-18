import { describe, expect, it } from 'vitest'
import { decideTier } from '../../src/systems/quality'

const frames = (ms: number, n = 120) => Array.from({ length: n }, (_, i) => ms + (i % 5) * 0.3)

describe('quality manager', () => {
  it('waits for enough samples', () => {
    expect(decideTier(frames(80, 10), 2, false)).toBe(2)
  })
  it('steps down when frames are slow, never below 0', () => {
    expect(decideTier(frames(30), 2, false)).toBe(1)
    expect(decideTier(frames(60), 0, false)).toBe(0)
  })
  it('steps up only with lots of headroom, never above 3', () => {
    expect(decideTier(frames(8), 2, false)).toBe(3)
    expect(decideTier(frames(14), 2, false)).toBe(2)
    expect(decideTier(frames(4), 3, false)).toBe(3)
  })
  it('judges phones against 30 fps, laptops against 60', () => {
    expect(decideTier(frames(30), 1, true)).toBe(1)
    expect(decideTier(frames(30), 1, false)).toBe(0)
  })
  it('uses the median, so one hitch does not cost a tier', () => {
    const f = frames(12)
    f[3] = 400
    expect(decideTier(f, 2, false)).toBe(2)
  })
})

import { describe, expect, it } from 'vitest'
import { CENTERS } from '../../src/world/levels'
import { LINE } from '../../src/world/layout'
import { frameAt } from '../../src/world/timeline'
import { targetForHash } from '../../src/world/hash'

describe('timeline', () => {
  it('starts on a bare caret and an empty line', () => {
    const f = frameAt(0)
    expect(f.typed).toBe(0)
    expect(f.caret).toBe(1)
    expect(f.particles).toBe(0)
  })
  it('has the whole line typed at Level 1', () => {
    expect(frameAt(CENTERS.line).typed).toBe(LINE.length)
  })
  it('hands the script to particles, and the particles to the DOM caret at the end', () => {
    expect(frameAt(CENTERS.script).script).toBe(1)
    expect(frameAt(CENTERS.project).script).toBe(0)
    expect(frameAt(CENTERS.project).particles).toBe(1)
    expect(frameAt(1).particles).toBe(0)
    expect(frameAt(1).outroCaret).toBe(1)
  })
  it('morphs through every shape in order', () => {
    expect(frameAt(CENTERS.project)).toMatchObject({ seg: 0, segT: 1 })
    expect(frameAt(CENTERS.constellation)).toMatchObject({ seg: 1, segT: 1 })
    expect(frameAt(CENTERS.person)).toMatchObject({ seg: 2, segT: 1 })
    expect(frameAt(1)).toMatchObject({ seg: 3, segT: 1 })
  })
})

describe('hash', () => {
  it('maps levels, projects and junk', () => {
    expect(targetForHash('')).toBe(0)
    expect(targetForHash('#constellation')).toBe(CENTERS.constellation)
    expect(targetForHash('#raremind')).toBe(CENTERS.project)
    expect(targetForHash('#nope')).toBeNull()
  })
})

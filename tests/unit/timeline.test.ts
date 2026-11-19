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
    expect(f.universe).toBe(0)
  })
  it('has the whole line typed at Level 1', () => {
    expect(frameAt(CENTERS.line).typed).toBe(LINE.length)
  })
  it('hands the script to particles, and the particles to the DOM caret at the end', () => {
    expect(frameAt(CENTERS.script).particles).toBe(1) // the script is drawn in particles
    expect(frameAt(CENTERS.script).universe).toBe(0)
    expect(frameAt(CENTERS.project).particles).toBe(1)
    expect(frameAt(1).particles).toBe(0)
    expect(frameAt(1).outroCaret).toBe(1)
  })
  it('rests on each particle shape in order (shape = seg + segT)', () => {
    const shape = (p: number) => frameAt(p).seg + frameAt(p).segT
    expect(shape(CENTERS.line)).toBe(0)
    expect(shape(CENTERS.script)).toBe(1)
    expect(shape(CENTERS.project)).toBe(2)
    expect(shape(CENTERS.constellation)).toBe(3)
    expect(shape(CENTERS.person)).toBe(4)
    expect(shape(1)).toBe(5)
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

describe('project catalogue', () => {
  it('steps through every project in order, wrapping, and only when a project is open', async () => {
    // Node has no history; browsing only needs replaceState.
    Object.assign(globalThis, { history: { replaceState: () => {} } })
    const { browseProjects } = await import('../../src/world/hash')
    const { dive, zoom } = await import('../../src/world/zoom')
    const { projects } = await import('../../src/content/projects')
    const at = () => (dive.id && dive.target === 1 ? dive.id : 'raremind')

    zoom.target = CENTERS.cursor
    expect(browseProjects(1)).toBe(false)

    zoom.target = CENTERS.project
    const seen = [at()]
    for (let i = 0; i < projects.length; i++) {
      expect(browseProjects(1)).toBe(true)
      dive.value = dive.target // as if the camera arrived
      seen.push(at())
    }
    expect(seen).toEqual([...projects.map((p) => p.id), 'raremind'])
    expect(browseProjects(-1)).toBe(true)
    expect(at()).toBe(projects.at(-1)!.id)
  })
})

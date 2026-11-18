import { describe, expect, it } from 'vitest'
import {
  COST,
  YEAR_DAYS,
  idx,
  newFarm,
  nextPlot,
  plant,
  seasonOf,
  stepDays,
} from '../../src/demos/agrarian/sim'
import { score, tierFor } from '../../src/demos/raremind/logic'

describe('agrarian sim', () => {
  const grow = (seed: number) =>
    stepDays(plant(plant(newFarm(seed), idx(4, 4)), idx(4, 5)), YEAR_DAYS * 3)

  it('same seed and same clicks grow the same farm', () => {
    expect(grow(4821)).toEqual(grow(4821))
  })
  it('a different seed grows a different farm', () => {
    expect(grow(4821)).not.toEqual(grow(77))
  })
  it('harvests compound into a barn, a tractor and a village', () => {
    const f = stepDays(plant(newFarm(1), idx(4, 4)), YEAR_DAYS * 8)
    expect(f.harvested).toBeGreaterThan(0)
    expect(f.tiles.some((t) => t.kind === 'barn')).toBe(true)
    expect(f.tractor).toBe(true)
    expect(f.tiles.filter((t) => t.kind === 'field').length).toBeGreaterThan(3)
    expect(f.coins).toBeGreaterThanOrEqual(0)
  })
  it('nothing grows from nothing', () => {
    const f = stepDays(newFarm(9), YEAR_DAYS * 2)
    expect(f.coins).toBe(0)
    expect(f.tiles.every((t) => t.kind === 'grass')).toBe(true)
  })
  it('cycles seasons and only plants on grass', () => {
    expect(seasonOf(0)).toBe('spring')
    expect(seasonOf(YEAR_DAYS - 1)).toBe('winter')
    const f = plant(newFarm(1), 0)
    expect(plant(f, 0)).toBe(f)
    expect(COST.barn).toBeLessThan(COST.tractor)
  })
  it('the scripted planter picks a grass tile next to a field', () => {
    const f = plant(newFarm(3), idx(2, 2))
    const i = nextPlot(f)
    expect(f.tiles[i]?.kind).toBe('grass')
    expect(Math.abs((i % 9) - 2) + Math.abs(Math.floor(i / 9) - 2)).toBe(1)
  })
})

describe('raremind scoring', () => {
  it('scores rarity, handles plurals, aliases, exclusions and repeats', () => {
    expect(tierFor(18)).toBe('common')
    expect(tierFor(0.05)).toBe('ultra')
    expect(score('Mangoes', [])).toMatchObject({ kind: 'hit', name: 'Mango', tier: 'common' })
    expect(score('cherries', [])).toMatchObject({ kind: 'hit', name: 'Cherry' })
    expect(score('dragonfruit', [])).toMatchObject({ kind: 'hit', tier: 'ultra' })
    expect(score('Bananas', []).kind).toBe('excluded')
    expect(score('mango', ['mango']).kind).toBe('duplicate')
    expect(score('carrot', []).kind).toBe('unknown')
    expect(score('   ', []).kind).toBe('empty')
  })
})

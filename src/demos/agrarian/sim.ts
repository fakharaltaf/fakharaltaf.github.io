// A tiny deterministic farm: same seed + same clicks = the same farm, every time.
// Pure functions over plain data. The RNG state lives in the state, so it replays exactly.

export const SIZE = 9
export const SEASON_DAYS = 10
export const YEAR_DAYS = SEASON_DAYS * 4
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const
export type Season = (typeof SEASONS)[number]

export const COST = { field: 4, barn: 20, tractor: 45, house: 70 } as const
const EARLY_FIELDS = 6
const MAX_FIELDS = 40
export const MAX_HOUSES = 6

export type Tile = { kind: 'grass' | 'field' | 'barn' | 'house'; growth: number }
export type Farm = {
  seed: number
  rng: number
  day: number
  coins: number
  harvested: number
  tractor: boolean
  tiles: Tile[]
}

/** mulberry32 as a pure step: returns [value, nextState]. */
function rand(state: number): [number, number] {
  const s = (state + 0x6d2b79f5) | 0
  let t = Math.imul(s ^ (s >>> 15), 1 | s)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s]
}

export const idx = (x: number, y: number) => y * SIZE + x
export const seasonOf = (day: number): Season =>
  SEASONS[Math.floor((day % YEAR_DAYS) / SEASON_DAYS)]!

export function newFarm(seed: number): Farm {
  return {
    seed,
    rng: seed,
    day: 0,
    coins: 0,
    harvested: 0,
    tractor: false,
    tiles: Array.from({ length: SIZE * SIZE }, () => ({ kind: 'grass' as const, growth: 0 })),
  }
}

const neighbours = (i: number) => {
  const x = i % SIZE
  const y = Math.floor(i / SIZE)
  return [
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1],
  ]
    .filter(([a, b]) => a! >= 0 && b! >= 0 && a! < SIZE && b! < SIZE)
    .map(([a, b]) => idx(a!, b!))
}

/** Grass tiles next to a field, in index order (so choices are deterministic). */
export function frontier(f: Farm): number[] {
  return f.tiles
    .map((t, i) =>
      t.kind === 'grass' && neighbours(i).some((n) => f.tiles[n]!.kind === 'field') ? i : -1,
    )
    .filter((i) => i >= 0)
}

export function plant(f: Farm, i: number): Farm {
  if (f.tiles[i]?.kind !== 'grass') return f
  const tiles = f.tiles.slice()
  tiles[i] = { kind: 'field', growth: 0 }
  return { ...f, tiles }
}

/** Pick a grass tile with the farm's own RNG: next to fields if possible. */
function pickTile(f: Farm, rng: number): [number, number] {
  const near = frontier(f)
  const pool = near.length
    ? near
    : f.tiles.map((t, i) => (t.kind === 'grass' ? i : -1)).filter((i) => i >= 0)
  if (!pool.length) return [-1, rng]
  const [r, next] = rand(rng)
  return [pool[Math.floor(r * pool.length)]!, next]
}

export function step(f: Farm): Farm {
  const { tractor } = f
  let { rng, coins, harvested } = f
  const day = f.day + 1
  const season = seasonOf(day)
  const barn = f.tiles.some((t) => t.kind === 'barn')
  const houses = f.tiles.filter((t) => t.kind === 'house').length
  let tiles = f.tiles.map((t) => {
    if (t.kind !== 'field') return t
    if (season === 'spring' || season === 'summer') {
      const [r, next] = rand(rng)
      rng = next
      return { ...t, growth: Math.min(1, t.growth + 0.08 + r * 0.06) }
    }
    if (season === 'autumn' && t.growth >= 0.8) {
      const [r, next] = rand(rng)
      rng = next
      coins += Math.round((4 + Math.floor(r * 4)) * (barn ? 1.5 : 1))
      harvested++
      return { ...t, growth: 0 }
    }
    return t
  })
  coins += houses // a village pays its way

  let farm: Farm = { ...f, day, rng, coins, harvested, tractor, tiles }
  // Harvests compound: build the next thing as soon as it's affordable, one per day.
  const build = (kind: 'field' | 'barn' | 'house') => {
    const [i, next] = pickTile(farm, farm.rng)
    if (i < 0) return
    tiles = farm.tiles.slice()
    tiles[i] = { kind, growth: 0 }
    farm = { ...farm, tiles, rng: next, coins: farm.coins - COST[kind] }
  }
  const fields = farm.tiles.filter((t) => t.kind === 'field').length
  if (fields > 0 && fields < EARLY_FIELDS && farm.coins >= COST.field) build('field')
  else if (!barn && farm.coins >= COST.barn) build('barn')
  else if (barn && !farm.tractor && farm.coins >= COST.tractor)
    farm = { ...farm, tractor: true, coins: farm.coins - COST.tractor }
  else if (farm.tractor && houses < MAX_HOUSES && farm.coins >= COST.house) build('house')
  else if (barn && fields < MAX_FIELDS && farm.coins >= COST.field + 10) build('field')
  // The tractor plants one new field a day in spring.
  if (farm.tractor && season === 'spring') {
    const [i, next] = pickTile(farm, farm.rng)
    if (i >= 0) farm = { ...plant(farm, i), rng: next }
  }
  return farm
}

export function stepDays(f: Farm, n: number): Farm {
  let out = f
  for (let i = 0; i < n; i++) out = step(out)
  return out
}

/** Where the script plants: the farm's own next choice, so automation stays deterministic too. */
export function nextPlot(f: Farm): number {
  return pickTile(f, f.rng ^ f.day)[0]
}

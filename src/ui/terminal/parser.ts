// The hidden terminal's brain. Pure: input in, printed lines + side effects out.
// The component applies effects (navigation, sound, automation) so this stays testable.
import { person, terminal as t } from '../../content/copy.ts'
import { projects } from '../../content/projects.ts'
import type { LevelId } from '../../world/levels.ts'

export type Effect =
  | { type: 'zoom'; dir: 1 | -1 }
  | { type: 'goto'; level: LevelId; project?: string }
  | { type: 'sound'; on: boolean }
  | { type: 'automateAll' }
  | { type: 'reset' }
  | { type: 'mail'; delayMs: number }
  | { type: 'clear' }
  | { type: 'exit' }
  | { type: 'visit'; href: string }

export type Result = { lines: string[]; effects: Effect[]; unknown?: true }
export type Context = { atStart: boolean; atEnd: boolean; unknownCount: number }

export const COMMANDS = [
  'help',
  'ls projects',
  'open',
  'whoami',
  'zoom out',
  'zoom in',
  'theme',
  'sound on',
  'sound off',
  'automate all',
  'reset',
  'contact',
  'sudo hire fakhar',
  'clear',
  'exit',
] as const

const pad = (s: string, n: number) => s + ' '.repeat(Math.max(1, n - s.length))
const findProject = (q: string) => {
  const k = q.toLowerCase().replace(/\s+/g, '-')
  return projects.find((p) => p.id === k || p.title.toLowerCase() === q.toLowerCase())
}

export function run(input: string, ctx: Context): Result {
  const raw = input.trim()
  const cmd = raw.toLowerCase().replace(/\s+/g, ' ')
  const out = (lines: string[], effects: Effect[] = []): Result => ({ lines, effects })
  if (!cmd) return out([])

  switch (cmd) {
    case 'help':
      return out(t.help.map(([c, d]) => `${pad(c, 20)}${d}`))
    case 'ls': // the only place writing/ shows up: lowkey on purpose
      return out([...projects.map((p) => `${pad(p.id, 16)}${p.title}`), t.writingEntry])
    case 'cd writing':
    case 'cd writing/':
    case 'open writing':
    case 'open writing/':
      return out([t.writingOpen], [{ type: 'visit', href: '/writing/' }])
    case 'ls projects':
      return out(projects.map((p) => `${pad(p.id, 16)}${p.title}`))
    case 'whoami':
      return out([person.name, person.oneLiner, `${person.location}. ${person.relocation}`])
    case 'zoom out':
      return ctx.atEnd ? out([t.alreadyOut]) : out([t.zoomOut], [{ type: 'zoom', dir: 1 }])
    case 'zoom in':
      return ctx.atStart ? out([t.alreadyIn]) : out([t.zoomIn], [{ type: 'zoom', dir: -1 }])
    case 'theme':
      return out([t.theme])
    case 'sound on':
      return out([t.soundOn], [{ type: 'sound', on: true }])
    case 'sound off':
      return out([t.soundOff], [{ type: 'sound', on: false }])
    case 'sound':
      return out([t.soundUsage])
    case 'automate all':
      return out([t.automateAll], [{ type: 'automateAll' }])
    case 'reset':
      return out([t.reset], [{ type: 'reset' }])
    case 'contact':
      return out([
        `email     ${person.links.email}`,
        `github    ${person.links.github}`,
        `linkedin  ${person.links.linkedin}`,
      ])
    case 'sudo hire fakhar':
      return out([...t.sudoHire], [{ type: 'mail', delayMs: 1200 }])
    case 'clear':
      return out([], [{ type: 'clear' }])
    case 'exit':
    case 'quit':
      return out([t.exit], [{ type: 'exit' }])
    case 'open':
      return out([t.open.noArg])
  }

  if (cmd.startsWith('open ')) {
    const arg = raw.slice(5).trim()
    const p = findProject(arg)
    if (!p) return out([t.open.missing(arg)])
    // shortcut: only RareMind has its own level until stage 5; the rest fly to their star.
    const level: LevelId = p.id === 'raremind' ? 'project' : 'constellation'
    return out([t.open.ok(p.title)], [{ type: 'goto', level, project: p.id }])
  }
  if (cmd.startsWith('sound ')) return out([t.soundUsage])

  // Unknown: rotate through the replies so repeats take a while.
  const reply = t.unknown[ctx.unknownCount % t.unknown.length]!
  return { lines: [reply(raw.split(' ')[0]!)], effects: [], unknown: true }
}

/** Tab completion: the longest unambiguous extension of what's typed. */
export function complete(input: string): string {
  const lower = input.toLowerCase()
  const pool = lower.startsWith('open ')
    ? projects.map((p) => `open ${p.id}`)
    : (COMMANDS as readonly string[])
  const hits = pool.filter((c) => c.startsWith(lower))
  if (!hits.length) return input
  let prefix = hits[0]!
  for (const h of hits) while (!h.startsWith(prefix)) prefix = prefix.slice(0, -1)
  return prefix.length > input.length ? prefix : input
}

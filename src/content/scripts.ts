// The scripts the site writes for the visitor. Each one describes, in real readable code,
// exactly what the automation then does. Typos are marked ⟨wrong|right⟩ and get "fixed" live.
import type { ActionId } from '../automation/machine.ts'
import type { LevelId } from '../world/levels.ts'

export type Script = {
  file: string
  source: string
  /** How often the automated action repeats, in ms (before the global rate limit). */
  cadenceMs: number
  /** Levels where it's allowed to run. Automations never fire somewhere the visitor can't see. */
  levels: readonly LevelId[] | 'any'
}

/** Commands the automated terminal types. The open-terminal script below names the same list. */
export const AUTO_TERMINAL_COMMANDS = ['whoami', 'ls projects', 'help'] as const

export const scripts: Partial<Record<ActionId, Script>> = {
  submitAnswer: {
    file: 'dive.ts',
    cadenceMs: 9_000,
    levels: ['project'],
    source: `// You answered twice. Now the submarine finds its own answers.
import { every, pick, typeInto } from './lib'
import { answers, round } from './raremind'

export default every(9_000, async () => {
  if (!round.isOpen()) round.start()
  // Rarer answers dive deeper, so aim for the bottom of the list.
  const rare = answers.filter((a) => a.share < 2 && !round.said(a))
  await typeInto('#raremind-answer', pick(rare).name)
  round.⟨sumbit|submit⟩()
})`,
  },
  plantField: {
    file: 'plant.ts',
    cadenceMs: 6_000,
    levels: ['constellation'],
    source: `// You planted twice. Now the farm plants itself.
import { every } from './lib'
import { farm } from './agrarian'

export default every(6_000, () => {
  // Same seed, same choice: automation stays deterministic too.
  const tile = farm.nextPlot()
  if (tile !== undefined) farm.⟨palnt|plant⟩(tile)
})`,
  },
  expandToolCall: {
    file: 'expand.ts',
    cadenceMs: 7_000,
    levels: ['constellation'],
    source: `// You opened two tool calls. Now they open themselves.
import { every } from './lib'
import { trace } from './claude-trace'

export default every(7_000, () => {
  const closed = trace.toolCalls().find((call) => !call.⟨exapnded|expanded⟩)
  closed?.expand()
})`,
  },
  swipeCard: {
    file: 'swipe.ts',
    cadenceMs: 5_000,
    levels: ['constellation'],
    source: `// You swiped twice. Now the stack swipes itself, with taste.
import { every } from './lib'
import { stack } from './svype'

export default every(5_000, () => {
  const job = stack.top()
  if (!job) return
  stack.fling(job.match >= ⟨07|70⟩ ? 'right' : 'left')
})`,
  },
  dragRow: {
    file: 'classify.py',
    cadenceMs: 5_000,
    levels: ['constellation'],
    source: `# You dragged rows twice. Now they classify themselves.
from lna import engine, every, table


@every(seconds=5)
def classify_next():
    row = next((r for r in table.rows if not r.classified), None)
    if row:
        engine.⟨rnu|run⟩(row)`,
  },
  openProject: {
    file: 'tour.ts',
    cadenceMs: 14_000,
    levels: ['constellation'],
    source: `// You opened two projects. Now the constellation gives its own tour.
import { every, pick } from './lib'
import { constellation } from './world'

export default every(14_000, async () => {
  const star = pick(constellation.stars.filter((s) => !s.⟨visted|visited⟩))
  await constellation.flyInto(star)
  await constellation.backOut({ after: 6_000 })
})`,
  },
  flingStar: {
    file: 'fling.ts',
    cadenceMs: 8_000,
    levels: ['constellation'],
    source: `// You flung two stars. Now they fling themselves. Springs bring them home.
import { every, pick } from './lib'
import { constellation } from './world'

export default every(8_000, () => {
  const star = pick(constellation.stars)
  const angle = Math.random() * Math.PI * 2
  star.applyImpulse({ x: Math.cos(angle), y: Math.⟨cso|sin⟩(angle) })
})`,
  },
  openTerminal: {
    file: 'open-terminal.ts',
    cadenceMs: 28_000,
    levels: 'any',
    source: `// You opened it twice. Now it opens itself.
import { every, pick, sleep } from './lib'
import { terminal, visitor } from './site'

const COMMANDS = ['whoami', 'ls projects', 'help']

export default every(28_000, async () => {
  if (visitor.isBusy()) return // never in your way
  await ⟨temrinal|terminal⟩.open({ focus: false })
  await terminal.type(pick(COMMANDS))
  await sleep(3_500)
  terminal.close()
})`,
  },
}

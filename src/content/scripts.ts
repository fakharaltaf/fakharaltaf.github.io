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

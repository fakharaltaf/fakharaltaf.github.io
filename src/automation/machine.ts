// "Done twice, it gets a script": one tiny state machine per trackable action.
//
//   unseen ──did it──▶ seenOnce ──did it again──▶ scripting ──script typed──▶ automated ⇄ disabled
//
// Pure: no timers, no DOM, no storage. The store and runner wrap it.
import type { automation } from '../content/copy.ts'

export type ActionId = keyof typeof automation.actions
export type Status = 'unseen' | 'seenOnce' | 'scripting' | 'automated' | 'disabled'

export type AutoEvent =
  | { type: 'PERFORMED'; by: 'visitor' | 'script' }
  | { type: 'SCRIPT_TYPED' }
  | { type: 'TOGGLE' }
  | { type: 'AUTOMATE' } // "automate all": skip doing it twice
  | { type: 'RESET' }

export function next(s: Status, e: AutoEvent): Status {
  if (e.type === 'RESET') return 'unseen'
  switch (s) {
    case 'unseen':
      if (e.type === 'AUTOMATE') return 'automated'
      return e.type === 'PERFORMED' && e.by === 'visitor' ? 'seenOnce' : s
    case 'seenOnce':
      if (e.type === 'AUTOMATE') return 'automated'
      return e.type === 'PERFORMED' && e.by === 'visitor' ? 'scripting' : s
    case 'scripting':
      return e.type === 'SCRIPT_TYPED' || e.type === 'AUTOMATE' ? 'automated' : s
    case 'automated':
      return e.type === 'TOGGLE' ? 'disabled' : s
    case 'disabled':
      // Doing it by hand while disabled is the visitor's choice; it stays manual.
      return e.type === 'TOGGLE' ? 'automated' : s
  }
}

/** Statuses that count towards "You've automated N things". */
export const isRunning = (s: Status) => s === 'automated'

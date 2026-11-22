// Automation state for every action, persisted so a returning visitor's scripts are still there.
// Also owns the script panel's queue and the milestone note, so components stay pure views.
import { create } from 'zustand'
import { automation } from '../content/copy.ts'
import { scripts } from '../content/scripts.ts'
import { type ActionId, type AutoEvent, type Status, isRunning, next } from './machine.ts'

export const ACTION_IDS = Object.keys(automation.actions) as ActionId[]
/** Actions that have a script written for them. Others aren't tracked yet. */
export const SCRIPTED_IDS = ACTION_IDS.filter((id) => scripts[id])
const KEY = 'zo:auto:v1'

type Statuses = Record<ActionId, Status>
type Saved = { v: 1; statuses: Partial<Statuses> }
export type PanelPhase = 'typing' | 'running' | 'done'

function load(): Partial<Statuses> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const data = JSON.parse(raw) as Saved
    if (data.v !== 1) return {}
    const out: Partial<Statuses> = {}
    for (const id of ACTION_IDS) {
      const s = data.statuses[id]
      // Left mid-typing last time? They earned it: restore as automated.
      if (s) out[id] = s === 'scripting' ? 'automated' : s
    }
    return out
  } catch {
    return {}
  }
}

function save(statuses: Statuses) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, statuses } satisfies Saved))
  } catch {
    /* storage blocked: the session still works, it just won't remember */
  }
}

export const automatedCount = (s: Statuses) => Object.values(s).filter(isRunning).length
const blank = () => Object.fromEntries(ACTION_IDS.map((id) => [id, 'unseen'])) as Statuses

type AutomationState = {
  statuses: Statuses
  /** The action the script panel is showing, if any. */
  panel: { id: ActionId; phase: PanelPhase } | null
  /** Actions waiting for the panel. */
  queue: ActionId[]
  /** A short reaction line (welcome back, milestones). */
  note: string | null
  /** Highest count reached, so milestones fire once. */
  best: number
  /** When each script last ran (ms since epoch), for the log. Not persisted. */
  lastRun: Partial<Record<ActionId, number>>
  send: (id: ActionId, e: AutoEvent) => void
  setPanelPhase: (phase: PanelPhase) => void
  closePanel: () => void
  clearNote: () => void
  automateAll: () => void
  reset: () => void
}

const initial = load()
const initialStatuses = { ...blank(), ...initial }

export const useAutomation = create<AutomationState>((set, get) => {
  /** Commit new statuses: persist, and react if a milestone was just reached. */
  const commit = (statuses: Statuses, extra: Partial<AutomationState> = {}) => {
    const count = automatedCount(statuses)
    const { best } = get()
    const milestone = count > best ? automation.milestones[count] : undefined
    set({
      statuses,
      best: Math.max(best, count),
      ...(milestone ? { note: milestone } : {}),
      ...extra,
    })
    save(statuses)
  }

  return {
    statuses: initialStatuses,
    panel: null,
    queue: [],
    lastRun: {},
    note: Object.values(initial).some(isRunning) ? automation.welcomeBack : null,
    best: automatedCount(initialStatuses),

    send(id, e) {
      const { statuses, panel, queue } = get()
      const to = next(statuses[id], e)
      if (to === statuses[id]) return
      const extra: Partial<AutomationState> = {}
      if (to === 'scripting') {
        if (!panel) extra.panel = { id, phase: 'typing' }
        else extra.queue = [...queue, id]
      }
      commit({ ...statuses, [id]: to }, extra)
    },
    setPanelPhase(phase) {
      const { panel } = get()
      if (!panel) return
      if (phase === 'running') get().send(panel.id, { type: 'SCRIPT_TYPED' })
      set({ panel: { ...panel, phase } })
    },
    closePanel() {
      const [head, ...rest] = get().queue
      set({ panel: head ? { id: head, phase: 'typing' } : null, queue: rest })
    },
    clearNote: () => set({ note: null }),
    automateAll() {
      const statuses = { ...get().statuses }
      for (const id of SCRIPTED_IDS) statuses[id] = next(statuses[id], { type: 'AUTOMATE' })
      commit(statuses, { panel: null, queue: [] })
    },
    reset() {
      set({ statuses: blank(), panel: null, queue: [], note: null, best: 0 })
      try {
        localStorage.removeItem(KEY)
      } catch {
        /* fine */
      }
    },
  }
})

/** The visitor did something trackable. Call this from the UI; automated runs must not. */
export function track(id: ActionId) {
  if (!scripts[id]) return
  useAutomation.getState().send(id, { type: 'PERFORMED', by: 'visitor' })
}

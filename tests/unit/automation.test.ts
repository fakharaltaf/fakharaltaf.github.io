import { beforeEach, describe, expect, it } from 'vitest'
import { type Status, next } from '../../src/automation/machine'
import { track, useAutomation } from '../../src/automation/store'
import { finalText, keystrokes } from '../../src/automation/typing'
import { scripts } from '../../src/content/scripts'
import { complete, run } from '../../src/ui/terminal/parser'

const visitor = { type: 'PERFORMED', by: 'visitor' } as const
const script = { type: 'PERFORMED', by: 'script' } as const

describe('automation state machine', () => {
  it('done twice → scripting → automated', () => {
    let s: Status = 'unseen'
    s = next(s, visitor)
    expect(s).toBe('seenOnce')
    s = next(s, visitor)
    expect(s).toBe('scripting')
    s = next(s, visitor) // extra clicks while it types change nothing
    expect(s).toBe('scripting')
    s = next(s, { type: 'SCRIPT_TYPED' })
    expect(s).toBe('automated')
  })
  it('automated runs never count as the visitor doing it', () => {
    expect(next('unseen', script)).toBe('unseen')
    expect(next('seenOnce', script)).toBe('seenOnce')
  })
  it('toggles off and back on; doing it by hand while off keeps it off', () => {
    expect(next('automated', { type: 'TOGGLE' })).toBe('disabled')
    expect(next('disabled', visitor)).toBe('disabled')
    expect(next('disabled', { type: 'TOGGLE' })).toBe('automated')
  })
  it('automate-all skips ahead, reset goes back to the start from anywhere', () => {
    expect(next('unseen', { type: 'AUTOMATE' })).toBe('automated')
    expect(next('disabled', { type: 'AUTOMATE' })).toBe('disabled') // respects "I'll do it myself"
    for (const s of ['seenOnce', 'scripting', 'automated', 'disabled'] as const)
      expect(next(s, { type: 'RESET' })).toBe('unseen')
  })
})

describe('store flow', () => {
  beforeEach(() => useAutomation.getState().reset())
  it('second open shows the panel, typing → running automates it and says so', () => {
    track('openTerminal')
    expect(useAutomation.getState().panel).toBeNull()
    track('openTerminal')
    expect(useAutomation.getState().panel).toEqual({ id: 'openTerminal', phase: 'typing' })
    useAutomation.getState().setPanelPhase('running')
    const s = useAutomation.getState()
    expect(s.statuses.openTerminal).toBe('automated')
    expect(s.note).toBe('There it is.')
    s.closePanel()
    expect(useAutomation.getState().panel).toBeNull()
  })
  it('ignores actions that have no script yet', () => {
    track('flingStar')
    track('flingStar')
    expect(useAutomation.getState().statuses.flingStar).toBe('unseen')
  })
})

describe('typing plan', () => {
  it('ends on exactly the final code, and actually backspaces the typo', () => {
    for (const s of Object.values(scripts)) {
      const keys = keystrokes(s.source)
      expect(keys.at(-1)?.text).toBe(finalText(s.source))
      expect(keys.some((k, i) => i > 0 && k.text.length < keys[i - 1]!.text.length)).toBe(true)
      expect(finalText(s.source)).not.toMatch(/[⟨⟩]/)
    }
  })
  it('is deterministic for a seed', () => {
    const src = 'const ⟨a|b⟩ = 1'
    expect(keystrokes(src, 3)).toEqual(keystrokes(src, 3))
  })
})

describe('terminal parser', () => {
  const ctx = { atStart: false, atEnd: false, unknownCount: 0 }
  it('knows its commands', () => {
    expect(run('help', ctx).lines.length).toBeGreaterThan(5)
    expect(run('whoami', ctx).lines[0]).toBe('Fakhar Altaf')
    expect(run('ls projects', ctx).lines.join(' ')).toContain('raremind')
    expect(run('  Zoom   OUT ', ctx).effects).toEqual([{ type: 'zoom', dir: 1 }])
    expect(run('zoom out', { ...ctx, atEnd: true }).effects).toEqual([])
    expect(run('automate all', ctx).effects).toEqual([{ type: 'automateAll' }])
    expect(run('reset', ctx).effects).toEqual([{ type: 'reset' }])
    expect(run('sound on', ctx).effects).toEqual([{ type: 'sound', on: true }])
    expect(run('sudo hire fakhar', ctx).effects[0]?.type).toBe('mail')
  })
  it('opens projects by id or title, and says when it cannot', () => {
    expect(run('open raremind', ctx).effects[0]).toMatchObject({
      type: 'goto',
      project: 'raremind',
    })
    expect(run('open LNA Bot', ctx).effects[0]).toMatchObject({ project: 'lna-bot' })
    expect(run('open nothing', ctx).effects).toEqual([])
    expect(run('open', ctx).lines[0]).toMatch(/Open what/)
  })
  it('varies its reply to unknown commands', () => {
    const a = run('dance', { ...ctx, unknownCount: 0 })
    const b = run('dance', { ...ctx, unknownCount: 1 })
    expect(a.unknown).toBe(true)
    expect(a.lines[0]).not.toBe(b.lines[0])
  })
  it('tab-completes commands and project names', () => {
    expect(complete('wh')).toBe('whoami')
    expect(complete('zo')).toBe('zoom ')
    expect(complete('open ra')).toBe('open raremind')
    expect(complete('xyz')).toBe('xyz')
  })
})

import { describe, expect, it } from 'vitest'
import { wordDiff } from '../../src/demos/claude-trace/session'
import { RULES, classify } from '../../src/demos/lna-bot/LnaBot'

describe('claude trace word diff', () => {
  it('marks only the words that changed, and rebuilds both sides', () => {
    const d = wordDiff('title: file.name,', 'title: file.name.replace(x),')
    expect(
      d
        .filter((p) => p.op !== 'add')
        .map((p) => p.text)
        .join(''),
    ).toBe('title: file.name,')
    expect(
      d
        .filter((p) => p.op !== 'del')
        .map((p) => p.text)
        .join(''),
    ).toBe('title: file.name.replace(x),')
    expect(d[0]).toEqual({ text: 'title:', op: 'same' })
  })
})

describe('lna rules', () => {
  it('fires the first matching rule, in order, with a catch-all', () => {
    expect(classify({ competency: 'a', trainees: 20, level: 'Advanced' })).toBe(0)
    expect(classify({ competency: 'b', trainees: 6, level: 'Advanced' })).toBe(1)
    expect(classify({ competency: 'c', trainees: 3, level: 'Basic' })).toBe(2)
    expect(classify({ competency: 'd', trainees: 10, level: 'Basic' })).toBe(RULES.length - 1)
  })
})

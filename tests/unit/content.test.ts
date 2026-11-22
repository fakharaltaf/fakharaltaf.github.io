import { describe, expect, it } from 'vitest'
import * as copy from '../../src/content/copy'
import { projects } from '../../src/content/projects'
import { skills } from '../../src/content/skills'
import { renderNotFound, renderPlain, shell } from '../../src/ui/plain/render'

// Every string in the deck, including what the template functions produce.
const strings = (v: unknown): string[] => {
  if (typeof v === 'string') return [v]
  if (typeof v === 'function') return strings((v as (...a: unknown[]) => unknown)('x', ['y'], 'z'))
  if (v && typeof v === 'object') return Object.values(v).flatMap(strings)
  return []
}
// Project scripts are real code quoted from the repos, not copy: the copy rules don't apply.
const all = [...strings(copy), ...strings(projects.map((p) => ({ ...p, script: undefined })))]
  .join('\n')
  .toLowerCase()
const plain = renderPlain({ size: '1 KB', date: '2026-01-01', commit: 'abc1234' })

describe('copy rules', () => {
  it.each([
    'passionate about',
    'leveraging',
    'synergy',
    'cutting-edge',
    'creative problem solver',
    'lorem',
    'ipsum',
    '!',
  ])('has no "%s"', (phrase) => {
    expect(all).not.toContain(phrase)
  })

  it('every project skill exists', () => {
    for (const p of projects) for (const s of p.skills) expect(skills).toHaveProperty(s)
  })
})

describe('plain mode', () => {
  it('contains every project with its links', () => {
    for (const p of projects) {
      expect(plain).toContain(`id="${p.id}"`)
      expect(plain).toContain(p.links.code)
      if (p.links.play) expect(plain).toContain(p.links.play)
    }
  })

  it('has the contact links, JSON-LD and canonical', () => {
    for (const l of Object.values(copy.person.links)) expect(plain).toContain(l)
    expect(plain).toContain('"@type":"Person"')
    expect(plain).toContain('<link rel="canonical" href="https://fakharaltaf.github.io/plain/">')
  })

  it('ships no script except JSON-LD, and no TODOs', () => {
    for (const html of [plain, renderNotFound(), shell().head + shell().body]) {
      expect(html).not.toContain('TODO')
      expect(html.match(/<script(?![^>]*application\/ld\+json)/g)).toBeNull()
    }
  })
})

describe('live sites', () => {
  it('only embeds my own https sites, on this origin', () => {
    for (const p of projects)
      if (p.live) expect(new URL(p.live.url).origin).toBe('https://fakharaltaf.github.io')
  })
})

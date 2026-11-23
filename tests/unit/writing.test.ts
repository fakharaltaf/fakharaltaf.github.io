import { describe, expect, it } from 'vitest'
import { paragraphs, pieceName, slugFrom, slugify, SLUG } from '../../src/writing/core'
import { writingHead } from '../../src/ui/plain/render'
import { run } from '../../src/ui/terminal/parser'

describe('writing', () => {
  it('keeps paragraphs and single line breaks', () => {
    expect(paragraphs('One\ntwo\r\n\n\nThree  \n')).toEqual([['One', 'two'], ['Three']])
  })

  it('names a piece by its title, or its first line', () => {
    expect(pieceName({ title: null, body: 'First line\nsecond' })).toBe('First line')
    expect(pieceName({ title: ' T ', body: 'x' })).toBe('T')
  })

  it('reads the link safely', () => {
    expect(slugFrom('')).toBeNull()
    expect(slugFrom('?p=first-piece')).toBe('first-piece')
    expect(slugFrom('?p=<script>')).toBe('')
    expect(slugify('Notes from a long, quiet week in the city.')).toBe('notes-from-a-long-quiet-week')
    expect(SLUG.test(slugify('Ça va? Ünïcode — fine'))).toBe(true)
  })

  it('pages tell search engines to stay out', () => {
    expect(writingHead('/writing/')).toContain('name="robots" content="noindex"')
    expect(writingHead('/writing/admin/index.html')).toContain('<title>Write')
  })

  it('only the terminal knows where it is', () => {
    const ctx = { atStart: true, atEnd: false, unknownCount: 0 }
    expect(run('ls', ctx).lines.join(' ')).toContain('writing/')
    expect(run('ls projects', ctx).lines.join(' ')).not.toContain('writing/')
    expect(run('cd writing', ctx).effects).toEqual([{ type: 'visit', href: '/writing/' }])
  })
})

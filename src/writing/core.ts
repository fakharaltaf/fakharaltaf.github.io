// Writing: the shared, pure parts (no network, no DOM), so they're testable.
export type Piece = {
  slug: string
  title: string | null
  date: string // YYYY-MM-DD
  listed: boolean
  body: string
  updated_at?: string
}

export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Paragraphs split on blank lines; single line breaks kept. */
export const paragraphs = (body: string): string[][] =>
  body
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.split('\n').map((l) => l.trimEnd()).filter(Boolean))
    .filter((p) => p.length)

/** What to call a piece: its title, or its first line. */
export const pieceName = (p: Pick<Piece, 'title' | 'body'>) =>
  p.title?.trim() || paragraphs(p.body)[0]?.[0] || ''

/** "first-piece" from /writing/?p=first-piece; null for the list. */
export function slugFrom(search: string): string | null {
  const s = new URLSearchParams(search).get('p')
  return s && SLUG.test(s) ? s : s === null ? null : ''
}

/** A suggested link name from a title or first line. */
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')
    .slice(0, 6)
    .join('-')

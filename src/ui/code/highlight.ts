// A tiny line-based highlighter for the TS/Python snippets the site shows. Not a parser:
// it only needs to colour short, known-good code believably.
import type { syntax } from '../../styles/tokens.ts'

export type TokenKind = keyof typeof syntax
export type Token = { text: string; kind: TokenKind }

const KEYWORDS = new Set(
  'import from export const let async await for of in if else return function def class new type interface while try except with as pass yield lambda None True False true false null undefined'.split(
    ' ',
  ),
)
const TYPES = new Set(
  'string number boolean void unknown File Promise str int float list dict'.split(' '),
)

const RULES: [RegExp, TokenKind | 'word'][] = [
  [/^(\/\/.*|#.*)/, 'comment'],
  [/^(`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/, 'string'],
  [/^\/(?![*/\s])(?:[^/\\\n]|\\.)+\/[gimsuy]*/, 'string'], // regex literal
  [/^\d+(\.\d+)?/, 'number'],
  [/^[A-Za-z_$][\w$]*/, 'word'],
  [/^\s+/, 'plain'],
  [/^./, 'punct'],
]

export function highlightLine(line: string): Token[] {
  const out: Token[] = []
  let rest = line
  let prevWord = ''
  while (rest.length) {
    for (const [re, kind] of RULES) {
      const m = re.exec(rest)
      if (!m) continue
      const text = m[0]
      let k: TokenKind
      if (kind === 'word') {
        const next = rest.slice(text.length).trimStart()
        k = KEYWORDS.has(text)
          ? 'keyword'
          : TYPES.has(text)
            ? 'type'
            : next.startsWith('(') || prevWord === 'function' || prevWord === 'def'
              ? 'fn'
              : 'plain'
        prevWord = text
      } else {
        k = kind
      }
      // A slash after an identifier or ')' is division, not a regex.
      if (
        kind === 'string' &&
        text.startsWith('/') &&
        /[\w)\]]\s*$/.test(line.slice(0, line.length - rest.length))
      ) {
        continue
      }
      const last = out[out.length - 1]
      if (last && last.kind === k) last.text += text
      else out.push({ text, kind: k })
      rest = rest.slice(text.length)
      break
    }
  }
  return out
}

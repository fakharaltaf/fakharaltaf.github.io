// Believable typing for the script panel. Snippets mark typos inline as ⟨wrong|right⟩:
// the typer types `wrong`, pauses, backspaces it, then types `right`. Deterministic per snippet.
import { mulberry32 } from '../systems/random.ts'

export type Keystroke = { text: string; delay: number } // `text` is the whole buffer after the key

const TYPO = /⟨([^|⟩]*)\|([^⟩]*)⟩/g

/** The code as it finally reads, with typo markers resolved. */
export const finalText = (src: string) => src.replace(TYPO, '$2')

export function keystrokes(src: string, seed = 1, msPerChar = 16): Keystroke[] {
  const rnd = mulberry32(seed)
  const out: Keystroke[] = []
  let buf = ''
  const key = (ch: string) => {
    buf += ch
    // Faster through indentation, a beat at line ends, jitter everywhere else.
    const base = ch === ' ' ? msPerChar * 0.4 : ch === '\n' ? msPerChar * 6 : msPerChar
    out.push({ text: buf, delay: base * (0.6 + rnd() * 0.9) })
  }
  let last = 0
  for (const m of src.matchAll(TYPO)) {
    for (const ch of src.slice(last, m.index)) key(ch)
    const [, wrong = '', right = ''] = m
    for (const ch of wrong) key(ch)
    out.push({ text: buf, delay: msPerChar * 14 }) // the "wait, no" pause
    for (let i = 0; i < wrong.length; i++) {
      buf = buf.slice(0, -1)
      out.push({ text: buf, delay: msPerChar * 2.2 })
    }
    for (const ch of right) key(ch)
    last = m.index + m[0].length
  }
  for (const ch of src.slice(last)) key(ch)
  return out
}

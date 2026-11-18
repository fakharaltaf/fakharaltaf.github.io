import { describe, expect, it } from 'vitest'
import { controls, palette } from '../../src/styles/tokens'

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

describe('WCAG AA contrast', () => {
  for (const [theme, p] of Object.entries(palette)) {
    for (const key of ['ink', 'muted', 'anchorInk', 'actionInk'] as const) {
      it(`${theme}: ${key} on canvas and surface`, () => {
        expect(contrast(p[key], p.canvas)).toBeGreaterThanOrEqual(4.5)
        expect(contrast(p[key], p.surface)).toBeGreaterThanOrEqual(4.5)
      })
    }
  }

  for (const [name, states] of Object.entries(controls)) {
    for (const [state, { bg, fg }] of Object.entries(states)) {
      if (state === 'disabled') continue // WCAG exempts disabled controls
      it(`.btn-${name}:${state} locked pair`, () => {
        expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5)
      })
    }
  }
})

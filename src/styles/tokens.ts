// Single source of design tokens. CSS variables are generated from this file (see toCss),
// so the TS object and the stylesheet can never drift apart.

export const palette = {
  dark: {
    canvas: '#0B0F0E',
    surface: '#121816',
    line: '#1F2926',
    ink: '#E9F0EE',
    muted: '#8A9A95',
    anchorInk: '#1D9E75', // anchor used as text
    actionInk: '#D85A30', // action used as text
  },
  // Light only ships in plain mode (agreed cut). Designed, not inverted: anchor/action darkened to hold AA as text.
  light: {
    canvas: '#F3F6F5',
    surface: '#FFFFFF',
    line: '#D5DDDA',
    ink: '#0F1513',
    muted: '#4D5A56',
    anchorInk: '#11704F',
    actionInk: '#A63E1B',
  },
} as const

export const brand = {
  anchor: '#1D9E75',
  action: '#D85A30',
  neutral: '#3A4542',
  // Text on light fills. #1A1A1A from the brief only reaches 4.49:1 on coral, so it's nudged darker.
  onLight: '#111111',
  onDark: '#FFFFFF',
} as const

type Pair = { bg: string; fg: string }
type ControlStates = Record<'default' | 'hover' | 'active' | 'focus' | 'disabled', Pair>

// Every control sets background AND text as a locked pair in every state. Never inherit.
export const controls: Record<'primary' | 'secondary' | 'action' | 'quiet', ControlStates> = {
  primary: {
    default: { bg: brand.anchor, fg: brand.onLight },
    hover: { bg: '#27B587', fg: brand.onLight },
    active: { bg: '#22A87D', fg: brand.onLight },
    focus: { bg: brand.anchor, fg: brand.onLight },
    disabled: { bg: brand.neutral, fg: '#9AA6A2' },
  },
  secondary: {
    default: { bg: '#18201E', fg: brand.onDark },
    hover: { bg: '#222D2A', fg: brand.onDark },
    active: { bg: '#0F1513', fg: brand.onDark },
    focus: { bg: '#18201E', fg: brand.onDark },
    disabled: { bg: brand.neutral, fg: '#9AA6A2' },
  },
  action: {
    default: { bg: brand.action, fg: brand.onLight },
    hover: { bg: '#E46A40', fg: brand.onLight },
    active: { bg: '#DD6136', fg: brand.onLight },
    focus: { bg: brand.action, fg: brand.onLight },
    disabled: { bg: brand.neutral, fg: '#9AA6A2' },
  },
  // Text-only control on the canvas: same dark fill as the page, so it still sets a locked pair.
  quiet: {
    default: { bg: palette.dark.canvas, fg: palette.dark.muted },
    hover: { bg: palette.dark.canvas, fg: palette.dark.ink },
    active: { bg: palette.dark.canvas, fg: palette.dark.anchorInk },
    focus: { bg: palette.dark.canvas, fg: palette.dark.ink },
    disabled: { bg: palette.dark.canvas, fg: brand.neutral },
  },
}

// Syntax colours for code drawn on canvas and in the script panel. Restrained: teal family + sand.
export const syntax = {
  plain: '#E9F0EE',
  keyword: '#1D9E75',
  type: '#9FC9BC',
  fn: '#F2F7F5',
  string: '#C9B48A',
  number: '#C9B48A',
  comment: '#7E8E89',
  punct: '#8A9A95',
} as const

// Spring tokens: stiffness (N/m-ish) and damping. Used by the camera rig and UI motion.
export const spring = {
  camera: { stiffness: 90, damping: 22 },
  ui: { stiffness: 380, damping: 32 },
  snappy: { stiffness: 620, damping: 42 },
  gentle: { stiffness: 55, damping: 16 },
} as const

export const font = {
  mono: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  sans: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
} as const

export const fontFaces = `
@font-face{font-family:"JetBrains Mono";src:url(/fonts/jetbrains-mono.woff2) format("woff2");font-weight:100 800;font-display:swap}
@font-face{font-family:Inter;src:url(/fonts/inter.woff2) format("woff2");font-weight:100 900;font-display:swap}`

const vars = (o: Record<string, string>) =>
  Object.entries(o)
    .map(([k, v]) => `--${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}:${v}`)
    .join(';')

const controlCss = () =>
  Object.entries(controls)
    .map(([name, s]) => {
      const sel = `.btn-${name}`
      return [
        `${sel}{background:${s.default.bg};color:${s.default.fg}}`,
        `${sel}:hover{background:${s.hover.bg};color:${s.hover.fg}}`,
        `${sel}:active{background:${s.active.bg};color:${s.active.fg}}`,
        `${sel}:focus-visible{background:${s.focus.bg};color:${s.focus.fg};outline:2px solid var(--anchor);outline-offset:3px}`,
        `${sel}:disabled,${sel}[aria-disabled=true]{background:${s.disabled.bg};color:${s.disabled.fg};cursor:not-allowed}`,
      ].join('')
    })
    .join('')

/** CSS for tokens. `withLight` adds the plain-mode light theme via prefers-color-scheme. */
export function toCss({ withLight = false } = {}): string {
  const base = `:root{${vars(palette.dark)};${vars(brand)};--mono:${font.mono};--sans:${font.sans};color-scheme:dark}`
  const light = withLight
    ? `@media (prefers-color-scheme: light){:root{${vars(palette.light)};color-scheme:light}}`
    : ''
  const syntaxCss = Object.entries(syntax)
    .map(([k, v]) => `.tok-${k}{color:${v}}`)
    .join('')
  return fontFaces + base + light + controlCss() + syntaxCss
}

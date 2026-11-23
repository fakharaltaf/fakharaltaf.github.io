// A tiny DOM builder. Text always goes in as text, never as HTML.
type Attrs = Record<string, string | boolean | ((e: Event) => void)>

export function h(tag: string, attrs: Attrs = {}, ...kids: (Node | string | null | false)[]) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v)
    else if (v === true) el.setAttribute(k, '')
    else if (v !== false) el.setAttribute(k, v)
  }
  for (const k of kids) if (k) el.append(k)
  return el
}

export const caret = () => h('span', { class: 'caret', 'aria-hidden': 'true' })

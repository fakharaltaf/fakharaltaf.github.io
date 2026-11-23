// /writing/ (the list) and /writing/?p=<slug> (one piece). Fetched at runtime; nothing is
// in the repo or the build.
import { writing as t } from '../content/copy.ts'
import { type Piece, paragraphs, pieceName, slugFrom } from './core.ts'
import { db } from './db.ts'
import { caret, h } from './dom.ts'

const main = document.getElementById('main')!
const foot = document.getElementById('foot')!
const show = (...kids: Node[]) => main.replaceChildren(...kids)
const note = (text: string) => h('p', { class: 'empty' }, text)
const link = (href: string, text: string) => h('a', { href }, text)
const COLS = 'slug,title,date,listed,body'

async function list() {
  foot.replaceChildren(link('/', t.home))
  const { data, error } = await db!.from('pieces').select(COLS).eq('listed', true).order('date', { ascending: false })
  if (error) return show(h('h1', {}, t.heading), note(t.offline))
  const pieces = data as Piece[]
  show(
    h('h1', {}, t.heading, caret()),
    pieces.length
      ? h(
          'ol',
          { class: 'pieces' },
          ...pieces.map((p) =>
            h('li', {}, h('time', { datetime: p.date }, t.date(p.date)), link(`/writing/?p=${p.slug}`, pieceName(p))),
          ),
        )
      : note(t.empty),
  )
}

async function one(slug: string) {
  foot.replaceChildren(link('/writing/', t.all), link('/', t.home))
  const { data, error } = slug ? await db!.rpc('get_piece', { p_slug: slug }) : { data: [], error: null }
  if (error) return show(note(t.offline))
  const p = (data as Piece[])[0]
  if (!p) return show(h('h1', {}, t.heading), note(t.missing))
  document.title = `${pieceName(p)} · ${t.title}`
  const paras = paragraphs(p.body)
  show(
    h(
      'article',
      {},
      h('h1', p.title ? {} : { class: 'sr-only' }, pieceName(p)),
      h('time', { datetime: p.date }, t.date(p.date)),
      h(
        'div',
        { class: 'piece' },
        ...paras.map((lines, i) =>
          h(
            'p',
            {},
            ...lines.flatMap((l, j) => (j ? [h('br'), l] : [l])),
            i === paras.length - 1 ? caret() : null,
          ),
        ),
      ),
    ),
  )
}

if (!db) show(note(t.notSetUp))
else {
  show(note(t.loading))
  const slug = slugFrom(location.search)
  void (slug === null ? list() : one(slug))
}

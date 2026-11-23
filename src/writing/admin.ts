// /writing/admin/: sign in with an emailed link, then write, edit and delete.
// The page only shows controls; the database decides who may write (supabase/writing.sql).
import { writing } from '../content/copy.ts'
import { type Piece, SLUG, pieceName, slugify } from './core.ts'
import { db } from './db.ts'
import { h } from './dom.ts'

const t = writing.admin
const main = document.getElementById('main')!
const foot = document.getElementById('foot')!
const show = (...kids: (Node | null)[]) => main.replaceChildren(...kids.filter((k) => k !== null))
const note = (text: string, cls = 'empty') => h('p', { class: cls, role: 'status' }, text)
const today = () => new Date().toISOString().slice(0, 10)

function signInForm() {
  foot.replaceChildren(h('a', { href: '/writing/' }, writing.all))
  const email = h('input', { type: 'email', id: 'email', required: true, autocomplete: 'email' }) as HTMLInputElement
  const status = h('p', { class: 'empty', role: 'status' })
  const form = h(
    'form',
    {
      class: 'admin',
      onSubmit: async (e: Event) => {
        e.preventDefault()
        const addr = email.value.trim().toLowerCase()
        // shouldCreateUser: false — unknown emails never get an account, let alone a link.
        await db!.auth.signInWithOtp({
          email: addr,
          options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}/writing/admin/` },
        })
        // Same reply either way, so the form doesn't reveal who can write.
        status.textContent = t.sent(addr)
      },
    },
    h('label', { for: 'email' }, t.emailLabel),
    email,
    h('button', { type: 'submit', class: 'btn btn-primary' }, t.sendLink),
    status,
  )
  show(h('h1', {}, t.heading), form)
}

async function dashboard(msg?: string) {
  foot.replaceChildren(
    h('a', { href: '/writing/' }, writing.all),
    h('button', { type: 'button', class: 'linkish', onClick: () => void db!.auth.signOut() }, t.signOut),
  )
  const { data: author } = await db!.rpc('is_author')
  if (!author) return show(h('h1', {}, t.heading), note(t.notAuthor))
  const { data, error } = await db!.from('pieces').select('*').order('date', { ascending: false })
  if (error) return show(h('h1', {}, t.heading), note(writing.offline))
  const pieces = data as Piece[]
  show(
    h('h1', {}, t.heading),
    msg ? note(msg, 'ok') : null,
    h('p', {}, h('button', { type: 'button', class: 'btn btn-primary', onClick: () => editor() }, t.newPiece)),
    pieces.length
      ? h(
          'ol',
          { class: 'pieces' },
          ...pieces.map((p) =>
            h(
              'li',
              {},
              h('time', { datetime: p.date }, writing.date(p.date) + (p.listed ? '' : ` · ${t.unlisted}`)),
              h(
                'span',
                { class: 'row' },
                h('a', { href: `/writing/?p=${p.slug}` }, pieceName(p)),
                h('button', { type: 'button', class: 'linkish', onClick: () => editor(p) }, t.edit),
                h(
                  'button',
                  {
                    type: 'button',
                    class: 'linkish danger',
                    onClick: async () => {
                      if (!confirm(t.confirmRemove(pieceName(p)))) return
                      const { error } = await db!.from('pieces').delete().eq('slug', p.slug)
                      void dashboard(error ? t.failed(error.message) : undefined)
                    },
                  },
                  t.remove,
                ),
              ),
            ),
          ),
        )
      : note(writing.empty),
  )
}

function field(id: string, label: string, input: HTMLElement) {
  input.id = id
  return h('p', { class: 'field' }, h('label', { for: id }, label), input)
}

function editor(p?: Piece) {
  const slug = h('input', { required: true, maxlength: '80', spellcheck: 'false' }) as HTMLInputElement
  const title = h('input', { maxlength: '200' }) as HTMLInputElement
  const date = h('input', { type: 'date', required: true }) as HTMLInputElement
  const listed = h('input', { type: 'checkbox' }) as HTMLInputElement
  const body = h('textarea', { required: true, rows: '18' }) as HTMLTextAreaElement
  const status = h('p', { class: 'empty', role: 'status' })
  slug.value = p?.slug ?? ''
  slug.disabled = !!p // the link is the identity; a new link is a new piece
  title.value = p?.title ?? ''
  date.value = p?.date ?? today()
  listed.checked = p?.listed ?? true
  body.value = p?.body ?? ''
  // Suggest a link name from the first line, until it's typed by hand.
  let typed = !!p
  slug.addEventListener('input', () => (typed = true))
  const suggest = () => {
    if (!typed) slug.value = slugify(title.value || body.value.split('\n')[0] || '')
  }
  title.addEventListener('input', suggest)
  body.addEventListener('input', suggest)

  show(
    h('h1', {}, p ? pieceName(p) : t.newPiece),
    h(
      'form',
      {
        class: 'admin',
        onSubmit: async (e: Event) => {
          e.preventDefault()
          if (!SLUG.test(slug.value)) return void (status.textContent = t.badSlug)
          if (!body.value.trim()) return void (status.textContent = t.emptyBody)
          const row = {
            slug: slug.value,
            title: title.value.trim() || null,
            date: date.value,
            listed: listed.checked,
            body: body.value.replace(/\s+$/, ''),
          }
          // New: insert (fails if the link is taken). Existing: update that one row.
          const { error } = p
            ? await db!.from('pieces').update(row).eq('slug', p.slug)
            : await db!.from('pieces').insert(row)
          if (error) status.textContent = t.failed(error.message)
          else void dashboard(t.saved)
        },
      },
      field('slug', t.slugLabel, slug),
      field('title', t.titleLabel, title),
      field('date', t.dateLabel, date),
      h('p', { class: 'field check' }, listed, h('label', { for: 'listed' }, t.listedLabel)),
      field('body', t.bodyLabel, body),
      h(
        'p',
        { class: 'actions' },
        h('button', { type: 'submit', class: 'btn btn-primary' }, t.save),
        h('button', { type: 'button', class: 'btn btn-secondary', onClick: () => void dashboard() }, t.cancel),
      ),
      status,
    ),
  )
  listed.id = 'listed'
  body.focus()
}

if (!db) show(note(writing.notSetUp))
else {
  show(note(writing.loading))
  // The emailed link lands here with a code; the client trades it for a session.
  // Only these redraw the page: a token refresh mid-edit must not wipe the editor.
  db.auth.onAuthStateChange((event, session) => {
    if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') return
    queueMicrotask(() => (session ? void dashboard() : signInForm()))
  })
}

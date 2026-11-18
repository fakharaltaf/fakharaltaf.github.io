// The DOM half of each level: real, selectable, screen-reader-friendly text over the 3D world.
import { useEffect, useState } from 'react'
import { automation, github, levels, person } from '../content/copy.ts'
import { useEggs } from './Eggs.tsx'
import { type Sourced, getActivity } from '../systems/github.ts'
import { projects } from '../content/projects.ts'
import { navigate } from '../world/hash.ts'
import { useDemos } from '../demos/store.ts'
import { remap } from '../world/levels.ts'
import { dive } from '../world/zoom.ts'
import type { Frame } from '../world/timeline.ts'
import { useFade } from './useFade.ts'

const window_ = (a: number, b: number, c: number) => (f: Frame) =>
  remap(f.t[a]!, b, 1) * (1 - remap(f.t[a + 1] ?? 0, 0, c))

const fades = {
  line: window_(0, 0.6, 0.12),
  script: window_(1, 0.6, 0.12),
  project: (f: Frame) => (dive.id ? remap(dive.value, 0.6, 1) : window_(2, 0.7, 0.3)(f)),
  constellation: (f: Frame) => window_(3, 0.7, 0.3)(f) * (1 - dive.value),
  person: window_(4, 0.7, 0.3),
  outro: (f: Frame) => f.outroCaret,
}

function Caption({
  text,
  fade,
  small,
  hint,
}: {
  text: string
  fade: (f: Frame) => number
  small?: boolean
  hint?: boolean
}) {
  const ref = useFade<HTMLParagraphElement>(fade)
  return (
    <p ref={ref} className={`fade caption${small ? ' small' : ''}${hint ? ' hint-line' : ''}`}>
      {text}
    </p>
  )
}

const Ext = ({ href, label, cls }: { href: string; label: string; cls: string }) => (
  <a className={`btn ${cls}`} href={href} target="_blank" rel="noopener">
    {label}
    <span aria-hidden="true"> ↗</span>
  </a>
)

function ProjectCard() {
  const ref = useFade<HTMLElement>(fades.project)
  const id = useDemos((s) => s.present) ?? 'raremind'
  const p = projects.find((x) => x.id === id) ?? projects[0]!
  return (
    <section ref={ref} className="fade card" aria-labelledby="pj-title">
      <p className="kicker">{levels.project.srHeading}</p>
      <h2 id="pj-title" className={p.title.length > 24 ? 'long' : undefined}>
        {p.title}
      </h2>
      <p>{p.description}</p>
      <ul className="chips" aria-label={levels.project.stackLabel}>
        {p.stack.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <p className="actions">
        {p.links.play && <Ext href={p.links.play} label={levels.project.play} cls="btn-primary" />}
        <Ext href={p.links.code} label={levels.project.code} cls="btn-secondary" />
      </p>
    </section>
  )
}

/** Live public GitHub activity, cached; falls back to the build-time snapshot quietly. */
function GitHubActivity() {
  const [a, setA] = useState<Sourced | null>(null)
  useEffect(() => {
    let alive = true
    void getActivity().then((x) => alive && setA(x))
    return () => {
      alive = false
    }
  }, [])
  return (
    <div className="gh">
      <p className="label">{github.heading}</p>
      {!a ? (
        <p className="muted">{github.loading}</p>
      ) : a.repos.length === 0 ? (
        <p className="muted">{github.empty}</p>
      ) : (
        <ul>
          {a.repos.map((r) => (
            <li key={r.url}>
              <a href={r.url} target="_blank" rel="noopener">
                {r.name}
              </a>{' '}
              <span className="muted">{github.pushed(r.pushes, r.pushedAt)}</span>
              {r.message && <span className="msg">{r.message}</span>}
            </li>
          ))}
        </ul>
      )}
      {a?.source === 'snapshot' && (
        <p className="muted small">
          {a.reason === 'rateLimited' ? github.rateLimited : github.offline}
        </p>
      )}
    </div>
  )
}

function PersonCard() {
  const ref = useFade<HTMLElement>(fades.person)
  return (
    <section ref={ref} className="fade card" aria-labelledby="ps-title">
      <p className="kicker">
        {levels.person.pin} · {person.relocation}
      </p>
      <h2 id="ps-title" className="sr-only">
        {person.name}
      </h2>
      <p className="big">{person.oneLiner}</p>
      <p className="what">{person.whatIDo.join(' ')}</p>
      <p>
        <span className="label">{levels.person.openToLabel}</span> {person.openTo}
      </p>
      <p className="muted">{person.currently}</p>
      <GitHubActivity />
    </section>
  )
}

function Outro() {
  const ending = useEggs((s) => s.ending)
  const ref = useFade<HTMLElement>(fades.outro, 0)
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(person.links.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 2400)
    } catch {
      location.href = `mailto:${person.links.email}`
    }
  }
  return (
    <section ref={ref} className="fade outro" aria-labelledby="outro-title">
      <span className="caret" aria-hidden="true" />
      <div className="outro-body">
        <h2 id="outro-title" className="motto">
          {person.motto}
        </h2>
        <p className="lead">{ending ? automation.ending : levels.outro.lead}</p>
        <p className="actions">
          <a className="btn btn-primary" href={`mailto:${person.links.email}`}>
            {levels.outro.email}
          </a>
          <button type="button" className="btn btn-secondary" onClick={copy}>
            <span aria-live="polite">{copied ? levels.outro.copied : levels.outro.copyEmail}</span>
          </button>
          <Ext href={person.links.github} label={levels.outro.github} cls="btn-secondary" />
          <Ext href={person.links.linkedin} label={levels.outro.linkedin} cls="btn-secondary" />
        </p>
        <p>
          <button type="button" className="btn btn-quiet" onClick={() => navigate('cursor')}>
            ↑ {levels.outro.zoomBackIn}
          </button>
        </p>
      </div>
    </section>
  )
}

export function Overlays() {
  return (
    <div className="overlays">
      <Caption text={levels.line.caption} fade={fades.line} />
      <Caption text={levels.script.caption} fade={fades.script} />
      <ProjectCard />
      <Caption text={levels.constellation.caption} fade={fades.constellation} small />
      <Caption text={levels.constellation.hint} fade={fades.constellation} small hint />
      <PersonCard />
      <Caption text={levels.person.knockHint} fade={fades.person} small hint />
      <Outro />
    </div>
  )
}

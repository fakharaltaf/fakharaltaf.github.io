// The DOM half of each level: real, selectable, screen-reader-friendly text over the 3D world.
import { useState } from 'react'
import { levels, person } from '../content/copy.ts'
import { projects } from '../content/projects.ts'
import { navigate } from '../world/hash.ts'
import { remap } from '../world/levels.ts'
import type { Frame } from '../world/timeline.ts'
import { useFade } from './useFade.ts'

const window_ = (a: number, b: number, c: number) => (f: Frame) =>
  remap(f.t[a]!, b, 1) * (1 - remap(f.t[a + 1] ?? 0, 0, c))

const fades = {
  line: window_(0, 0.6, 0.12),
  script: window_(1, 0.6, 0.12),
  project: window_(2, 0.7, 0.3),
  constellation: window_(3, 0.7, 0.3),
  person: window_(4, 0.7, 0.3),
  outro: (f: Frame) => f.outroCaret,
}

function Caption({
  text,
  fade,
  small,
}: {
  text: string
  fade: (f: Frame) => number
  small?: boolean
}) {
  const ref = useFade<HTMLParagraphElement>(fade)
  return (
    <p ref={ref} className={`fade caption${small ? ' small' : ''}`}>
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
  const p = projects[0]!
  return (
    <section ref={ref} className="fade card" aria-labelledby="pj-title">
      <p className="kicker">{levels.project.srHeading}</p>
      <h2 id="pj-title">{p.title}</h2>
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
    </section>
  )
}

function Outro() {
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
        <p className="lead">{levels.outro.lead}</p>
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
      <PersonCard />
      <Outro />
    </div>
  )
}

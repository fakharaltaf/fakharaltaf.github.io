// Static HTML for the pages that must work without JavaScript: plain mode, 404, and the
// experience shell's <head>. Pure functions over the copy deck; the Vite plugin writes them out.
import { notFound, person, plain, site, skip, levels, loading } from '../../content/copy.ts'
import { projects } from '../../content/projects.ts'
import { toCss } from '../../styles/tokens.ts'

export type BuildStamp = { size: string; date: string; commit: string }

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const ext = (href: string, label: string, cls = '') =>
  `<a${cls ? ` class="${cls}"` : ''} href="${esc(href)}" rel="noopener">${esc(label)}<span aria-hidden="true"> ↗</span></a>`

const jsonLd = () =>
  `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    url: site.url,
    jobTitle: person.role,
    address: { '@type': 'PostalAddress', addressLocality: 'Lahore', addressCountry: 'PK' },
    sameAs: [person.links.github, person.links.linkedin],
  }).replace(/</g, '\\u003c')}</script>`

function head(o: { title: string; description: string; path: string; ld?: boolean; css: string }) {
  const url = site.url + o.path
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#0B0F0E">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/figtree.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/jetbrains-mono.woff2" as="font" type="font/woff2" crossorigin>
<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta name="twitter:card" content="summary">
${o.ld ? jsonLd() : ''}
<style>${o.css}</style>`
}

// Shared base: reset, focus rings, caret. Small enough to inline on every static page.
const baseCss = `*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--canvas);color:var(--ink);font:400 1.0625rem/1.6 var(--sans);-webkit-font-smoothing:antialiased}
a{color:var(--anchor-ink);text-decoration:underline;text-underline-offset:.2em;text-decoration-thickness:1px}
a:hover{color:var(--ink);text-decoration-thickness:2px}
a:active{color:var(--ink)}
:focus-visible{outline:2px solid var(--anchor);outline-offset:3px;border-radius:2px}
.mono{font-family:var(--mono)}
.btn{display:inline-flex;align-items:center;gap:.5em;min-height:44px;padding:.6em 1.1em;font:500 .875rem/1.3 var(--mono);text-decoration:none;border-radius:2px}
.caret{display:inline-block;width:.08em;min-width:3px;height:.9em;margin-left:.08em;vertical-align:-.05em;background:var(--anchor);animation:blink 1.06s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
@media (prefers-reduced-motion:reduce){.caret{animation:none}}
.sr-only{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}`

const plainCss = `${baseCss}
.skip{position:absolute;left:1rem;top:-4rem;background:var(--anchor);color:var(--on-light);padding:.6em 1em;font:500 .875rem var(--mono);z-index:2}
.skip:focus{top:1rem;color:var(--on-light)}
.wrap{max-width:48rem;margin:0 auto;padding:clamp(2.5rem,8vw,6rem) max(1rem,env(safe-area-inset-right)) 3rem max(1rem,env(safe-area-inset-left))}
.kicker{margin:0 0 1rem;font:500 .8125rem/1.4 var(--mono);color:var(--muted)}
h1{margin:0;font-size:clamp(2.75rem,9vw,5rem);line-height:1;font-weight:700;letter-spacing:-.03em}
.lead{margin:1.5rem 0 .5rem;font-size:clamp(1.2rem,2.6vw,1.45rem);line-height:1.4;max-width:34ch}
.where{margin:0;color:var(--muted)}
.cta{display:flex;flex-wrap:wrap;gap:.75rem;margin:2rem 0 0}
section{display:grid;grid-template-columns:9rem 1fr;gap:1rem 2rem;padding:2.75rem 0 0;margin-top:2.75rem;border-top:1px solid var(--line)}
h2{margin:0;font:500 .8125rem/1.7 var(--mono);color:var(--muted)}
h2 span{color:var(--anchor-ink)}
section>div>:first-child{margin-top:0}
ul.what{margin:0;padding:0;list-style:none}
ul.what li{margin:0 0 .5rem}
.note{color:var(--muted)}
article{padding:0 0 1.75rem;margin:0 0 1.75rem;border-bottom:1px solid var(--line)}
article:last-child{border-bottom:0;margin-bottom:0}
h3{margin:0 0 .4rem;font-size:1.25rem;line-height:1.3;font-weight:650;letter-spacing:-.01em}
article p{margin:0 0 .75rem}
.stack{display:flex;flex-wrap:wrap;gap:.25rem .9rem;margin:0 0 .75rem;padding:0;list-style:none;font:400 .8125rem/1.6 var(--mono);color:var(--muted)}
.links{display:flex;gap:1.25rem;font:500 .875rem var(--mono)}
.links a{display:inline-block;padding:.35rem 0}
dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:.5rem 1.25rem}
dt{font:400 .8125rem/1.9 var(--mono);color:var(--muted)}
dd{margin:0;word-break:break-word}
footer{margin-top:4rem;padding-top:1.5rem;border-top:1px solid var(--line);font:400 .8125rem/1.7 var(--mono);color:var(--muted)}
footer p{margin:0 0 .25rem}
footer .motto{color:var(--ink)}
@media (max-width:40rem){section{grid-template-columns:1fr;gap:.75rem}}
@media print{
:root{--canvas:#fff;--ink:#000;--muted:#444;--line:#ccc;--anchor-ink:#000}
.skip,.cta,.caret,footer .back{display:none}
.wrap{padding:0;max-width:none}
section{break-inside:avoid}
article{break-inside:avoid}
a[href^="http"]::after{content:" (" attr(href) ")";font-size:.8em;color:#444}
}`

export function renderPlain(stamp: BuildStamp): string {
  const { links } = person
  const projectHtml = projects
    .map(
      (p) => `<article id="${p.id}">
<h3>${esc(p.title)}</h3>
<p>${esc(p.description)}</p>
<ul class="stack" aria-label="${esc(levels.project.stackLabel)}">${p.stack.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
<p class="links">${p.links.play ? ext(p.links.play, `${plain.play}`) : ''}${ext(p.links.code, plain.code)}</p>
</article>`,
    )
    .join('\n')

  return `<!doctype html>
<html lang="en">
<head>
${head({ title: site.plainTitle, description: site.plainDescription, path: 'plain/', ld: true, css: toCss({ withLight: true }) + plainCss })}
</head>
<body>
<a class="skip" href="#main">${esc(plain.skipToContent)}</a>
<div class="wrap">
<header>
<p class="kicker">${esc(person.tagline)}</p>
<h1>${esc(person.name)}<span class="caret" aria-hidden="true"></span></h1>
<p class="lead">${esc(person.oneLiner)}</p>
<p class="where">${esc(person.role)} · ${esc(person.location)} · ${esc(person.relocation)}</p>
<p class="cta"><a class="btn btn-primary" href="mailto:${links.email}">${esc(levels.outro.email)}</a><a class="btn btn-secondary" href="/">${esc(skip.backToExperience)}</a></p>
</header>
<main id="main">
<section aria-labelledby="h-what"><h2 id="h-what"><span>01</span> ${esc(plain.sections.what)}</h2><div>
<ul class="what">${person.whatIDo.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
<p class="note">${esc(person.howIThink)}</p>
</div></section>
<section aria-labelledby="h-open"><h2 id="h-open"><span>02</span> ${esc(plain.sections.open)}</h2><div>
<p>${esc(person.openTo)}</p>
<p class="note">${esc(plain.currentlyLabel)}: ${esc(person.currently)}</p>
</div></section>
<section aria-labelledby="h-projects"><h2 id="h-projects"><span>03</span> ${esc(plain.sections.projects)}</h2><div>
${projectHtml}
</div></section>
<section aria-labelledby="h-contact"><h2 id="h-contact"><span>04</span> ${esc(plain.sections.contact)}</h2><div>
<dl>
<dt>${esc(plain.emailLabel)}</dt><dd><a href="mailto:${links.email}">${links.email}</a></dd>
<dt>GitHub</dt><dd>${ext(links.github, 'github.com/fakharaltaf')}</dd>
<dt>LinkedIn</dt><dd>${ext(links.linkedin, 'linkedin.com/in/fakharaltaf')}</dd>
</dl>
</div></section>
</main>
<footer>
<p class="motto">// ${esc(person.motto)}</p>
<p class="back"><a href="/">${esc(skip.backToExperience)}</a></p>
<p>${esc(plain.buildStamp(stamp.size, stamp.date, stamp.commit))}</p>
</footer>
</div>
</body>
</html>
`
}

const notFoundCss = `${baseCss}
body{min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:1rem}
.ed{font:400 clamp(1rem,2.4vw,1.25rem)/1.6 var(--mono);width:min(40rem,100%)}
.row{display:flex;gap:1.5rem;align-items:center}
.ln{color:var(--muted);min-width:3ch;text-align:right;user-select:none}
.row.big{font-size:clamp(4rem,18vw,9rem);line-height:1;margin:.5rem 0}
.row.big .ln{font-size:1rem;align-self:center}
.msg{color:var(--ink)}
.msg.muted{color:var(--muted)}
.links{display:flex;flex-wrap:wrap;gap:.75rem;margin:2rem 0 0 calc(3ch + 1.5rem)}`

export function renderNotFound(): string {
  return `<!doctype html>
<html lang="en">
<head>
${head({ title: notFound.title, description: notFound.line, path: '404.html', css: toCss() + notFoundCss })}
<meta name="robots" content="noindex">
</head>
<body>
<main class="ed">
<div class="row"><span class="ln" aria-hidden="true">403</span><span class="msg muted">// ${esc(person.motto)}</span></div>
<div class="row big"><span class="ln" aria-hidden="true">404</span><span class="caret" aria-hidden="true"></span></div>
<div class="row"><span class="ln" aria-hidden="true">405</span><h1 class="msg" style="font:inherit;margin:0">${esc(notFound.line)}</h1></div>
<p class="links"><a class="btn btn-primary" href="/">${esc(notFound.home)}</a><a class="btn btn-secondary" href="/plain/">${esc(notFound.plain)}</a></p>
</main>
</body>
</html>
`
}

const shellCss = `${baseCss}
html,body{height:100%;overflow:hidden;overscroll-behavior:none}
.skip-exp{position:fixed;z-index:10;top:max(1rem,env(safe-area-inset-top));left:max(1rem,env(safe-area-inset-left));min-height:44px}
.boot{position:fixed;inset:0;display:grid;place-items:center;pointer-events:none}
.boot .caret{width:clamp(14px,2.2vw,28px);height:clamp(120px,22vw,260px);margin:0}
.slow{position:fixed;left:1rem;right:1rem;bottom:max(2rem,env(safe-area-inset-bottom));margin:0;text-align:center;font:400 .8125rem var(--mono);color:var(--muted)}`

/** <head> contents + static body for the experience shell (index.html). Works before JS arrives. */
export function shell(): { head: string; body: string } {
  return {
    head: head({
      title: site.title,
      description: site.description,
      path: '',
      ld: true,
      css: toCss() + shellCss,
    }),
    body: `<a class="skip-exp btn btn-secondary" href="/plain/">${esc(skip.experience)}</a>
<div class="boot" aria-hidden="true"><span class="caret"></span></div>
<div class="sr-only" role="status" data-boot-status>${esc(loading.srBusy)}</div>
<div class="sr-only"><h1>${esc(person.name)}</h1><p>${esc(person.oneLiner)}</p><p>${esc(person.role)}, ${esc(person.location)}.</p></div>
<noscript><p class="slow">${esc(skip.noscript)} <a href="/plain/">${esc(skip.noscriptLink)}</a></p></noscript>`,
  }
}

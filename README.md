# Zoom Out

Fakhar Altaf's portfolio: one continuous camera move from a blinking cursor out to the whole
picture. Live at **https://fakharaltaf.github.io/**, with a fast, no-JavaScript version at
[`/plain/`](https://fakharaltaf.github.io/plain/).

## Run it

```sh
npm install
npm run dev        # http://localhost:5173  (plain mode at /plain/, 404 at /404.html)
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck, then the static build in `dist/` (plain mode, 404, build stamp included) |
| `npm run preview` | Serve `dist/` locally |
| `npm test` | Unit tests (Vitest) |
| `npm run e2e` | End-to-end tests (Playwright) against the built site |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run capture` | Re-shoot the OG card and the plain-mode demo stills (after `build`) |

Add `?webgl` to any URL to force the WebGL2 renderer instead of WebGPU.

## Editing copy

Every visible string lives in **`src/content/copy.ts`**. Projects are in `src/content/projects.ts`,
skills in `src/content/skills.ts`, the scripts the site writes for visitors in
`src/content/scripts.ts`, and the "view source" snippets in `src/content/sources.ts`.
Edit those; no component changes needed. `npm test` checks the copy for banned phrases and that
plain mode still lists every project.

## How it works

**One value, one loop.** Everything is a pure function of a single zoom progress `p ∈ [0, 1]`
(`src/world/levels.ts`, `timeline.ts`). Wheel, trackpad, pinch, touch, drag, keys, the HUD, the
terminal and URL hashes all write a target; a spring moves `p` toward it inside R3F's frame loop,
which also drives every DOM overlay (`onFrame`), so there is no per-component
`requestAnimationFrame`.

**One universe.** Each level is physically inside the next (`src/world/layout.ts`): the line is a
row of the script, the script a module of RareMind's frame, the frame a star, the constellation
the head of a map pin. The camera stays at the origin and the universe is scaled around it, so
float precision holds across a ~10⁵× zoom.

**Rendering.** three.js `WebGPURenderer` with TSL materials, falling back to WebGL2 by itself.
Particles (12k–60k by quality tier) are instanced sprites morphing between five shapes in one TSL
vertex program; physics offsets for stars and letters are applied there too. Project demos render
into their DOM element's rectangle of the same canvas (`src/world/Render.tsx`, scissored
viewports), so they fly in with the camera and hand off to full screen with a View Transition.

**Physics.** Rapier (WASM, streamed, loaded only near the constellation): stars on springs
(home + one per shared skill), grabbable and flingable; the letters of the name are rigid bodies
you can knock over.

**Done twice, it gets a script.** `src/automation/`: a pure state machine per action
(`unseen → seenOnce → scripting → automated ⇄ disabled`), a store that persists to
`localStorage`, a script panel that types the code (typos included), and a polite runner: one
action at a time, rate-limited, only where you can see it, paused while you're busy, the tab is
hidden or motion is reduced.

**Everything else.** Synthesised Web Audio (off by default), a context-aware cursor (mouse only),
haptics, live GitHub activity with a build-time snapshot fallback, adaptive quality from measured
frame times, "How this works" stats, view-source-of-this-moment, wireframe (X), shortcuts (?),
a hidden terminal (/), and a couple of easter eggs.

```
src/
  content/     copy deck, projects, skills, scripts, sources, GitHub snapshot
  world/       zoom, levels, layout, camera, particles, physics, render, input, hash
  demos/       one lazy-loaded folder per project demo
  automation/  state machine, store, runner, script panel, tray
  systems/     audio, cursor, haptics, quality, stats, GitHub
  ui/          HUD, overlays, terminal, engineering overlays, plain mode
build/site.ts  Vite plugin: shell, plain mode, 404, build stamp, GitHub snapshot
```

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`: lint, unit tests, build, end-to-end tests,
then GitHub Pages. Fonts (Figtree, JetBrains Mono) are self-hosted under their OFL licences in
`public/fonts/`.

# Zoom Out

Fakhar Altaf's portfolio: one continuous zoom from a blinking cursor to the whole picture.
Deployed to https://fakharaltaf.github.io/ (the plain version is at `/plain/`).

## Scripts

|                                   |                                                                             |
| --------------------------------- | --------------------------------------------------------------------------- |
| `npm run dev`                     | dev server (experience at `/`, plain mode at `/plain/`, 404 at `/404.html`) |
| `npm run build`                   | typecheck + static build to `dist/`                                         |
| `npm test`                        | unit tests (Vitest)                                                         |
| `npm run e2e`                     | end-to-end tests (Playwright)                                               |
| `npm run lint` / `npm run format` | ESLint / Prettier                                                           |

## Editing copy

Every visible string is in `src/content/copy.ts`. Projects are in `src/content/projects.ts`,
skills in `src/content/skills.ts`. Edit those; no component changes needed. `npm test` checks the
copy for banned phrases and makes sure plain mode still lists every project.

## Architecture (so far)

- `src/styles/tokens.ts`: colours, control colour pairs, springs, fonts. CSS variables are generated
  from it, and a test enforces WCAG AA on every text/control pair.
- `src/ui/plain/render.ts`: pure functions that render the no-JS pages (plain mode, 404, the
  experience shell's head).
- `build/site.ts`: Vite plugin that injects the shell, emits `plain/index.html` and `404.html`, and
  stamps the plain-mode footer with JS size, build date and commit.
- Fonts (Inter, JetBrains Mono; latin subset, OFL) are self-hosted in `public/fonts/`.

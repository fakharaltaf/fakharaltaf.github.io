// Vite plugin: fills the experience shell from the copy deck, and emits the no-JS pages
// (plain/index.html, 404.html) with a build stamp. In dev, serves those pages live.
import { execSync } from 'node:child_process'
import type { Plugin, ViteDevServer } from 'vite'
import type * as Render from '../src/ui/plain/render.ts'

const RENDER = '/src/ui/plain/render.ts'

function commit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return 'uncommitted'
  }
}

const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`
const today = () => new Date().toISOString().slice(0, 10)

export function site(): Plugin {
  let server: ViteDevServer | undefined
  // Dev: load through Vite so copy edits show up on refresh. Build: plain import.
  const load = async (): Promise<typeof Render> =>
    server
      ? ((await server.ssrLoadModule(RENDER)) as typeof Render)
      : import('../src/ui/plain/render.ts')

  return {
    name: 'zoom-out:site',
    enforce: 'post',
    configureServer(s) {
      server = s
      s.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0]
        if (path !== '/plain/' && path !== '/plain' && path !== '/404.html') return next()
        const r = await load()
        const html =
          path === '/404.html'
            ? r.renderNotFound()
            : r.renderPlain({ size: 'dev', date: today(), commit: 'dev' })
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(html)
      })
    },
    async transformIndexHtml(html) {
      const { head, body } = (await load()).shell()
      return html.replace('<!-- site:head -->', head).replace('<!-- site:body -->', body)
    },
    async generateBundle(_, bundle) {
      const js = Object.values(bundle).reduce(
        (n, f) => n + (f.type === 'chunk' ? Buffer.byteLength(f.code) : 0),
        0,
      )
      const r = await load()
      const stamp = { size: kb(js), date: today(), commit: commit() }
      this.emitFile({ type: 'asset', fileName: 'plain/index.html', source: r.renderPlain(stamp) })
      this.emitFile({ type: 'asset', fileName: '404.html', source: r.renderNotFound() })
    },
  }
}

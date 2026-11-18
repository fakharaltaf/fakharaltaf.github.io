// Captures the OG card (a designed still of the constellation) and one screenshot per project
// demo for plain mode, from the built site. Run: npm run capture (after npm run build).
import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'

const PORT = 4179
const ORIGIN = `http://localhost:${PORT}`
const projects = ['raremind', 'agrarian', 'claude-trace', 'monitoring', 'svype', 'lna-bot']

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
})
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await sleep(2500)

const browser = await chromium.launch({
  channel: process.env.CI ? undefined : 'chrome',
  args: ['--enable-unsafe-webgpu'],
})
try {
  // OG card: the constellation, chrome hidden, name set in type.
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 } })
  await og.goto(`${ORIGIN}/#constellation`)
  await og.waitForFunction(() => document.documentElement.classList.contains('world-ready'))
  await sleep(4500)
  await og.addStyleTag({
    content: `.skip-exp,.hud,.overlays,.star-labels,.eng-toggles,.tray,.hint,.cursor{display:none!important}
      .og{position:fixed;left:0;bottom:0;right:0;z-index:50;padding:120px 64px 56px;color:#E9F0EE;
        background:linear-gradient(to top,#0B0F0E 30%,rgba(11,15,14,.85) 60%,rgba(11,15,14,0))}
      .og h1{margin:0;font:700 76px/1 Figtree,sans-serif;letter-spacing:-.03em}
      .og p{margin:14px 0 0;font:500 24px "JetBrains Mono",monospace;color:#1D9E75}`,
  })
  await og.evaluate(() => {
    const d = document.createElement('div')
    d.className = 'og'
    d.innerHTML = "<h1>Fakhar Altaf</h1><p>zoom out, it'll all make sense</p>"
    document.body.append(d)
  })
  await sleep(400)
  await og.screenshot({ path: 'public/og.png' })
  await og.close()

  // One still per demo, cropped to the demo itself.
  const pg = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  for (const id of projects) {
    await pg.goto(`${ORIGIN}/#${id}`)
    await pg.waitForFunction(() => document.documentElement.classList.contains('world-ready'))
    await sleep(6500)
    await pg.addStyleTag({ content: '.demo-expand,.cursor,.script-panel{display:none!important}' })
    const box = await pg.locator('.demo-host').boundingBox()
    if (!box) throw new Error(`no demo for ${id}`)
    await pg.screenshot({ path: `public/shots/${id}.jpg`, type: 'jpeg', quality: 78, clip: box })
    console.log('captured', id, Math.round(box.width), 'x', Math.round(box.height))
  }
} finally {
  await browser.close()
  server.kill()
}

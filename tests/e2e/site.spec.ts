import { type Page, expect, test } from '@playwright/test'

const LEVELS = ['Cursor', 'Line', 'Script', 'Project', 'Constellation', 'Person', 'Outro']
const PROJECTS = [
  ['raremind', 'RareMind', 'iframe'], // the real sites, served by the stand-in below
  ['agrarian', 'Agrarian', 'iframe'],
  ['claude-trace', 'Claude Trace', '.ct'],
  ['monitoring', 'Multi-person facial and behavioural monitoring', '.mo-room'],
  ['svype', 'Svype', '.sv-card.top'],
  ['lna-bot', 'LNA Bot', '.lna-engine'],
] as const

const STAND_IN = '<h1>stand-in farm</h1>'

async function ready(page: Page, path = '/') {
  // Never depend on the real live sites in tests: serve a stand-in (a test may override this).
  for (const id of ['agrarian', 'raremind'])
    await page.route(`https://fakharaltaf.github.io/${id}/**`, (r) =>
      r.fulfill({ contentType: 'text/html', body: STAND_IN }),
    )
  // Behaviour, not looks: the lowest quality tier keeps CI's software renderer responsive.
  await page.addInitScript(() => localStorage.setItem('zo:quality:v1', '0'))
  await page.goto(path)
  await page.waitForFunction(
    () => document.documentElement.classList.contains('world-ready'),
    null,
    { timeout: 30_000 },
  )
}
const current = (page: Page) => page.locator('.notch[aria-current="step"]')

test('zooms from the cursor to the outro and back, one level at a time', async ({ page }) => {
  await ready(page)
  await expect(current(page)).toHaveAttribute('aria-label', 'Fly to Cursor')
  for (const name of LEVELS.slice(1)) {
    await page.keyboard.press('PageDown')
    await expect(current(page)).toHaveAttribute('aria-label', `Fly to ${name}`, { timeout: 15_000 })
  }
  await expect(page).toHaveURL(/#outro$/, { timeout: 15_000 })
  await expect(page.locator('.outro .motto')).toBeVisible()
  await page.keyboard.press('Home')
  // The longest single flight on the site; CI's software renderer gets extra time for it.
  await expect(current(page)).toHaveAttribute('aria-label', 'Fly to Cursor', { timeout: 45_000 })
})

test('the HUD flies anywhere, and back/forward follow', async ({ page }) => {
  await ready(page)
  await page.click('button[aria-label="Fly to Person"]')
  await expect(page).toHaveURL(/#person$/)
  await page.click('button[aria-label="Fly to Script"]')
  await expect(page).toHaveURL(/#script$/)
  await page.goBack()
  await expect(current(page)).toHaveAttribute('aria-label', 'Fly to Person', { timeout: 20_000 })
})

for (const [id, title, inside] of PROJECTS) {
  test(`opens ${title} and its demo is live`, async ({ page }) => {
    await ready(page, `/#${id}`)
    const host = page.locator('.demo-host')
    await expect(host).toHaveAttribute('aria-label', title, { timeout: 15_000 })
    await expect(host).toHaveAttribute('data-fade', '1', { timeout: 15_000 })
    // Small screens show a preview with one way in: open it full screen first.
    if (await host.evaluate((el) => el.classList.contains('compact')))
      await page.click('.demo-expand')
    await expect(page.locator(inside)).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('#pj-title')).toHaveText(title)
  })
}

test('Agrarian shows the real game: a preview in the world, playable full screen', async ({
  page,
}) => {
  await ready(page, '/#agrarian')
  const host = page.locator('.demo-host')
  await expect(host).toHaveAttribute('data-fade', '1', { timeout: 15_000 })
  const frame = page.locator('iframe[title="Agrarian, the real site"]')
  await expect(frame).toHaveAttribute('sandbox', /allow-scripts/)
  await expect(page.frameLocator('iframe').getByText('stand-in farm')).toBeAttached()
  await expect(page.getByRole('button', { name: 'Demo' })).toHaveCount(0)
  // In the world, a click opens it full screen (on phones the Full screen button does).
  if (await host.evaluate((el) => el.classList.contains('compact')))
    await page.click('.demo-expand')
  else await page.getByRole('button', { name: 'Play Agrarian full screen' }).click()
  await expect(host).toHaveClass(/expanded/)
  await expect(page.frameLocator('iframe').getByText('stand-in farm')).toBeVisible()
  await expect(page.getByRole('link', { name: /Open the real site/ })).toBeVisible()
  await page.getByRole('button', { name: 'Back to the world' }).click()
  await expect(host).not.toHaveClass(/expanded/)
})

test('a live site that never answers falls back to a link', async ({ page }) => {
  await ready(page, '/#agrarian')
  await page.unroute('https://fakharaltaf.github.io/agrarian/**')
  await page.route('https://fakharaltaf.github.io/agrarian/**', () => {}) // hang forever
  await page.reload()
  await page.waitForFunction(() => document.documentElement.classList.contains('world-ready'))
  await expect(page.getByRole('status').filter({ hasText: 'won’t open in here' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.locator('iframe')).toHaveCount(0)
  // Leaving the project drops it entirely.
  await page.click('button[aria-label="Fly to Person"]')
  await expect(page.locator('.live')).toHaveCount(0, { timeout: 15_000 })
})

test('a trackpad swipe browses exactly one project; swiping down then zooms out', async ({
  page,
}) => {
  await ready(page, '/#claude-trace')
  await expect(page.locator('.demo-host')).toHaveAttribute('data-fade', '1', { timeout: 15_000 })
  // A Mac swipe as Chrome delivers it: a slow start, batched jumps (and a dip), then momentum,
  // with a little vertical wobble. Sent in one burst so CI's slow frames can't space it out.
  const swipe = (vertical: boolean, deltas: number[]) =>
    page.evaluate(
      ({ vertical, deltas }) =>
        deltas.forEach((d, i) => {
          const w = i % 2 ? 1.5 : -1.5
          const init = { deltaX: vertical ? w : d, deltaY: vertical ? d : w, bubbles: true }
          window.dispatchEvent(new WheelEvent('wheel', { ...init, cancelable: true }))
        }),
      { vertical, deltas },
    )
  const momentum = Array.from({ length: 30 }, (_, i) => 24 * Math.exp(-(i + 1) / 10))
  await swipe(false, [2, 3, 3, 18, 30, 26, 6, 31, 28, 24, ...momentum])
  await expect(page).toHaveURL(/#monitoring$/, { timeout: 15_000 })
  await page.waitForTimeout(1500)
  await expect(page).toHaveURL(/#monitoring$/) // not two projects, not back out to the galaxy
  await swipe(true, [4, 9, 16, 24, 30, 32, ...momentum.map((d) => d * 1.3)])
  await expect(page).toHaveURL(/#constellation$/, { timeout: 20_000 })
})

test('stars are buttons: Enter on one dives into that project', async ({ page }) => {
  await ready(page, '/#constellation')
  const star = page.locator('button[aria-label="Open Svype"]')
  await expect(star).toBeVisible({ timeout: 20_000 })
  // Stars only take focus once they've faded in past half (inert before that); keep trying.
  await expect(async () => {
    await star.focus()
    await expect(star).toBeFocused({ timeout: 500 })
  }).toPass({ timeout: 20_000 })
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#svype$/)
  await expect(page.locator('.demo-host')).toHaveAttribute('data-fade', '1', { timeout: 15_000 })
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/#constellation$/, { timeout: 20_000 })
})

test('doing something twice writes a script, automates it, and remembers', async ({ page }) => {
  await ready(page)
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press('/')
    await expect(page.locator('.terminal')).toBeVisible()
    await page.keyboard.press('Escape')
  }
  await expect(page.locator('.script-panel')).toBeVisible()
  await expect(page.locator('.script-panel .file')).toHaveText('open-terminal.ts')
  await expect(page.locator('.script-panel .state-done')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.tray-toggle')).toHaveAccessibleName('Automated · 1')
  await page.reload()
  await expect(page.locator('.tray .note')).toHaveText('Welcome back. Your scripts kept running.')
  await page.click('.tray-toggle')
  await page.click('.tray li button')
  await expect(page.locator('.tray li')).toHaveClass(/off/)
})

test('terminal: commands, history, completion, varied replies, focus return', async ({ page }) => {
  await ready(page)
  await page.keyboard.press('/')
  const input = page.locator('.terminal input')
  await expect(input).toBeFocused()
  await input.fill('whoami')
  await input.press('Enter')
  await expect(page.locator('.terminal-log')).toContainText(
    'I automate my way out of every job I get',
  )
  await input.fill('dance')
  await input.press('Enter')
  await input.fill('dance')
  await input.press('Enter')
  const replies = await page.locator('.terminal-log .out').allTextContents()
  expect(replies.at(-1)).not.toBe(replies.at(-2))
  await input.press('ArrowUp')
  await expect(input).toHaveValue('dance')
  await input.fill('open ra')
  await input.press('Tab')
  await expect(input).toHaveValue('open raremind')
  await input.press('Escape')
  await expect(page.locator('.terminal')).toHaveCount(0)
})

test('plain mode works without JavaScript and lists every project', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false })
  const page = await ctx.newPage()
  await page.goto('/plain/')
  await expect(page.locator('h1')).toHaveText('Fakhar Altaf')
  for (const [id, title] of PROJECTS) {
    await expect(page.locator(`#${id} h3`)).toHaveText(title)
    await expect(page.locator(`#${id} a`, { hasText: 'Code' })).toHaveAttribute(
      'href',
      /github\.com\/fakharaltaf\//,
    )
  }
  await page.goto('/')
  await expect(page.locator('a.skip-exp')).toHaveAttribute('href', '/plain/')
  await ctx.close()
})

test('reduced motion: one gesture is one step, automations wait', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.addInitScript(() =>
    localStorage.setItem(
      'zo:auto:v1',
      JSON.stringify({ v: 1, statuses: { openTerminal: 'automated' } }),
    ),
  )
  await ready(page)
  await page.mouse.move(640, 400)
  await page.mouse.wheel(0, 400)
  await expect(page).toHaveURL(/#line$/, { timeout: 15_000 })
  await expect(current(page)).toHaveAttribute('aria-label', 'Fly to Line')
  await page.click('.tray-toggle')
  await expect(page.locator('.tray .paused')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(32_000) // longer than the open-terminal cadence
  await expect(page.locator('.terminal')).toHaveCount(0)
  await ctx.close()
})

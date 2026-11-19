import { type Page, expect, test } from '@playwright/test'

const LEVELS = ['Cursor', 'Line', 'Script', 'Project', 'Constellation', 'Person', 'Outro']
const PROJECTS = [
  ['raremind', 'RareMind', '#raremind-answer'],
  ['agrarian', 'Agrarian', '.ag-plot'],
  ['claude-trace', 'Claude Trace', '.ct'],
  ['monitoring', 'Multi-person facial and behavioural monitoring', '.mo-room'],
  ['svype', 'Svype', '.sv-card.top'],
  ['lna-bot', 'LNA Bot', '.lna-engine'],
] as const

async function ready(page: Page, path = '/') {
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

test('Agrarian runs the real game in its window, only when asked', async ({ page }) => {
  // Never depend on the real site in tests: serve a stand-in for it.
  await page.route('https://fakharaltaf.github.io/agrarian/**', (r) =>
    r.fulfill({ contentType: 'text/html', body: '<h1>stand-in farm</h1>' }),
  )
  await ready(page, '/#agrarian')
  const host = page.locator('.demo-host')
  await expect(host).toHaveAttribute('data-fade', '1', { timeout: 15_000 })
  if (await host.evaluate((el) => el.classList.contains('compact')))
    await page.click('.demo-expand')
  await expect(page.locator('.ag-plot').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('iframe')).toHaveCount(0)
  await page.getByRole('button', { name: 'Real game' }).click()
  const frame = page.locator('iframe[title="Agrarian, the real game"]')
  await expect(frame).toHaveAttribute('sandbox', /allow-scripts/)
  await expect(page.frameLocator('iframe').getByText('stand-in farm')).toBeVisible()
  await expect(page.locator('.live[data-state="loaded"]')).toBeVisible()
  await expect(page.getByRole('link', { name: /Keep playing on the real site/ })).toBeVisible()
  // No Demo button for now: leaving full screen is the way back.
  await expect(page.getByRole('button', { name: 'Demo' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Back to the world' }).click()
  await expect(page.locator('iframe')).toHaveCount(0)
  await expect(page.locator('.ag-plot').first()).toBeVisible()
})

test('a live site that never answers falls back to a link', async ({ page }) => {
  await page.route('https://fakharaltaf.github.io/agrarian/**', () => {}) // hang forever
  await ready(page, '/#agrarian')
  const host = page.locator('.demo-host')
  await expect(host).toHaveAttribute('data-fade', '1', { timeout: 15_000 })
  if (await host.evaluate((el) => el.classList.contains('compact')))
    await page.click('.demo-expand')
  await page.getByRole('button', { name: 'Real game' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'won’t open in here' })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.locator('iframe')).toHaveCount(0)
  // Leaving the project drops the frame entirely.
  await page.keyboard.press('Escape')
  await page.click('button[aria-label="Fly to Person"]')
  await expect(page.locator('.live')).toHaveCount(0, { timeout: 15_000 })
})

test('stars are buttons: Enter on one dives into that project', async ({ page }) => {
  await ready(page, '/#constellation')
  const star = page.locator('button[aria-label="Open Svype"]')
  await expect(star).toBeVisible({ timeout: 20_000 })
  await star.focus()
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
  await expect(page.locator('.tray .counter')).toHaveText('You’ve automated 1 thing.')
  await page.reload()
  await expect(page.locator('.tray .note')).toHaveText('Welcome back. Your scripts kept running.')
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
  await expect(page.locator('.tray .paused')).toBeVisible()
  await page.waitForTimeout(32_000) // longer than the open-terminal cadence
  await expect(page.locator('.terminal')).toHaveCount(0)
  await ctx.close()
})

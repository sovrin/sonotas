// Refresh the README screenshots (docs/screenshot-{dark,light}.png): the demo
// tab at bar 22, both staves, four bars across, in each theme. Run by the
// screenshots workflow on each push to master, in Playwright's headless shell
// against a dev server it starts.
import { spawn } from 'node:child_process'
import { chromium, type Page } from 'playwright-core'

const PORT = 3123
const SEEK = 0.302 // fraction of the song: 0:43 of 2:23, bar 22

const url = `http://localhost:${PORT}`
// Own process group, so stopping it takes nuxt down with pnpm.
const server = spawn('pnpm', ['exec', 'nuxt', 'dev', '--port', String(PORT)], { stdio: 'ignore', detached: true })
process.on('exit', () => server.pid && process.kill(-server.pid))
await waitFor(url)

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
  await page.goto(url)
  // The dev server's DevTools button isn't part of the app.
  await page.addStyleTag({ content: '#nuxt-devtools-container { display: none !important }' })
  await settle(page)

  await page.getByRole('tab', { name: 'Look' }).click()
  await page.getByRole('radio', { name: 'Both' }).check({ force: true })
  await page.getByRole('tab', { name: 'Frame' }).click()
  await page.getByRole('radio', { name: 'Bars across' }).check({ force: true })
  await settle(page)

  const strip = (await page.getByRole('slider', { name: 'Song position' }).boundingBox())!
  await page.mouse.click(strip.x + strip.width * SEEK, strip.y + strip.height / 2)
  await settle(page)
  await page.screenshot({ path: 'docs/screenshot-dark.png' })

  await page.getByRole('button', { name: 'Switch to light theme' }).click()
  await page.getByRole('tab', { name: 'Look' }).click()
  await page.getByRole('radio', { name: /^Light/ }).check({ force: true })
  await page.getByRole('tab', { name: 'Frame' }).click()
  await settle(page)
  await page.screenshot({ path: 'docs/screenshot-light.png' })
  console.log('Wrote docs/screenshot-dark.png and docs/screenshot-light.png')
} finally {
  await browser.close()
}
process.exit() // also stops the dev server

async function waitFor(target: string) {
  for (let i = 0; i < 120; i++) {
    if (await fetch(target).then(r => r.ok, () => false)) return
    await new Promise(r => setTimeout(r, 1000))
  }
  throw new Error(`No dev server at ${target} after 2 minutes`)
}

// The sheet rebuilds and the size estimate reruns after a change; shoot once
// the estimate is back.
async function settle(page: Page) {
  await page.waitForTimeout(500)
  await page.getByText(/~[\d.]+ MB/).waitFor({ timeout: 60_000 })
}

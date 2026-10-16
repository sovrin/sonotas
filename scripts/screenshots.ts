// Refresh the README screenshots (docs/screenshot-{dark,light}.png): the demo
// tab at bar 22, both staves, four bars across, in each theme. Run by the
// screenshots workflow on each push to master, in Playwright's headless shell
// against a dev server it starts.
import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { chromium, type Page } from 'playwright-core'

const PORT = 3123
const SEEK = 0.302 // fraction of the song: 0:43 of 2:23, bar 22
// A shot replaces the old one only when more than SHARE of its pixels moved by
// more than TOLERANCE in some channel, so rendering noise commits nothing.
const TOLERANCE = 16
const SHARE = 0.0001

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
  await save('docs/screenshot-dark.png', await page.screenshot())

  await page.getByRole('button', { name: 'Switch to light theme' }).click()
  await page.getByRole('tab', { name: 'Look' }).click()
  await page.getByRole('radio', { name: /^Light/ }).check({ force: true })
  await page.getByRole('tab', { name: 'Frame' }).click()
  await settle(page)
  await save('docs/screenshot-light.png', await page.screenshot())
} finally {
  await browser.close()
}
process.exit() // also stops the dev server

async function save(path: string, png: Buffer) {
  const old = await readFile(path).catch(() => undefined)
  if (old && !(await differs(old, png))) return console.log(`Kept ${path}, nothing changed`)
  await writeFile(path, png)
  console.log(`Wrote ${path}`)
}

// Decodes both PNGs in the browser, which saves a PNG dependency.
async function differs(a: Buffer, b: Buffer): Promise<boolean> {
  const page = await browser.newPage()
  try {
    return await page.evaluate(async ({ a, b, tolerance, share }) => {
      const pixels = async (src: string) => {
        const img = new Image()
        img.src = src
        await img.decode()
        const ctx = new OffscreenCanvas(img.width, img.height).getContext('2d')!
        ctx.drawImage(img, 0, 0)
        return { w: img.width, h: img.height, data: ctx.getImageData(0, 0, img.width, img.height).data }
      }
      const [pa, pb] = await Promise.all([pixels(a), pixels(b)])
      if (pa.w !== pb.w || pa.h !== pb.h) return true
      let moved = 0
      for (let i = 0; i < pa.data.length; i += 4) {
        for (let c = 0; c < 4; c++) {
          if (Math.abs(pa.data[i + c]! - pb.data[i + c]!) > tolerance) {
            moved++
            break
          }
        }
      }
      return moved > pa.w * pa.h * share
    }, { a: dataUrl(a), b: dataUrl(b), tolerance: TOLERANCE, share: SHARE })
  } finally {
    await page.close()
  }
}

function dataUrl(png: Buffer) {
  return `data:image/png;base64,${png.toString('base64')}`
}

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

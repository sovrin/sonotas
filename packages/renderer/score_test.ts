import { test } from 'node:test'
import { assert, assertEquals } from './_assert.ts'
import { loadDemo, loadSample, shimHeadless } from './_testutil.ts'

shimHeadless()
const alphaTab = await import('@coderline/alphatab')
const { createSettings } = await import('./settings.ts')
const { countBars, detachCropStart, hasTab, injectTempoAt, listTracks, loadScore, measureBars, renderSheet }
  = await import('./score.ts')

test('listTracks returns a non-empty, sequentially-indexed track list', async () => {
  const tracks = listTracks(await loadSample())

  assert(tracks.length > 0, 'expected at least one track')
  tracks.forEach((t, i) => {
    assertEquals(t.index, i)
    assert(typeof t.name === 'string')
  })
})

test('countBars returns the master-bar count', async () => {
  const bytes = await loadSample()
  const score = loadScore(bytes, createSettings(), 0)
  assertEquals(countBars(bytes), score.masterBars.length)
})

test('injectTempoAt copies the effective tempo onto a mid-piece bar', async () => {
  const score = loadScore(await loadSample(), createSettings(), 0)
  const target = score.masterBars[2]!
  target.tempoAutomations = [] // simulate a bar without its own marker

  injectTempoAt(score, 2)

  assertEquals(target.tempoAutomations.length, 1)
  const auto = target.tempoAutomations[0]!
  assertEquals(auto.type, alphaTab.model.AutomationType.Tempo)
  assertEquals(auto.ratioPosition, 0)
  assertEquals(auto.value, score.masterBars[0]!.tempoAutomations[0]!.value)
})

test('detachCropStart nulls the start bar\'s back-link and restores it', async () => {
  const score = loadScore(await loadSample(), createSettings(), 0)
  const bar = score.tracks[0]!.staves[0]!.bars[2]!
  const prev = bar.previousBar
  assert(prev !== null, 'expected a real previous bar to detach')

  const restore = detachCropStart(score, 2, 0)
  assertEquals(bar.previousBar, null)

  restore()
  assertEquals(bar.previousBar, prev)
})

test('injectTempoAt leaves a bar that already has a tempo alone', async () => {
  const score = loadScore(await loadSample(), createSettings(), 0)
  const bar = score.masterBars[0]! // bar 0 carries the initial tempo
  const before = bar.tempoAutomations.length

  injectTempoAt(score, 0)

  assertEquals(bar.tempoAutomations.length, before)
})

test('measureBars scales linearly with the display scale', async () => {
  const bytes = await loadSample()
  const at = (scale: number) => measureBars(createSettings({ scale }), loadScore(bytes, createSettings(), 0), 0)
  const one = at(1)
  const two = at(2)
  assert(one.length > 1, 'expected measured bars')
  assertEquals(two.length, one.length)
  // fit-to-bars derives its engrave scale from one measurement at 1
  one.forEach((b, i) => {
    assert(Math.abs(two[i]!.w - b.w * 2) < 0.5, `w ${two[i]!.w} vs 2×${b.w}`)
    assert(Math.abs(two[i]!.h - b.h * 2) < 0.5, `h ${two[i]!.h} vs 2×${b.h}`)
  })
})

test('hasTab is true for stringed tracks and false for the drum kit', async () => {
  const score = loadScore(await loadDemo(), createSettings(), 0)

  assertEquals(hasTab(score, 0), true) // Lead guitar
  assertEquals(hasTab(score, 1), false) // Drums
  assertEquals(hasTab(score, 3), true)
})

test('renderSheet rejects instead of hanging when alphaTab fails to render', async () => {
  // Tab only on the drum kit leaves alphaTab no staff to draw: it reports an
  // error rather than finishing.
  const settings = createSettings({ notation: 'tab' })
  const score = loadScore(await loadDemo(), settings, 1)

  let failed = false
  await renderSheet(settings, score, 1, '').catch(() => (failed = true))
  assert(failed, 'expected renderSheet to reject')
})

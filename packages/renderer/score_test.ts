import { test } from 'node:test'
import { assert, assertEquals } from './_assert.ts'
import { loadSample, shimHeadless } from './_testutil.ts'

shimHeadless()
const alphaTab = await import('@coderline/alphatab')
const { createSettings } = await import('./settings.ts')
const { countBars, detachCropStart, injectTempoAt, listTracks, loadScore }
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

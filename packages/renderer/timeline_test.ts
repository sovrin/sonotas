import { test } from 'node:test'
import type * as alphaTab from '@coderline/alphatab'
import { assert, assertEquals } from './_assert.ts'
import { loadSample, shimHeadless } from './_testutil.ts'

shimHeadless()
const { createSettings } = await import('./settings.ts')
const { loadScore } = await import('./score.ts')
const { buildTimeline } = await import('./timeline.ts')

// `bars` needs no rendered geometry, so a bounds lookup that finds nothing works.
const noBounds = {
  findBeat: () => null
} as unknown as alphaTab.rendering.BoundsLookup

test('buildTimeline emits one ascending bar onset per master bar', async () => {
  const settings = createSettings()
  const score = loadScore(await loadSample(), settings, 0)

  const { bars, durationMs } = buildTimeline(score, settings, 0, noBounds)

  assertEquals(bars.length, score.masterBars.length)
  assertEquals(bars[0], 0)
  for (let i = 1; i < bars.length; i++) {
    assert(bars[i] >= bars[i - 1], `bars[${i}] < bars[${i - 1}]`)
  }
  assert(bars[bars.length - 1] <= durationMs)
})

test('buildTimeline scopes and rebases a crop range to start at 0', async () => {
  const settings = createSettings()
  const score = loadScore(await loadSample(), settings, 0)

  const full = buildTimeline(score, settings, 0, noBounds)
  const crop = buildTimeline(score, settings, 0, noBounds, {
    fromBar: 1,
    toBar: 2
  })

  assertEquals(crop.bars.length, 2)
  assertEquals(crop.bars[0], 0) // rebased to the crop start
  assertEquals(crop.beats[0]!.startMs, 0)
  assert(crop.durationMs > 0)
  assert(crop.durationMs < full.durationMs, 'crop should be shorter than full')
  assert(crop.beats.length < full.beats.length)
})

import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import type * as alphaTab from '@coderline/alphatab'
import { assert, assertEquals } from './_assert.ts'
import { loadSample, shimHeadless } from './_testutil.ts'

shimHeadless()
const { createSettings } = await import('./settings.ts')
const { loadScore } = await import('./score.ts')
const { buildTimeline } = await import('./timeline.ts')
const { CHANNELS, RELEASE_MS, SAMPLE_RATE, renderAudio } = await import('./audio.ts')

const noBounds = { findBeat: () => null } as unknown as alphaTab.rendering.BoundsLookup
const soundFont = new Uint8Array(await readFile(new URL(
  './node_modules/@coderline/alphatab/dist/soundfont/sonivox.sf3', import.meta.url
)))

/** Peak level over a ms window of interleaved samples. */
function peak(pcm: Float32Array, fromMs: number, toMs: number): number {
  const end = Math.min(Math.round(toMs * SAMPLE_RATE / 1000) * CHANNELS, pcm.length)
  let p = 0
  for (let i = Math.max(0, Math.round(fromMs * SAMPLE_RATE / 1000) * CHANNELS); i < end; i++) p = Math.max(p, Math.abs(pcm[i]!))
  return p
}

async function timeline() {
  const settings = createSettings()
  return buildTimeline(loadScore(await loadSample(), settings, 0), settings, 0, noBounds)
}

test('renderAudio fills the window, scaled by speed', async () => {
  const { midi, durationMs } = await timeline()
  const pcm = renderAudio(midi, soundFont, 0, durationMs, 2)
  assertEquals(pcm.length, Math.round((durationMs / 2) * SAMPLE_RATE / 1000) * CHANNELS)
  assert(peak(pcm, 0, durationMs / 2) > 0.01, 'audio is silent')
})

test('the last note rings out past the song\'s end instead of stopping dead', async () => {
  const { midi, durationMs, endsSong } = await timeline()
  assert(endsSong, 'a whole-song timeline ends the song')
  const tail = renderAudio(midi, soundFont, durationMs, durationMs + RELEASE_MS)
  assert(peak(tail, 0, 100) > 0.01, 'silent right after the last note')
  assert(peak(tail, RELEASE_MS - 100, RELEASE_MS) < peak(tail, 0, 100), 'no decay')
})

test('a crop ending mid-song does not end the song', async () => {
  const settings = createSettings()
  const crop = buildTimeline(loadScore(await loadSample(), settings, 0), settings, 0, noBounds, { fromBar: 0, toBar: 1 })
  assert(!crop.endsSong, 'bars follow the crop')
})

test('a crop\'s audio starts where its first bar plays in the song', async () => {
  const settings = createSettings()
  const score = loadScore(await loadSample(), settings, 0)
  const full = buildTimeline(score, settings, 0, noBounds)
  const crop = buildTimeline(score, settings, 0, noBounds, { fromBar: 2, toBar: 3 })
  assertEquals(full.offsetMs, 0)
  assertEquals(crop.offsetMs, full.bars[2])
})

test('the synth follows the reconstructed ritardando, not alphaTab\'s steps', async () => {
  const { midi, beats, durationMs } = await timeline()
  const pcm = renderAudio(midi, soundFont, 0, durationMs)
  // Deep in the ramp, where stepped timing would be off by whole notes, each
  // attack lands right after its beat: louder than the decay just before it.
  for (const b of beats.slice(-6)) {
    assert(peak(pcm, b.startMs, b.startMs + 40) > peak(pcm, b.startMs - 40, b.startMs), `no attack at ${b.startMs}ms`)
  }
})

import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import type * as alphaTab from '@coderline/alphatab'
import { assert, assertEquals } from './_assert.ts'
import { loadDemo, loadSample, shimHeadless } from './_testutil.ts'

shimHeadless()
const { createSettings } = await import('./settings.ts')
const { loadScore } = await import('./score.ts')
const { buildTimeline } = await import('./timeline.ts')
const { CHANNELS, countInMs, RELEASE_MS, SAMPLE_RATE, renderAudio } = await import('./audio.ts')

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

const rms = (a: Float32Array) => Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length)

test('muting a track\'s channels leaves it out of the mix', async () => {
  const settings = createSettings()
  const score = loadScore(await loadDemo(), settings, 0)
  const { midi } = buildTimeline(score, settings, 0, noBounds)
  const drums = score.tracks[1]!.playbackInfo
  const others = score.tracks.filter(t => t.index !== 1).flatMap(t => [t.playbackInfo.primaryChannel, t.playbackInfo.secondaryChannel])
  const all = rms(renderAudio(midi, soundFont, 0, 10000))
  const solo = rms(renderAudio(midi, soundFont, 0, 10000, 1, { muted: others }))
  const minus = rms(renderAudio(midi, soundFont, 0, 10000, 1, { muted: [drums.primaryChannel, drums.secondaryChannel] }))
  assert(solo > 0.001 && solo < all, `solo ${solo} vs all ${all}`)
  assert(minus > 0.001 && minus < all, `minus ${minus} vs all ${all}`)
})

test('the metronome clicks through the song but not its ring-out', async () => {
  const { midi, durationMs } = await timeline()
  const plain = renderAudio(midi, soundFont, 0, durationMs + RELEASE_MS)
  const clicked = renderAudio(midi, soundFont, 0, durationMs + RELEASE_MS, 1, { metronome: true })
  const end = Math.round(durationMs * SAMPLE_RATE / 1000) * CHANNELS
  assert(rms(clicked.subarray(0, end)) > rms(plain.subarray(0, end)) * 1.01, 'no clicks')
  // shortly after the end, past any last click's decay
  const tail = end + Math.round(0.3 * SAMPLE_RATE) * CHANNELS
  assert(rms(clicked.subarray(tail)) - rms(plain.subarray(tail)) < 1e-4, 'clicks in the ring-out')
})

test('a count-in bar of clicks opens the soundtrack', async () => {
  const { midi, durationMs, startTick } = await timeline()
  const ms = countInMs(midi, startTick)
  const body = renderAudio(midi, soundFont, 0, durationMs, 2)
  const full = renderAudio(midi, soundFont, 0, durationMs, 2, { countIn: startTick })
  const lead = Math.round((ms / 2) * SAMPLE_RATE / 1000) * CHANNELS
  assertEquals(full.length, lead + body.length)
  assert(peak(full, 0, ms / 2) > 0.01, 'the count-in is silent')
  assertEquals(rms(full.subarray(lead)), rms(body))
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

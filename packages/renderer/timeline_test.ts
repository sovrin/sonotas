import { test } from 'node:test'
import type * as alphaTab from '@coderline/alphatab'
import { assert, assertEquals } from './_assert.ts'
import { loadDemo, loadSample, shimHeadless } from './_testutil.ts'

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

test('buildTimeline lists bars in play order, in step with time', async () => {
  const settings = createSettings()
  const score = loadScore(await loadSample(), settings, 0)

  const { plays, durationMs } = buildTimeline(score, settings, 0, noBounds)

  assertEquals(plays[0], { bar: 0, startMs: 0 })
  for (let i = 1; i < plays.length; i++) {
    assert(plays[i]!.startMs > plays[i - 1]!.startMs, `plays[${i}] not after plays[${i - 1}]`)
  }
  assert(plays[plays.length - 1]!.startMs < durationMs)
})

test('buildTimeline plays repeated bars again (demo has repeats)', async () => {
  const settings = createSettings()
  const score = loadScore(await loadDemo(), settings, 0)

  const { plays, bars } = buildTimeline(score, settings, 0, noBounds)

  assert(plays.length > bars.length, `expected repeats: ${plays.length} plays for ${bars.length} bars`)
  // Every play of a bar after its first comes later than its first-play onset.
  for (const p of plays) assert(p.startMs >= bars[p.bar]!, `bar ${p.bar} played before its first onset`)
})

test('buildTimeline rebases play bar indices to a crop range', async () => {
  const settings = createSettings()
  const score = loadScore(await loadSample(), settings, 0)

  const { plays } = buildTimeline(score, settings, 0, noBounds, { fromBar: 1, toBar: 2 })

  assertEquals(plays[0], { bar: 0, startMs: 0 })
  assert(plays.every(p => p.bar >= 0 && p.bar <= 1))
})

test('buildTimeline keeps beats on the synth\'s clock to the end (demo has no ramp)', async () => {
  const alphaTab = await import('@coderline/alphatab')
  const settings = createSettings()
  const score = loadScore(await loadDemo(), settings, 0)
  const { beats, durationMs, midi } = buildTimeline(score, settings, 0, noBounds)
  // The synth's clock: the MIDI tempo map summed in float, as its sequencer does.
  let ms = 0
  let tick = 0
  let bpm = 120
  for (const e of midi.events) {
    ms += ((e.tick - tick) * 60000) / (bpm * midi.division)
    tick = e.tick
    if (e instanceof alphaTab.midi.TempoChangeEvent) bpm = e.beatsPerMinute
  }
  const gen = new alphaTab.midi.MidiFileGenerator(score, settings, new alphaTab.midi.AlphaSynthMidiFileHandler(new alphaTab.midi.MidiFile()))
  gen.generate()
  let end = 0
  for (let cur = gen.tickLookup.findBeat(new Set([0]), 0); cur && cur.end > end; cur = gen.tickLookup.findBeat(new Set([0]), cur.end)) end = cur.end
  ms += ((end - tick) * 60000) / (bpm * midi.division)
  assert(beats.length > 500, 'demo is long enough to drift')
  assert(Math.abs(durationMs - ms) < 1, `cursor ends at ${durationMs}ms, sound at ${ms}ms`)
})

test('buildTimeline sketches the whole song\'s notes, crop or not', async () => {
  const settings = createSettings()
  const score = loadScore(await loadSample(), settings, 0)

  const full = buildTimeline(score, settings, 0, noBounds)
  const crop = buildTimeline(score, settings, 0, noBounds, { fromBar: 1, toBar: 2 })

  assert(full.notes.length > 0, 'no notes sketched')
  assertEquals(crop.notes, full.notes) // the strip shows the whole song either way
  for (const n of full.notes) {
    assert(n.y >= 0 && n.y <= 1, `lane ${n.y} off the staff`)
    assert(n.startMs >= 0 && n.endMs > n.startMs && n.endMs <= full.durationMs + 1, `note ${n.startMs}–${n.endMs} out of the song`)
  }
})

test('buildTimeline spreads a drum kit over its own pitch range', async () => {
  const settings = createSettings()
  const score = loadScore(await loadDemo(), settings, 1) // Drums

  const { notes } = buildTimeline(score, settings, 1, noBounds)
  const ys = notes.map(n => n.y)

  assertEquals(Math.min(...ys), 0) // highest drum on the top line
  assertEquals(Math.max(...ys), 1) // lowest on the bottom
})

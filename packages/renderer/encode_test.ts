import { test } from 'node:test'
import { assertEquals } from './_assert.ts'
import { avcCodecString, bitrateFor, clipFrames, quantizerFor, sampleGops, splitRanges } from './encode.ts'

test('clipFrames counts the frames in a sub-clip', () => {
  assertEquals(clipFrames(1000, 2000, 5000, 30), 30)
})

test('clipFrames over the full range matches ceil(durationMs/1000*fps)', () => {
  assertEquals(clipFrames(0, 5000, 5000, 30), Math.ceil((5000 / 1000) * 30))
})

test('clipFrames scales the frame count by playback speed', () => {
  assertEquals(clipFrames(0, 4000, 4000, 30, 2), 60) // twice as fast → half as long
  assertEquals(clipFrames(0, 4000, 4000, 30, 0.5), 240)
})

test('clipFrames returns at least one frame', () => {
  assertEquals(clipFrames(1000, 1000, 5000, 30), 1)
})

test('quantizerFor matches mediabunny\'s QP per preset', () => {
  assertEquals(quantizerFor('low'), 35)
  assertEquals(quantizerFor('medium'), 29)
  assertEquals(quantizerFor('high'), 22)
  assertEquals(quantizerFor('max'), 16)
})

test('bitrateFor matches mediabunny\'s avc bitrate model', () => {
  assertEquals(bitrateFor('high', 1920, 1080), 6_111_000) // 3 Mbps · 0.3e^(2.5538·0.75), ceil to kbps
  assertEquals(bitrateFor('max', 1920, 1080) > bitrateFor('high', 1920, 1080), true)
  assertEquals(bitrateFor('high', 1280, 720) < bitrateFor('high', 1920, 1080), true)
})

test('avcCodecString picks the lowest High-profile level for size and rate', () => {
  assertEquals(avcCodecString(1280, 720, 30), 'avc1.64001f') // 3.1
  assertEquals(avcCodecString(1920, 1080, 30), 'avc1.640028') // 4.0
  assertEquals(avcCodecString(1920, 1080, 60), 'avc1.64002a') // 4.2
  assertEquals(avcCodecString(1080, 1920, 60), 'avc1.64002a') // portrait: same macroblocks
})

test('splitRanges covers every frame in contiguous whole-GOP runs', () => {
  assertEquals(splitRanges(300, 60, 2), [{ first: 0, count: 120 }, { first: 120, count: 180 }])
  assertEquals(splitRanges(250, 60, 4), [
    { first: 0, count: 60 },
    { first: 60, count: 60 },
    { first: 120, count: 60 },
    { first: 180, count: 70 } // 2 GOPs, the last one short
  ])
})

test('splitRanges never makes more runs than GOPs', () => {
  assertEquals(splitRanges(90, 60, 4), [{ first: 0, count: 60 }, { first: 60, count: 30 }])
  assertEquals(splitRanges(1, 60, 4), [{ first: 0, count: 1 }])
})

test('sampleGops takes every GOP when there are no more than the samples', () => {
  assertEquals(sampleGops(4, 6), [0, 1, 2, 3])
  assertEquals(sampleGops(6, 6), [0, 1, 2, 3, 4, 5])
})

test('sampleGops spreads the samples evenly, one per stratum centre', () => {
  assertEquals(sampleGops(72, 6), [6, 18, 30, 42, 54, 66])
  assertEquals(sampleGops(10, 3), [1, 5, 8])
})

test('sampleGops never repeats or overruns a GOP', () => {
  for (const gops of [7, 13, 50, 301]) {
    const picks = sampleGops(gops, 6)
    assertEquals(new Set(picks).size, 6)
    assertEquals(picks.every(g => g >= 0 && g < gops), true)
  }
})

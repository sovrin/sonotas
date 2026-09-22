import { test } from 'node:test'
import { assertEquals, assertStrictEquals } from './_assert.ts'
import { QUALITY_HIGH, QUALITY_LOW, QUALITY_MEDIUM, QUALITY_VERY_HIGH } from 'mediabunny'
import { clipFrames, QUALITY_PRESET } from './encode.ts'

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

test('QUALITY_PRESET maps each quality to its mediabunny constant', () => {
  assertStrictEquals(QUALITY_PRESET.low, QUALITY_LOW)
  assertStrictEquals(QUALITY_PRESET.medium, QUALITY_MEDIUM)
  assertStrictEquals(QUALITY_PRESET.high, QUALITY_HIGH)
  assertStrictEquals(QUALITY_PRESET.max, QUALITY_VERY_HIGH)
})

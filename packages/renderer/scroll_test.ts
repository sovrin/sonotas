import { test } from 'node:test'
import { assertEquals } from './_assert.ts'
import { clampScroll, scrollState } from './scroll.ts'
import type { Beat } from './types.ts'

const WIDTH = 1000
const beat = (startMs: number, x: number, barX: number): Beat => ({
  startMs,
  x,
  barX,
  barY: 0,
  barW: 0,
  barH: 0,
  heads: []
})

test('bar mode anchors the view to the current bar, note on the beat', () => {
  const beats = [beat(0, 500, 400), beat(100, 800, 700)]
  const s = scrollState('bar', beats, 0, 50, WIDTH)
  assertEquals(s.noteX, 500) // the note, not interpolated
  assertEquals(s.scrollX, 400 - 80) // barX minus BAR_MARGIN
})

test('smooth mode centers the interpolated note in the viewport', () => {
  const beats = [beat(0, 200, 0), beat(100, 400, 0)] // halfway → x 300
  const s = scrollState('smooth', beats, 0, 50, WIDTH)
  assertEquals(s.noteX, 300)
  assertEquals(s.scrollX, 300 - WIDTH / 2)
})

test('smooth mode clamps interpolation to [0,1] within the beat', () => {
  const beats = [beat(0, 200, 0), beat(100, 400, 0)]
  assertEquals(scrollState('smooth', beats, 0, -10, WIDTH).noteX, 200) // before onset
  assertEquals(scrollState('smooth', beats, 0, 999, WIDTH).noteX, 400) // past next
})

test('smooth mode holds on the last beat when there is no next', () => {
  const beats = [beat(0, 250, 0)]
  const s = scrollState('smooth', beats, 0, 500, WIDTH)
  assertEquals(s.noteX, 250)
  assertEquals(s.scrollX, 250 - WIDTH / 2)
})

// pan mode: bar 0 anchored at x 0, bar 1 at x 1000; bar 1 starts at 1000ms.
const panBeats = [beat(0, 10, 0), beat(1000, 1010, 1000)]

test('pan mode holds on the first bar (nothing to pan from)', () => {
  const s = scrollState('pan', panBeats, 0, 500, WIDTH)
  assertEquals(s.scrollX, 0 - 80)
})

test('pan mode eases from the previous bar\'s anchor on crossing in', () => {
  // 125ms into the 250ms pan → ease-out 1-(1-0.5)^2 = 0.75 of the way from 0→1000.
  const s = scrollState('pan', panBeats, 1, 1125, WIDTH)
  assertEquals(s.scrollX, 750 - 80)
})

test('pan mode settles on the current bar once the pan completes', () => {
  const s = scrollState('pan', panBeats, 1, 1400, WIDTH) // 400ms in, past PAN_MS
  assertEquals(s.scrollX, 1000 - 80)
})

test('clampScroll allows scrolling within a span wider than the view', () => {
  assertEquals(clampScroll(500, 0, 2000, 1000), 500) // centered, in range
  assertEquals(clampScroll(-200, 0, 2000, 1000), 0) // clamped to lo (no left gap)
  assertEquals(clampScroll(1800, 0, 2000, 1000), 1000) // clamped to hi - width
})

test('clampScroll pins to lo when the span is narrower than the view', () => {
  assertEquals(clampScroll(50, 600, 1000, 1000), 600)
  assertEquals(clampScroll(9999, 600, 1000, 1000), 600)
})

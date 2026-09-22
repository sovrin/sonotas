import { test } from 'node:test'
import { assertEquals } from './_assert.ts'
import { clampScroll, scrollState, scrollStateY } from './scroll.ts'
import type { Beat } from './types.ts'

const WIDTH = 1000
const beat = (startMs: number, x: number, barX: number, barY = 0): Beat => ({
  startMs,
  x,
  barX,
  barY,
  barW: 0,
  barH: 100,
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

test('smooth mode holds on the beat when the next one is on another system', () => {
  // next beat is at the far left of the following line — no glide back across the page
  const beats = [beat(0, 900, 800, 0), beat(100, 50, 0, 300)]
  assertEquals(scrollState('smooth', beats, 0, 50, WIDTH).noteX, 900)
})

test('none mode keeps the note on the beat and wants the far-left view', () => {
  const beats = [beat(0, 500, 400), beat(100, 800, 700)]
  const s = scrollState('none', beats, 1, 150, WIDTH)
  assertEquals(s.noteX, 800)
  assertEquals(s.scrollX, -Infinity) // clampScroll pins this to the range start
  assertEquals(clampScroll(s.scrollX, -80, 5000, WIDTH), -80)
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

// vertical follow (page layout): system 0 spans y 0..100, system 1 y 300..400;
// the cursor crosses into system 1 at 1000ms. Viewport 500 tall.
const pageBeats = [beat(0, 10, 0, 0), beat(500, 400, 300, 0), beat(1000, 10, 0, 300)]
const VIEW_H = 500

test('scrollStateY centers the current system in bar mode', () => {
  assertEquals(scrollStateY('bar', pageBeats, 0, 100, VIEW_H), 50 - 250)
  assertEquals(scrollStateY('bar', pageBeats, 2, 1100, VIEW_H), 350 - 250)
})

test('scrollStateY eases between systems in pan and smooth modes', () => {
  // 125ms into the 250ms pan → 0.75 of the way from -200 to 100
  assertEquals(scrollStateY('pan', pageBeats, 2, 1125, VIEW_H), -200 + 300 * 0.75)
  assertEquals(scrollStateY('smooth', pageBeats, 2, 1125, VIEW_H), -200 + 300 * 0.75)
  assertEquals(scrollStateY('smooth', pageBeats, 2, 1400, VIEW_H), 100) // settled
})

test('scrollStateY holds on the first system and pins none mode to the top', () => {
  assertEquals(scrollStateY('pan', pageBeats, 1, 600, VIEW_H), -200) // same system, no pan
  assertEquals(scrollStateY('none', pageBeats, 2, 1100, VIEW_H), -Infinity)
  assertEquals(clampScroll(-Infinity, 0, 2000, VIEW_H), 0)
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

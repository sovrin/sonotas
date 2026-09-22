import { test } from 'node:test'
import { assertEquals } from './_assert.ts'
import { barAt, clampScroll, scrollState, scrollStateY } from './scroll.ts'
import type { Beat } from './types.ts'

const WIDTH = 1000
const barMid = (b: Beat) => b.barX + b.barW / 2
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

test('smooth mode holds on the last beat when there is no next', () => {
  const beats = [beat(0, 250, 0)]
  const s = scrollState('smooth', beats, 0, 500, WIDTH)
  assertEquals(s.noteX, 250)
  assertEquals(s.scrollX, 250 - WIDTH / 2)
})

// A repeat: bar A 0..200, bar B 200..400 played twice, one beat per second.
// B's last beat (x 350, 2000–3000ms) jumps back to B's first (x 250) at 3000ms.
const bar = (startMs: number, x: number, barX: number): Beat => ({ ...beat(startMs, x, barX), barW: 200 })
const repeatBeats = [bar(0, 50, 0), bar(1000, 250, 200), bar(2000, 350, 200), bar(3000, 250, 200), bar(4000, 350, 200)]

test('smooth mode glides to the bar end ahead of a repeat, not back over it', () => {
  assertEquals(scrollState('smooth', repeatBeats, 2, 2500, WIDTH).noteX, 375) // halfway 350 → 400
  assertEquals(scrollState('smooth', repeatBeats, 1, 1500, WIDTH).noteX, 300) // plain glide 250 → 350
})

test('smooth mode quick-pans from the bar end after a repeat jump', () => {
  // 125ms into the 250ms pan → ease-out 0.75 of the way from the bar end (400)
  // to the gliding note (250 + 100 · 0.125 = 262.5)
  const s = scrollState('smooth', repeatBeats, 3, 3125, WIDTH)
  assertEquals(s.noteX, 262.5)
  assertEquals(s.scrollX, 400 + (262.5 - 400) * 0.75 - WIDTH / 2)
  // settled once the pan is over; the note is then followed as usual
  assertEquals(scrollState('smooth', repeatBeats, 3, 3400, WIDTH).scrollX, 290 - WIDTH / 2)
})

test('center mode follows the note like smooth', () => {
  const beats = [beat(0, 200, 0), beat(100, 400, 0)]
  assertEquals(scrollState('center', beats, 0, 50, WIDTH), scrollState('smooth', beats, 0, 50, WIDTH))
})

test('center mode rewinds the note with the sheet after a repeat jump', () => {
  // same pan as smooth, but the note eases too, so it stays mid-view
  const s = scrollState('center', repeatBeats, 3, 3125, WIDTH)
  const eased = 400 + (262.5 - 400) * 0.75
  assertEquals(s.noteX, eased)
  assertEquals(s.scrollX, eased - WIDTH / 2)
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

test('centered bar mode puts the bar\'s middle at the view center', () => {
  const beats = [{ ...beat(0, 500, 400), barW: 200 }]
  assertEquals(scrollState('bar', beats, 0, 50, WIDTH, barMid).scrollX, 500 - WIDTH / 2)
})

test('centered pan mode eases between the bars\' centered anchors', () => {
  const beats = panBeats.map(b => ({ ...b, barW: 200 }))
  // centers 100 → 1100; 0.75 of the way at 125ms into the pan
  assertEquals(scrollState('pan', beats, 1, 1125, WIDTH, barMid).scrollX, 100 + 1000 * 0.75 - WIDTH / 2)
})

test('centered smooth mode holds the bar still while the note glides', () => {
  // bar 0 spans 0..200 (center 100), bar 1 200..400 (center 300)
  const beats = [{ ...beat(0, 50, 0), barW: 200 }, { ...beat(100, 250, 200), barW: 200 }]
  const early = scrollState('smooth', beats, 0, 25, WIDTH, barMid) // note at 100, still bar 0
  assertEquals(early.noteX, 100)
  assertEquals(early.scrollX, 100 - WIDTH / 2)
  // note at 212.5 has crossed the barline before bar 1's first onset → bar 1
  assertEquals(scrollState('smooth', beats, 0, 81.25, WIDTH, barMid).scrollX, 300 - WIDTH / 2)
})

test('barAt picks the bar the note x is over, not only the beat\'s', () => {
  const beats = [beat(0, 50, 0), beat(100, 250, 200), beat(200, 20, 0, 300)]
  assertEquals(barAt(beats, 0, 150), beats[0])
  assertEquals(barAt(beats, 0, 200), beats[1]) // crossed the barline
  assertEquals(barAt(beats, 1, 900), beats[1]) // next is on another system
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

test('scrollStateY holds on the first system', () => {
  assertEquals(scrollStateY('pan', pageBeats, 1, 600, VIEW_H), -200) // same system, no pan
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

import { test } from 'node:test'
import { assertEquals } from './_assert.ts'
import { barAt, clampScroll, resolveFollow, scrollState, scrollStateY } from './scroll.ts'
import type { Beat } from './types.ts'

const WIDTH = 1000
const F = { bar: resolveFollow('bar'), pan: resolveFollow('pan'), smooth: resolveFollow('smooth'), center: resolveFollow('center') }
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
  const s = scrollState(F.bar, beats, 0, 50, WIDTH)
  assertEquals(s.noteX, 500) // the note, not interpolated
  assertEquals(s.scrollX, 400 - 80) // barX minus BAR_MARGIN
})

test('smooth mode centers the interpolated note in the viewport', () => {
  const beats = [beat(0, 200, 0), beat(100, 400, 0)] // halfway → x 300
  const s = scrollState(F.smooth, beats, 0, 50, WIDTH)
  assertEquals(s.noteX, 300)
  assertEquals(s.scrollX, 300 - WIDTH / 2)
})

test('smooth mode clamps interpolation to [0,1] within the beat', () => {
  const beats = [beat(0, 200, 0), beat(100, 400, 0)]
  assertEquals(scrollState(F.smooth, beats, 0, -10, WIDTH).noteX, 200) // before onset
  assertEquals(scrollState(F.smooth, beats, 0, 999, WIDTH).noteX, 400) // past next
})

test('smooth mode holds on the beat when the next one is on another system', () => {
  // next beat is at the far left of the following line — no glide back across the page
  const beats = [beat(0, 900, 800, 0), beat(100, 50, 0, 300)]
  assertEquals(scrollState(F.smooth, beats, 0, 50, WIDTH).noteX, 900)
})

test('smooth mode holds on the last beat when there is no next', () => {
  const beats = [beat(0, 250, 0)]
  const s = scrollState(F.smooth, beats, 0, 500, WIDTH)
  assertEquals(s.noteX, 250)
  assertEquals(s.scrollX, 250 - WIDTH / 2)
})

// A repeat: bar A 0..200, bar B 200..400 played twice, one beat per second.
// B's last beat (x 350, 2000–3000ms) jumps back to B's first (x 250) at 3000ms.
const bar = (startMs: number, x: number, barX: number): Beat => ({ ...beat(startMs, x, barX), barW: 200 })
const repeatBeats = [bar(0, 50, 0), bar(1000, 250, 200), bar(2000, 350, 200), bar(3000, 250, 200), bar(4000, 350, 200)]

test('smooth mode glides to the bar end ahead of a repeat, not back over it', () => {
  assertEquals(scrollState(F.smooth, repeatBeats, 2, 2500, WIDTH).noteX, 375) // halfway 350 → 400
  assertEquals(scrollState(F.smooth, repeatBeats, 1, 1500, WIDTH).noteX, 300) // plain glide 250 → 350
})

test('smooth mode quick-pans from the bar end after a repeat jump', () => {
  // 125ms into the 250ms pan → ease-out 0.75 of the way from the bar end (400)
  // to the gliding note (250 + 100 · 0.125 = 262.5)
  const s = scrollState(F.smooth, repeatBeats, 3, 3125, WIDTH)
  assertEquals(s.noteX, 262.5)
  assertEquals(s.scrollX, 400 + (262.5 - 400) * 0.75 - WIDTH / 2)
  // settled once the pan is over; the note is then followed as usual
  assertEquals(scrollState(F.smooth, repeatBeats, 3, 3400, WIDTH).scrollX, 290 - WIDTH / 2)
})

test('center mode follows the note like smooth', () => {
  const beats = [beat(0, 200, 0), beat(100, 400, 0)]
  assertEquals(scrollState(F.center, beats, 0, 50, WIDTH), scrollState(F.smooth, beats, 0, 50, WIDTH))
})

test('center mode rewinds the note with the sheet after a repeat jump', () => {
  // same pan as smooth, but the note eases too, so it stays mid-view
  const s = scrollState(F.center, repeatBeats, 3, 3125, WIDTH)
  const eased = 400 + (262.5 - 400) * 0.75
  assertEquals(s.noteX, eased)
  assertEquals(s.scrollX, eased - WIDTH / 2)
})

// pan mode: bar 0 anchored at x 0, bar 1 at x 1000; bar 1 starts at 1000ms.
const panBeats = [beat(0, 10, 0), beat(1000, 1010, 1000)]

test('pan mode holds on the first bar (nothing to pan from)', () => {
  const s = scrollState(F.pan, panBeats, 0, 500, WIDTH)
  assertEquals(s.scrollX, 0 - 80)
})

test('pan mode eases from the previous bar\'s anchor on crossing in', () => {
  // 125ms into the 250ms pan → ease-out 1-(1-0.5)^2 = 0.75 of the way from 0→1000.
  const s = scrollState(F.pan, panBeats, 1, 1125, WIDTH)
  assertEquals(s.scrollX, 750 - 80)
})

test('pan mode settles on the current bar once the pan completes', () => {
  const s = scrollState(F.pan, panBeats, 1, 1400, WIDTH) // 400ms in, past PAN_MS
  assertEquals(s.scrollX, 1000 - 80)
})

test('centered bar mode puts the bar\'s middle at the view center', () => {
  const beats = [{ ...beat(0, 500, 400), barW: 200 }]
  assertEquals(scrollState(F.bar, beats, 0, 50, WIDTH, barMid).scrollX, 500 - WIDTH / 2)
})

test('centered pan mode eases between the bars\' centered anchors', () => {
  const beats = panBeats.map(b => ({ ...b, barW: 200 }))
  // centers 100 → 1100; 0.75 of the way at 125ms into the pan
  assertEquals(scrollState(F.pan, beats, 1, 1125, WIDTH, barMid).scrollX, 100 + 1000 * 0.75 - WIDTH / 2)
})

test('centered smooth mode holds the bar still while the note glides', () => {
  // bar 0 spans 0..200 (center 100), bar 1 200..400 (center 300)
  const beats = [{ ...beat(0, 50, 0), barW: 200 }, { ...beat(100, 250, 200), barW: 200 }]
  const early = scrollState(F.smooth, beats, 0, 25, WIDTH, barMid) // note at 100, still bar 0
  assertEquals(early.noteX, 100)
  assertEquals(early.scrollX, 100 - WIDTH / 2)
  // note at 212.5 has crossed the barline before bar 1's first onset → bar 1
  assertEquals(scrollState(F.smooth, beats, 0, 81.25, WIDTH, barMid).scrollX, 300 - WIDTH / 2)
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
  assertEquals(scrollStateY(F.bar, pageBeats, 0, 100, VIEW_H), 50 - 250)
  assertEquals(scrollStateY(F.bar, pageBeats, 2, 1100, VIEW_H), 350 - 250)
})

test('scrollStateY eases between systems in pan and smooth modes', () => {
  // 125ms into the 250ms pan → 0.75 of the way from -200 to 100
  assertEquals(scrollStateY(F.pan, pageBeats, 2, 1125, VIEW_H), -200 + 300 * 0.75)
  assertEquals(scrollStateY(F.smooth, pageBeats, 2, 1125, VIEW_H), -200 + 300 * 0.75)
  assertEquals(scrollStateY(F.smooth, pageBeats, 2, 1400, VIEW_H), 100) // settled
})

test('scrollStateY holds on the first system', () => {
  assertEquals(scrollStateY(F.pan, pageBeats, 1, 600, VIEW_H), -200) // same system, no pan
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

// ── playhead and view set apart ─────────────────────────────────────────────

const follow = (f: Parameters<typeof resolveFollow>[1]) => resolveFollow('bar', f)
// bar n spans n·200..(n+1)·200 with one beat at its middle, one second each.
const runBeats = (n: number) => Array.from({ length: n }, (_, k) => bar(k * 1000, k * 200 + 100, k * 200))

test('a gliding playhead over a bar view: the note glides, the view holds on the bar', () => {
  const s = scrollState(follow({ playhead: 'glide' }), runBeats(3), 0, 250, WIDTH)
  assertEquals(s.noteX, 150) // a quarter of the way 100 → 300
  assertEquals(s.scrollX, 0 - 80)
  // past the barline (x 200) before bar 1's onset: the view has cut to bar 1
  assertEquals(scrollState(follow({ playhead: 'glide' }), runBeats(3), 0, 600, WIDTH).scrollX, 200 - 80)
})

test('a jumping playhead over a tracking view: the note sits on the beat, the view glides', () => {
  const s = scrollState(follow({ playhead: 'jump', view: 'track' }), runBeats(3), 0, 500, WIDTH)
  assertEquals(s.noteX, 100)
  assertEquals(s.scrollX, 200 - WIDTH / 2)
})

test('the anchor places now across the view', () => {
  assertEquals(scrollState(follow({ view: 'track', playhead: 'glide', anchor: 0.25 }), runBeats(3), 0, 500, WIDTH).scrollX, 200 - 250)
  assertEquals(scrollState(follow({ anchor: 0.1 }), runBeats(3), 1, 1000, WIDTH).scrollX, 200 - 100)
})

test('a move cut short by the next starts from where it got to', () => {
  // bars every 100ms but a 250ms transition: the view never jumps at a bar change
  const beats = [0, 1, 2, 3].map(k => bar(k * 100, k * 200 + 100, k * 200))
  const f = follow({ transitionMs: 250 })
  for (const at of [100, 200, 300]) {
    const before = scrollState(f, beats, at / 100 - 1, at - 0.001, WIDTH).scrollX
    const after = scrollState(f, beats, at / 100, at, WIDTH).scrollX
    assertEquals(Math.abs(after - before) < 0.1, true)
  }
})

test('the screen view holds until a bar runs off it, then turns to lead with it', () => {
  // 1000 wide, 0 margin: bars 0–4 fit the first screen, bar 5 turns it
  const f = follow({ view: 'screen', anchor: 0 })
  const beats = runBeats(12)
  assertEquals([0, 4, 5, 9, 10].map(k => scrollState(f, beats, k, k * 1000, WIDTH).scrollX), [0, 0, 1000, 1000, 2000])
})

test('turning early leads the next screen with the last bar that fits', () => {
  const f = follow({ view: 'screen', anchor: 0, early: true })
  const beats = runBeats(12)
  assertEquals([0, 3, 4, 7, 8].map(k => scrollState(f, beats, k, k * 1000, WIDTH).scrollX), [0, 0, 800, 800, 1600])
})

test('the screen view turns back to a repeat that left it', () => {
  // bars 0–6 played, then a jump back to bar 1
  const beats = [...runBeats(7), bar(7000, 300, 200)]
  const f = follow({ view: 'screen', anchor: 0 })
  assertEquals(scrollState(f, beats, 6, 6000, WIDTH).scrollX, 1000)
  assertEquals(scrollState(f, beats, 7, 7000, WIDTH).scrollX, 200)
})

test('the screen view turns a page of lines when the next one runs off it', () => {
  // lines 300 apart and 100 tall, one beat each; a 700-tall view holds three
  const beats = [0, 1, 2, 3, 4].map(k => ({ ...beat(k * 1000, 10, 0, k * 300), barW: 200 }))
  const at = (f: ReturnType<typeof follow>) => [0, 2, 3].map(k => scrollStateY(f, beats, k, k * 1000, 700))
  assertEquals(at(follow({ view: 'screen' })), [0, 0, 900])
  assertEquals(at(follow({ view: 'screen', early: true })), [0, 600, 600])
})

test('the steady path keeps an even pace through uneven note spacing', () => {
  // notes 100ms apart alternating 10px and 90px steps: the raw glide lurches
  // between 0.1 and 0.9 px/ms, the steady view holds near the 0.5 average
  const beats: Beat[] = []
  for (let k = 0, x = 0; k < 80; k++, x += k % 2 ? 10 : 90) beats.push({ ...beat(k * 100, x, 0), barW: 8000 })
  const f = follow({ view: 'track', playhead: 'glide', steady: true })
  const x = (t: number) => scrollState(f, beats, Math.floor(t / 100), t, WIDTH).scrollX
  for (const t of [3000, 3050, 4020]) assertEquals(Math.abs((x(t + 10) - x(t)) / 10 - 0.5) < 0.05, true)
  // and meets the raw path at the run's start
  assertEquals(x(0), scrollState(follow({ view: 'track', playhead: 'glide' }), beats, 0, 0, WIDTH).scrollX)
})

import { test } from 'node:test'
import { assertEquals } from './_assert.ts'
import { createPainter } from './paint.ts'
import type { Beat } from './types.ts'

// Bar A spans x 0–400, bar B 400–800 and is played twice (a repeat); two beats
// a bar, 500ms apart. One tile wide enough that the view never clamps.
const beat = (startMs: number, x: number, barX: number): Beat => ({ startMs, x, barX, barY: 0, barW: 400, barH: 100, heads: [] })
const beats = [beat(0, 50, 0), beat(500, 250, 0), beat(1000, 450, 400), beat(1500, 650, 400), beat(2000, 450, 400), beat(2500, 650, 400)]
const painter = createPainter({ tiles: [{ x: 0, y: 0, w: 2000, h: 100, img: null as never }], beats, width: 1000, height: 200, durationMs: 3000 })
// The bar view holds the current bar 80px in from the left, so frame x = sheet x - barX + 80.
const at = (t: number, sheetX: number, barX: number) => painter.timeAt(t, sheetX - barX + 80, 50)

test('a click seeks to the beat at or left of it in the bar', () => {
  assertEquals(at(0, 300, 0), 500)
  assertEquals(at(0, 100, 0), 0)
  assertEquals(at(0, 20, 0), 0) // left of the bar's first note: its first beat
})

test('a click on a repeated bar takes the play nearest the playhead', () => {
  assertEquals(at(1200, 700, 400), 1500) // first time through
  assertEquals(at(2100, 700, 400), 2500) // the repeat
})

test('a click off the notation seeks nowhere', () => {
  assertEquals(at(0, 900, 0), null)
})

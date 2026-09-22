import { test } from 'node:test'
import { assertEquals } from './_assert.ts'
import { barWindow, widestRun } from './fit.ts'

// bars at x 0..100, 100..300, 300..350, 350..600 (widths 100, 200, 50, 250)
const bars = [
  { x: 0, y: 0, w: 100, h: 80 },
  { x: 100, y: 0, w: 200, h: 80 },
  { x: 300, y: 0, w: 50, h: 80 },
  { x: 350, y: 0, w: 250, h: 80 }
]

test('widestRun finds the widest run of n consecutive bars', () => {
  assertEquals(widestRun(bars, 1), 250)
  assertEquals(widestRun(bars, 2), 300) // 300..600 beats 0..300
  assertEquals(widestRun(bars, 3), 500) // 100..600
})

test('widestRun spans every bar when n exceeds the count', () => {
  assertEquals(widestRun(bars, 9), 600)
  assertEquals(widestRun([], 2), 0)
})

test('barWindow reads ahead from the current bar', () => {
  assertEquals(barWindow(4, 0, 2), [0, 2])
  assertEquals(barWindow(4, 1, 2), [1, 3])
})

test('barWindow holds the last full window near the end', () => {
  assertEquals(barWindow(4, 3, 2), [2, 4])
  assertEquals(barWindow(4, 3, 3), [1, 4])
  assertEquals(barWindow(2, 1, 5), [0, 2]) // fewer bars than n
})

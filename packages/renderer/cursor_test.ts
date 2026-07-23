import { test } from 'node:test'
import { assertEquals } from './_assert.ts'
import { cursorRect } from './cursor.ts'

test('cursorRect at full height reproduces the full-height bar', () => {
  assertEquals(cursorRect(100, 3, 1, 200), {
    x: 98.5,
    y: 0,
    width: 3,
    height: 200
  })
})

test('cursorRect centers a partial-height bar vertically', () => {
  assertEquals(cursorRect(100, 4, 0.5, 200), {
    x: 98,
    y: 50,
    width: 4,
    height: 100
  })
})

test('cursorRect clamps the height fraction to [0, 1]', () => {
  assertEquals(cursorRect(0, 2, 1.5, 100).height, 100)
  assertEquals(cursorRect(0, 2, -1, 100).height, 0)
})

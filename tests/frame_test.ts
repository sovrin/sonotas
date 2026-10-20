import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fitEdge, freeAt } from '../app/utils/frame.ts'

test('fitEdge keeps an edge even and within 240–3840 px', () => {
  assert.equal(fitEdge(541, 1920), 542)
  assert.equal(fitEdge(10, 1920), 240)
  assert.equal(fitEdge(9999, 240), 3840)
})

test('fitEdge holds the frame within a 4K frame’s area', () => {
  assert.equal(fitEdge(3840, 3840), 2160)
  assert.equal(fitEdge(3000, 2900), 2860)
})

test('freeAt scales the 1080p size to the resolution', () => {
  assert.deepEqual(freeAt(1920, 540, 1080), [1920, 540])
  assert.deepEqual(freeAt(1920, 540, 720), [1280, 360])
  assert.deepEqual(freeAt(1000, 250, 480), [444, 112])
})

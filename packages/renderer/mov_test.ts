import { test } from 'node:test'
import { assert, assertEquals } from './_assert.ts'
import { CHANNELS, SAMPLE_RATE } from './audio.ts'
import { createMovWriter, pcm16 } from './mov.ts'

const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'dinf'])

/** Every box in the file by path ("moov/trak/mdia/..."), in order, with its payload. */
function boxes(file: Uint8Array): { path: string, at: number, body: DataView }[] {
  const dv = new DataView(file.buffer, file.byteOffset, file.byteLength)
  const out: { path: string, at: number, body: DataView }[] = []
  const walk = (from: number, to: number, path: string) => {
    for (let o = from; o < to;) {
      let size = dv.getUint32(o)
      let header = 8
      if (size === 1) {
        size = Number(dv.getBigUint64(o + 8))
        header = 16
      }
      const type = String.fromCharCode(...file.subarray(o + 4, o + 8))
      const p = path ? `${path}/${type}` : type
      out.push({ path: p, at: o, body: new DataView(file.buffer, file.byteOffset + o + header, size - header) })
      if (CONTAINERS.has(type)) walk(o + header, o + size, p)
      o += size
    }
  }
  walk(0, file.length, '')
  return out
}

/** A stand-in frame: distinct bytes of a distinct length. */
const frame = (i: number) => new Blob([new Uint8Array(100 + i).fill(i)])

async function write(frames: number, fps: number, audio?: Float32Array) {
  const mov = createMovWriter(64, 36, fps, audio)
  for (let i = 0; i < frames; i++) mov.add(frame(i))
  const file = new Uint8Array(await mov.finish().arrayBuffer())
  const all = boxes(file)
  const traks = all.filter(b => b.path === 'moov/trak')
  const inTrak = (n: number, path: string) => all.filter(b => b.path === `moov/trak/${path}` && b.at > traks[n]!.at && (!traks[n + 1] || b.at < traks[n + 1]!.at))[0]!.body
  return { file, all, traks, inTrak }
}

test('the file is ftyp, mdat, moov, and mdat spans the data', async () => {
  const { file, all } = await write(3, 30)
  assertEquals(all.filter(b => !b.path.includes('/')).map(b => b.path), ['ftyp', 'mdat', 'moov'])
  const mdat = all.find(b => b.path === 'mdat')!
  const moov = all.find(b => b.path === 'moov')!
  assertEquals(mdat.at + 16 + mdat.body.byteLength, moov.at)
  assertEquals(moov.at + 8 + moov.body.byteLength, file.length)
})

test('each frame sits where its chunk offset and sample size say', async () => {
  const { file, inTrak } = await write(5, 30)
  const stsz = inTrak(0, 'mdia/minf/stbl/stsz')
  const stco = inTrak(0, 'mdia/minf/stbl/stco')
  assertEquals(stsz.getUint32(8), 5)
  assertEquals(stco.getUint32(4), 5)
  for (let i = 0; i < 5; i++) {
    const size = stsz.getUint32(12 + i * 4)
    const at = stco.getUint32(8 + i * 4)
    assertEquals(size, 100 + i)
    assert(file.subarray(at, at + size).every(b => b === i), `frame ${i} is at its offset`)
  }
})

test('the video track says png at depth 32, and fps frames make a second', async () => {
  const { inTrak } = await write(60, 30)
  const stsd = inTrak(0, 'mdia/minf/stbl/stsd')
  const entry = new Uint8Array(stsd.buffer, stsd.byteOffset + 8, stsd.byteLength - 8)
  assertEquals(String.fromCharCode(...entry.subarray(4, 8)), 'png ')
  assertEquals(new DataView(entry.buffer, entry.byteOffset).getUint16(8 + 74), 32) // depth
  const mdhd = inTrak(0, 'mdia/mdhd')
  assertEquals(mdhd.getUint32(16) / mdhd.getUint32(12), 2) // duration / timescale = seconds
})

test('the sound is 16-bit PCM between the seconds of frames, all of it', async () => {
  const seconds = 2.5
  const audio = new Float32Array(seconds * SAMPLE_RATE * CHANNELS).map((_, i) => ((i % 200) - 100) / 100)
  const { file, traks, inTrak } = await write(75, 30, audio)
  assertEquals(traks.length, 2)
  const stsd = inTrak(1, 'mdia/minf/stbl/stsd')
  assertEquals(String.fromCharCode(...new Uint8Array(stsd.buffer, stsd.byteOffset + 12, 4)), 'sowt')
  const stco = inTrak(1, 'mdia/minf/stbl/stco')
  const stsc = inTrak(1, 'mdia/minf/stbl/stsc')
  const chunks = stco.getUint32(4)
  assertEquals(chunks, 3) // after second 1, after second 2, the rest
  // stsc: one run of whole seconds, then the half second left.
  assertEquals([stsc.getUint32(4), stsc.getUint32(8), stsc.getUint32(12)], [2, 1, SAMPLE_RATE])
  assertEquals([stsc.getUint32(20), stsc.getUint32(24)], [3, SAMPLE_RATE / 2])
  // The chunks hold the whole soundtrack, in order.
  const pcm = pcm16(audio)
  let at = 0
  for (let c = 0; c < chunks; c++) {
    const offset = stco.getUint32(8 + c * 4)
    const n = (c < 2 ? SAMPLE_RATE : SAMPLE_RATE / 2) * 4
    assertEquals(file.subarray(offset, offset + n), pcm.subarray(at, at + n))
    at += n
  }
  assertEquals(at, pcm.length)
  // The first second of sound comes after the first second of frames.
  const video = inTrak(0, 'mdia/minf/stbl/stco')
  assert(stco.getUint32(8) > video.getUint32(8 + 29 * 4) && stco.getUint32(8) < video.getUint32(8 + 30 * 4))
})

test('pcm16 clamps and scales to signed 16-bit, little-endian', () => {
  const out = new DataView(pcm16(new Float32Array([0, 1, -1, 2, -0.5])).buffer)
  assertEquals([0, 1, 2, 3, 4].map(i => out.getInt16(i * 2, true)), [0, 32767, -32767, 32767, -16383])
})

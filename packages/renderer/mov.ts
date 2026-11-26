// A QuickTime (.mov) writer for PNG frames with alpha and 16-bit PCM sound:
// the transparent export. Browsers can encode neither ProRes nor any other
// alpha codec editors read, but they encode PNG, and every editor reads PNG in
// a .mov with its alpha. The box layout follows what ffmpeg writes for
// `-c:v png -c:a pcm_s16le`, the file that was checked in an editor.
import { CHANNELS, SAMPLE_RATE } from './audio.ts'

/** ffmpeg's video timescale is the frame rate times this; editors expect a fine one. */
const TICKS_PER_FRAME = 512
const MOVIE_TIMESCALE = 1000
const PCM_BYTES = 2 * CHANNELS // one 16-bit sample per channel

const ascii = (s: string) => Uint8Array.from(s, c => c.charCodeAt(0))

/** Big-endian bytes from [width, value] pairs, a width of 0 meaning raw bytes. */
function bytes(...fields: ([1 | 2 | 4 | 8, number] | Uint8Array)[]): Uint8Array<ArrayBuffer> {
  const size = fields.reduce((n, f) => n + (f instanceof Uint8Array ? f.length : f[0]), 0)
  const out = new Uint8Array(size)
  const dv = new DataView(out.buffer)
  let o = 0
  for (const f of fields) {
    if (f instanceof Uint8Array) {
      out.set(f, o)
      o += f.length
      continue
    }
    const [w, v] = f
    if (w === 1) dv.setUint8(o, v)
    else if (w === 2) dv.setUint16(o, v)
    else if (w === 4) dv.setUint32(o, v)
    else dv.setBigUint64(o, BigInt(v))
    o += w
  }
  return out
}

function box(type: string, ...body: Uint8Array[]): Uint8Array<ArrayBuffer> {
  return bytes([4, 8 + body.reduce((n, b) => n + b.length, 0)], ascii(type), ...body)
}

/** A box with QuickTime's version and flags word. */
const full = (type: string, flags: number, ...body: Uint8Array[]) => box(type, bytes([4, flags]), ...body)

/** QuickTime's Pascal string: a length byte, then the text, padded to `size`. */
function pascal(s: string, size = s.length + 1): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(size)
  out[0] = s.length
  out.set(ascii(s), 1)
  return out
}

const MATRIX = bytes([4, 0x10000], [4, 0], [4, 0], [4, 0], [4, 0x10000], [4, 0], [4, 0], [4, 0], [4, 0x40000000])

interface Track {
  kind: 'vide' | 'soun'
  timescale: number
  duration: number // in `timescale`
  entry: Uint8Array // the sample description
  stts: [count: number, delta: number][]
  sizes: number[] | { size: number, count: number } // per sample, or all alike
  chunks: { offset: number, samples: number }[]
}

function trak(t: Track, id: number, width: number, height: number): Uint8Array<ArrayBuffer> {
  const video = t.kind === 'vide'
  const movieDuration = Math.round((t.duration / t.timescale) * MOVIE_TIMESCALE)
  const tkhd = full('tkhd', 3, bytes(
    [4, 0], [4, 0], [4, id], [4, 0], [4, movieDuration], [8, 0],
    [2, 0], [2, video ? 0 : 1], [2, video ? 0 : 0x100], [2, 0],
    MATRIX, [4, video ? width * 0x10000 : 0], [4, video ? height * 0x10000 : 0]
  ))
  const edts = box('edts', full('elst', 0, bytes([4, 1], [4, movieDuration], [4, 0], [4, 0x10000])))
  const mdhd = full('mdhd', 0, bytes([4, 0], [4, 0], [4, t.timescale], [4, t.duration], [2, 0x7fff], [2, 0]))
  const hdlr = full('hdlr', 0, ascii('mhlr'), ascii(t.kind), bytes([4, 0], [4, 0], [4, 0]), pascal(video ? 'VideoHandler' : 'SoundHandler'))
  const media = video ? full('vmhd', 1, bytes([2, 0], [2, 0], [2, 0], [2, 0])) : full('smhd', 0, bytes([2, 0], [2, 0]))
  const dhlr = full('hdlr', 0, ascii('dhlr'), ascii('url '), bytes([4, 0], [4, 0], [4, 0]), pascal('DataHandler'))
  const dinf = box('dinf', full('dref', 0, bytes([4, 1]), full('url ', 1)))
  const last = t.chunks.at(-1)
  const wide = !!last && last.offset > 0xffffffff
  // Runs of chunks holding the same number of samples.
  const runs: [first: number, samples: number][] = []
  t.chunks.forEach((c, i) => {
    if (runs.at(-1)?.[1] !== c.samples) runs.push([i + 1, c.samples])
  })
  const stbl = box(
    'stbl',
    full('stsd', 0, bytes([4, 1]), t.entry),
    full('stts', 0, bytes([4, t.stts.length], ...t.stts.flatMap(([n, d]) => [[4, n], [4, d]] as [4, number][]))),
    full('stsc', 0, bytes([4, runs.length], ...runs.flatMap(([c, n]) => [[4, c], [4, n], [4, 1]] as [4, number][]))),
    Array.isArray(t.sizes)
      ? full('stsz', 0, bytes([4, 0], [4, t.sizes.length], ...t.sizes.map(s => [4, s] as [4, number])))
      : full('stsz', 0, bytes([4, t.sizes.size], [4, t.sizes.count])),
    full(wide ? 'co64' : 'stco', 0, bytes([4, t.chunks.length], ...t.chunks.map(c => [wide ? 8 : 4, c.offset] as [4 | 8, number])))
  )
  return box('trak', tkhd, edts, box('mdia', mdhd, hdlr, box('minf', media, dhlr, dinf, stbl)))
}

function pngEntry(width: number, height: number): Uint8Array<ArrayBuffer> {
  return box(
    'png ',
    bytes([4, 0], [2, 0], [2, 1]), // reserved, data reference 1
    bytes([2, 0], [2, 0], [4, 0], [4, 0x200], [4, 0x200]), // version, revision, vendor, temporal and spatial quality
    bytes([2, width], [2, height], [4, 72 * 0x10000], [4, 72 * 0x10000], [4, 0], [2, 1]),
    pascal('png', 32),
    bytes([2, 32], [2, 0xffff]), // depth 32: the alpha is real; no colour table
    box('fiel', bytes([1, 1], [1, 0])),
    box('pasp', bytes([4, 1], [4, 1]))
  )
}

function sowtEntry(): Uint8Array<ArrayBuffer> {
  return box(
    'sowt',
    bytes([4, 0], [2, 0], [2, 1]),
    bytes([2, 0], [2, 0], [4, 0]), // version 0, revision, vendor
    bytes([2, CHANNELS], [2, 16], [2, 0], [2, 0], [4, SAMPLE_RATE * 0x10000]),
    full('chan', 0, bytes([4, 0x650002], [4, 0], [4, 0])) // stereo layout
  )
}

/** 16-bit little-endian PCM of interleaved float samples. */
export function pcm16(samples: Float32Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(samples.length * 2)
  const dv = new DataView(out.buffer)
  samples.forEach((v, i) => dv.setInt16(i * 2, Math.round(Math.max(-1, Math.min(1, v)) * 0x7fff), true))
  return out
}

export interface MovWriter {
  /** Append the next frame, a PNG. */
  add(png: Blob): void
  /** The finished file: frames and sound, the index after them. */
  finish(): Blob
}

/** Write a .mov of `fps` PNG frames, with `audio` (interleaved stereo at
 * SAMPLE_RATE) as a PCM track when given. Frames stay as the Blobs they came
 * in, which the browser may keep on disk, so a long clip needn't fit in memory.
 * The sound goes in one-second chunks between the seconds of frames. */
export function createMovWriter(width: number, height: number, fps: number, audio?: Float32Array): MovWriter {
  const ftyp = box('ftyp', ascii('qt  '), bytes([4, 0x200]), ascii('qt  '))
  const MDAT_HEADER = 16 // a 64-bit size: the clip may pass 4 GB
  const parts: BlobPart[] = []
  let offset = ftyp.length + MDAT_HEADER
  const sizes: number[] = []
  const frameChunks: Track['chunks'] = []
  const soundChunks: Track['chunks'] = []
  const pcm = audio ? pcm16(audio) : undefined
  const soundFrames = audio ? audio.length / CHANNELS : 0
  let soundAt = 0 // sample frames written

  const writeSound = (until: number) => {
    const end = Math.min(until, soundFrames)
    if (!pcm || end <= soundAt) return
    const chunk = pcm.subarray(soundAt * PCM_BYTES, end * PCM_BYTES)
    parts.push(chunk)
    soundChunks.push({ offset, samples: end - soundAt })
    offset += chunk.length
    soundAt = end
  }

  return {
    add(png) {
      parts.push(png)
      frameChunks.push({ offset, samples: 1 })
      sizes.push(png.size)
      offset += png.size
      // After each second of frames, that second of sound.
      if (sizes.length % fps === 0) writeSound(Math.round((sizes.length / fps) * SAMPLE_RATE))
    },
    finish() {
      writeSound(Infinity)
      const frames = sizes.length
      const tracks: Track[] = [{
        kind: 'vide',
        timescale: fps * TICKS_PER_FRAME,
        duration: frames * TICKS_PER_FRAME,
        entry: pngEntry(width, height),
        stts: [[frames, TICKS_PER_FRAME]],
        sizes,
        chunks: frameChunks
      }]
      if (soundFrames) {
        tracks.push({
          kind: 'soun',
          timescale: SAMPLE_RATE,
          duration: soundFrames,
          entry: sowtEntry(),
          stts: [[soundFrames, 1]],
          sizes: { size: PCM_BYTES, count: soundFrames },
          chunks: soundChunks
        })
      }
      const duration = Math.max(...tracks.map(t => Math.round((t.duration / t.timescale) * MOVIE_TIMESCALE)))
      const mvhd = full('mvhd', 0, bytes(
        [4, 0], [4, 0], [4, MOVIE_TIMESCALE], [4, duration], [4, 0x10000], [2, 0x100], [8, 0], [2, 0],
        MATRIX, [4, 0], [4, 0], [4, 0], [4, 0], [4, 0], [4, 0], [4, tracks.length + 1]
      ))
      const moov = box('moov', mvhd, ...tracks.map((t, i) => trak(t, i + 1, width, height)))
      const mdat = bytes([4, 1], ascii('mdat'), [8, offset - ftyp.length])
      return new Blob([ftyp, mdat, ...parts, moov], { type: 'video/quicktime' })
    }
  }
}

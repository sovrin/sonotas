import {
  BufferTarget,
  EncodedPacket,
  EncodedVideoPacketSource,
  Mp4OutputFormat,
  Output
} from 'mediabunny'
import type { Painter } from './paint.ts'
import type { PaintOptions, Quality } from './types.ts'

/** Seconds between forced keyframes. Every GOP starts on a multiple of this,
 * which is what lets separate encoders each take a run of GOPs and have the
 * pieces stitched back into one stream. */
export const KEYFRAME_SECONDS = 2

/** Our quality presets on mediabunny's 0–1 quality scale (its 'low', 'medium',
 * 'high' and 'very-high'). */
export const QUALITY_LEVEL: Record<Quality, number> = {
  low: 0.25,
  medium: 0.5,
  high: 0.75,
  max: 1
}

/** Constant H.264 quantizer for a preset: mediabunny's mapping of the quality
 * scale onto QP 41 (worst) … 16 (best). */
export function quantizerFor(quality: Quality): number {
  return Math.round(41 + (16 - 41) * QUALITY_LEVEL[quality])
}

/** Target bitrate for a preset where the encoder can't hold a constant
 * quantizer: mediabunny's model, 3 Mbps at 1080p scaled by pixel count and a
 * quality factor of 0.3·e^(2.5538·level). */
export function bitrateFor(quality: Quality, width: number, height: number): number {
  const scale = Math.pow((width * height) / (1920 * 1080), 0.95)
  const factor = 0.3 * Math.exp(2.5538 * QUALITY_LEVEL[quality])
  return Math.ceil((3_000_000 * scale * factor) / 1000) * 1000
}

// H.264 levels by max frame size and max macroblock rate (Table A-1).
const AVC_LEVELS: [level: number, maxFs: number, maxMbps: number][] = [
  [0x1f, 3600, 108000], // 3.1
  [0x20, 5120, 216000], // 3.2
  [0x28, 8192, 245760], // 4.0
  [0x2a, 8704, 522240], // 4.2
  [0x32, 22080, 589824], // 5.0
  [0x33, 36864, 983040], // 5.1
  [0x34, 36864, 2073600] // 5.2
]

/** `avc1` codec string, High profile, at the lowest level that fits the frame
 * size and the macroblock rate at `fps`. */
export function avcCodecString(width: number, height: number, fps: number): string {
  const fs = Math.ceil(width / 16) * Math.ceil(height / 16)
  const level = AVC_LEVELS.find(([, maxFs, maxMbps]) => fs <= maxFs && fs * fps <= maxMbps) ?? AVC_LEVELS.at(-1)!
  return `avc1.6400${level[0].toString(16).padStart(2, '0')}`
}

/** Number of constant-rate frames in the clip window `[startMs, endMs]` played
 * at `speed` (2 = twice as fast → half the frames). */
export function clipFrames(
  startMs: number,
  endMs: number,
  durationMs: number,
  fps: number,
  speed = 1
): number {
  const start = Math.max(0, startMs)
  const end = Math.min(endMs, durationMs)
  return Math.max(1, Math.ceil(((end - start) / 1000 / speed) * fps))
}

export interface EncodeParams {
  fps: number
  startMs: number
  endMs: number
  speed: number // playback rate; scales source time per output frame
  quality: Quality
  fast: boolean // parallel software encoders instead of the constant-quality path
  paint: PaintOptions // crop/scroll/cursor/background passed through to paint()
  onProgress?: (frame: number, total: number) => void
  signal?: AbortSignal // closes the encoders and abandons the output
}

/** A run of output frames `[first, first + count)` one encoder paints in order. */
export interface Range {
  first: number
  count: number
}

/** Split `total` frames into at most `parts` contiguous runs of whole GOPs,
 * their GOP counts differing by at most one (the clip's last GOP may be short). */
export function splitRanges(total: number, gopFrames: number, parts: number): Range[] {
  const gops = Math.ceil(total / gopFrames)
  const n = Math.max(1, Math.min(parts, gops))
  return Array.from({ length: n }, (_, j) => {
    const first = Math.floor((j * gops) / n) * gopFrames
    const end = Math.min(total, Math.floor(((j + 1) * gops) / n) * gopFrames)
    return { first, count: end - first }
  })
}

/** Indices of `samples` GOPs spread evenly over `gops`, each at the centre of
 * its stratum (all of them when `samples >= gops`). */
export function sampleGops(gops: number, samples: number): number[] {
  if (samples >= gops) return Array.from({ length: gops }, (_, i) => i)
  return Array.from({ length: samples }, (_, i) => Math.floor(((i + 0.5) * gops) / samples))
}

/** How to encode: the WebCodecs config, extra per-frame options (the
 * quantizer), and how many encoders run side by side. */
interface Setup {
  config: VideoEncoderConfig
  frame: VideoEncoderEncodeOptions
  lanes: number
}

/** One software encoder per two cores, leaving the rest to the page and the
 * browser. Scaling flattens early: every lane's frames go through the same
 * GPU→CPU readback, so on a 10-core M1 Pro 5 lanes beat 4 by 2–10% and 8 were
 * no faster (slower on continuous scroll). The cap bounds memory and
 * contention on many-core machines. */
function fastLanes(): number {
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2
  return Math.max(1, Math.min(8, Math.floor(cores / 2)))
}

/** Pick the first encoder setup this browser supports:
 *
 * - fast: software H.264 at a target bitrate across `fastLanes()` encoders.
 *   ~3× faster than the default on a 10-core Mac, but 2–3× larger files with
 *   slightly softer motion, and the size estimate is only approximate.
 * - constant quantizer (usually the hardware encoder) across 2 encoders. A
 *   hardware encoder is a fixed-throughput unit (~6 ms/frame at 1080p on an
 *   M1 Pro, nearly independent of resolution), so 2 sessions only overlap its
 *   pipeline: ~20% faster; more add nothing. The output is byte-identical to
 *   one encoder, since every GOP starts on a keyframe and a quantizer has no
 *   rate-control state to carry over.
 * - target bitrate, single encoder: the last resort. */
async function resolveSetup(
  width: number,
  height: number,
  fps: number,
  quality: Quality,
  fast: boolean
): Promise<Setup> {
  const base: VideoEncoderConfig = {
    codec: avcCodecString(width, height, fps),
    width,
    height,
    framerate: fps,
    avc: { format: 'avc' } // length-prefixed NALUs + avcC, what mp4 wants (not Annex B)
  }
  const bitrate = bitrateFor(quality, width, height)
  const candidates: Setup[] = [
    ...(fast
      ? [{ config: { ...base, bitrate, bitrateMode: 'variable', hardwareAcceleration: 'prefer-software' }, frame: {}, lanes: fastLanes() } as Setup]
      : []),
    { config: { ...base, bitrateMode: 'quantizer' }, frame: { avc: { quantizer: quantizerFor(quality) } }, lanes: 2 } as Setup,
    { config: { ...base, bitrate, bitrateMode: 'variable' }, frame: {}, lanes: 1 }
  ]
  for (const c of candidates) {
    const { supported } = await VideoEncoder.isConfigSupported(c.config).catch(() => ({ supported: false }))
    if (supported) return c
  }
  throw new Error('This browser cannot encode H.264 video.')
}

interface LaneOutput {
  packets: EncodedPacket[]
  meta?: EncodedVideoChunkMetadata // first metadata carrying the decoder config
}

interface Hooks {
  keep?: boolean // collect packets for muxing (the probe only counts bytes)
  onPacket?: (bytes: number) => void
  signal?: AbortSignal
}

/** Paint and encode each lane's ranges on its own VideoEncoder, all lanes
 * concurrently. Frame `i` shows source time `startMs + i/fps·speed`, is
 * stamped `i/fps` and is a keyframe on every GOP boundary. Resolves `null` if
 * `signal` aborted: every encoder is closed right away, dropping its queued
 * frames, and the lanes stop painting. */
async function encodeLanes(
  painter: Painter,
  { fps, startMs, speed, paint }: Pick<EncodeParams, 'fps' | 'startMs' | 'speed' | 'paint'>,
  setup: Setup,
  lanes: Range[][],
  { keep, onPacket, signal }: Hooks
): Promise<LaneOutput[] | null> {
  const { width, height } = painter
  const gopFrames = Math.round(KEYFRAME_SECONDS * fps)
  let failed: unknown = null
  const halted = () => !!failed || !!signal?.aborted

  // Painting and handing frames to the encoders is cheap main-thread work; the
  // encoders run off-thread. Still yield on a wall-clock budget (~every 60ms)
  // so progress UI keeps repainting. rAF-based yields resume right before a
  // paint (so the browser actually redraws the bar); setTimeout is the
  // fallback where rAF is absent (e.g. a worker context).
  const raf = typeof requestAnimationFrame === 'function'
  const yieldToPaint = () =>
    new Promise<void>(r => (raf ? requestAnimationFrame(() => r()) : setTimeout(r)))
  let lastYield = performance.now()

  const runLane = async (ranges: Range[]): Promise<LaneOutput> => {
    const out: LaneOutput = { packets: [] }
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')!
    let wake: (() => void) | null = null // resolves a backpressure wait early on error/abort
    const encoder = new VideoEncoder({
      output: (chunk, meta) => {
        if (!out.meta && meta?.decoderConfig) out.meta = meta
        if (keep) out.packets.push(EncodedPacket.fromEncodedChunk(chunk))
        onPacket?.(chunk.byteLength)
      },
      error: (e) => {
        failed ??= e
        wake?.()
      }
    })
    const abort = () => {
      if (encoder.state !== 'closed') encoder.close() // drops queued frames; a pending flush rejects
      wake?.()
    }
    signal?.addEventListener('abort', abort, { once: true })
    encoder.configure(setup.config)
    try {
      for (const { first, count } of ranges) {
        for (let i = first; i < first + count; i++) {
          if (halted()) return out
          painter.paint(ctx, startMs + (i / fps) * 1000 * speed, paint) // clip-relative source time
          const frame = new VideoFrame(canvas, {
            timestamp: Math.round((i / fps) * 1e6), // output timestamps start at 0
            duration: Math.round(1e6 / fps)
          })
          encoder.encode(frame, { ...setup.frame, keyFrame: i % gopFrames === 0 || i === first })
          frame.close()
          while (encoder.encodeQueueSize >= 4 && !halted()) {
            await new Promise<void>((r) => {
              wake = r
              encoder.addEventListener('dequeue', () => r(), { once: true })
            })
          }
          if (performance.now() - lastYield >= 60) {
            lastYield = performance.now()
            await yieldToPaint()
          }
        }
      }
      await encoder.flush()
      return out
    } catch (e) {
      if (signal?.aborted) return out // the flush we cut short
      throw e
    } finally {
      signal?.removeEventListener('abort', abort)
      if (encoder.state !== 'closed') encoder.close()
    }
  }

  const outputs = await Promise.all(lanes.map(runLane))
  if (failed) throw failed
  return signal?.aborted ? null : outputs
}

/** Raw bytes of a decoder config's `description` (the avcC box). */
function descriptionBytes(meta?: EncodedVideoChunkMetadata): string {
  const d = meta?.decoderConfig?.description
  if (!d) return ''
  const u = ArrayBuffer.isView(d) ? new Uint8Array(d.buffer, d.byteOffset, d.byteLength) : new Uint8Array(d)
  return u.join(',')
}

/** Mux the lanes' packets, in lane order, into one mp4. An mp4 track carries a
 * single avcC, so every lane must have produced the same one (they do with an
 * identical config); resolves `null` if not. */
async function mux(lanes: LaneOutput[], fps: number): Promise<Blob | null> {
  const filled = lanes.filter(l => l.packets.length)
  const avcC = descriptionBytes(filled[0]?.meta)
  if (filled.some(l => descriptionBytes(l.meta) !== avcC)) return null
  const out = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() })
  const src = new EncodedVideoPacketSource('avc')
  out.addVideoTrack(src, { frameRate: fps })
  await out.start()
  let meta = filled[0]?.meta
  for (const lane of filled) {
    for (const packet of lane.packets) {
      await src.add(packet, meta)
      meta = undefined // the decoder config goes with the first packet only
    }
  }
  await out.finalize()
  return new Blob([out.target.buffer!], { type: 'video/mp4' })
}

/** Encode the clip window `[startMs, endMs]` to an mp4 Blob via WebCodecs at a
 * constant `fps`, played back at `speed`.
 *
 * One frame per 1/fps step, cursor painted at the exact frame time. Constant
 * frame rate (not per-beat variable durations) is what real-time players — VLC
 * especially — need; VBR streams play back jerky and skip frames. Static content
 * still compresses tiny (identical frames → near-empty P-frames).
 *
 * The clip is split into runs of whole GOPs, one per encoder (see
 * `resolveSetup`), and the packets stitched back in order. Aborting `signal`
 * stops the encoders at once and rejects with its reason (an AbortError). */
export async function encodeVideo(
  painter: Painter,
  { endMs, onProgress, signal, ...params }: EncodeParams
): Promise<Blob> {
  const { fps, startMs, speed, quality, fast } = params
  const total = clipFrames(startMs, endMs, painter.durationMs, fps, speed)
  const gopFrames = Math.round(KEYFRAME_SECONDS * fps)
  signal?.throwIfAborted()
  const setup = await resolveSetup(painter.width, painter.height, fps, quality, fast)
  let lanes = setup.lanes
  for (;;) {
    let done = 0
    const outputs = await encodeLanes(
      painter,
      params,
      setup,
      splitRanges(total, gopFrames, lanes).map(r => [r]),
      { keep: true, onPacket: () => onProgress?.(++done, total), signal }
    )
    if (!outputs) throw signal!.reason
    const blob = await mux(outputs, fps)
    signal?.throwIfAborted()
    if (blob) return blob
    lanes = 1 // encoders disagreed on the stream header: redo it as one stream
  }
}

/** mp4 container cost on top of the encoded packets: a fixed header plus the
 * per-sample index tables (size, timing, chunk offsets). Measured. */
const MP4_BASE_BYTES = 1200
const MP4_BYTES_PER_FRAME = 4

/** Predict the byte size `encodeVideo` would produce for the same params by
 * really encoding a few of its GOPs and scaling up.
 *
 * With a constant quantizer, a frame's cost depends only on its content and
 * the previous frame — never on a bitrate budget. Every GOP starts with a
 * forced keyframe every `KEYFRAME_SECONDS` of output time, so a GOP encoded on
 * its own costs exactly what it costs inside the full export. Encoding
 * `samples` evenly spread GOPs and scaling their mean by the GOP count is
 * therefore an unbiased estimate; the only error is how representative the
 * sampled GOPs are. The fast (target-bitrate) path is only approximate: its
 * rate control carries state across GOPs. Resolves `null` if `signal` aborts. */
export async function estimateVideoBytes(
  painter: Painter,
  { endMs, onProgress: _, signal, ...params }: EncodeParams,
  samples: number
): Promise<number | null> {
  const { fps, startMs, speed, quality, fast } = params
  const total = clipFrames(startMs, endMs, painter.durationMs, fps, speed)
  const gopFrames = Math.round(KEYFRAME_SECONDS * fps)
  const setup = await resolveSetup(painter.width, painter.height, fps, quality, fast)
  if (signal?.aborted) return null
  const picks: Range[] = sampleGops(Math.ceil(total / gopFrames), samples).map(g => ({
    first: g * gopFrames,
    count: Math.min(gopFrames, total - g * gopFrames)
  }))
  // Deal the sampled GOPs to the lanes in contiguous, time-ordered runs.
  const per = Math.ceil(picks.length / setup.lanes)
  const lanes = Array.from({ length: setup.lanes }, (_, j) => picks.slice(j * per, (j + 1) * per)).filter(l => l.length)
  let bytes = 0
  const outputs = await encodeLanes(painter, params, setup, lanes, { onPacket: b => (bytes += b), signal })
  if (!outputs) return null
  const frames = picks.reduce((n, r) => n + r.count, 0)
  return Math.round((bytes / frames) * total + MP4_BASE_BYTES + MP4_BYTES_PER_FRAME * total)
}

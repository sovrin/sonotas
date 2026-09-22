import {
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  NullTarget,
  Output,
  type Quality as MbQuality,
  QUALITY_HIGH,
  QUALITY_LOW,
  QUALITY_MEDIUM,
  QUALITY_VERY_HIGH
} from 'mediabunny'
import type { Painter } from './paint.ts'
import type { PaintOptions, Quality } from './types.ts'

/** Seconds between forced keyframes — mediabunny's default, pinned here so the
 * size probe's GOPs line up with the export's. */
export const KEYFRAME_SECONDS = 2

/** Our quality presets → mediabunny's opaque quality constants. Kept internal
 * so mediabunny's Quality type never leaks past this module. */
export const QUALITY_PRESET: Record<Quality, MbQuality> = {
  low: QUALITY_LOW,
  medium: QUALITY_MEDIUM,
  high: QUALITY_HIGH,
  max: QUALITY_VERY_HIGH
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
  paint: PaintOptions // crop/scroll/cursor/background passed through to paint()
  onProgress?: (frame: number, total: number) => void
}

/** Paint and encode `total` frames from `startMs` into a fresh avc track on
 * `out`, then finalize it. Frame `i` shows source time `startMs + i/fps·speed`
 * and is stamped `i/fps`. `stop()` is polled after each frame; true aborts. */
async function encodeFrames(
  painter: Painter,
  out: Output,
  { fps, startMs, speed, quality, paint }: Omit<EncodeParams, 'endMs' | 'onProgress'>,
  total: number,
  onFrame?: (frame: number) => void,
  onPacketBytes?: (bytes: number) => void,
  stop?: () => boolean
): Promise<boolean> {
  const { width, height } = painter
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')!
  const src = new CanvasSource(canvas, {
    codec: 'avc',
    bitrate: QUALITY_PRESET[quality],
    keyFrameInterval: KEYFRAME_SECONDS,
    onEncodedPacket: onPacketBytes && (packet => onPacketBytes(packet.byteLength))
  })
  out.addVideoTrack(src, { frameRate: fps })
  await out.start()

  // The paint→encode loop is synchronous CPU work; nothing repaints while it
  // runs. Yield on a wall-clock budget (~every 60ms) so progress UI updates at
  // a steady ~16fps no matter how long the clip is — a frame-count cadence
  // stalls the bar for seconds on long renders. rAF-based yields resume right
  // before a paint (so the browser actually redraws the bar); setTimeout is the
  // fallback where rAF is absent (e.g. a worker context).
  const raf = typeof requestAnimationFrame === 'function'
  const yieldToPaint = () =>
    new Promise<void>(r => (raf ? requestAnimationFrame(() => r()) : setTimeout(r)))
  let lastYield = performance.now()
  for (let i = 0; i < total; i++) {
    painter.paint(ctx, startMs + (i / fps) * 1000 * speed, paint) // clip-relative source time
    await src.add(i / fps, 1 / fps) // output timestamps start at 0
    onFrame?.(i + 1)
    if (stop?.()) {
      await out.cancel()
      return false
    }
    if (performance.now() - lastYield >= 60) {
      await yieldToPaint()
      lastYield = performance.now()
    }
  }

  await out.finalize()
  return true
}

/** Encode the clip window `[startMs, endMs]` to an mp4 Blob via WebCodecs at a
 * constant `fps`, played back at `speed`.
 *
 * One frame per 1/fps step, cursor painted at the exact frame time. Constant
 * frame rate (not per-beat variable durations) is what real-time players — VLC
 * especially — need; VBR streams play back jerky and skip frames. Static content
 * still compresses tiny (identical frames → near-empty P-frames). */
export async function encodeVideo(
  painter: Painter,
  { endMs, onProgress, ...params }: EncodeParams
): Promise<Blob> {
  const total = clipFrames(params.startMs, endMs, painter.durationMs, params.fps, params.speed)
  const out = new Output({
    format: new Mp4OutputFormat(),
    target: new BufferTarget()
  })
  await encodeFrames(painter, out, params, total, frame => onProgress?.(frame, total))
  return new Blob([out.target.buffer!], { type: 'video/mp4' })
}

/** Indices of `samples` GOPs spread evenly over `gops`, each at the centre of
 * its stratum (all of them when `samples >= gops`). */
export function sampleGops(gops: number, samples: number): number[] {
  if (samples >= gops) return Array.from({ length: gops }, (_, i) => i)
  return Array.from({ length: samples }, (_, i) => Math.floor(((i + 0.5) * gops) / samples))
}

/** mp4 container cost on top of the encoded packets: a fixed header plus the
 * per-sample index tables (size, timing, chunk offsets). Measured. */
const MP4_BASE_BYTES = 1200
const MP4_BYTES_PER_FRAME = 4

/** Predict the byte size `encodeVideo` would produce for the same params by
 * really encoding a few of its GOPs and scaling up.
 *
 * mediabunny encodes avc at a constant quantizer, so a frame's cost depends
 * only on its content and the previous frame — never on a bitrate budget.
 * Every GOP starts with a forced keyframe every `KEYFRAME_SECONDS` of output
 * time, so a GOP encoded standalone costs exactly what it costs inside the
 * full export. Encoding `samples` evenly spread GOPs and scaling their mean by
 * the GOP count is therefore an unbiased estimate; the only error is how
 * representative the sampled GOPs are. Resolves `null` if `stop()` fires. */
export async function estimateVideoBytes(
  painter: Painter,
  { endMs, onProgress: _, ...params }: EncodeParams,
  samples: number,
  stop?: () => boolean
): Promise<number | null> {
  const { fps, startMs, speed } = params
  const total = clipFrames(startMs, endMs, painter.durationMs, fps, speed)
  const gopFrames = Math.round(KEYFRAME_SECONDS * fps)
  const gops = Math.ceil(total / gopFrames)
  let sampledBytes = 0
  let sampledFrames = 0
  for (const g of sampleGops(gops, samples)) {
    const frames = Math.min(gopFrames, total - g * gopFrames)
    const out = new Output({ format: new Mp4OutputFormat(), target: new NullTarget() })
    const gopStartMs = startMs + ((g * gopFrames) / fps) * 1000 * speed
    const done = await encodeFrames(
      painter,
      out,
      { ...params, startMs: gopStartMs },
      frames,
      undefined,
      bytes => (sampledBytes += bytes),
      stop
    )
    if (!done) return null
    sampledFrames += frames
  }
  const packets = (sampledBytes / sampledFrames) * total
  return Math.round(packets + MP4_BASE_BYTES + MP4_BYTES_PER_FRAME * total)
}

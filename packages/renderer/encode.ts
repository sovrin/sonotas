import {
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  type Quality as MbQuality,
  QUALITY_HIGH,
  QUALITY_LOW,
  QUALITY_MEDIUM
} from 'mediabunny'
import type { Painter } from './paint.ts'
import type { PaintOptions, Quality } from './types.ts'

/** Our quality presets → mediabunny's opaque quality constants. Kept internal
 * so mediabunny's Quality type never leaks past this module. */
export const QUALITY_PRESET: Record<Quality, MbQuality> = {
  low: QUALITY_LOW,
  medium: QUALITY_MEDIUM,
  high: QUALITY_HIGH
}

/** Number of constant-rate frames in the clip window `[startMs, endMs]`. */
export function clipFrames(
  startMs: number,
  endMs: number,
  durationMs: number,
  fps: number
): number {
  const start = Math.max(0, startMs)
  const end = Math.min(endMs, durationMs)
  return Math.max(1, Math.ceil(((end - start) / 1000) * fps))
}

export interface EncodeParams {
  fps: number
  startMs: number
  endMs: number
  quality: Quality
  paint: PaintOptions // crop/scroll/cursor/background passed through to paint()
  onProgress?: (frame: number, total: number) => void
}

/** Encode the clip window `[startMs, endMs]` to an mp4 Blob via WebCodecs at a
 * constant `fps`.
 *
 * One frame per 1/fps step, cursor painted at the exact frame time. Constant
 * frame rate (not per-beat variable durations) is what real-time players — VLC
 * especially — need; VBR streams play back jerky and skip frames. Static content
 * still compresses tiny (identical frames → near-empty P-frames). */
export async function encodeVideo(
  painter: Painter,
  { fps, startMs, endMs, quality, paint, onProgress }: EncodeParams
): Promise<Blob> {
  const { width, height, durationMs } = painter
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')!
  const out = new Output({
    format: new Mp4OutputFormat(),
    target: new BufferTarget()
  })
  const src = new CanvasSource(canvas, {
    codec: 'avc',
    bitrate: QUALITY_PRESET[quality]
  })
  out.addVideoTrack(src, { frameRate: fps })
  await out.start()

  const total = clipFrames(startMs, endMs, durationMs, fps)
  // The paint→encode loop is synchronous CPU work; nothing repaints while it
  // runs. Yield on a wall-clock budget (~every 60ms) so progress UI updates at
  // a steady ~16fps no matter how long the clip is — a frame-count cadence
  // stalls the bar for seconds on long renders. rAF-based yields resume right
  // before a paint (so the browser actually redraws the bar); setTimeout is the
  // fallback where rAF is absent (e.g. a worker context).
  const raf = typeof requestAnimationFrame === 'function'
  const yieldToPaint = () =>
    new Promise<void>((r) => (raf ? requestAnimationFrame(() => r()) : setTimeout(r)))
  let lastYield = performance.now()
  for (let i = 0; i < total; i++) {
    painter.paint(ctx, startMs + (i / fps) * 1000, paint) // clip-relative source time
    await src.add(i / fps, 1 / fps) // output timestamps start at 0
    onProgress?.(i + 1, total)
    if (performance.now() - lastYield >= 60) {
      await yieldToPaint()
      lastYield = performance.now()
    }
  }

  await out.finalize()
  return new Blob([out.target.buffer!], { type: 'video/mp4' })
}

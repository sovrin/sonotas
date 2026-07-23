// @sovrin/renderer — minimal, browser-only Guitar Pro → video renderer.
// One track, red cursor, bar-by-bar scroll. Render a single frame or a full mp4. No audio.
// This module wires the per-concern modules together.
import { musicFontCss } from './font.ts'
import { createSettings } from './settings.ts'
import {
  detachCropStart,
  injectTempoAt,
  loadScore,
  renderSheet
} from './score.ts'
import { buildTimeline } from './timeline.ts'
import { createPainter } from './paint.ts'
import { encodeVideo } from './encode.ts'
import type { EncodeOptions, Renderer, RendererOptions } from './types.ts'

export { countBars, listTracks } from './score.ts'
export type { ScrollMode } from './scroll.ts'
export type { Notation } from './settings.ts'
export type {
  Aspect,
  BackgroundOptions,
  Crop,
  CursorOptions,
  EncodeOptions,
  HighlightOptions,
  PaintOptions,
  Quality,
  Renderer,
  RendererOptions,
  TrackInfo
} from './types.ts'

const DEFAULT_WIDTH = 1280
const DEFAULT_FPS = 30
const DEFAULT_FONT_URL = '/fonts/Bravura.subset.woff2'
const MIN_SCALE = 0.5
const MAX_SCALE = 2.0
// When framing, the sheet is rasterized at a fixed high scale for crispness
// (it gets upscaled to fill the band) and its visible size is driven by `fill`
// instead — so `scale` (notation size) maps to how much of the frame it fills.
const FRAMED_RASTER_SCALE = 2.5
// Band height as a fraction of the frame's short edge at notation size 100%.
// Smaller ⇒ smaller staff ⇒ more bars fit across the frame. `scale` (notation
// size) multiplies this, clamped below.
const FRAMED_BASE_FILL = 0.33
const ASPECT_RATIO: Record<string, number> = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1 }

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

/** Load a Guitar Pro file and return a renderer for one track. Browser only. */
export async function createRenderer(
  bytes: Uint8Array,
  opts: RendererOptions = {}
): Promise<Renderer> {
  const track = opts.track ?? 0
  const width = (opts.width ?? DEFAULT_WIDTH) & ~1
  const aspect = opts.aspect
  const framed = !!aspect
  // Framed: fixed crisp raster, notation size → band fill. Unframed: the scale
  // knob drives the raster directly (clamp only when provided).
  const scale = framed
    ? FRAMED_RASTER_SCALE
    : opts.scale === undefined ? undefined : clamp(opts.scale, MIN_SCALE, MAX_SCALE)
  const fill = framed ? clamp(FRAMED_BASE_FILL * (opts.scale ?? 1), 0.15, 0.9) : undefined
  const crop = opts.crop
  const showTempo = opts.showTempo ?? true
  const showTimeSignature = opts.showTimeSignature ?? true
  const midPieceCrop = !!crop && crop.fromBar > 0

  const css = await musicFontCss(opts.fontUrl ?? DEFAULT_FONT_URL)
  const settings = createSettings({
    scale,
    notation: opts.notation,
    crop,
    showTempo,
    showTrackName: opts.showTrackName,
    foreground: opts.foreground,
    barNumberColor: opts.barNumberColor
  })
  const score = loadScore(bytes, settings, track)
  // A crop that starts mid-piece loses the earlier tempo marker; re-inject it.
  if (showTempo && midPieceCrop) injectTempoAt(score, crop!.fromBar)
  // Make the crop's start bar re-draw the time signature during render, then
  // reconnect so the timeline's MIDI pass sees the intact score.
  const reattach = showTimeSignature && midPieceCrop
    ? detachCropStart(score, crop!.fromBar, track)
    : undefined
  const { tiles, bounds, height: sheetHeight } = await renderSheet(
    settings,
    score,
    track,
    css
  )
  reattach?.()
  const { beats, durationMs, bars } = buildTimeline(
    score,
    settings,
    track,
    bounds,
    crop
  )
  // Output canvas: framed → this aspect (short/long edge derived from `width`),
  // else the bare sheet. Height forced even for the H.264 encoder.
  const height = framed ? Math.round(width / ASPECT_RATIO[aspect]) & ~1 : sheetHeight
  const painter = createPainter({
    tiles,
    beats,
    width,
    height,
    sheetHeight,
    fill,
    durationMs
  })

  return {
    durationMs,
    width,
    height,
    bars,
    frame(canvas, atMs, opts) {
      if (canvas.width !== width) canvas.width = width // resize also clears; skip if unchanged
      if (canvas.height !== height) canvas.height = height
      painter.paint(canvas.getContext('2d')!, atMs, opts)
    },
    encode(opts: EncodeOptions = {}) {
      return encodeVideo(painter, {
        fps: opts.fps ?? DEFAULT_FPS,
        startMs: opts.startMs ?? 0,
        endMs: opts.endMs ?? durationMs,
        quality: opts.quality ?? 'high',
        paint: {
          scroll: opts.scroll,
          cursor: opts.cursor,
          background: opts.background
        },
        onProgress: opts.onProgress
      })
    }
  }
}

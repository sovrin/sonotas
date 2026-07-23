import type { ScrollMode } from './scroll.ts'
import type { Notation } from './settings.ts'

/** Encoder quality preset. Mapped to mediabunny constants inside encode.ts. */
export type Quality = 'low' | 'medium' | 'high'

/** Output frame aspect. When set, the sheet is composited (centered, on a
 * background fill) into a canvas of this ratio instead of being emitted as a
 * bare horizontal strip. */
export type Aspect = '16:9' | '9:16' | '1:1'

/** Render only a 0-based inclusive bar range. alphaTab re-engraves the clef,
 * time signature, and track name at the crop's start bar. */
export interface Crop {
  fromBar: number
  toBar: number
}

/** A selectable track: its index in the score and a display name. */
export interface TrackInfo {
  index: number
  name: string
}

/** Options for {@link createRenderer}. Build-time only — changing these rebuilds the sheet. */
export interface RendererOptions {
  track?: number // default 0
  width?: number // output width, default 1280
  aspect?: Aspect // frame the sheet to this ratio; omit for a bare horizontal strip
  scale?: number // notation scale, clamped 0.5–2.0, default 1.0
  notation?: Notation // stave selection, default "auto"
  crop?: Crop // render only these bars, default whole sheet
  // Leading-element visibility. Track name and tempo are global; time signature
  // only controls whether it's re-shown at a mid-piece crop start (it always
  // shows on bar 1). All default true.
  showTrackName?: boolean
  showTimeSignature?: boolean
  showTempo?: boolean // re-injects the tempo at a mid-piece crop start when on
  foreground?: string // notation color (#rrggbb) — set light for a dark canvas
  barNumberColor?: string // bar-number color (#rrggbb); defaults to `foreground`
  fontUrl?: string // URL of the Bravura woff2 music font, default '/fonts/Bravura.subset.woff2'
}

/** Cursor appearance knobs. All optional; omission preserves current output. */
export interface CursorOptions {
  color?: string // final CSS color (rgba composed UI-side); default rgba(255,0,0,0.7)
  width?: number // px, default 3
  offsetX?: number // screen-space px added to cursorX (scroll-independent), default 0
  height?: number // fraction 0..1 of canvas height, centered; default 1 (full height)
}

/** Background knobs. Own shape so a `transparent?` field can be added later
 * without a signature change (deferred — see PRD Non-goals). */
export interface BackgroundOptions {
  color?: string // solid fill, preview + export; default "#fff"
}

/** Played-bar highlight knobs. Fills a translucent box over the current bar so
 * the eye tracks position at a glance. All optional; omission keeps it off. */
export interface HighlightOptions {
  enabled?: boolean // default false — no highlight
  color?: string // final CSS color (rgba composed UI-side); default rgba(224,169,76,0.22)
  padding?: number // sheet-space px grown around the bar box on every side; default 0
}

/** Per-call paint knobs (scroll/cursor/highlight/background). All optional. */
export interface PaintOptions {
  scroll?: ScrollMode // viewport behavior, default 'bar'
  cursor?: CursorOptions
  highlight?: HighlightOptions
  background?: BackgroundOptions
}

/** Options for {@link Renderer.encode} — the paint knobs plus the encode-loop
 * knobs. Encode-time only — never rebuilds the preview. */
export interface EncodeOptions extends PaintOptions {
  startMs?: number // clip start, default 0
  endMs?: number // clip end, default durationMs
  fps?: number // output frame rate, default 30
  quality?: Quality // encoder quality, default 'high'
  onProgress?: (frame: number, total: number) => void
}

export interface Renderer {
  durationMs: number
  width: number
  height: number
  /** Start-ms of each rendered bar's first play (rebased to 0); `bars.length`
   * is the rendered bar count. */
  bars: number[]
  /** Paint one frame (at time `atMs`) onto a visible canvas — for previews.
   * Pass `opts` to tune crop, scroll, cursor, and background. */
  frame(
    canvas: HTMLCanvasElement,
    atMs: number,
    opts?: PaintOptions,
  ): void
  /** Encode a clip of the track to an mp4 Blob via WebCodecs. */
  encode(opts?: EncodeOptions): Promise<Blob>
}

/** A rasterized SVG chunk of the sheet, placed in full-sheet coordinates. */
export interface Tile {
  x: number
  y: number
  w: number
  h: number
  img: OffscreenCanvas
}

/** A played beat: onset time plus note-x and the current master-bar box (sheet
 * coords). `barX` is the box's left edge; `barY`/`barW`/`barH` its full extent. */
export interface Beat {
  startMs: number
  x: number
  barX: number
  barY: number
  barW: number
  barH: number
}

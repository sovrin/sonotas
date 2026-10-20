import type { Follow, ScrollMode } from './scroll.ts'
import type { Layout, Notation, TabRhythm } from './settings.ts'

/** Encoder quality preset. Mapped to mediabunny constants inside encode.ts. */
export type Quality = 'low' | 'medium' | 'high' | 'max'

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
  tabRhythm?: TabRhythm // rhythm stems under the tab, default 'auto'
  // 'line' (default): one endless system the view scrolls along. 'page': systems
  // wrap at the frame width and stack; the view follows the current system down.
  layout?: Layout
  crop?: Crop // render only these bars, default whole sheet
  barsPerRow?: number // page layout: bars on each line; 0 (default) lets alphaTab fit them
  spacing?: number // how far notes spread out (alphaTab's stretchForce), default 1
  // Line layout: engrave the notation so the widest run of this many
  // consecutive bars spans nearly the whole frame width (capped by the frame
  // height); the bar view then centers the current bar and the ones after it
  // (see PaintOptions.currentBarOnly). Overrides `scale`; ignored in page
  // layout. 0 (default) = off.
  fitBars?: number
  // Leading-element visibility. Track name and tempo are global; time signature
  // only controls whether it's re-shown at a mid-piece crop start (it always
  // shows on bar 1). All default true.
  showTrackName?: boolean
  showBarNumbers?: boolean
  showAttribution?: boolean // alphaTab's "rendered by alphaTab" line below the sheet
  showTimeSignature?: boolean
  showTempo?: boolean // re-injects the tempo at a mid-piece crop start when on
  showLyrics?: boolean // lyrics under the beats, default true
  showSections?: boolean // section names (Intro, Verse…) above their bars, default true
  showDynamics?: boolean // dynamics, hairpins, text, directions and beat timers, default true
  showFingering?: boolean // fingering and pick strokes, default true
  // Draw chord diagrams (fretboard grids) for chord-named beats instead of the
  // bare chord name; in page layout also lists them in the header. Default false.
  chordDiagrams?: boolean
  foreground?: string // notation color (#rrggbb) — set light for a dark canvas
  barNumberColor?: string // bar-number color (#rrggbb); defaults to `foreground`
  fontUrl?: string // URL of the woff2 music font (a Bravura subset), default '/fonts/sonotas-music.woff2'
  soundFontUrl?: string // URL of the sf2/sf3 soundfont for audio, default '/soundfont/sonivox.sf3'; fetched on first use
}

/** Cursor appearance knobs. All optional; omission preserves current output. */
export interface CursorOptions {
  color?: string // final CSS color (rgba composed UI-side); default rgba(255,0,0,0.7)
  width?: number // px, default 3
  offsetX?: number // screen-space px added to cursorX (scroll-independent), default 0
  height?: number // fraction 0..1 of canvas height, centered; default 1 (full height)
  // 'frame' (default): `height` fraction of the whole canvas, centered.
  // 'bar': spans the current master-bar box, same vertical extent as the
  // played-bar highlight (`height` is then ignored).
  heightMode?: 'frame' | 'bar'
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

/** Active-note knobs. Fills a mark over the head(s) of the note currently
 * playing (a per-note recolor, done as a composited overlay — the sheet itself
 * is rasterized once, so the glyph can't be re-inked per frame). Optional. */
export interface ActiveNoteOptions {
  enabled?: boolean // default false
  color?: string // final CSS color (rgba composed UI-side); default rgba(229,72,77,0.9)
  padding?: number // sheet-space px grown around each note-head box; default 0
}

/** Song title/artist overlay, drawn in the frame's top-left from the file's own
 * metadata (nothing to draw when the file has none). In page layout the sheet
 * starts below it. */
export interface TitleOptions {
  enabled?: boolean // default false
  tuning?: boolean // a tuning and capo line, under the title or on its own; default false
  color?: string // CSS color; defaults to the notation color
}

/** Per-call paint knobs (scroll/cursor/highlight/activeNote/background/title). All optional. */
export interface PaintOptions {
  scroll?: ScrollMode // viewport behavior preset, default 'bar'
  follow?: Follow // playhead and view set apart; overrides the preset's fields
  // Draw only the bar being played — with fitBars, the run of that many bars
  // from it — centered in the frame, hiding the rest of the sheet. Default false.
  currentBarOnly?: boolean
  cursor?: CursorOptions
  highlight?: HighlightOptions
  activeNote?: ActiveNoteOptions
  background?: BackgroundOptions
  title?: TitleOptions
}

/** What the soundtrack plays. All optional. */
export interface SoundOptions {
  // 'all' (default): every track. 'solo': only the rendered track. 'minus':
  // every track but the rendered one, a backing track to play along with.
  mix?: 'all' | 'solo' | 'minus'
  metronome?: boolean // a click on every beat, default false
  // One bar of clicks in the clip's opening meter and tempo before its first
  // note; the video holds its first frame meanwhile. Default false.
  countIn?: boolean
}

/** Options for {@link Renderer.encode} — the paint knobs plus the encode-loop
 * knobs. Encode-time only — never rebuilds the preview. */
export interface EncodeOptions extends PaintOptions {
  startMs?: number // clip start, default 0
  endMs?: number // clip end, default durationMs
  fps?: number // output frame rate, default 30
  speed?: number // playback rate (2 = twice as fast, half as long), default 1
  quality?: Quality // encoder quality, default 'high'
  /** Parallel software encoders: ~3× faster on multi-core machines, but 2–3×
   * larger files with slightly softer motion. Falls back to the default
   * constant-quality encoder where software H.264 isn't available. */
  fast?: boolean
  /** Add a synthesized soundtrack. Default false. */
  audio?: boolean
  sound?: SoundOptions // what the soundtrack plays, when `audio` is on
  onProgress?: (frame: number, total: number) => void
  /** Stops the encode: encoders are closed at once and `encode()` rejects with
   * the signal's reason (an AbortError by default). */
  signal?: AbortSignal
}

export interface Renderer {
  durationMs: number
  width: number
  height: number
  /** Song metadata from the file ('' when absent) — what the title overlay shows. */
  title: string
  /** The track's tuning and capo line ('' for a track without strings). */
  tuning: string
  artist: string
  /** Whether the rendered track defines any chords (so chord diagrams can exist). */
  hasChords: boolean
  hasLyrics: boolean
  hasSections: boolean
  /** Start-ms of each rendered bar's first play (rebased to 0); `bars.length`
   * is the rendered bar count. */
  bars: number[]
  /** Every bar as played, repeats included (rendered bar index, onset ms) —
   * the song's real timeline, for a scrubber. */
  plays: { bar: number, startMs: number }[]
  /** Paint one frame (at time `atMs`) onto a visible canvas — for previews.
   * Pass `opts` to tune crop, scroll, cursor, and background. */
  frame(
    canvas: HTMLCanvasElement,
    atMs: number,
    opts?: PaintOptions,
  ): void
  /** The onset (ms) of the beat under output pixel (`x`, `y`) in the frame
   * `frame(…, atMs, opts)` paints, or null off the notation — for clicking the
   * preview to seek. A bar played more than once resolves to the play nearest
   * `atMs`. */
  timeAt(atMs: number, x: number, y: number, opts?: PaintOptions): number | null
  /** Length (ms, source time) of the count-in bar a soundtrack can open with. */
  countInMs: number
  /** Synthesize a clip of the song as interleaved stereo at SAMPLE_RATE,
   * played at `speed`, opening with the count-in bar when asked. `endMs`
   * defaults to the end plus the last notes' ring-out (when the clip ends the
   * song). Fetches the soundfont on first use. */
  soundtrack(opts?: Pick<EncodeOptions, 'startMs' | 'endMs' | 'speed'> & SoundOptions): Promise<Float32Array>
  /** Encode a clip of the track to an mp4 Blob via WebCodecs. */
  encode(opts?: EncodeOptions): Promise<Blob>
  /** Predict `encode(opts)`'s output size in bytes by encoding a sample of its
   * 2s GOPs. Resolves `null` if `opts.signal` aborts mid-probe. */
  estimateSize(opts?: EstimateOptions): Promise<number | null>
}

export interface EstimateOptions extends Omit<EncodeOptions, 'onProgress'> {
  samples?: number // GOPs to encode, default 8
}

/** A rasterized SVG chunk of the sheet, placed in full-sheet coordinates. */
export interface Tile {
  x: number
  y: number
  w: number
  h: number
  img: OffscreenCanvas
  annotation?: boolean // alphaTab's "rendered by alphaTab" line, not notation
}

/** A rectangle in sheet coordinates. */
export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** A played beat: onset time plus note-x (its notes' left edge), the current
 * master-bar box, and the head box of each note sounding on this beat (sheet
 * coords). `barX` is the bar box's left edge; `barY`/`barW`/`barH` its full
 * extent. */
export interface Beat {
  startMs: number
  x: number
  barX: number
  barY: number
  barW: number
  barH: number
  heads: Box[]
}

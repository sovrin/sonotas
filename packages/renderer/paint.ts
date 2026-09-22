import type { Beat, PaintOptions, Tile } from './types.ts'
import type { Layout } from './settings.ts'
import { clampScroll, scrollState, scrollStateY } from './scroll.ts'
import { cursorRect } from './cursor.ts'

const DEFAULT_CURSOR_COLOR = 'rgba(255,0,0,0.7)'
const DEFAULT_CURSOR_WIDTH = 3
const DEFAULT_CURSOR_OFFSET_X = 0
const DEFAULT_CURSOR_HEIGHT = 1 // fraction of canvas height (full height)
const DEFAULT_HIGHLIGHT_COLOR = 'rgba(224,169,76,0.22)'
const DEFAULT_HIGHLIGHT_PADDING = 0
const DEFAULT_ACTIVE_NOTE_COLOR = 'rgba(229,72,77,0.9)'
const DEFAULT_ACTIVE_NOTE_PADDING = 0
const DEFAULT_BACKGROUND_COLOR = '#fff'
const DEFAULT_TITLE_COLOR = '#000'
const EDGE_MARGIN = 80 // blank breathing room before/after the visible content
// Title overlay metrics, as fractions of the frame's short edge.
const TITLE_MARGIN = 0.04
const TITLE_SIZE = 0.045
const ARTIST_SIZE = 0.6 // of the title size
const TITLE_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

type Ctx = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D

export interface SheetView {
  tiles: Tile[]
  beats: Beat[]
  width: number // output canvas width
  height: number // output canvas height
  durationMs: number
  /** Natural rasterized height of the sheet band. Defaults to `height`
   * (unframed: the sheet fills the canvas). */
  sheetHeight?: number
  /** Vertical fraction of the frame the sheet band fills when framed (centered).
   * Undefined/1 keeps the sheet at native size (unframed). Line layout only. */
  fill?: number
  /** 'line' (default): one horizontal system, scrolled along x and centered
   * vertically. 'page': wrapped systems already laid out at the output width,
   * top-aligned and scrolled along y. */
  layout?: Layout
  /** Song metadata for the title overlay ('' draws nothing). */
  title?: string
  artist?: string
  titleColor?: string // default for the overlay when the paint call gives none
}

export interface Painter {
  width: number
  height: number
  durationMs: number
  /** Draw the frame at time `t` (ms). Pass `opts` to tune crop, scroll, cursor,
   * and background; every knob defaults to today's output. */
  paint(ctx: Ctx, t: number, opts?: PaintOptions): void
}

export function createPainter(view: SheetView): Painter {
  const { tiles, beats, width, height, durationMs } = view
  const page = view.layout === 'page'
  const sheetHeight = view.sheetHeight ?? height
  const title = view.title ?? ''
  const artist = view.artist ?? ''
  // Line layout: scale the sheet band to `fill` of the frame's SHORT edge,
  // centered. Using the short edge (not the height) keeps notation the same
  // size across aspects: a tall 9:16 frame then shows fewer bars with margins,
  // instead of zooming one bar to fill the height. Unframed (fill undefined) →
  // 1, sheet fills canvas. Page layout: the sheet is already laid out in output
  // pixels, so it's drawn 1:1 from the top.
  const k = !page && view.fill ? (Math.min(width, height) * view.fill) / sheetHeight : 1
  const bandTop = page ? 0 : (height - sheetHeight * k) / 2
  // Viewport measured in sheet pixels (what maps onto the full output width).
  const viewportSheet = width / k
  const contentRight = tiles.reduce((m, t) => Math.max(m, t.x + t.w), 0)
  const contentBottom = tiles.reduce((m, t) => Math.max(m, t.y + t.h), 0)
  const short = Math.min(width, height)
  const titleMargin = Math.round(short * TITLE_MARGIN)
  const titleSize = Math.round(short * TITLE_SIZE)
  const artistSize = Math.round(titleSize * ARTIST_SIZE)
  let lastI = 0 // monotonic seed; forward walks (encode) stay O(1) per step
  // Reused scratch buffer for recoloring the active note's glyph pixels.
  let scratch: OffscreenCanvas | null = null

  function indexAt(t: number): number {
    if (lastI >= beats.length || beats[lastI]!.startMs > t) lastI = 0 // moved back → restart
    let i = lastI
    while (i < beats.length - 1 && beats[i + 1]!.startMs <= t) i++
    lastI = i
    return i
  }

  /** Height of the title block (title + artist lines with margins), 0 when
   * nothing is drawn. Page layout starts the sheet below it. */
  function titleBlockHeight(show: boolean): number {
    if (!show || !title) return 0
    return titleMargin + titleSize + (artist ? Math.round(artistSize * 1.3) : 0) + titleMargin
  }

  function paintTitle(ctx: Ctx, color: string): void {
    ctx.fillStyle = color
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'
    ctx.font = `600 ${titleSize}px ${TITLE_FONT}`
    ctx.fillText(title, titleMargin, titleMargin + titleSize)
    if (artist) {
      ctx.font = `400 ${artistSize}px ${TITLE_FONT}`
      ctx.globalAlpha = 0.72
      ctx.fillText(artist, titleMargin, titleMargin + titleSize + Math.round(artistSize * 1.3))
      ctx.globalAlpha = 1
    }
  }

  function paint(ctx: Ctx, t: number, opts?: PaintOptions): void {
    const scroll = opts?.scroll ?? 'bar'
    const cursorColor = opts?.cursor?.color ?? DEFAULT_CURSOR_COLOR
    const cursorWidth = opts?.cursor?.width ?? DEFAULT_CURSOR_WIDTH
    const cursorOffsetX = opts?.cursor?.offsetX ?? DEFAULT_CURSOR_OFFSET_X
    const cursorHeight = opts?.cursor?.height ?? DEFAULT_CURSOR_HEIGHT
    // Stacked systems have no meaningful "frame-high" cursor; page layout
    // always spans the current bar.
    const cursorHeightMode = page ? 'bar' : opts?.cursor?.heightMode ?? 'frame'
    const highlightEnabled = opts?.highlight?.enabled ?? false
    const highlightColor = opts?.highlight?.color ?? DEFAULT_HIGHLIGHT_COLOR
    const highlightPadding = opts?.highlight?.padding ?? DEFAULT_HIGHLIGHT_PADDING
    const activeNoteEnabled = opts?.activeNote?.enabled ?? false
    const activeNoteColor = opts?.activeNote?.color ?? DEFAULT_ACTIVE_NOTE_COLOR
    const activeNotePadding = opts?.activeNote?.padding ?? DEFAULT_ACTIVE_NOTE_PADDING
    const backgroundColor = opts?.background?.color ?? DEFAULT_BACKGROUND_COLOR
    const titleEnabled = opts?.title?.enabled ?? false
    const titleColor = opts?.title?.color ?? view.titleColor ?? DEFAULT_TITLE_COLOR
    const currentBarOnly = opts?.currentBarOnly ?? false

    t = Math.max(0, Math.min(t, durationMs))
    const i = indexAt(t)
    const { noteX, scrollX: wantedX } = scrollState(scroll, beats, i, t, viewportSheet, currentBarOnly)

    // Line layout scrolls along x, bounded a margin *outside* the content, so
    // the first/last bar keeps the same left/right breathing room instead of
    // sitting flush against the frame edge; the margin stays blank (no tiles
    // live there). Page layout is as wide as the frame and scrolls along y,
    // below the title block, bounded by the sheet itself. When only the
    // current bar is drawn it's centered on both axes and left unbounded —
    // there are no neighbors to reveal.
    const top = page ? titleBlockHeight(titleEnabled) : bandTop
    const viewportH = height - top
    const scrollX = currentBarOnly
      ? wantedX
      : page
        ? 0
        : clampScroll(wantedX, -EDGE_MARGIN, contentRight + EDGE_MARGIN, viewportSheet)
    const wantedY = page ? scrollStateY(scroll, beats, i, t, viewportH) : 0
    const scrollY = page && !currentBarOnly
      ? clampScroll(wantedY, 0, contentBottom, viewportH)
      : wantedY
    // Map sheet pixels → output pixels: subtract scroll, scale by the band fit.
    const X = (x: number) => (x - scrollX) * k
    const Y = (y: number) => top + (y - scrollY) * k
    // Cursor offset is screen-space (after scroll/scale), so scroll-independent.
    const cursorX = X(noteX) + cursorOffsetX

    // The bar the playhead is over. In continuous scroll the cursor glides
    // between notes and can cross a barline before the next beat's onset; pick
    // the bar by note-x, not the last beat's bar, so the highlight (and the lone
    // bar) advances with the cursor instead of trailing a note behind. In
    // bar/pan modes the note sits on the beat, so this is a no-op.
    let hb = beats[i]!
    const nb = beats[i + 1]
    if (nb && nb.barY === hb.barY && nb.barX > hb.barX && noteX >= nb.barX) hb = nb

    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)

    // Only the current bar: clip the notation to its box (which already spans
    // the markings above the staff, e.g. tempo and chords).
    const clipBar = currentBarOnly && hb.barW > 0
    if (clipBar) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(X(hb.barX), Y(hb.barY), hb.barW * k, hb.barH * k)
      ctx.clip()
    }
    for (const tile of tiles) {
      if (tile.x + tile.w < scrollX || tile.x > scrollX + viewportSheet) continue
      if (page && (tile.y + tile.h < scrollY || tile.y > scrollY + viewportH)) continue
      ctx.drawImage(tile.img, X(tile.x), Y(tile.y), tile.w * k, tile.h * k)
    }
    if (clipBar) ctx.restore()
    // Translucent wash over the current master-bar box, drawn on top of the
    // notation so it reads as a highlight.
    if (highlightEnabled && hb.barW > 0) {
      const pad = highlightPadding * k
      ctx.fillStyle = highlightColor
      ctx.fillRect(
        X(hb.barX) - pad,
        Y(hb.barY) - pad,
        hb.barW * k + pad * 2,
        hb.barH * k + pad * 2
      )
    }
    // Recolor the currently-sounding note(s) — the played beat's note heads
    // (beats[i], not the glide target). The sheet is a flat raster, but its
    // tiles are glyph-on-transparent (we fill the background separately), so a
    // tile's alpha IS the glyph shape. Copy each head box from the tiles, keep
    // that alpha and swap the color via `source-in`, then blit back — so only
    // the glyph pixels change color, not a box around them. Rests have no heads.
    if (activeNoteEnabled) {
      const pad = activeNotePadding
      for (const head of beats[i]!.heads) {
        const hx = head.x - pad
        const hy = head.y - pad
        const hw = head.w + pad * 2
        const hh = head.h + pad * 2
        const sw = Math.max(1, Math.ceil(hw))
        const sh = Math.max(1, Math.ceil(hh))
        if (!scratch || scratch.width < sw || scratch.height < sh) {
          scratch = new OffscreenCanvas(sw, sh)
        }
        const sctx = scratch.getContext('2d')!
        sctx.clearRect(0, 0, scratch.width, scratch.height)
        // stamp the glyph pixels of this head box from every tile it overlaps
        for (const tile of tiles) {
          if (tile.x + tile.w < hx || tile.x > hx + hw) continue
          if (tile.y + tile.h < hy || tile.y > hy + hh) continue
          sctx.drawImage(tile.img, hx - tile.x, hy - tile.y, hw, hh, 0, 0, hw, hh)
        }
        sctx.globalCompositeOperation = 'source-in' // keep glyph alpha, new color
        sctx.fillStyle = activeNoteColor
        sctx.fillRect(0, 0, sw, sh)
        sctx.globalCompositeOperation = 'source-over'
        ctx.drawImage(scratch, 0, 0, hw, hh, X(hx), Y(hy), hw * k, hh * k)
      }
    }
    // Cursor. 'bar' mode spans the current bar box (same extent as the
    // highlight, via `hb`); otherwise a centered fraction of the whole frame.
    ctx.fillStyle = cursorColor
    if (cursorHeightMode === 'bar' && hb.barH > 0) {
      ctx.fillRect(cursorX - cursorWidth / 2, Y(hb.barY), cursorWidth, hb.barH * k)
    } else {
      const r = cursorRect(cursorX, cursorWidth, cursorHeight, height)
      ctx.fillRect(r.x, r.y, r.width, r.height)
    }
    // Title/artist overlay last, so it sits above anything scrolled under it.
    if (titleEnabled && title) paintTitle(ctx, titleColor)
  }

  return { width, height, durationMs, paint }
}

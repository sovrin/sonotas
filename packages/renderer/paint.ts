import type { Beat, PaintOptions, Tile } from './types.ts'
import { clampScroll, scrollState } from './scroll.ts'
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
const EDGE_MARGIN = 80 // blank breathing room before/after the visible content

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
   * Undefined/1 keeps the sheet at native size (unframed). */
  fill?: number
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
  const sheetHeight = view.sheetHeight ?? height
  // Scale the sheet band to `fill` of the frame's SHORT edge, centered. Using the
  // short edge (not the height) keeps notation the same size across aspects: a
  // tall 9:16 frame then shows fewer bars with margins, instead of zooming one
  // bar to fill the height. Unframed (fill undefined) → 1, sheet fills canvas.
  const bandScale = view.fill ? (Math.min(width, height) * view.fill) / sheetHeight : 1
  const bandTop = (height - sheetHeight * bandScale) / 2
  // Viewport measured in sheet pixels (what maps onto the full output width).
  const viewportSheet = width / bandScale
  const contentRight = tiles.reduce((m, t) => Math.max(m, t.x + t.w), 0)
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

  function paint(ctx: Ctx, t: number, opts?: PaintOptions): void {
    const scroll = opts?.scroll ?? 'bar'
    const cursorColor = opts?.cursor?.color ?? DEFAULT_CURSOR_COLOR
    const cursorWidth = opts?.cursor?.width ?? DEFAULT_CURSOR_WIDTH
    const cursorOffsetX = opts?.cursor?.offsetX ?? DEFAULT_CURSOR_OFFSET_X
    const cursorHeight = opts?.cursor?.height ?? DEFAULT_CURSOR_HEIGHT
    const highlightEnabled = opts?.highlight?.enabled ?? false
    const highlightColor = opts?.highlight?.color ?? DEFAULT_HIGHLIGHT_COLOR
    const highlightPadding = opts?.highlight?.padding ?? DEFAULT_HIGHLIGHT_PADDING
    const activeNoteEnabled = opts?.activeNote?.enabled ?? false
    const activeNoteColor = opts?.activeNote?.color ?? DEFAULT_ACTIVE_NOTE_COLOR
    const activeNotePadding = opts?.activeNote?.padding ?? DEFAULT_ACTIVE_NOTE_PADDING
    const backgroundColor = opts?.background?.color ?? DEFAULT_BACKGROUND_COLOR

    t = Math.max(0, Math.min(t, durationMs))
    const i = indexAt(t)
    const { noteX, scrollX: wanted } = scrollState(scroll, beats, i, t, viewportSheet)

    // Scroll is bounded a margin *outside* the content, so the first/last bar
    // keeps the same left/right breathing room instead of sitting flush against
    // the frame edge; the margin stays blank (no tiles live there).
    const scrollX = clampScroll(
      wanted,
      -EDGE_MARGIN,
      contentRight + EDGE_MARGIN,
      viewportSheet
    )
    // Map sheet pixels → output pixels: subtract scroll, scale by the band fit.
    // Cursor offset is screen-space (after scroll/scale), so scroll-independent.
    const cursorX = (noteX - scrollX) * bandScale + cursorOffsetX

    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)

    for (const tile of tiles) {
      if (tile.x + tile.w < scrollX || tile.x > scrollX + viewportSheet) continue
      ctx.drawImage(
        tile.img,
        (tile.x - scrollX) * bandScale,
        bandTop + tile.y * bandScale,
        tile.w * bandScale,
        tile.h * bandScale
      )
    }
    // Translucent wash over the current master-bar box, drawn on top of the
    // notation so it reads as a highlight. In continuous scroll the cursor
    // glides between notes and can cross a barline before the next beat's onset;
    // highlight the bar the playhead is actually over (by note-x), not the last
    // beat's bar, so it advances with the cursor instead of trailing a note
    // behind. In bar/pan modes the note sits on the beat, so this is a no-op.
    let hb = beats[i]!
    const nb = beats[i + 1]
    if (nb && nb.barX > hb.barX && noteX >= nb.barX) hb = nb
    if (highlightEnabled && hb.barW > 0) {
      const pad = highlightPadding * bandScale
      ctx.fillStyle = highlightColor
      ctx.fillRect(
        (hb.barX - scrollX) * bandScale - pad,
        bandTop + hb.barY * bandScale - pad,
        hb.barW * bandScale + pad * 2,
        hb.barH * bandScale + pad * 2
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
        ctx.drawImage(
          scratch,
          0, 0, hw, hh,
          (hx - scrollX) * bandScale, bandTop + hy * bandScale,
          hw * bandScale, hh * bandScale
        )
      }
    }
    // Cursor spans the full frame height (a playhead across the whole video).
    const r = cursorRect(cursorX, cursorWidth, cursorHeight, height)
    ctx.fillStyle = cursorColor
    ctx.fillRect(r.x, r.y, r.width, r.height)
  }

  return { width, height, durationMs, paint }
}

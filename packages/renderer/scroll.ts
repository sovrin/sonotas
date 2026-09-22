import type { Beat } from './types.ts'

/** How the viewport follows playback.
 *
 * - `bar`: the view snaps to the current bar; the cursor jumps note-to-note.
 * - `pan`: like `bar`, but the view quick-pans from the previous bar when the
 *   cursor crosses into a new one, instead of cutting.
 * - `smooth`: the sheet scrolls continuously with the note kept near the
 *   viewport center. */
export type ScrollMode = 'bar' | 'pan' | 'smooth'

const BAR_MARGIN = 80 // px gap left of the current bar (bar/pan modes)
const PAN_MS = 250 // pan transition time when crossing into a new bar (pan mode)

/** Viewport geometry for one frame, before any crop clamping. */
export interface ScrollState {
  /** Absolute x of the played note (sheet coords). */
  noteX: number
  /** Wanted left edge of the viewport (sheet coords). */
  scrollX: number
}

/** View geometry at time `t` (ms) for beat `i` in the played `beats` list.
 *
 * `smooth` interpolates the note x between beat `i` and the next so the cursor
 * glides (only while both sit on the same system — across a line break it holds
 * rather than sweeping back over the page); `bar`/`pan` keep it on beat `i` and
 * anchor the view to the bar (`pan` eases the anchor across bar changes). With
 * `center`, `bar`/`pan` center the bar in the view instead of pinning it a
 * margin from the left — for when only the current bar is drawn. */
export function scrollState(
  mode: ScrollMode,
  beats: Beat[],
  i: number,
  t: number,
  width: number,
  center = false
): ScrollState {
  const b = beats[i]!
  if (mode === 'smooth') {
    const next = beats[i + 1]
    const glide = next && next.barY === b.barY
    const dur = glide ? next.startMs - b.startMs : 0
    const f = dur > 0 ? Math.min(1, Math.max(0, (t - b.startMs) / dur)) : 0
    const noteX = glide ? b.x + (next.x - b.x) * f : b.x
    return { noteX, scrollX: noteX - width / 2 }
  }
  const anchor = center
    ? (a: Beat) => a.barX + a.barW / 2 - width / 2
    : (a: Beat) => a.barX - BAR_MARGIN
  const scrollX = mode === 'pan' ? panAnchorX(beats, i, t, anchor) : anchor(b)
  return { noteX: b.x, scrollX }
}

/** Wanted viewport top at time `t` for beat `i` when systems stack vertically
 * (page layout): the current bar's system centered in a `viewportH`-tall view.
 * `bar` cuts to it; `pan` and `smooth` ease from the previous system's position
 * over the first PAN_MS after crossing into a new one. Before any clamping. */
export function scrollStateY(
  mode: ScrollMode,
  beats: Beat[],
  i: number,
  t: number,
  viewportH: number
): number {
  const center = (b: Beat) => b.barY + b.barH / 2 - viewportH / 2
  const target = center(beats[i]!)
  if (mode === 'bar') return target
  // Walk back over this system's contiguous run of beats to find when the
  // cursor entered it; a system's beats are contiguous in play order.
  const barY = beats[i]!.barY
  let start = i
  while (start > 0 && beats[start - 1]!.barY === barY) start--
  if (start === 0) return target
  const into = t - beats[start]!.startMs
  if (into >= PAN_MS) return target
  const prev = center(beats[start - 1]!)
  const e = 1 - (1 - into / PAN_MS) ** 2 // ease-out
  return prev + (target - prev) * e
}

/** Eased view-left x for `pan` mode: the view holds on the current bar's
 * `anchor` and quick-pans from the previous bar's when the cursor has just
 * crossed in. A bar's beats are contiguous in play order, so walking back over
 * the equal-`barX` run finds this play's start — correct across repeats. */
function panAnchorX(
  beats: Beat[],
  i: number,
  t: number,
  anchor: (b: Beat) => number
): number {
  const barX = beats[i]!.barX
  const target = anchor(beats[i]!)
  let start = i
  while (start > 0 && beats[start - 1]!.barX === barX) start--
  if (start === 0) return target // first bar — nothing to pan from
  const into = t - beats[start]!.startMs
  if (into >= PAN_MS) return target
  const prev = anchor(beats[start - 1]!)
  const e = 1 - (1 - into / PAN_MS) ** 2 // ease-out
  return prev + (target - prev) * e
}

/** Clamp a wanted viewport-left `x` into the scrollable range for a `width`-wide
 * view over content spanning `[lo, hi]`, so the view never scrolls past those
 * edges. When the span is narrower than `width` it pins to `lo` (nothing to
 * scroll). */
export function clampScroll(
  x: number,
  lo: number,
  hi: number,
  width: number
): number {
  return Math.min(Math.max(x, lo), Math.max(lo, hi - width))
}

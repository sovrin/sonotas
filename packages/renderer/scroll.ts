import type { Beat } from './types.ts'

/** How the viewport follows playback.
 *
 * - `bar`: the view snaps to the current bar; the cursor jumps note-to-note.
 * - `pan`: like `bar`, but the view quick-pans from the previous bar when the
 *   cursor crosses into a new one, instead of cutting.
 * - `smooth`: the sheet scrolls continuously with the note kept near the
 *   viewport center; on a jump (repeat, alternate ending, D.S.) it quick-pans
 *   to the new spot instead of sweeping across the sheet. Near the sheet's
 *   ends the view stops, so the cursor starts left and ends right.
 * - `center`: like `smooth`, but the cursor stays at the viewport center the
 *   whole time and the sheet runs under it, past its ends too (the view starts
 *   and ends half blank). On a jump the cursor rewinds with the sheet. */
export type ScrollMode = 'bar' | 'pan' | 'smooth' | 'center'

const BAR_MARGIN = 80 // px gap left of the current bar (bar/pan modes)
const PAN_MS = 250 // pan transition time when crossing into a new bar (pan mode) or jumping (smooth/center)
const ABUT_PX = 1 // tolerance for consecutive bar boxes touching (they abut exactly)

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
 * rather than sweeping back over the page). Ahead of a jump it glides to the
 * bar's end instead, and once the jump lands the view eases over from there in
 * PAN_MS rather than sweeping back across the repeat. `center` does the same
 * with the note pinned mid-view (the caller leaves it unclamped), so across a
 * jump the note eases over too. `bar`/`pan` keep it on beat `i` and
 * anchor the view to the bar (`pan` eases the anchor across bar changes). With
 * `focus` — the sheet x to center for a beat, e.g. the middle of its bar or of
 * the bars fit around it — the view centers that instead: `bar`/`pan` rather
 * than pinning the bar a margin from the left, `smooth` rather than following
 * the note (the view holds still and the cursor glides across it). */
export function scrollState(
  mode: ScrollMode,
  beats: Beat[],
  i: number,
  t: number,
  width: number,
  focus?: (b: Beat) => number
): ScrollState {
  const b = beats[i]!
  if (mode === 'smooth' || mode === 'center') {
    const next = beats[i + 1]
    const glide = next && next.barY === b.barY
    const toX = glide ? (continues(b, next) ? next.x : b.barX + b.barW) : b.x
    const dur = glide ? next.startMs - b.startMs : 0
    const f = dur > 0 ? Math.min(1, Math.max(0, (t - b.startMs) / dur)) : 0
    const noteX = b.x + (toX - b.x) * f
    if (focus) return { noteX, scrollX: focus(barAt(beats, i, noteX)) - width / 2 }
    // Just jumped here from the end of another bar on this system: ease over.
    const prev = beats[i - 1]
    const into = t - b.startMs
    if (!prev || prev.barY !== b.barY || continues(prev, b) || into >= PAN_MS) {
      return { noteX, scrollX: noteX - width / 2 }
    }
    const from = prev.barX + prev.barW
    const e = 1 - (1 - Math.max(0, into) / PAN_MS) ** 2 // ease-out
    const eased = from + (noteX - from) * e
    // `smooth` eases the view and lets the cursor land; `center` keeps the
    // cursor mid-view, so it rewinds with the sheet.
    return { noteX: mode === 'center' ? eased : noteX, scrollX: eased - width / 2 }
  }
  const anchor = focus
    ? (a: Beat) => focus(a) - width / 2
    : (a: Beat) => a.barX - BAR_MARGIN
  const scrollX = mode === 'pan' ? panAnchorX(beats, i, t, anchor) : anchor(b)
  return { noteX: b.x, scrollX }
}

/** The beat whose bar the playhead is over at note x `noteX` for beat `i`. In
 * `smooth` scroll the cursor glides between notes and can cross a barline
 * before the next beat's onset; pick the bar by note x, not the last beat's
 * bar, so it advances with the cursor instead of trailing a note behind. In
 * `bar`/`pan` modes the note sits on the beat, so this is beat `i`. */
export function barAt(beats: Beat[], i: number, noteX: number): Beat {
  const b = beats[i]!
  const next = beats[i + 1]
  return next && next.barY === b.barY && next.barX > b.barX && noteX >= next.barX ? next : b
}

/** Whether playback runs straight on from beat `b` to `next`: forward in the
 * same bar, or into the one right after it on the same system. Repeats (even of
 * a single bar), alternate endings, and D.S./D.C. break this. Without a bar
 * box, whether it moves forward. */
function continues(b: Beat, next: Beat): boolean {
  if (next.barY !== b.barY) return false
  if (b.barW <= 0 || next.barX === b.barX) return next.x >= b.x
  return Math.abs(next.barX - (b.barX + b.barW)) <= ABUT_PX
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

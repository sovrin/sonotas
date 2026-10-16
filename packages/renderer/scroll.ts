import type { Beat } from './types.ts'

/** How the viewport follows playback, as one-word presets of {@link Follow}.
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

/** How the playhead moves through the score: note to note, or sweeping
 * continuously between them. */
export type PlayheadMotion = 'jump' | 'glide'

/** When the view moves: once per bar (page layout: per line), once per
 * screenful (it holds still until the music runs off it, then turns), or all
 * the time, tracking the playhead. Page layout treats `track` as `bar`. */
export type ViewMode = 'bar' | 'screen' | 'track'

/** The playhead and the view, set apart. Unset fields come from the `scroll`
 * preset. */
export interface Follow {
  playhead?: PlayheadMotion
  view?: ViewMode
  /** How long the view takes to move when it steps (and, tracking, when the
   * music jumps), in ms. 0 cuts. */
  transitionMs?: number
  /** Where "now" sits in the view, 0–1 across it (page layout: down it, for
   * the current line's middle). `bar`/`screen`: the leading bar's left edge,
   * default 80px in; `track`: the playhead, default the middle. */
  anchor?: number
  /** `screen`: turn as the playhead enters the last bar (line) that fits, so it
   * leads the next screen and what follows is already in view. */
  early?: boolean
  /** `track`, line layout: hold the playhead at the anchor past the sheet's
   * ends instead of stopping the view there. */
  overscroll?: boolean
  /** `track`: follow a smoothed path at an even pace instead of every change
   * in note spacing. */
  steady?: boolean
}

export type ResolvedFollow = Required<Omit<Follow, 'anchor'>> & Pick<Follow, 'anchor'>

const BAR_MARGIN = 80 // px gap left of the leading bar (bar/screen views)
const PAN_MS = 250 // default view transition (pan preset, and jumps in smooth/center)
const ABUT_PX = 1 // tolerance for consecutive bar boxes touching (they abut exactly)
const STEADY_MS = 2000 // moving-average window of the steady track path
const STEP_MS = 10 // sample spacing of the steady track path

const PRESETS: Record<ScrollMode, Follow> = {
  bar: { playhead: 'jump', view: 'bar', transitionMs: 0 },
  pan: { playhead: 'jump', view: 'bar' },
  smooth: { playhead: 'glide', view: 'track' },
  center: { playhead: 'glide', view: 'track', overscroll: true }
}

/** The `scroll` preset with `follow`'s set fields on top. */
export function resolveFollow(scroll: ScrollMode = 'bar', follow: Follow = {}): ResolvedFollow {
  const p = PRESETS[scroll] ?? PRESETS.bar
  return {
    playhead: follow.playhead ?? p.playhead!,
    view: follow.view ?? p.view!,
    transitionMs: follow.transitionMs ?? p.transitionMs ?? PAN_MS,
    anchor: follow.anchor,
    early: follow.early ?? false,
    overscroll: follow.overscroll ?? p.overscroll ?? false,
    steady: follow.steady ?? false
  }
}

/** Viewport geometry for one frame, before any crop clamping. */
export interface ScrollState {
  /** Absolute x of the played note (sheet coords). */
  noteX: number
  /** Wanted left edge of the viewport (sheet coords). */
  scrollX: number
}

/** View geometry at time `t` (ms) for beat `i` in the played `beats` list.
 *
 * The playhead `glide`s between beat `i` and the next while both sit on the
 * same system (across a line break it holds rather than sweeping back over the
 * page); ahead of a jump it glides to the bar's end instead. `jump` keeps it on
 * beat `i`.
 *
 * The view, `track`ing, follows the gliding x at the anchor (even when the
 * playhead jumps, so the view stays smooth); once a jump lands it eases over
 * from the bar end in `transitionMs` rather than sweeping back across the
 * repeat, and with `overscroll` the playhead eases along so it stays put. `bar`
 * and `screen` hold on the leading bar and ease to the next in `transitionMs`.
 * With `focus` — the sheet x to center for a beat, e.g. the middle of its bar
 * or of the bars fit around it — the view centers that bar instead (`screen`
 * then steps per bar like `bar`). */
export function scrollState(
  f: ResolvedFollow,
  beats: Beat[],
  i: number,
  t: number,
  width: number,
  focus?: (b: Beat) => number
): ScrollState {
  const b = beats[i]!
  const gx = glideX(beats, i, t)
  const noteX = f.playhead === 'glide' ? gx : b.x
  const ms = f.transitionMs
  if (f.view === 'track') {
    if (focus) return { noteX, scrollX: focus(barAt(beats, i, gx)) - width / 2 }
    const at = (f.anchor ?? 0.5) * width
    const cam = (k: number, tt: number) => (f.steady ? steadyX(beats, k, tt) : glideX(beats, k, tt))
    const to = cam(i, t)
    // Just jumped here from the end of another bar on this system: ease over.
    const prev = beats[i - 1]
    const e = ease(t - b.startMs, ms)
    if (!prev || prev.barY !== b.barY || continues(prev, b) || e >= 1) {
      return { noteX, scrollX: to - at }
    }
    const from = cam(i - 1, b.startMs)
    // The playhead held at the anchor rides the ease with the sheet.
    const pinned = f.overscroll && f.playhead === 'glide'
    const end = prev.barX + prev.barW
    return {
      noteX: pinned ? end + (gx - end) * e : noteX,
      scrollX: from + (to - from) * e - at
    }
  }
  // A gliding playhead crosses the barline a little before the next onset;
  // step with it, not a note behind.
  const j = f.playhead === 'glide' && barAt(beats, i, gx) !== b ? i + 1 : i
  const margin = f.anchor === undefined ? BAR_MARGIN : f.anchor * width
  const left = focus
    ? (k: number) => focus(beats[k]!) - width / 2
    : (k: number) => beats[k]!.barX - margin
  if (f.view === 'screen' && !focus) {
    const leads = cached(beats, `x|${width}|${margin}|${f.early}`, () => screenLeads(beats, width, margin, f.early, false))
    return { noteX, scrollX: stepped(beats, j, t, k => leads[k], k => left(leads[k]!), ms) }
  }
  return { noteX, scrollX: stepped(beats, j, t, k => beats[k]!.barX, left, ms) }
}

/** The beat whose bar the playhead is over at note x `noteX` for beat `i`. A
 * gliding playhead can cross a barline before the next beat's onset; pick the
 * bar by note x, not the last beat's bar, so it advances with the cursor
 * instead of trailing a note behind. A jumping one sits on the beat, so this is
 * beat `i`. */
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

/** The gliding playhead's x for beat `i` at `t`: toward the next note, or to
 * the bar's end ahead of a jump; held across a line break. */
function glideX(beats: Beat[], i: number, t: number): number {
  const b = beats[i]!
  const next = beats[i + 1]
  if (!next || next.barY !== b.barY) return b.x
  const toX = continues(b, next) ? next.x : b.barX + b.barW
  const dur = next.startMs - b.startMs
  const f = dur > 0 ? Math.min(1, Math.max(0, (t - b.startMs) / dur)) : 0
  return b.x + (toX - b.x) * f
}

/** Ease-out progress `into` ms of an `ms`-long move; 1 once it's over (or for a cut). */
function ease(into: number, ms: number): number {
  if (ms <= 0 || into >= ms) return 1
  return 1 - (1 - Math.max(0, into) / ms) ** 2
}

/** A view position that holds on `target(i)` and, when `key` changed where the
 * current run of equal keys began, eases there from wherever it was then. A
 * run's beats are contiguous in play order, so walking back over it finds this
 * play's start — correct across repeats. A move cut short by the next one
 * starts the next from where it got to, so the view never jumps. */
function stepped(
  beats: Beat[],
  i: number,
  t: number,
  key: (k: number) => unknown,
  target: (k: number) => number,
  ms: number
): number {
  const to = target(i)
  if (ms <= 0) return to
  let start = i
  while (start > 0 && key(start - 1) === key(i)) start--
  if (start === 0) return to // first run — nothing to move from
  const e = ease(t - beats[start]!.startMs, ms)
  if (e >= 1) return to
  const from = stepped(beats, start - 1, beats[start]!.startMs, key, target, ms)
  return from + (to - from) * e
}

/** For each beat, the index of the beat whose bar (`vertical`: line) leads the
 * screen it's shown on. A screen spans `extent` from a `margin` before its
 * leading bar and holds until the playhead enters a bar that doesn't fit, which
 * then leads the next — or, `early`, until it enters the last bar that fits
 * with the music running straight on past it. */
function screenLeads(
  beats: Beat[],
  extent: number,
  margin: number,
  early: boolean,
  vertical: boolean
): Int32Array {
  const pos = (b: Beat) => (vertical ? b.barY : b.barX)
  const size = (b: Beat) => (vertical ? b.barH : b.barW)
  const onward = (b: Beat, next: Beat) => (vertical ? next.barY > b.barY : continues(b, next))
  const leads = new Int32Array(beats.length)
  let lead = 0
  let lo = beats.length ? pos(beats[0]!) - margin : 0
  const fits = (b: Beat) => pos(b) >= lo && pos(b) + size(b) <= lo + extent + ABUT_PX
  for (let k = 1; k < beats.length; k++) {
    const b = beats[k]!
    if (pos(b) !== pos(beats[k - 1]!)) {
      let n = k + 1
      while (n < beats.length && pos(beats[n]!) === pos(b)) n++
      const next = beats[n]
      const turn = !fits(b) || (early && pos(beats[lead]!) !== pos(b) && !!next && onward(beats[n - 1]!, next) && !fits(next))
      if (turn) {
        lead = k
        lo = pos(b) - margin
      }
    }
    leads[k] = lead
  }
  return leads
}

/** The track view's x for beat `i` at `t` on the steady path: the gliding x
 * averaged over STEADY_MS, so the view keeps an even pace through dense and
 * sparse passages. Each straight run between jumps is smoothed on its own,
 * the window narrowing toward its ends, so the path still meets each jump. */
function steadyX(beats: Beat[], i: number, t: number): number {
  const { segOf, segs } = cached(beats, 'steady', () => steadyPath(beats))
  const s = segs[segOf[i]!]!
  const p = Math.min(Math.max((t - s.t0) / STEP_MS, 0), s.xs.length - 1)
  const k = Math.floor(p)
  const x0 = s.xs[k]!
  return x0 + ((s.xs[k + 1] ?? x0) - x0) * (p - k)
}

function steadyPath(beats: Beat[]) {
  const segOf = new Int32Array(beats.length)
  const segs: { t0: number, xs: Float64Array }[] = []
  let first = 0
  for (let end = 1; end <= beats.length; end++) {
    if (end < beats.length && continues(beats[end - 1]!, beats[end]!)) continue
    const t0 = beats[first]!.startMs
    const t1 = beats[end]?.startMs ?? beats[end - 1]!.startMs
    const n = Math.floor((t1 - t0) / STEP_MS) + 1
    const raw = new Float64Array(n)
    for (let m = 0, j = first; m < n; m++) {
      const tt = t0 + m * STEP_MS
      while (j + 1 < end && beats[j + 1]!.startMs <= tt) j++
      raw[m] = glideX(beats, j, tt)
    }
    const sum = new Float64Array(n + 1)
    for (let m = 0; m < n; m++) sum[m + 1] = sum[m]! + raw[m]!
    const half = Math.round(STEADY_MS / 2 / STEP_MS)
    const xs = new Float64Array(n)
    for (let m = 0; m < n; m++) {
      const h = Math.min(half, m, n - 1 - m)
      xs[m] = (sum[m + h + 1]! - sum[m - h]!) / (2 * h + 1)
    }
    segOf.fill(segs.length, first, end)
    segs.push({ t0, xs })
    first = end
  }
  return { segOf, segs }
}

// Per-beats-list memo for the precomputed screen leads and steady path, so
// every frame stays a pure function of `t` without redoing them.
const memo = new WeakMap<Beat[], Map<string, unknown>>()
function cached<T>(beats: Beat[], key: string, make: () => T): T {
  let m = memo.get(beats)
  if (!m) memo.set(beats, (m = new Map()))
  if (!m.has(key)) {
    if (m.size > 16) m.clear() // e.g. a dragged anchor; keeps it bounded
    m.set(key, make())
  }
  return m.get(key) as T
}

/** Wanted viewport top at time `t` for beat `i` when systems stack vertically
 * (page layout). `bar`/`track` put the current line's middle at the anchor
 * (default the view's middle); `screen` holds a screenful of lines with the
 * leading one on top until the playhead runs off it. Either eases over
 * `transitionMs` from where it was. Before any clamping. */
export function scrollStateY(
  f: ResolvedFollow,
  beats: Beat[],
  i: number,
  t: number,
  viewportH: number
): number {
  if (f.view === 'screen') {
    const leads = cached(beats, `y|${viewportH}|${f.early}`, () => screenLeads(beats, viewportH, 0, f.early, true))
    return stepped(beats, i, t, k => leads[k], k => beats[leads[k]!]!.barY, f.transitionMs)
  }
  const at = (f.anchor ?? 0.5) * viewportH
  return stepped(beats, i, t, k => beats[k]!.barY, k => beats[k]!.barY + beats[k]!.barH / 2 - at, f.transitionMs)
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

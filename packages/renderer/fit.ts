import type { Box } from './types.ts'

// Fit-to-bars (line layout) works on runs of consecutive bar boxes along the
// one system, sorted by x: the widest run of `n` sets the engrave scale, and the
// run starting at the current bar is what the view centers on.

/** Width of the widest run of `n` consecutive bars — left edge of the first to
 * right edge of the last. With fewer than `n` bars, the whole run. */
export function widestRun(bars: Box[], n: number): number {
  const m = Math.min(n, bars.length)
  if (m < 1) return 0
  let w = 0
  for (let j = 0; j + m <= bars.length; j++) {
    const last = bars[j + m - 1]!
    w = Math.max(w, last.x + last.w - bars[j]!.x)
  }
  return w
}

/** Index range `[start, end)` of the `n` bars in view while bar `j` plays: `j`
 * and the ones after it (reading ahead), pulled back near the end so the last
 * view still holds `n` and stays put while the cursor crosses it. */
export function barWindow(count: number, j: number, n: number): [number, number] {
  const m = Math.min(n, count)
  const start = Math.max(0, Math.min(j, count - m))
  return [start, start + m]
}

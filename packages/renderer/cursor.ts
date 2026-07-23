/** Axis-aligned rect for the playback cursor bar. */
export interface CursorRect {
  x: number
  y: number
  width: number
  height: number
}

/** Vertical cursor bar rect. `heightFraction` (0..1, clamped) of `canvasHeight`,
 * centered vertically; default fraction 1 reproduces the full-height bar. */
export function cursorRect(
  cursorX: number,
  width: number,
  heightFraction: number,
  canvasHeight: number
): CursorRect {
  const height = clamp(heightFraction, 0, 1) * canvasHeight
  return {
    x: cursorX - width / 2,
    y: (canvasHeight - height) / 2,
    width,
    height
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

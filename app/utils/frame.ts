// A free frame is a size in px at 1080p, so the notation keeps its size
// whatever the shape; 720p and 480p scale the whole frame down.

export const FREE_MIN = 240
export const FREE_MAX = 3840
// H.264's top levels take about a 4K UHD frame's worth of pixels.
const MAX_AREA = 3840 * 2160

/** A free width or height as a link holds it: even, FREE_MIN–FREE_MAX, and
 * small enough beside `other` that the frame stays within MAX_AREA. */
export function fitEdge(v: number, other: number): number {
  const max = Math.min(FREE_MAX, Math.floor(MAX_AREA / other)) & ~1
  return Math.min(Math.max(Math.round(v / 2) * 2, FREE_MIN), max)
}

/** The free frame at a resolution's short edge (1080 is as stored), in even px. */
export function freeAt(w: number, h: number, short: number): [w: number, h: number] {
  const k = short / 1080
  return [Math.round((w * k) / 2) * 2, Math.round((h * k) / 2) * 2]
}

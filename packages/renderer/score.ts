import * as alphaTab from '@coderline/alphatab'
import type { Box, Tile, TrackInfo } from './types.ts'
import { svgToCanvas } from './svg.ts'
import { createSettings } from './settings.ts'

/** Parse a Guitar Pro file and list its tracks — no rasterization. */
export function listTracks(bytes: Uint8Array): TrackInfo[] {
  const score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(
    bytes,
    createSettings()
  )
  return score.tracks.map((track, index) => ({ index, name: track.name }))
}

/** Parse a Guitar Pro file and count its master bars — no rasterization. The UI
 * needs the whole-file bar count to bound the crop picker, independent of any
 * (possibly cropped) render. */
export function countBars(bytes: Uint8Array): number {
  const score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(
    bytes,
    createSettings()
  )
  return score.masterBars.length
}

/** Copy the tempo in effect at master bar `fromBar` onto that bar so alphaTab
 * engraves the tempo marker at a mid-piece crop start (it otherwise only draws
 * it on the bar carrying the automation). No-op when the bar already has one. */
export function injectTempoAt(
  score: alphaTab.model.Score,
  fromBar: number
): void {
  const bar = score.masterBars[fromBar]
  if (!bar || bar.tempoAutomations.length) return

  let value = score.tempo
  let text = ''
  for (let i = 0; i <= fromBar; i++) {
    const autos = score.masterBars[i]?.tempoAutomations ?? []
    if (autos.length) {
      const last = autos[autos.length - 1]!
      value = last.value // already quarter-note BPM
      text = last.text
    }
  }

  // reference 2 = quarter note, so `value` renders unscaled as "♩= value".
  const auto = alphaTab.model.Automation.buildTempoAutomation(
    false,
    0,
    value,
    2,
    true
  )
  auto.text = text
  bar.tempoAutomations.push(auto)
}

/** Detach the crop's first bar from its predecessor so alphaTab treats it as a
 * fresh start and re-draws the (otherwise omitted) unchanged time signature.
 * Only the render needs this; the returned restore reconnects the links before
 * MIDI/timeline generation, which relies on them. */
export function detachCropStart(
  score: alphaTab.model.Score,
  fromBar: number,
  track: number
): () => void {
  const bars = (score.tracks[track]?.staves ?? [])
    .map(s => s.bars[fromBar])
    .filter((b): b is alphaTab.model.Bar => !!b)
  const saved = bars.map(b => b.previousBar)
  for (const b of bars) b.previousBar = null
  return () => bars.forEach((b, i) => (b.previousBar = saved[i]!))
}

/** Load a Guitar Pro file and assert the requested track exists. */
export function loadScore(
  bytes: Uint8Array,
  settings: alphaTab.Settings,
  track: number
): alphaTab.model.Score {
  const score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(
    bytes,
    settings
  )
  if (!score.tracks[track]) throw new Error(`track ${track} not found`)
  return score
}

interface RawChunk {
  x: number
  y: number
  w: number
  h: number
  svg: string
}

export interface RenderedSheet {
  tiles: Tile[]
  bounds: alphaTab.rendering.BoundsLookup
  height: number
}

/** Whether the track defines any chords (fretboard shapes a diagram can show). */
export function hasChords(score: alphaTab.model.Score, track: number): boolean {
  return (score.tracks[track]?.staves ?? []).some(s => (s.chords?.size ?? 0) > 0)
}

/** Master-bar boxes of the track laid out with `settings`, in render order, in
 * output px at its `display.scale`. Layout only — nothing is painted, so this
 * is cheap next to {@link renderSheet}. alphaTab lays out in unscaled units and
 * applies the scale on output, so bar sizes are linear in the scale: measure
 * once, then derive the scale that gives a wanted size. */
export function measureBars(
  settings: alphaTab.Settings,
  score: alphaTab.model.Score,
  track: number
): Box[] {
  const renderer = new alphaTab.rendering.ScoreRenderer(settings)
  renderer.width = 1
  renderer.renderScore(score, [track]) // lays out synchronously; partials only paint on renderResult()
  return (renderer.boundsLookup?.staffSystems ?? []).flatMap(system =>
    system.bars.map(({ realBounds: r }) => ({ x: r.x, y: r.y, w: r.w, h: r.h }))
  )
}

// alphaTab always engraves this line below the sheet, as its own partial, with
// no setting to turn it off.
const ANNOTATION = 'rendered by alphaTab'

/** Render one track to rasterized SVG tiles, exposing alphaTab's bounds lookup.
 * `width` is the layout width in output pixels — what page layout wraps systems
 * to; the horizontal layout ignores it. `annotation: false` drops alphaTab's
 * "rendered by alphaTab" line (the sheet keeps its height, so toggling it
 * doesn't resize the notation). */
export async function renderSheet(
  settings: alphaTab.Settings,
  score: alphaTab.model.Score,
  track: number,
  css: string,
  width = 1,
  annotation = true
): Promise<RenderedSheet> {
  // render sheet to SVG chunks (async in the browser — await full completion)
  const raw: RawChunk[] = []
  const renderer = new alphaTab.rendering.ScoreRenderer(settings)
  renderer.width = width
  await new Promise<void>((resolve) => {
    let laid = 0
    let done = false
    const maybe = () => {
      if (done && raw.length >= laid) resolve()
    }
    renderer.partialLayoutFinished.on((r) => {
      laid++
      renderer.renderResult(r.id)
    })
    renderer.partialRenderFinished.on((r) => {
      if (typeof r.renderResult === 'string') {
        raw.push({
          x: r.x,
          y: r.y,
          w: r.width,
          h: r.height,
          svg: r.renderResult
        })
      }
      maybe()
    })
    renderer.renderFinished.on(() => {
      done = true
      maybe()
    })
    renderer.renderScore(score, [track])
  })
  if (!raw.length) throw new Error('no chunks rendered')

  const bounds = renderer.boundsLookup!
  const kept = annotation ? raw : raw.filter(c => !c.svg.includes(ANNOTATION))
  const tiles: Tile[] = await Promise.all(
    kept.map(async c => ({
      x: c.x,
      y: c.y,
      w: c.w,
      h: c.h,
      img: await svgToCanvas(c.svg, c.w, c.h, css),
      annotation: c.svg.includes(ANNOTATION)
    }))
  )
  const height = Math.max(...raw.map(c => c.y + c.h)) & ~1
  return { tiles, bounds, height }
}

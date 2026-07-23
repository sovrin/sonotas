import * as alphaTab from '@coderline/alphatab'
import type { Beat, Box } from './types.ts'
import type { CropRange } from './settings.ts'
import { buildTempo } from './tempo.ts'

export interface Timeline {
  beats: Beat[]
  durationMs: number
  /** First-play onset (ms) of each rendered master bar; `bars.length` is the
   * rendered bar count. Onsets are rebased so the clip starts at 0. */
  bars: number[]
}

/** Walk the played beats and place each on the tempo curve. When `range` is set
 * only its bars are emitted, with times rebased so the clip starts at 0 —
 * matching a render cropped to the same range. */
export function buildTimeline(
  score: alphaTab.model.Score,
  settings: alphaTab.Settings,
  track: number,
  bounds: alphaTab.rendering.BoundsLookup,
  range?: CropRange
): Timeline {
  const midi = new alphaTab.midi.MidiFile()
  const gen = new alphaTab.midi.MidiFileGenerator(
    score,
    settings,
    new alphaTab.midi.AlphaSynthMidiFileHandler(midi)
  )
  gen.generate()
  const lookup = gen.tickLookup
  const trackSet = new Set([track])

  // 1st pass: walk in playback order (expanded ticks unfold repeats), collect tick spans
  const spans: {
    x: number
    barX: number
    barY: number
    barW: number
    barH: number
    heads: Box[]
    s: number
    e: number
    ms: number
    bar: number
  }[] = []
  let cur = lookup.findBeat(trackSet, 0)
  let last = -1
  while (cur && cur.start !== last) {
    last = cur.start
    const bb = bounds.findBeat(cur.beat)
    const box = bb?.barBounds?.masterBarBounds?.realBounds
    // Per-note head boxes (needs core.includeNoteBounds — already on). Powers the
    // active-note recolor overlay; empty for rests or if bounds are unavailable.
    const heads: Box[] = (bb?.notes ?? []).map(n => ({
      x: n.noteHeadBounds.x,
      y: n.noteHeadBounds.y,
      w: n.noteHeadBounds.w,
      h: n.noteHeadBounds.h
    }))
    spans.push({
      x: bb ? bb.onNotesX : 0,
      barX: box?.x ?? 0,
      barY: box?.y ?? 0,
      barW: box?.w ?? 0,
      barH: box?.h ?? 0,
      heads,
      s: cur.start,
      e: cur.end,
      ms: cur.duration > 0 ? cur.duration : 1,
      bar: cur.beat.voice.bar.masterBar.index
    })
    cur = lookup.findBeat(trackSet, cur.end)
  }
  const totalTicks = spans.length ? spans[spans.length - 1]!.e : 0

  // 2nd pass: with the full played span known, place each beat on the tempo
  // curve. Keep only in-range beats and rebase their times to the crop start so
  // the clip runs 0..durationMs.
  const tempo = buildTempo(score, lookup, midi.division, totalTicks)
  const inRange = (bar: number) =>
    !range || (bar >= range.fromBar && bar <= range.toBar)

  const beats: Beat[] = []
  const barOnset = new Array<number>(score.masterBars.length) // rebased onset per bar
  let flatMs = 0
  let offset: number | null = null // first in-range onset (ms)
  let durationMs = 0
  for (const span of spans) {
    const startMs = tempo.hasRamp ? tempo.timeAtTick(span.s) : flatMs
    const endMs = tempo.hasRamp ? tempo.timeAtTick(span.e) : flatMs + span.ms
    if (inRange(span.bar)) {
      offset ??= startMs
      beats.push({ startMs: startMs - offset, x: span.x, barX: span.barX, barY: span.barY, barW: span.barW, barH: span.barH, heads: span.heads })
      barOnset[span.bar] ??= startMs - offset // repeats revisit bars — keep the earliest
      durationMs = Math.max(durationMs, endMs - offset)
    }
    if (!tempo.hasRamp) flatMs += span.ms
  }
  const bars = fillDense(barOnset, durationMs)
  return {
    beats,
    durationMs,
    bars: range ? bars.slice(range.fromBar, range.toBar + 1) : bars
  }
}

/** Backfill entries never played (e.g. untaken alternate endings) so the array
 * is dense and monotonic: a hole inherits the next present value, and trailing
 * holes take `terminal`. */
function fillDense(values: number[], terminal: number): number[] {
  const dense = values.slice()
  let next = terminal
  for (let i = dense.length - 1; i >= 0; i--) {
    if (dense[i] === undefined) dense[i] = next
    else next = dense[i]!
  }
  return dense
}

import type * as alphaTab from '@coderline/alphatab'

export interface TempoCurve {
  hasRamp: boolean
  totalMs: number
  /** Elapsed ms at an (expanded playback) tick. */
  timeAtTick(tick: number): number
}

// Tempo curve. alphaTab plays linear tempo automations (ritardando/accelerando) as step
// changes, dropping the gradual ramp — so reconstruct the timing ourselves.
// Keyed in EXPANDED PLAYBACK space (tick lookup ticks unfold repeats) so the ramp is one
// continuous slowdown across the whole played timeline, not restarted per repeat. A trailing
// ramp target is stretched to the final tick so a ritardando reaches its end value at the end.
// Within a ramp the tempo is LINEAR IN TIME (matches Guitar Pro), not linear in ticks — so a
// segment's duration is quarters / average-BPM, and tick→time inverts a quadratic.
export function buildTempo(
  score: alphaTab.model.Score,
  lookup: alphaTab.midi.MidiTickLookup,
  division: number,
  totalTicks: number
): TempoCurve {
  const pts: { tick: number, bpm: number, linear: boolean }[] = [{
    tick: 0,
    bpm: score.tempo,
    linear: false
  }]
  let hasRamp = false
  for (const mb of score.masterBars) {
    const autos = (mb as { tempoAutomations?: alphaTab.model.Automation[] })
      .tempoAutomations ?? []
    if (!autos.length) continue
    const start = lookup.getMasterBarStart(mb) // first-play tick in expanded space
    const len = mb.calculateDuration()
    for (const a of autos) {
      pts.push({
        tick: start + a.ratioPosition * len,
        bpm: a.value,
        linear: a.isLinear
      })
      if (a.isLinear) hasRamp = true
    }
  }
  pts.sort((a, b) => a.tick - b.tick)
  const nP = pts.length
  if (nP >= 2 && pts[nP - 2]!.linear && pts[nP - 1]!.tick < totalTicks) {
    pts[nP - 1]!.tick = totalTicks
  }

  // segments between consecutive points, with cumulative start time (ms)
  const segs: {
    aTick: number
    bTick: number
    aBpm: number
    bBpm: number
    linear: boolean
    startMs: number
    ms: number
  }[] = []
  let cumMs = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!
    const b = pts[i + 1]!
    const q = (b.tick - a.tick) / division // quarter notes in this segment
    const ramp = a.linear && a.bpm !== b.bpm
    const ms = ramp ? (120000 * q) / (a.bpm + b.bpm) : (60000 * q) / a.bpm // linear-in-time avg, else constant
    segs.push({
      aTick: a.tick,
      bTick: b.tick,
      aBpm: a.bpm,
      bBpm: b.bpm,
      linear: ramp,
      startMs: cumMs,
      ms
    })
    cumMs += ms
  }

  // elapsed ms at an (expanded) tick
  const timeAtTick = (tick: number): number => {
    if (tick <= 0 || !segs.length) return 0
    let s = segs[segs.length - 1]!
    for (const seg of segs) {
      if (tick <= seg.bTick) {
        s = seg
        break
      }
    }
    const q = Math.max(0, tick - s.aTick) / division
    if (!s.linear) return s.startMs + (60000 * q) / s.aBpm
    // tempo(t)=aBpm + (bBpm-aBpm)*t/segMs ; position q(t)=(aBpm*t + db*t²/(2·segMs))/60000
    const db = s.bBpm - s.aBpm
    const k = db / s.ms
    const within = (-s.aBpm + Math.sqrt(s.aBpm * s.aBpm + 2 * k * 60000 * q))
      / k
    return s.startMs + within
  }

  return { hasRamp, totalMs: cumMs, timeAtTick }
}

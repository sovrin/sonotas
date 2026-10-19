import * as alphaTab from '@coderline/alphatab'
import type { TempoCurve } from './tempo.ts'

export const SAMPLE_RATE = 48000 // the one rate both AAC and Opus encoders take
export const CHANNELS = 2 // alphaTab's synth renders interleaved stereo
/** How long a clip that ends the song runs on, holding its last frame, so the
 * final notes ring out instead of stopping at their written length. */
export const RELEASE_MS = 2000

// Tempo grid for a baked ramp: a 32nd note. The synth's time matches the curve
// exactly at every grid tick and is linear in between.
const GRID_DIVISOR = 8

/** Replace the MIDI's tempo map with one sampled from `tempo`, so the synth
 * follows the reconstructed ritardando/accelerando instead of alphaTab's step
 * changes and stays on the same clock as the cursor. */
export function bakeTempo(
  midi: alphaTab.midi.MidiFile,
  tempo: TempoCurve,
  totalTicks: number
): void {
  const step = midi.division / GRID_DIVISOR
  const track = midi.tracks[0]!
  for (let i = track.events.length - 1; i >= 0; i--) {
    if (track.events[i]!.type === alphaTab.midi.MidiEventType.TempoChange) track.events.splice(i, 1)
  }
  for (let tick = 0; tick < totalTicks; tick += step) {
    const ms = tempo.timeAtTick(tick + step) - tempo.timeAtTick(tick)
    track.addEvent(new alphaTab.midi.TempoChangeEvent(tick, Math.round((ms * 1000 * GRID_DIVISOR))))
  }
}

/** Synthesize `[fromMs, toMs)` of the song (source time, before `speed`) as
 * interleaved stereo at SAMPLE_RATE, played back at `speed`. Rendering starts
 * at the top so notes ringing into the window are kept. */
export function renderAudio(
  midi: alphaTab.midi.MidiFile,
  soundFont: Uint8Array,
  fromMs: number,
  toMs: number,
  speed = 1
): Float32Array {
  const scaled = new alphaTab.midi.MidiFile()
  scaled.division = midi.division
  let mpq = 500000 / speed // MIDI's default 120 bpm until a tempo event says otherwise
  let lastTick = 0
  for (const e of midi.events) {
    if (e instanceof alphaTab.midi.TempoChangeEvent) mpq = e.microSecondsPerQuarterNote / speed
    scaled.addEvent(e instanceof alphaTab.midi.TempoChangeEvent ? new alphaTab.midi.TempoChangeEvent(e.tick, mpq) : e)
    lastTick = e.tick
  }
  // The synth cuts every voice dead at its last event; a no-op tempo event
  // RELEASE_MS (source time) later keeps it running so the final notes ring out.
  const releaseTicks = Math.ceil((RELEASE_MS / speed * 1000 / mpq) * midi.division)
  scaled.addEvent(new alphaTab.midi.TempoChangeEvent(lastTick + releaseTicks, mpq))
  const options = new alphaTab.synth.AudioExportOptions()
  options.soundFonts = [soundFont]
  options.sampleRate = SAMPLE_RATE
  // shortcut: exportAudio only reads `this` when no soundfont is passed, so no
  // synth (and no audio device) is needed; upgrade if alphaTab starts using it.
  const exporter = alphaTab.synth.AlphaSynth.prototype.exportAudio.call(
    null as never, options, scaled, [], new Map()
  )
  const sampleAt = (ms: number) => Math.round((ms / speed) * SAMPLE_RATE / 1000) * CHANNELS
  const from = sampleAt(fromMs)
  const out = new Float32Array(Math.max(0, sampleAt(toMs) - from))
  for (let pos = 0; pos < from + out.length;) {
    const chunk = exporter.render(500)
    if (!chunk) break // song over: the rest stays silent
    const s = chunk.samples
    const lo = Math.max(from - pos, 0)
    const hi = Math.min(from + out.length - pos, s.length)
    if (hi > lo) out.set(s.subarray(lo, hi), pos + lo - from)
    pos += s.length
  }
  return out
}

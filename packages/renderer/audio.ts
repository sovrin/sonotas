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

/** What plays besides the notes. */
export interface Sound {
  muted?: number[] // MIDI channels to silence (the tracks left out of the mix)
  metronome?: boolean // a click on every beat
  // One bar of clicks before the window, in the meter and tempo in effect at
  // this (expanded) tick: the clip start's.
  countIn?: number
}

const isTiming = (e: alphaTab.midi.MidiEvent) =>
  e.type === alphaTab.midi.MidiEventType.TempoChange || e.type === alphaTab.midi.MidiEventType.TimeSignature

/** The events of `midi` that `keep` passes, every tempo scaled by `speed`, and
 * a no-op tempo event `tailMs` (source time) after the last one: the synth
 * cuts every voice dead at its last event, so this lets them ring out. */
function retime(
  midi: alphaTab.midi.MidiFile,
  speed: number,
  keep: (e: alphaTab.midi.MidiEvent) => boolean,
  tailMs: number
): alphaTab.midi.MidiFile {
  const out = new alphaTab.midi.MidiFile()
  out.division = midi.division
  let mpq = 500000 / speed // MIDI's default 120 bpm until a tempo event says otherwise
  let lastTick = 0
  for (const e of midi.events) {
    if (e instanceof alphaTab.midi.TempoChangeEvent) mpq = e.microSecondsPerQuarterNote / speed
    if (keep(e)) out.addEvent(e instanceof alphaTab.midi.TempoChangeEvent ? new alphaTab.midi.TempoChangeEvent(e.tick, mpq) : e)
    lastTick = e.tick
  }
  out.addEvent(new alphaTab.midi.TempoChangeEvent(lastTick + Math.ceil((tailMs / speed * 1000 / mpq) * midi.division), mpq))
  return out
}

/** Synthesize `length` samples of `midi` from sample `from` (interleaved). */
function play(
  midi: alphaTab.midi.MidiFile,
  soundFont: Uint8Array,
  { muted = [], metronome = false }: Sound,
  from: number,
  length: number
): Float32Array {
  const options = new alphaTab.synth.AudioExportOptions()
  options.soundFonts = [soundFont]
  options.sampleRate = SAMPLE_RATE
  options.metronomeVolume = metronome ? 1 : 0
  for (const channel of muted) options.trackVolume.set(channel, 0)
  // shortcut: exportAudio only reads `this` when no soundfont is passed, so no
  // synth (and no audio device) is needed; upgrade if alphaTab starts using it.
  const exporter = alphaTab.synth.AlphaSynth.prototype.exportAudio.call(
    null as never, options, midi, [], new Map()
  )
  const out = new Float32Array(Math.max(0, length))
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

/** The bar a count-in clicks through: the meter and tempo in effect at `tick`,
 * as a MIDI file of just those, and its length (source ms). */
function countInBar(midi: alphaTab.midi.MidiFile, tick: number): { bar: alphaTab.midi.MidiFile, ms: number } {
  let mpq = 500000
  let numerator = 4
  let denominatorIndex = 2
  for (const e of midi.events) {
    if (e.tick > tick) break
    if (e instanceof alphaTab.midi.TempoChangeEvent) mpq = e.microSecondsPerQuarterNote
    if (e instanceof alphaTab.midi.TimeSignatureEvent) ({ numerator, denominatorIndex } = e)
  }
  const ticks = numerator * midi.division * 4 / 2 ** denominatorIndex
  const bar = new alphaTab.midi.MidiFile()
  bar.division = midi.division
  bar.addEvent(new alphaTab.midi.TimeSignatureEvent(0, 0, numerator, denominatorIndex, 24, 8))
  bar.addEvent(new alphaTab.midi.TempoChangeEvent(0, mpq))
  bar.addEvent(new alphaTab.midi.TempoChangeEvent(ticks, mpq)) // runs the clicks to the bar's end
  return { bar, ms: (ticks / midi.division) * mpq / 1000 }
}

/** How long a count-in before `tick` lasts (source ms). */
export function countInMs(midi: alphaTab.midi.MidiFile, tick: number): number {
  return countInBar(midi, tick).ms
}

/** Synthesize `[fromMs, toMs)` of the song (source time, before `speed`) as
 * interleaved stereo at SAMPLE_RATE, played back at `speed`, preceded by the
 * count-in bar when `sound.countIn` is set. Rendering starts at the top so
 * notes ringing into the window are kept. */
export function renderAudio(
  midi: alphaTab.midi.MidiFile,
  soundFont: Uint8Array,
  fromMs: number,
  toMs: number,
  speed = 1,
  sound: Sound = {}
): Float32Array {
  const sampleAt = (ms: number) => Math.round((ms / speed) * SAMPLE_RATE / 1000) * CHANNELS
  const from = sampleAt(fromMs)
  const length = sampleAt(toMs) - from
  const notes = play(retime(midi, speed, () => true, RELEASE_MS), soundFont, { muted: sound.muted }, from, length)
  // The clicks are a pass of their own over just the tempo map, so they stop
  // at the last note instead of ticking on through its ring-out.
  if (sound.metronome) {
    const clicks = play(retime(midi, speed, isTiming, 0), soundFont, { metronome: true }, from, length)
    for (let i = 0; i < notes.length; i++) notes[i] = notes[i]! + clicks[i]!
  }
  if (sound.countIn === undefined) return notes
  const { bar, ms } = countInBar(midi, sound.countIn)
  const lead = play(retime(bar, speed, () => true, 0), soundFont, { metronome: true }, 0, sampleAt(ms))
  const out = new Float32Array(lead.length + notes.length)
  out.set(lead)
  out.set(notes, lead.length)
  return out
}

// Settings as a short code for a link (?s=…): how a video looks and is
// exported, never the song. Codes are shared and must keep working forever,
// so the format only ever grows:
//
//   code    = base62(bytes), case-sensitive, letters and digits only
//   bytes   = field* crc16
//   field   = varint(id << 2 | wire) value
//   wire    0 false · 1 true · 2 varint (enum index, or zigzag int)
//           · 3 varint(length) + bytes (a colour is 3: r g b)
//
// Each field says what it means when a code leaves it out (`absent`), and a
// code writes only the fields that differ from that, so most codes are short.
// `absent` never changes: for a setting added later it is how videos looked
// before the setting existed, so older codes keep looking the same. The app's
// own defaults (APP_DEFAULTS) are separate and free to change. So a code needs
// no version: it means the same settings forever. (A format old readers can't
// skip through would get a new query key, not a new ?s=.)
//
// Reading is lenient: a field this build doesn't know (a newer code), or a
// value it can't take, is skipped and counted, and the rest still apply. A bad
// checksum rejects the whole code.
//
// Rules (with the how-to in AGENTS.md), held by tests/settings-code_test.ts
// against tests/settings-code.lock.json, which only ever grows:
// - a field's id, type and `absent` never change; new enum values go at the
//   end, int ranges only widen, a removed field's id is retired;
// - BASE_THEMES never changes and never grows.

/** The video's settings as the app starts them: a clean link (no ?s=) means
 * these. Free to change; every key needs a field below. */
export const APP_DEFAULTS = {
  aspect: '16:9', // framed output ratio
  resolution: '1080p',
  fps: '30 fps',
  quality: 'High',
  fastExport: false, // parallel software encoders: much faster, larger files
  sound: false, // synthesized soundtrack in preview and export
  soundMix: 'All', // which tracks sound: all, only the shown one, or all but it
  metronome: false, // a click on every beat
  countIn: false, // a bar of clicks before the first note
  speed: '1×',
  layout: 'Scrolling line', // one endless system, or page-style wrapped systems
  notationSize: '100%',
  fitBars: 'Off', // line layout: size the widest run of N bars to the frame width
  barsPerLine: 'Auto', // page layout: bars on each line
  spacing: 'Normal', // how far the notes spread out along the line
  currentBarOnly: false, // hide everything but the bar(s) being played
  staves: 'Tab only',
  songBook: false, // bends, whammys and let-ring drawn and played song-book style
  tabRhythm: 'Auto', // stems under the tab: auto (as the file sets it), beams, bars or none
  theme: 'dark', // canvas preset: sets the three colours below unless changed
  bg: '#121316',
  fg: '#e8e9eb', // notation
  barNum: '#e8e9eb',
  staffLines: 100, // % of the notation colour's strength the staff lines get
  showTitle: true, // title/artist overlay (needs the file to carry one)
  showTuning: false, // the track's tuning and capo, in the title overlay
  showTrackName: true,
  showBarNumbers: true,
  showTempo: true,
  showTimeSig: true,
  showChords: false, // chord diagrams above chord-named beats
  showLyrics: true,
  showSections: true, // section names (Intro, Verse…) above their bars
  showDynamics: true, // dynamics, hairpins, text, directions and beat timers
  showFingering: true, // fingering and pick strokes
  showAttribution: true, // alphaTab's "rendered by alphaTab" line
  playhead: 'jump', // 'jump' note to note | 'glide' through the bar
  view: 'bar', // 'bar' (page: per line) | 'screen' | 'track'
  transition: 0, // ms the view takes to move; 0 cuts
  followAt: 5, // % where now sits in the view
  turnEarly: true, // screen: turn on the last bar that fits
  runPast: false, // track: keep the playhead put past the sheet's ends
  steady: true, // track: an even pace instead of every note's spacing
  cursorColor: '#737b87', // a grey that holds 3:1 on both canvas themes
  cursorOpacity: 70,
  cursorWidth: 3,
  cursorHeight: 100,
  cursorOffset: 0, // screen-space px nudged onto the playhead
  cursorMatchBar: false, // playhead spans the played bar instead of the frame
  highlightBar: true,
  highlightColor: '#e0a94c',
  highlightOpacity: 22,
  highlightPadding: 6,
  recolorNote: false, // recolour the note being played
  activeNoteColor: '#e5484d',
  activeNoteOpacity: 90
}

export type Settings = typeof APP_DEFAULTS
export type SettingKey = keyof Settings
export type Value = string | number | boolean
type ThemeColours = Pick<Settings, 'bg' | 'fg' | 'barNum'>

export type Field
  = | { id: number, key: SettingKey, type: 'enum', values: readonly string[], absent: string }
    | { id: number, key: SettingKey, type: 'bool', absent: boolean }
    | { id: number, key: SettingKey, type: 'int', min: number, max: number, absent: number }
    | { id: number, key: SettingKey, type: 'colour', absent: string }

// The canvas presets every reader knows, so a code for one of these themes
// with its preset colours needn't spell the colours out. Never edit, never add
// to: a theme added later isn't known to older readers, so its codes carry
// their colours.
const BASE_THEMES: Record<string, ThemeColours> = {
  dark: { bg: '#121316', fg: '#e8e9eb', barNum: '#e8e9eb' },
  light: { bg: '#f5f7f9', fg: '#13161c', barNum: '#13161c' }
}

/** The app's canvas presets. Free to change or grow. */
export const THEMES: Record<string, ThemeColours> = { ...BASE_THEMES }

/** Frozen parts of the format besides the fields, for the lock test. */
export const FROZEN = { BASE_THEMES }

const fitBarsValues = ['Off', '1 bar', ...[2, 3, 4, 5, 6, 7, 8].map(n => `${n} bars`)]

// One line per setting: its permanent id, what it can hold, and what a code
// that leaves it out means. The first 31 ids take one byte, so they went to
// what's changed most; the rest take two. A new setting appends a line, with
// `absent` set to how videos looked before it existed.
export const FIELDS: readonly Field[] = [
  { id: 1, key: 'theme', type: 'enum', values: ['dark', 'light'], absent: 'dark' },
  { id: 2, key: 'aspect', type: 'enum', values: ['16:9', '9:16', '1:1'], absent: '16:9' },
  { id: 3, key: 'layout', type: 'enum', values: ['Scrolling line', 'Page'], absent: 'Scrolling line' },
  { id: 4, key: 'fitBars', type: 'enum', values: fitBarsValues, absent: 'Off' },
  { id: 5, key: 'currentBarOnly', type: 'bool', absent: false },
  { id: 6, key: 'notationSize', type: 'enum', values: ['80%', '100%', '120%', '150%'], absent: '100%' },
  { id: 7, key: 'staves', type: 'enum', values: ['Tab only', 'Standard + Tab', 'Standard only'], absent: 'Tab only' },
  { id: 8, key: 'playhead', type: 'enum', values: ['jump', 'glide'], absent: 'jump' },
  { id: 9, key: 'view', type: 'enum', values: ['bar', 'screen', 'track'], absent: 'bar' },
  { id: 10, key: 'transition', type: 'int', min: 0, max: 5000, absent: 0 },
  { id: 11, key: 'followAt', type: 'int', min: 0, max: 100, absent: 5 },
  { id: 12, key: 'cursorColor', type: 'colour', absent: '#737b87' },
  { id: 13, key: 'cursorOpacity', type: 'int', min: 10, max: 100, absent: 70 },
  { id: 14, key: 'cursorWidth', type: 'int', min: 1, max: 10, absent: 3 },
  { id: 15, key: 'cursorHeight', type: 'int', min: 40, max: 100, absent: 100 },
  { id: 16, key: 'cursorOffset', type: 'int', min: -100, max: 100, absent: 0 },
  { id: 17, key: 'highlightBar', type: 'bool', absent: true },
  { id: 18, key: 'highlightColor', type: 'colour', absent: '#e0a94c' },
  { id: 19, key: 'highlightOpacity', type: 'int', min: 5, max: 60, absent: 22 },
  { id: 20, key: 'recolorNote', type: 'bool', absent: false },
  { id: 21, key: 'activeNoteColor', type: 'colour', absent: '#e5484d' },
  { id: 22, key: 'activeNoteOpacity', type: 'int', min: 30, max: 100, absent: 90 },
  { id: 23, key: 'bg', type: 'colour', absent: '#121316' }, // of a theme not in BASE_THEMES
  { id: 24, key: 'fg', type: 'colour', absent: '#e8e9eb' },
  { id: 25, key: 'barNum', type: 'colour', absent: '#e8e9eb' },
  { id: 26, key: 'showTitle', type: 'bool', absent: true },
  { id: 27, key: 'showTrackName', type: 'bool', absent: true },
  { id: 28, key: 'showBarNumbers', type: 'bool', absent: true },
  { id: 29, key: 'showTempo', type: 'bool', absent: true },
  { id: 30, key: 'showChords', type: 'bool', absent: false },
  { id: 31, key: 'fps', type: 'enum', values: ['24 fps', '30 fps', '60 fps'], absent: '30 fps' },
  { id: 32, key: 'resolution', type: 'enum', values: ['1080p', '720p', '480p'], absent: '1080p' },
  { id: 33, key: 'quality', type: 'enum', values: ['Standard', 'High', 'Max'], absent: 'High' },
  { id: 34, key: 'speed', type: 'enum', values: ['0.25×', '0.5×', '0.75×', '1×', '1.25×', '1.5×', '2×'], absent: '1×' },
  { id: 35, key: 'fastExport', type: 'bool', absent: false },
  { id: 36, key: 'steady', type: 'bool', absent: true },
  { id: 37, key: 'turnEarly', type: 'bool', absent: true },
  { id: 38, key: 'runPast', type: 'bool', absent: false },
  { id: 39, key: 'cursorMatchBar', type: 'bool', absent: false },
  { id: 40, key: 'highlightPadding', type: 'int', min: 0, max: 20, absent: 6 },
  { id: 41, key: 'showTimeSig', type: 'bool', absent: true },
  { id: 42, key: 'showAttribution', type: 'bool', absent: true },
  { id: 43, key: 'sound', type: 'bool', absent: false },
  { id: 44, key: 'soundMix', type: 'enum', values: ['All', 'Solo', 'Minus'], absent: 'All' },
  { id: 45, key: 'metronome', type: 'bool', absent: false },
  { id: 46, key: 'countIn', type: 'bool', absent: false },
  { id: 47, key: 'tabRhythm', type: 'enum', values: ['Auto', 'Beams', 'Bars', 'None'], absent: 'Auto' },
  { id: 48, key: 'showLyrics', type: 'bool', absent: true },
  { id: 49, key: 'showSections', type: 'bool', absent: true },
  { id: 50, key: 'showDynamics', type: 'bool', absent: true },
  { id: 51, key: 'showFingering', type: 'bool', absent: true },
  { id: 52, key: 'showTuning', type: 'bool', absent: false },
  { id: 53, key: 'barsPerLine', type: 'enum', values: ['Auto', '2', '3', '4', '6'], absent: 'Auto' },
  { id: 54, key: 'spacing', type: 'enum', values: ['Tight', 'Normal', 'Wide'], absent: 'Normal' },
  { id: 55, key: 'songBook', type: 'bool', absent: false },
  { id: 56, key: 'staffLines', type: 'int', min: 20, max: 100, absent: 100 }
]

/** Ids of removed fields: never reused; old codes carrying them skip them quietly. */
export const RETIRED_IDS: readonly number[] = []

const BY_ID = new Map(FIELDS.map(f => [f.id, f]))
const ABSENT = Object.fromEntries(FIELDS.map(f => [f.key, f.absent])) as Settings

/** What a code that leaves everything out means, with the colours of `theme`
 * when it's one every reader knows. */
export function absentFor(theme: string = ABSENT.theme): Settings {
  return { ...ABSENT, ...BASE_THEMES[theme], theme }
}

/** The settings as a code. */
export function encodeSettings(s: Settings): string {
  // Left-out colours follow the code's theme; the theme's own is fixed.
  const d = { ...absentFor(s.theme), theme: ABSENT.theme }
  const bytes: number[] = []
  for (const f of FIELDS) {
    const v = s[f.key]
    if (same(f, v, d[f.key]) || !valid(f, v)) continue
    if (f.type === 'bool') {
      varint(f.id * 4 + (v ? 1 : 0), bytes)
    } else if (f.type === 'colour') {
      varint(f.id * 4 + 3, bytes)
      varint(3, bytes)
      const hex = String(v).slice(1)
      for (let i = 0; i < 6; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16))
    } else {
      varint(f.id * 4 + 2, bytes)
      varint(f.type === 'enum' ? f.values.indexOf(v as string) : zigzag(v as number), bytes)
    }
  }
  return toCode(bytes)
}

/** Field bytes as a code: checksummed, in base62. */
export function toCode(bytes: number[]): string {
  const crc = crc16(bytes)
  return toBase62([...bytes, crc >> 8, crc & 0xff])
}

export interface Decoded {
  /** Full settings: the code's, and `absent` for what it leaves out. */
  settings: Settings
  /** Fields that didn't apply: unknown to this build, or a value it can't take. */
  skipped: number
}

/** Read a code; null when it isn't one (bad characters, truncated, checksum). */
export function decodeSettings(code: string): Decoded | null {
  const bytes = fromBase62(code.trim())
  if (!bytes || bytes.length < 2) return null
  const body = bytes.slice(0, -2)
  if (crc16(body) !== bytes.at(-2)! * 256 + bytes.at(-1)!) return null
  const r = { bytes: body, at: 0 }
  const raw: Partial<Record<SettingKey, Value>> = {}
  let skipped = 0
  while (r.at < body.length) {
    const tag = readVarint(r)
    if (tag === null) return null
    const id = Math.floor(tag / 4)
    const wire = tag % 4
    let value: number | number[] | boolean
    if (wire < 2) {
      value = wire === 1
    } else if (wire === 2) {
      const n = readVarint(r)
      if (n === null) return null
      value = n
    } else {
      const len = readVarint(r)
      if (len === null || r.at + len > body.length) return null
      value = body.slice(r.at, r.at + len)
      r.at += len
    }
    const f = BY_ID.get(id)
    if (!f) {
      if (!RETIRED_IDS.includes(id)) skipped++
      continue
    }
    const v = read(f, wire, value)
    if (v === undefined) skipped++
    else raw[f.key] = v
  }
  const settings = { ...absentFor(raw.theme as string | undefined), ...raw } as Settings
  return { settings, skipped }
}

// ── fields ──────────────────────────────────────────────────────────────────

function same(f: Field, a: Value, b: Value): boolean {
  return f.type === 'colour' ? String(a).toLowerCase() === String(b).toLowerCase() : a === b
}

function valid(f: Field, v: Value): boolean {
  if (f.type === 'bool') return typeof v === 'boolean'
  if (f.type === 'enum') return f.values.includes(v as string)
  if (f.type === 'int') return Number.isInteger(v) && (v as number) >= f.min && (v as number) <= f.max
  return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)
}

// A wire value as the field's value, or undefined when it can't take it.
function read(f: Field, wire: number, value: number | number[] | boolean): Value | undefined {
  if (f.type === 'bool') return wire < 2 ? (value as boolean) : undefined
  if (f.type === 'colour') {
    const rgb = value as number[]
    if (wire !== 3 || rgb.length !== 3) return undefined
    return '#' + rgb.map(c => c.toString(16).padStart(2, '0')).join('')
  }
  if (wire !== 2) return undefined
  const n = value as number
  if (f.type === 'enum') return f.values[n]
  const v = unzigzag(n)
  return v >= f.min && v <= f.max ? v : undefined
}

// ── bytes ───────────────────────────────────────────────────────────────────

function varint(n: number, out: number[]): void {
  while (n >= 0x80) {
    out.push((n % 0x80) | 0x80)
    n = Math.floor(n / 0x80)
  }
  out.push(n)
}

function readVarint(r: { bytes: number[], at: number }): number | null {
  let n = 0
  for (let scale = 1; r.at < r.bytes.length && scale < 2 ** 49; scale *= 0x80) {
    const b = r.bytes[r.at++]!
    n += (b & 0x7f) * scale
    if (b < 0x80) return n
  }
  return null // truncated, or too long to be a number
}

const zigzag = (n: number) => (n >= 0 ? n * 2 : -n * 2 - 1)
const unzigzag = (z: number) => (z % 2 ? -(z + 1) / 2 : z / 2)

// CRC-16/CCITT-FALSE.
function crc16(bytes: number[]): number {
  let crc = 0xffff
  for (const b of bytes) {
    crc ^= b << 8
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc
}

// Base62 of the bytes as one big-endian number. No leading zero byte is lost:
// a field's tag is at least 4, and with no fields the checksum (of nothing) is
// 0xffff.
const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

function toBase62(bytes: number[]): string {
  let n = bytes.reduce((acc, b) => acc * 256n + BigInt(b), 0n)
  let out = ''
  while (n > 0n) {
    out = B62[Number(n % 62n)] + out
    n /= 62n
  }
  return out
}

function fromBase62(code: string): number[] | null {
  if (!/^[0-9A-Za-z]{1,2048}$/.test(code)) return null
  let n = 0n
  for (const c of code) n = n * 62n + BigInt(B62.indexOf(c))
  const bytes: number[] = []
  while (n > 0n) {
    bytes.unshift(Number(n % 256n))
    n /= 256n
  }
  return bytes
}

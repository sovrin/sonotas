// Holds the settings code to its promise: every code ever made keeps decoding
// to the same settings. tests/settings-code.lock.json records each field's id,
// type and `absent` value, the base themes, and sample codes with what they
// decode to. Adding fields or enum values (at the end), or widening a range, is fine;
// changing anything locked fails here. After an intended addition, refresh the
// lock (it refuses while anything locked has changed) and commit it:
//   pnpm settings:lock
// The lock itself only grows: it is checked against its committed version
// (LOCK_BASE, default HEAD; CI uses the commit before the push), so editing it
// to make a break pass fails too. See AGENTS.md.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { APP_DEFAULTS, FIELDS, FROZEN, RETIRED_IDS, absentFor, decodeSettings, encodeSettings, toCode, type Settings } from '../app/utils/settings-code.ts'

const LOCK = new URL('./settings-code.lock.json', import.meta.url)
const lock = JSON.parse(readFileSync(LOCK, 'utf8'))

const LIGHT = absentFor('light')
// A light video with an amber playhead that glides, tracked, four bars across, at 60 fps.
const EXAMPLE = { ...LIGHT, cursorColor: '#e0a94c', playhead: 'glide', view: 'track', fitBars: '4 bars', fps: '60 fps' }
// Every field away from its absent value, at the ends of its range.
const EVERYTHING: Settings = { ...absentFor(), ...Object.fromEntries(FIELDS.map((f) => {
  const d = absentFor()[f.key]
  if (f.type === 'bool') return [f.key, !d]
  if (f.type === 'enum') return [f.key, f.values.at(-1) === d ? f.values[0] : f.values.at(-1)]
  if (f.type === 'int') return [f.key, f.min === d ? f.max : f.min]
  return [f.key, '#0a0b0c']
})) }

/** Everything locked that the current code breaks. */
function breaks(): string[] {
  const out: string[] = []
  const ids = FIELDS.map(f => f.id)
  if (new Set(ids).size !== ids.length) out.push('field ids must be unique')
  for (const id of ids) if (id < 1 || RETIRED_IDS.includes(id)) out.push(`field id ${id} is 0 or retired`)
  const keys = FIELDS.map(f => f.key)
  for (const k of Object.keys(APP_DEFAULTS)) if (!keys.includes(k as keyof Settings)) out.push(`setting ${k} has no field, so links would drop it`)
  for (const f of FIELDS) {
    if (!(f.key in APP_DEFAULTS)) out.push(`field ${f.id} (${f.key}) is no setting`)
    if (!valid(f, f.absent)) out.push(`field ${f.id}'s absent value isn't one it can hold`)
  }
  return [...out, ...growth({ fields: FIELDS, retired: RETIRED_IDS, themes: FROZEN.BASE_THEMES }, lock)]
}

interface Contract { fields: readonly (typeof FIELDS)[number][], retired: readonly number[], themes: unknown }

/** Where `now` doesn't keep every promise `before` made: a field gone without
 * being retired, or one that changed more than growing. */
function growth(now: Contract, before: Contract): string[] {
  const out: string[] = []
  for (const locked of before.fields) {
    const f = now.fields.find(x => x.id === locked.id)
    if (!f) {
      if (!now.retired.includes(locked.id)) out.push(`field ${locked.id} (${locked.key}) was removed: add its id to RETIRED_IDS`)
      continue
    }
    if (f.type !== locked.type) out.push(`field ${locked.id} changed its type`)
    else if (f.type === 'enum' && locked.type === 'enum' && JSON.stringify(f.values.slice(0, locked.values.length)) !== JSON.stringify(locked.values)) out.push(`field ${locked.id} changed values; only append`)
    else if (f.type === 'int' && locked.type === 'int' && (f.min > locked.min || f.max < locked.max)) out.push(`field ${locked.id} narrowed its range`)
    if (f.absent !== locked.absent) out.push(`field ${locked.id} changed its absent value; change APP_DEFAULTS instead`)
  }
  for (const id of before.retired) if (!now.retired.includes(id)) out.push(`retired id ${id} must stay retired`)
  if (JSON.stringify(now.themes) !== JSON.stringify(before.themes)) out.push('BASE_THEMES changed; change THEMES instead')
  return out
}

test('nothing locked has changed', () => {
  assert.deepEqual(breaks(), [])
})

test('the lock is up to date', { skip: !!process.env.UPDATE_LOCK && 'refreshing it' }, () => {
  // Every field, value and range as the code has them, and a sample of every
  // field set: so what was just added is protected from the next change too.
  const behind = 'the lock is behind the code: run pnpm settings:lock and commit the lock'
  assert.deepEqual(lock.fields, JSON.parse(JSON.stringify(FIELDS)), behind)
  assert.deepEqual(lock.retired, [...RETIRED_IDS], behind)
  assert.ok(lock.samples.some((x: { code: string }) => x.code === encodeSettings(EVERYTHING)), behind)
})

test('every sample code still decodes as it did', () => {
  // Settings added since a sample was made come back as their absent values;
  // settings retired since are gone. The rest must match exactly.
  for (const sample of lock.samples) {
    const got = decodeSettings(sample.code)?.settings as Record<string, unknown> | undefined
    const kept = Object.keys(sample.settings).filter(k => FIELDS.some(f => f.key === k))
    assert.deepEqual(Object.fromEntries(kept.map(k => [k, got?.[k]])), Object.fromEntries(kept.map(k => [k, sample.settings[k]])), `sample ${sample.code}`)
  }
})

test('the lock only grows', (t) => {
  let base = process.env.LOCK_BASE || 'HEAD'
  if (/^0+$/.test(base)) base = 'origin/master' // a new branch's first push
  let before
  try {
    before = JSON.parse(execFileSync('git', ['show', `${base}:tests/settings-code.lock.json`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))
  } catch {
    t.skip(`no lock committed at ${base}`)
    return
  }
  assert.deepEqual(growth(lock, before), [], `the lock changed against ${base}; it may only grow`)
  for (const sample of before.samples) {
    assert.ok(lock.samples.some((x: { code: string, settings: unknown }) => x.code === sample.code && JSON.stringify(x.settings) === JSON.stringify(sample.settings)), `sample ${sample.code} was changed or removed`)
  }
})

function valid(f: (typeof FIELDS)[number], v: unknown): boolean {
  if (f.type === 'bool') return typeof v === 'boolean'
  if (f.type === 'enum') return f.values.includes(v as string)
  if (f.type === 'int') return Number.isInteger(v) && (v as number) >= f.min && (v as number) <= f.max
  return typeof v === 'string' && /^#[0-9a-f]{6}$/.test(v)
}

test('settings round-trip, and leaving everything out is the shortest code', () => {
  for (const s of [absentFor(), LIGHT, EXAMPLE, EVERYTHING, APP_DEFAULTS]) {
    assert.deepEqual(decodeSettings(encodeSettings(s)), { settings: s, skipped: 0 })
  }
  assert.equal(encodeSettings(absentFor()), 'H31') // just the checksum of nothing
})

test('a code is letters and digits, and short for a few changes', () => {
  const code = encodeSettings(EXAMPLE)
  assert.match(code, /^[0-9A-Za-z]+$/)
  assert.ok(code.length <= 22, `example code ${code} is ${code.length} chars`)
  assert.ok(encodeSettings(LIGHT).length <= 5, 'a base theme needs no colours')
})

test('a mistyped or cut code is rejected whole', () => {
  const code = encodeSettings(EXAMPLE)
  for (let i = 0; i < code.length; i++) {
    const c = code[i] === 'a' ? 'b' : 'a'
    assert.equal(decodeSettings(code.slice(0, i) + c + code.slice(i + 1)), null, `typo at ${i}`)
  }
  assert.equal(decodeSettings(code.slice(0, -1)), null)
  for (const bad of ['', 'not a code!', '-'.repeat(10), 'z'.repeat(3000)]) assert.equal(decodeSettings(bad), null)
})

test('what a build can\'t take is skipped, the rest applies', () => {
  const glide = [8 * 4 + 2, 1] // playhead: glide
  // An unknown field (id 900: tag 3600 + wire, as a two-byte varint) of every
  // wire type, as a newer build might write, then a known one.
  const unknown = [[0x90, 0x1c], [0x91, 0x1c], [0x92, 0x1c, 5], [0x93, 0x1c, 2, 1, 2]]
  const d = decodeSettings(toCode([...unknown.flat(), ...glide]))
  assert.equal(d?.skipped, 4)
  assert.equal(d?.settings.playhead, 'glide')
  // Values out of range or of the wrong kind.
  const odd = [
    [2 * 4 + 2, 9], // aspect: no 10th value
    [14 * 4 + 2, 2 * 50], // cursorWidth 50 > 10
    [12 * 4 + 3, 2, 1, 2], // cursorColor with 2 bytes
    [5 * 4 + 2, 1] // currentBarOnly as a number
  ]
  const e = decodeSettings(toCode([...odd.flat(), ...glide]))
  assert.equal(e?.skipped, 4)
  assert.deepEqual(e?.settings, { ...absentFor(), playhead: 'glide' })
})

test('a theme no reader knew at first keeps its colours in the code', () => {
  // As if a later build added a third theme: its colours aren't base ones.
  const sepia = { ...absentFor(), theme: 'sepia', bg: '#f4ecd8', fg: '#3b2f1e', barNum: '#3b2f1e' }
  const field = FIELDS.find(f => f.key === 'theme')!
  const code = encodeSettings(sepia as Settings)
  // This build has no 'sepia' value, so the theme itself is left out; the colours stay.
  assert.ok(field.type === 'enum' && !field.values.includes('sepia'))
  const d = decodeSettings(code)!.settings
  assert.deepEqual([d.bg, d.fg, d.barNum], [sepia.bg, sepia.fg, sepia.barNum])
})

if (process.env.UPDATE_LOCK) {
  test('refresh the lock', () => {
    assert.deepEqual(breaks(), [], 'refusing to refresh the lock over a break')
    const samples = [...lock.samples]
    for (const settings of [LIGHT, EXAMPLE, EVERYTHING]) {
      const code = encodeSettings(settings)
      assert.deepEqual(decodeSettings(code)?.settings, settings, `new sample ${code}`)
      if (!samples.some(x => x.code === code)) samples.push({ code, settings })
    }
    writeFileSync(LOCK, JSON.stringify({ fields: FIELDS, retired: RETIRED_IDS, themes: FROZEN.BASE_THEMES, samples }, null, 2) + '\n')
  })
}

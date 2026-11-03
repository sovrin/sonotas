import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Every text the app shows is t('key') from utils/i18n, with the key written out, so this finds
// them all: a key the committed texts lack shows its name instead of a text, and a key no code
// uses is left over (delete it where the texts are edited, then `pnpm texts`).
const { source } = JSON.parse(readFileSync('app/i18n/languages.json', 'utf8'))
const known = new Set(Object.keys(JSON.parse(readFileSync(`app/i18n/texts/${source}.json`, 'utf8'))))

const IMPORTS_T = /import\s*\{[^}]*\bt\b[^}]*\}\s*from\s*['"]~\/utils\/i18n['"]/
const CALL = /\bt\(\s*(['"])?([^'"),\s]*)/g

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return path === join('app', 'i18n') ? [] : files(path)
    return /\.(vue|ts|js)$/.test(entry.name) ? [path] : []
  })
}

const used = new Map<string, string>()
const built: string[] = []
for (const file of files('app')) {
  const source = readFileSync(file, 'utf8')
  if (!IMPORTS_T.test(source)) continue
  for (const match of source.matchAll(CALL)) {
    const line = source.slice(0, match.index).split('\n').length
    if (match[1]) used.set(match[2]!, `${file}:${line}`)
    else built.push(`${file}:${line}`)
  }
}

test('every t() names its key as it is', () => {
  assert.deepEqual(built, [], 'a key put together cannot be checked: one t(\'…\') per key')
})

test('every key the code uses has a text', () => {
  assert.deepEqual([...used].filter(([key]) => !known.has(key)).map(([key, at]) => `${key} (${at})`), [])
})

test('every text is used by the code', () => {
  assert.deepEqual([...known].filter(key => !used.has(key)), [])
})

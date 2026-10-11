// Build the music font sonotas ships: a subset of Bravura holding only the
// glyphs alphaTab can emit, so each SVG chunk decodes a ~37KB font instead of
// the full ~500KB (font decode is the dominant cost when rasterizing many
// chunks — see the renderer notes).
//
// Bravura is CFF-based; only a full harfbuzz build subsets CFF correctly (the
// wasm ports drop the outlines), so this shells out to hb-subset + woff2_compress.
//   macOS:  brew install harfbuzz woff2
//   Debian: apt-get install libharfbuzz-bin woff2
//
// Bravura is published under the SIL OFL with "Bravura" as a Reserved Font
// Name, and a subset counts as a Modified Version, so the result must not call
// itself Bravura. The internal name table is rewritten to "Sonotas Music" with
// fontTools' `ttx`. That step is optional locally: without `ttx` on PATH the
// subset keeps Bravura's names and a note is printed. The Docker font stage
// installs fontTools, so `docker build --target font --output public/fonts .`
// always produces the properly renamed font — use that for the committed file.
//
// Run: pnpm build-font  (from the repo root)
import { execFile } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const OUT_NAME = 'sonotas-music.woff2'
const FAMILY = 'Sonotas Music'
const POSTSCRIPT = 'SonotasMusic'

// alphaTab's MusicFontSymbol enum lists every SMuFL codepoint it renders. Reading
// it straight from the shipped bundle keeps the subset in sync with the installed
// version — no hand-maintained glyph list to drift.
function alphaTabCodepoints(coreSource: string): number[] {
  const cps = new Set<number>()
  const re = /MusicFontSymbol\[[^\]]+\]\s*=\s*(\d+)/g
  for (const m of coreSource.matchAll(re)) cps.add(Number(m[1]))
  if (cps.size < 100) throw new Error(`only ${cps.size} codepoints found`)
  return [...cps].sort((a, b) => a - b)
}

async function run(cmd: string, args: string[]) {
  try {
    await execFileAsync(cmd, args)
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stderr?: string }
    if (e.code === 'ENOENT') {
      throw new Error(
        `'${cmd}' not runnable (${e.message}). Install it:\n`
        + `  macOS:  brew install harfbuzz woff2\n`
        + `  Debian: apt-get install libharfbuzz-bin woff2`,
        { cause: err }
      )
    }
    throw new Error(`${cmd} failed: ${e.stderr ?? e.message}`, { cause: err })
  }
}

async function hasTtx(): Promise<boolean> {
  try {
    await execFileAsync('ttx', ['--version'])
    return true
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw err
  }
}

/** Rewrite the OpenType name table so the subset no longer identifies as
 * Bravura (OFL Reserved Font Name). Family (1), full (4) and typographic
 * family (16) become FAMILY; PostScript (6) becomes POSTSCRIPT; the unique ID
 * (3) swaps the word. Copyright, license and trademark records stay intact —
 * the OFL requires those to travel with the font. Goes through ttx's XML dump
 * because hb-subset can only drop name records, not change them. */
async function renameFont(otf: string, out: string, tmp: string) {
  const ttx = join(tmp, 'name.ttx')
  await run('ttx', ['-q', '-t', 'name', '-o', ttx, otf])
  const replacements: Record<string, string> = {
    1: FAMILY,
    4: FAMILY,
    6: POSTSCRIPT,
    16: FAMILY
  }
  let seen = 0
  const xml = (await readFile(ttx, 'utf8')).replace(
    /(<namerecord nameID="(\d+)"[^>]*>)([\s\S]*?)(<\/namerecord>)/g,
    (_, open: string, id: string, body: string, close: string) => {
      const next = id === '3'
        ? body.replace(/Bravura/g, POSTSCRIPT)
        : replacements[id]
      if (next === undefined) return `${open}${body}${close}`
      seen++
      return `${open}\n      ${next}\n    ${close}`
    }
  )
  if (seen === 0) throw new Error('no name records rewritten; ttx output changed?')
  await writeFile(ttx, xml)
  await run('ttx', ['-q', '-m', otf, '-o', out, ttx])
}

const alphaTabMain = import.meta.resolve('@coderline/alphatab')
const coreSource = await readFile(
  fileURLToPath(new URL('./alphaTab.core.mjs', alphaTabMain)),
  'utf8'
)
const codepoints = alphaTabCodepoints(coreSource)
const unicodes = codepoints.map(c => `U+${c.toString(16).toUpperCase()}`)
  .join(',')

const srcOtf = fileURLToPath(new URL('./font/Bravura.otf', alphaTabMain))
const tmp = await mkdtemp(join(tmpdir(), 'sonotas-music-'))
const subOtf = join(tmp, 'subset.otf')
const finalOtf = join(tmp, 'sonotas-music.otf')

await run('hb-subset', [
  srcOtf,
  `--unicodes=${unicodes}`,
  // hb-subset keeps only name IDs 0-6 by default, which would drop Bravura's
  // license and trademark records; the OFL wants those kept.
  '--name-IDs=*',
  `--output-file=${subOtf}`
])

let renamed = false
if (await hasTtx()) {
  await renameFont(subOtf, finalOtf, tmp)
  renamed = true
} else {
  await copyFile(subOtf, finalOtf)
  console.warn(
    'ttx (fontTools) not found: internal font names left as Bravura.\n'
    + 'Regenerate through Docker for the committed file:\n'
    + '  docker build --target font --output public/fonts .'
  )
}
await run('woff2_compress', [finalOtf]) // writes sonotas-music.woff2 alongside

const outDir = new URL('../../../public/fonts/', import.meta.url)
const outPath = fileURLToPath(new URL(OUT_NAME, outDir))
await mkdir(fileURLToPath(outDir), { recursive: true })
await copyFile(join(tmp, OUT_NAME), outPath)
await rm(tmp, { recursive: true })

const size = (await stat(outPath)).size
console.log(
  `subset ${codepoints.length} glyphs${renamed ? `, renamed to "${FAMILY}"` : ''}`
  + ` -> ${size} bytes -> ${outPath}`
)

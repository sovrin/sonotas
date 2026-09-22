// Build a subset of Bravura holding only the glyphs alphaTab can emit, so each
// SVG chunk decodes a ~37KB font instead of the full ~500KB (font decode is the
// dominant cost when rasterizing many chunks — see the renderer notes).
//
// Bravura is CFF-based; only a full harfbuzz build subsets CFF correctly (the
// wasm ports drop the outlines), so this shells out to hb-subset + woff2_compress.
//   macOS:  brew install harfbuzz woff2
//   Debian: apt-get install harfbuzz-utils woff2
//
// Run: npm run build-font  (from packages/renderer)
import { execFile } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

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
        + `  Debian: apt-get install harfbuzz-utils woff2`,
        { cause: err }
      )
    }
    throw new Error(`${cmd} failed: ${e.stderr ?? e.message}`, { cause: err })
  }
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
const tmp = await mkdtemp(join(tmpdir(), 'bravura-'))
const subOtf = join(tmp, 'Bravura.subset.otf')
const subWoff2 = join(tmp, 'Bravura.subset.woff2')

await run('hb-subset', [
  srcOtf,
  `--unicodes=${unicodes}`,
  `--output-file=${subOtf}`
])
await run('woff2_compress', [subOtf]) // writes subWoff2 alongside

const outPath = fileURLToPath(
  new URL('../../../public/fonts/Bravura.subset.woff2', import.meta.url)
)
await mkdir(fileURLToPath(new URL('../../../public/fonts/', import.meta.url)), {
  recursive: true
})
await copyFile(subWoff2, outPath)
await rm(tmp, { recursive: true })

const size = (await stat(outPath)).size
console.log(
  `subset ${codepoints.length} glyphs -> ${size} bytes -> ${outPath}`
)

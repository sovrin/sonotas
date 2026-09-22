// Test helpers. alphaTab detects its platform at import time; under Node it
// mistakes the runtime for a browser and tries to touch DOM globals during
// init. Replacing `Window` so `globalThis instanceof Window` is false steers its
// detection to the NodeJs (headless) path, which skips all browser/DOM setup.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const SAMPLE = new URL(
  '../../public/tabs/ritardando.gp',
  import.meta.url
)
// The app's demo: four tracks (guitars, bass and a drum kit).
const DEMO = new URL(
  '../../public/tabs/Catastrophic.gp',
  import.meta.url
)

/** Steer alphaTab's platform detection to NodeJs. Call before importing it. */
export function shimHeadless(): void {
  (globalThis as { Window?: unknown }).Window = function () {}
}

/** Bytes of the bundled sample tab, for renderer unit tests. */
export async function loadSample(): Promise<Uint8Array> {
  return new Uint8Array(await readFile(fileURLToPath(SAMPLE)))
}

/** Bytes of the bundled multi-track demo tab; track 1 is percussion. */
export async function loadDemo(): Promise<Uint8Array> {
  return new Uint8Array(await readFile(fileURLToPath(DEMO)))
}

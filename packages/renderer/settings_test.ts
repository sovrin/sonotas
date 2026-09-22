import { test } from 'node:test'
import { assertEquals } from './_assert.ts'
import { shimHeadless } from './_testutil.ts'
import type { Notation } from './settings.ts'

// alphaTab touches DOM globals on import under Deno; steer it headless before the
// (dynamic, so post-shim) imports. Static imports would hoist above the shim.
shimHeadless()
const alphaTab = await import('@coderline/alphatab')
const { createSettings } = await import('./settings.ts')

const scales = [0.5, 1, 2]
const notations: Notation[] = ['auto', 'both', 'notation', 'tab']

test('createSettings keeps the four invariants for every scale×notation', () => {
  for (const scale of scales) {
    for (const notation of notations) {
      const s = createSettings({ scale, notation })
      assertEquals(s.core.engine, 'svg')
      assertEquals(s.core.useWorkers, false)
      assertEquals(s.core.includeNoteBounds, true)
      assertEquals(s.display.layoutMode, alphaTab.LayoutMode.Horizontal)
    }
  }
})

test('createSettings() with no args self-defaults', () => {
  const s = createSettings()
  assertEquals(s.core.engine, 'svg')
  assertEquals(s.core.useWorkers, false)
  assertEquals(s.core.includeNoteBounds, true)
  assertEquals(s.display.layoutMode, alphaTab.LayoutMode.Horizontal)
  assertEquals(s.display.scale, 1.0)
  assertEquals(s.display.staveProfile, alphaTab.StaveProfile.Default)
})

test('createSettings applies the scale and defaults it when omitted', () => {
  assertEquals(createSettings({ scale: 1.5 }).display.scale, 1.5)
  assertEquals(createSettings({ scale: 0.5 }).display.scale, 0.5)
  assertEquals(createSettings().display.scale, 1.0)
})

test('createSettings leaves startBar/barCount at defaults without a crop', () => {
  const s = createSettings()
  assertEquals(s.display.startBar, 1)
  assertEquals(s.display.barCount, -1)
})

test('createSettings maps a crop to 1-based startBar and barCount', () => {
  // bars 2..5 (0-based) → startBar 3 (1-based), 4 bars.
  const s = createSettings({ crop: { fromBar: 2, toBar: 5 } })
  assertEquals(s.display.startBar, 3)
  assertEquals(s.display.barCount, 4)
})

test('createSettings hides the tempo marker only when showTempo is false', () => {
  const off = createSettings({ showTempo: false })
  assertEquals(
    off.notation.elements.get(alphaTab.NotationElement.EffectTempo),
    false
  )
  // Default / explicit-true leave alphaTab's default (shown) untouched.
  assertEquals(
    createSettings().notation.elements.get(
      alphaTab.NotationElement.EffectTempo
    ),
    undefined
  )
})

test('createSettings hides the track name only when showTrackName is false', () => {
  assertEquals(
    createSettings({ showTrackName: false }).notation.elements.get(
      alphaTab.NotationElement.TrackNames
    ),
    false
  )
  assertEquals(
    createSettings().notation.elements.get(
      alphaTab.NotationElement.TrackNames
    ),
    undefined
  )
})

test('createSettings maps layout to alphaTab\'s layout mode, default horizontal', () => {
  assertEquals(createSettings().display.layoutMode, alphaTab.LayoutMode.Horizontal)
  assertEquals(createSettings({ layout: 'line' }).display.layoutMode, alphaTab.LayoutMode.Horizontal)
  assertEquals(createSettings({ layout: 'page' }).display.layoutMode, alphaTab.LayoutMode.Page)
})

test('createSettings turns off alphaTab\'s header lines only in page layout', () => {
  assertEquals(
    createSettings({ layout: 'page' }).notation.elements.get(alphaTab.NotationElement.ScoreTitle),
    false
  )
  assertEquals(
    createSettings({ layout: 'page' }).notation.elements.get(alphaTab.NotationElement.ScoreArtist),
    false
  )
  assertEquals(
    createSettings().notation.elements.get(alphaTab.NotationElement.ScoreTitle),
    undefined
  )
})

test('createSettings sets the chord diagram header only when asked', () => {
  const el = alphaTab.NotationElement.ChordDiagrams
  assertEquals(createSettings({ chordDiagrams: true }).notation.elements.get(el), true)
  assertEquals(createSettings({ chordDiagrams: false }).notation.elements.get(el), false)
  assertEquals(createSettings().notation.elements.get(el), undefined)
})

test('createSettings maps each notation to its StaveProfile', () => {
  assertEquals(
    createSettings({ notation: 'auto' }).display.staveProfile,
    alphaTab.StaveProfile.Default
  )
  assertEquals(
    createSettings({ notation: 'both' }).display.staveProfile,
    alphaTab.StaveProfile.ScoreTab
  )
  assertEquals(
    createSettings({ notation: 'notation' }).display.staveProfile,
    alphaTab.StaveProfile.Score
  )
  assertEquals(
    createSettings({ notation: 'tab' }).display.staveProfile,
    alphaTab.StaveProfile.Tab
  )
})

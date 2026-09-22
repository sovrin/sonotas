import * as alphaTab from '@coderline/alphatab'

/** Stave selection, as a domain enum so alphaTab's `StaveProfile` never leaks to
 * the UI (mirrors how `ScrollMode` crosses the package boundary). */
export type Notation = 'auto' | 'both' | 'notation' | 'tab'

/** Sheet layout: one endless horizontal system, or page-style wrapped systems. */
export type Layout = 'line' | 'page'

const DEFAULT_SCALE = 1.0
const DEFAULT_NOTATION: Notation = 'auto'
const DEFAULT_LAYOUT: Layout = 'line'

// Page-layout header lines alphaTab would engrave above the first system. The
// painter draws its own title/artist overlay instead, and the line layout never
// shows a tuning line, so these stay off to keep both layouts alike.
const HEADER_ELEMENTS = [
  alphaTab.NotationElement.ScoreTitle,
  alphaTab.NotationElement.ScoreSubTitle,
  alphaTab.NotationElement.ScoreArtist,
  alphaTab.NotationElement.ScoreAlbum,
  alphaTab.NotationElement.ScoreWords,
  alphaTab.NotationElement.ScoreMusic,
  alphaTab.NotationElement.ScoreWordsAndMusic,
  alphaTab.NotationElement.ScoreCopyright,
  alphaTab.NotationElement.GuitarTuning
]

/** Render only this 0-based inclusive master-bar range (maps to alphaTab's
 * `startBar`/`barCount`). Omit to render the whole sheet. */
export interface CropRange {
  fromBar: number
  toBar: number
}

export interface SettingsOptions {
  scale?: number // display scale, default 1.0
  notation?: Notation // stave selection, default "auto"
  layout?: Layout // 'line' (horizontal, default) or 'page' (wrapped systems)
  crop?: CropRange // render only these bars, default whole sheet
  showTempo?: boolean // draw the tempo marker, default true
  showTrackName?: boolean // draw the track name in the accolade, default true
  chordDiagrams?: boolean // page-layout chord diagram header; default alphaTab's (on)
  foreground?: string // notation color (#rrggbb); default is alphaTab's dark ink
  barNumberColor?: string // bar-number color (#rrggbb); defaults to `foreground`
}

/** Parse `#rrggbb` into an alphaTab Color. */
function colorFromHex(hex: string): alphaTab.model.Color {
  const h = hex.replace('#', '')
  return new alphaTab.model.Color(
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  )
}

// Exhaustive switch, no `default`: adding a Notation member becomes a type error
// here rather than silently mapping to a fallback. `TabMixed` is intentionally
// unmapped and unexposed.
function staveProfile(n: Notation): alphaTab.StaveProfile {
  switch (n) {
    case 'auto':
      return alphaTab.StaveProfile.Default
    case 'both':
      return alphaTab.StaveProfile.ScoreTab
    case 'notation':
      return alphaTab.StaveProfile.Score
    case 'tab':
      return alphaTab.StaveProfile.Tab
  }
}

export function createSettings(opts: SettingsOptions = {}): alphaTab.Settings {
  // A bad tab is caught and shown in the UI, so alphaTab's own console logging is
  // just noise — silence it (global logger + this settings instance).
  alphaTab.Logger.logLevel = alphaTab.LogLevel.None

  const settings = new alphaTab.Settings()
  settings.core.logLevel = alphaTab.LogLevel.None
  settings.core.engine = 'svg' // full-sheet coords; the html5 engine recycles an atlas
  settings.core.useWorkers = false
  settings.core.includeNoteBounds = true // note bounds feed the cursor
  const layout = opts.layout ?? DEFAULT_LAYOUT
  settings.display.layoutMode = layout === 'page'
    ? alphaTab.LayoutMode.Page
    : alphaTab.LayoutMode.Horizontal
  if (layout === 'page') {
    for (const el of HEADER_ELEMENTS) settings.notation.elements.set(el, false)
  }
  settings.display.scale = opts.scale ?? DEFAULT_SCALE
  settings.display.staveProfile = staveProfile(
    opts.notation ?? DEFAULT_NOTATION
  )
  if (opts.crop) {
    // alphaTab's startBar is 1-based; barCount counts from there (-1 = all).
    settings.display.startBar = opts.crop.fromBar + 1
    settings.display.barCount = opts.crop.toBar - opts.crop.fromBar + 1
  }
  if (opts.showTempo === false) {
    settings.notation.elements.set(alphaTab.NotationElement.EffectTempo, false)
  }
  if (opts.showTrackName === false) {
    settings.notation.elements.set(alphaTab.NotationElement.TrackNames, false)
  }
  if (opts.chordDiagrams !== undefined) {
    settings.notation.elements.set(alphaTab.NotationElement.ChordDiagrams, opts.chordDiagrams)
  }
  if (opts.foreground) {
    // Recolor the engraving so notation reads on a dark canvas — done in alphaTab
    // (baked into the SVG) rather than as a CSS/canvas filter.
    const c = colorFromHex(opts.foreground)
    const res = settings.display.resources
    res.mainGlyphColor = c
    res.secondaryGlyphColor = c
    res.staffLineColor = c
    res.barSeparatorColor = c
    res.barNumberColor = c
    res.scoreInfoColor = c
  }
  // Bar numbers are configurable independently of the notation color.
  if (opts.barNumberColor) {
    settings.display.resources.barNumberColor = colorFromHex(opts.barNumberColor)
  }
  return settings
}

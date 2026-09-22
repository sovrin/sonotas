// Sonotas app store: all renderer UI state, actions and derived values, plus
// the wiring to the real `renderer` package (browser Guitar Pro → video).
// One instance is created by the page (provideSonotas) and shared with every
// child via provide/inject. The renderer is browser-only, so every call into
// it is guarded to the client and the module is imported dynamically.
import { computed, inject, onBeforeUnmount, onMounted, provide, reactive, watch } from 'vue'
import type { InjectionKey } from 'vue'

export type SonotasStore = ReturnType<typeof createSonotas>

const KEY: InjectionKey<SonotasStore> = Symbol('sonotas')

type Dynamic = Record<string, unknown>

// The bundled demo tab, served from public/.
const SAMPLE_URL = '/tabs/Catastrophic.gp'

// UI resolution → short edge (px). The renderer derives the other edge from the
// aspect: 16:9 is wider than tall, 9:16 taller than wide, 1:1 square.
const SHORT_BY_RES: Record<string, number> = { '1080p': 1080, '720p': 720, '480p': 480 }
const NOTATION_BY_STAVES: Record<string, string> = { 'Tab only': 'tab', 'Standard + Tab': 'both', 'Standard only': 'notation' }
const SCROLL_BY_UI: Record<string, string> = { 'Bar snap': 'bar', 'Bar pan': 'pan', 'Continuous': 'smooth' }
const LAYOUT_BY_UI: Record<string, string> = { 'Scrolling line': 'line', 'Page': 'page' }
const QUALITY_BY_UI: Record<string, string> = { Standard: 'medium', High: 'high', Max: 'max' }
// mediabunny's bitrate factor per preset: 0.3·e^(2.5538·level) for levels
// .25/.5/.75/1 (see encode.js qualityToBitrateFactor).
const QUALITY_FACTOR: Record<string, number> = { low: 0.57, medium: 1.07, high: 2.03, max: 3.85 }
// Fraction of the target bitrate near-static notation actually spends. H.264 is
// VBR: bar-snap holds a still image between bars so it undershoots the target
// heavily; continuous scroll moves every frame and lands much closer. Empirical.
const MOTION_BY_SCROLL: Record<string, number> = { bar: 0.06, pan: 0.4, smooth: 0.55 }

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function createSonotas() {
  // ── state ─────────────────────────────────────────────────────────────────
  const s = reactive({
    sourceName: 'Catastrophic (demo)',
    isDemo: true, // false once the user loads their own file
    loadError: '', // surfaced when a picked file can't be parsed
    tracks: [] as { index: number, name: string }[],
    trackIndex: 0,
    aspect: '16:9', // framed output ratio (drives renderer output dims)
    resolution: '1080p',
    notationSize: '100%',
    staves: 'Tab only',
    fps: '30 fps',
    quality: 'High',
    scroll: 'Bar snap',
    layout: 'Scrolling line', // one endless system, or page-style wrapped systems
    speed: '1×',
    highlightBar: true, // played-bar highlight (paint-time)
    currentBarOnly: false, // hide everything but the bar being played (paint-time)
    showTitle: true, // title/artist overlay (paint-time; needs the file to carry one)
    showChords: false, // chord diagrams above chord-named beats (build-time)
    theme: 'dark', // canvas preset selector (Dark/Light) — sets the colors below
    bg: '#121316', // canvas background (paint-time)
    fg: '#e8e9eb', // notation color (build-time)
    barNum: '#e8e9eb', // bar-number color (build-time)
    uiTheme: 'dark', // page theme
    advanced: false, // "More options" disclosure open
    cursorColor: '#8f97ac',
    cursorOpacity: 70,
    cursorWidth: 3,
    cursorHeight: 100,
    cursorOffset: 0, // screen-space px nudged onto the playhead (can be negative)
    cursorMatchBar: false, // cursor height spans the played bar box instead of the frame
    highlightColor: '#e0a94c',
    highlightOpacity: 22,
    highlightPadding: 6,
    recolorNote: false, // recolor the currently-playing note (paint-time)
    activeNoteColor: '#e5484d',
    activeNoteOpacity: 90,
    showTrackName: true,
    showBarNumbers: true,
    showAttribution: true, // alphaTab's "rendered by alphaTab" line (build-time)
    showTempo: true,
    showTimeSig: true,
    fromBar: 1,
    toBar: 4,
    renderOnlyBars: false,
    playing: false,
    time: 0, // seconds
    duration: 8.4, // seconds; replaced by the real render once built
    ready: false,
    building: false,
    engineError: '',
    render: { status: 'idle', pct: 0, phase: '', frame: 0, total: 0 },
    // Real output geometry (set on build) + produced-file size + still frame.
    sheetW: 0,
    sheetH: 0,
    title: '', // song metadata the renderer read from the file ('' if none)
    artist: '',
    hasChords: false, // whether the rendered track defines any chords
    barStarts: [] as number[], // start-ms of each rendered bar (from the renderer)
    outBytes: 0,
    posterUrl: '',
    videoUrl: '' // object URL of the produced MP4; the stage shows it while set
  })

  // ── renderer instance + loop handles (non-reactive) ─────────────────────────
  let engine: Awaited<ReturnType<typeof import('renderer')['createRenderer']>> | null = null
  let bytes: Uint8Array | null = null
  let canvasEl: HTMLCanvasElement | null = null
  let raf: number | null = null
  let lastTs = 0
  let buildToken = 0
  let renderToken = 0
  let rebuildTimer: ReturnType<typeof setTimeout> | null = null
  let blobUrl: string | null = null

  // ── option mapping (UI state → renderer options) ────────────────────────────
  function outWidth() {
    const short = SHORT_BY_RES[s.resolution] ?? 1080
    return s.aspect === '16:9' ? Math.round(short * 16 / 9) : short
  }

  function scaleNum() {
    return (parseFloat(s.notationSize) || 100) / 100
  }

  function notationMode() {
    return NOTATION_BY_STAVES[s.staves] ?? 'tab'
  }

  function scrollMode() {
    return SCROLL_BY_UI[s.scroll] ?? 'bar'
  }

  function layoutMode() {
    return LAYOUT_BY_UI[s.layout] ?? 'line'
  }

  function qualityMode() {
    return QUALITY_BY_UI[s.quality] ?? 'high'
  }

  function cursorCss() {
    return hexToRgba(s.cursorColor, s.cursorOpacity / 100)
  }

  function highlightCss() {
    return hexToRgba(s.highlightColor, s.highlightOpacity / 100)
  }

  function activeNoteCss() {
    return hexToRgba(s.activeNoteColor, s.activeNoteOpacity / 100)
  }

  function buildOpts() {
    return {
      track: s.trackIndex,
      width: outWidth(),
      aspect: s.aspect,
      scale: scaleNum(),
      notation: notationMode(),
      layout: layoutMode(),
      chordDiagrams: s.showChords,
      showTrackName: s.showTrackName,
      showBarNumbers: s.showBarNumbers,
      showAttribution: s.showAttribution,
      showTempo: s.showTempo,
      showTimeSignature: s.showTimeSig,
      foreground: s.fg,
      barNumberColor: s.barNum,
      crop: s.renderOnlyBars ? { fromBar: s.fromBar - 1, toBar: s.toBar - 1 } : undefined
    }
  }

  function paintOpts() {
    return {
      scroll: scrollMode(),
      currentBarOnly: s.currentBarOnly,
      cursor: { color: cursorCss(), width: s.cursorWidth, height: s.cursorHeight / 100, offsetX: s.cursorOffset, heightMode: s.cursorMatchBar ? 'bar' : 'frame' },
      highlight: { enabled: s.highlightBar, color: highlightCss(), padding: s.highlightPadding },
      activeNote: { enabled: s.recolorNote, color: activeNoteCss() },
      background: { color: s.bg },
      title: { enabled: s.showTitle, color: s.fg }
    }
  }

  // ── renderer lifecycle (client only) ────────────────────────────────────────
  async function loadBytes(): Promise<Uint8Array> {
    const res = await fetch(SAMPLE_URL)
    if (!res.ok) throw new Error(`sample ${SAMPLE_URL}: ${res.status}`)
    return new Uint8Array(await res.arrayBuffer())
  }

  function paintFrame() {
    if (!import.meta.client || !engine || !canvasEl) return
    engine.frame(canvasEl, s.time * 1000, paintOpts() as never)
  }

  // A real still of the current frame, used as the finished video's poster.
  function makePoster() {
    if (!import.meta.client || !engine) return
    const c = document.createElement('canvas')
    engine.frame(c, s.time * 1000, paintOpts() as never)
    s.posterUrl = c.toDataURL('image/png')
  }

  // Estimated output size (bytes) using mediabunny's own target-bitrate model
  // on the real sheet dimensions. It's a ceiling — VBR undershoots on the mostly
  // static notation, so the real file is usually well below this.
  function estBytes() {
    if (!s.sheetW || !s.sheetH) return 0
    const factor = QUALITY_FACTOR[qualityMode()] ?? 1
    const motion = MOTION_BY_SCROLL[scrollMode()] ?? 0.2
    const pixels = s.sheetW * s.sheetH
    const target = factor * 3_000_000 * Math.pow(pixels / (1920 * 1080), 0.95) // avc target bitrate
    return (target / 8) * effDur() * motion
  }

  function fmtSize(bytes: number) {
    return bytes < 1e6 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : (bytes / 1e6).toFixed(1) + ' MB'
  }

  // Current bar / total, from the renderer's real per-bar onsets (ms, rebased).
  function barLabel() {
    const total = s.barStarts.length
    if (!total) return 'Bar 1 / 1'
    const ms = s.time * 1000
    let i = 0
    while (i + 1 < total && s.barStarts[i + 1]! <= ms) i++
    return `Bar ${i + 1} / ${total}`
  }

  async function rebuild() {
    if (!import.meta.client) return
    const token = ++buildToken
    s.building = true
    s.engineError = ''
    try {
      const mod = await import('renderer')
      if (!bytes) {
        bytes = await loadBytes()
        s.tracks = mod.listTracks(bytes)
        if (s.trackIndex >= s.tracks.length) s.trackIndex = 0
      }
      const inst = await mod.createRenderer(bytes, buildOpts() as never)
      if (token !== buildToken) return // superseded by a newer rebuild
      engine = inst
      s.duration = inst.durationMs / 1000
      s.sheetW = inst.width
      s.sheetH = inst.height
      s.title = inst.title
      s.artist = inst.artist
      s.hasChords = inst.hasChords
      s.barStarts = [...inst.bars]
      if (s.time > s.duration) s.time = s.duration
      s.ready = true
      paintFrame()
    } catch (err) {
      if (token === buildToken) s.engineError = (err as Error).message
    } finally {
      if (token === buildToken) s.building = false
    }
  }

  function scheduleRebuild() {
    if (!import.meta.client) return
    if (rebuildTimer) clearTimeout(rebuildTimer)
    rebuildTimer = setTimeout(rebuild, 150)
  }

  // Load a user-picked Guitar Pro / MusicXML file, replacing the demo. Parses
  // tracks up front so a bad file surfaces an error without wiping the current
  // sheet; only swaps in the new bytes once listTracks succeeds.
  async function loadFile(file: File) {
    if (!import.meta.client || !file) return
    s.loadError = ''
    try {
      const buf = new Uint8Array(await file.arrayBuffer())
      const mod = await import('renderer')
      const tracks = mod.listTracks(buf) // throws on an unparseable file
      bytes = buf
      s.tracks = tracks
      s.trackIndex = 0
      s.time = 0
      s.playing = false
      s.sourceName = file.name
      s.isDemo = false
      if (s.render.status === 'done') closeRender()
      await rebuild()
    } catch (err) {
      s.loadError = (err as Error).message || 'Could not read that file.'
    }
  }

  function registerCanvas(el: HTMLCanvasElement) {
    canvasEl = el
    paintFrame()
  }

  // ── playback (rAF loop) ─────────────────────────────────────────────────────
  function speedNum() {
    return parseFloat(s.speed) || 1
  }

  function stopLoop() {
    if (raf !== null) {
      cancelAnimationFrame(raf)
      raf = null
    }
  }

  function tick(ts: number) {
    const dt = (ts - lastTs) / 1000
    lastTs = ts
    const t = s.time + dt * speedNum()
    if (t >= s.duration) {
      s.time = s.duration
      s.playing = false
      stopLoop()
      paintFrame()
      return
    }
    s.time = t
    paintFrame()
    raf = requestAnimationFrame(tick)
  }

  function togglePlay() {
    if (s.playing) {
      stopLoop()
      s.playing = false
      return
    }
    if (s.time >= s.duration) s.time = 0
    s.playing = true
    lastTs = performance.now()
    raf = requestAnimationFrame(tick)
  }

  function seek(e: Event) {
    stopLoop()
    s.playing = false
    s.time = parseFloat((e.target as HTMLInputElement).value)
    paintFrame()
  }

  // ── form handlers ───────────────────────────────────────────────────────────
  function setField(e: Event) {
    const el = e.target as HTMLInputElement | HTMLSelectElement
    ;(s as Dynamic)[el.name] = el.value
  }

  function setNum(e: Event) {
    const el = e.target as HTMLInputElement
    const n = parseFloat(el.value)
    if (!isNaN(n)) (s as Dynamic)[el.name] = n
  }

  function setTrack(e: Event) {
    s.trackIndex = Number((e.target as HTMLSelectElement).value)
  }

  function toggle(k: string) {
    (s as Dynamic)[k] = !(s as Dynamic)[k]
  }

  function toggleTheme() {
    s.uiTheme = s.uiTheme === 'dark' ? 'light' : 'dark'
  }

  function toggleAdvanced() {
    s.advanced = !s.advanced
  }

  function setAspect(a: string) {
    s.aspect = a
  }

  function setLayout(l: string) {
    s.layout = l
  }

  function setCanvasTheme(t: string) {
    s.theme = t
    // Presets set all three colors; the Advanced pickers can override afterward.
    if (t === 'dark') {
      s.bg = '#121316'
      s.fg = '#e8e9eb'
      s.barNum = '#e8e9eb'
    } else {
      s.bg = '#f7f7f4'
      s.fg = '#1c1c24'
      s.barNum = '#1c1c24'
    }
  }

  function setCursorColor(c: string) {
    s.cursorColor = c
  }

  function setHighlightColor(c: string) {
    s.highlightColor = c
  }

  function setActiveNoteColor(c: string) {
    s.activeNoteColor = c
  }

  // ── encode (real MP4) ───────────────────────────────────────────────────────
  function phaseFor(pct: number) {
    return pct < 8 ? 'Preparing score…' : pct < 82 ? 'Rendering frames…' : pct < 97 ? 'Encoding MP4…' : 'Finalizing…'
  }

  async function startRender() {
    if (!import.meta.client || !engine) return
    stopLoop()
    s.playing = false
    const token = ++renderToken
    s.render = { status: 'rendering', pct: 0, phase: 'Preparing score…', frame: 0, total: 0 }
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      blobUrl = null
    }
    s.videoUrl = ''
    try {
      const out = await engine.encode({
        fps: parseInt(s.fps, 10) || 30,
        speed: speedNum(),
        quality: qualityMode() as never,
        startMs: 0,
        endMs: s.duration * 1000,
        ...paintOpts(),
        onProgress: (frame: number, total: number) => {
          if (token !== renderToken) return
          const pct = total ? (frame / total) * 100 : 0
          s.render = { status: 'rendering', pct, phase: phaseFor(pct), frame, total }
        }
      } as never)
      if (token !== renderToken) return // cancelled
      blobUrl = URL.createObjectURL(out)
      s.videoUrl = blobUrl
      s.outBytes = out.size
      makePoster()
      s.render = { ...s.render, status: 'done', pct: 100 }
    } catch (err) {
      if (token === renderToken) {
        s.engineError = (err as Error).message
        s.render = { status: 'idle', pct: 0, phase: '', frame: 0, total: 0 }
      }
    }
  }

  function cancelRender() {
    renderToken++ // invalidate any in-flight encode result
    s.render = { status: 'idle', pct: 0, phase: '', frame: 0, total: 0 }
  }

  function closeRender() {
    renderToken++
    s.render = { status: 'idle', pct: 0, phase: '', frame: 0, total: 0 }
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      blobUrl = null
    }
    s.videoUrl = ''
    s.posterUrl = ''
  }

  // e.g. "catastrophic-16x9-1080p.mp4": the loaded file's name (sans
  // extension, demo tag and accents), the frame and the resolution.
  function outName() {
    const base = s.sourceName.replace(/\(demo\)/i, '').trim().replace(/\.\w+$/, '')
    const slug = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'sonotas'
    return `${slug}-${s.aspect.replace(':', 'x')}-${s.resolution}.mp4`
  }

  function download() {
    if (!import.meta.client || !blobUrl) return
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = outName()
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────
  onMounted(rebuild)

  // A finished export belongs to the settings it was made with; changing any
  // of them drops it and shows the live preview again.
  function invalidateResult() {
    if (s.render.status === 'done') closeRender()
  }

  // Rebuild the sheet when a build-time option changes (debounced).
  watch(
    () => [s.trackIndex, s.aspect, s.fg, s.barNum, s.notationSize, s.staves, s.layout, s.showChords, s.showTrackName, s.showBarNumbers, s.showAttribution, s.showTempo, s.showTimeSig, s.fromBar, s.toBar, s.renderOnlyBars, s.resolution].join('|'),
    () => {
      invalidateResult()
      scheduleRebuild()
    }
  )
  // Repaint the current frame when a paint-time option changes (not during play).
  watch(
    () => [s.bg, s.cursorColor, s.cursorOpacity, s.cursorWidth, s.cursorHeight, s.cursorOffset, s.cursorMatchBar, s.scroll, s.currentBarOnly, s.showTitle, s.highlightBar, s.highlightColor, s.highlightOpacity, s.highlightPadding, s.recolorNote, s.activeNoteColor, s.activeNoteOpacity].join('|'),
    () => {
      invalidateResult()
      if (!s.playing) paintFrame()
    }
  )
  // Encode-only options don't touch the preview but do change the file.
  watch(() => [s.fps, s.quality, s.speed].join('|'), invalidateResult)

  onBeforeUnmount(() => {
    stopLoop()
    if (rebuildTimer) clearTimeout(rebuildTimer)
    if (blobUrl) URL.revokeObjectURL(blobUrl)
    renderToken++
    buildToken++
  })

  // ── helpers used by the derived values ──────────────────────────────────────
  function fpsNum() {
    return parseInt(s.fps, 10) || 30
  }

  function effDur() {
    return s.duration / speedNum()
  }

  function fmt(t: number) {
    const m = Math.floor(t / 60)
    const sec = Math.floor(t % 60)
    return m + ':' + String(sec).padStart(2, '0')
  }

  // ── derived values (styles + labels consumed by components) ─────────────────
  const v = computed(() => {
    const ratio = s.aspect === '16:9' ? 16 / 9 : s.aspect === '9:16' ? 9 / 16 : 1
    const eff = effDur()
    const resPxMap: Record<string, string> = {
      '1080p': ratio > 1 ? '1920×1080' : ratio === 1 ? '1080×1080' : '1080×1920',
      '720p': ratio > 1 ? '1280×720' : ratio === 1 ? '720×720' : '720×1280',
      '480p': ratio > 1 ? '854×480' : ratio === 1 ? '480×480' : '480×854'
    }
    const r = s.render
    const done = r.status === 'done'
    // Real output geometry once built; the target-bitrate estimate before a
    // render, the produced file's real size once done.
    const resPx = s.sheetW ? `${s.sheetW}×${s.sheetH}` : resPxMap[s.resolution]
    const estSize = fmtSize(estBytes())
    const sizeLabel = done && s.outBytes ? fmtSize(s.outBytes) : estSize

    return {
      isPage: s.layout === 'Page',
      timeLabel: fmt(s.time),
      durLabel: fmt(s.duration),
      barLabel: barLabel(),
      scrubPct: s.duration ? (s.time / s.duration) * 100 : 0,
      // "1920×1080 · 30 fps · 0:08 · ~1.2 MB"
      estLine: resPx + ' · ' + fpsNum() + ' fps · ' + fmt(eff) + ' · ~' + estSize,
      resPx,
      sizeLabel,
      outName: outName(),
      isRendering: r.status === 'rendering',
      isDone: r.status === 'done',
      phase: r.phase,
      pct: Math.round(r.pct),
      frame: r.frame,
      totalFrames: r.total
    }
  })

  return {
    s,
    v,
    registerCanvas,
    setField,
    setNum,
    setTrack,
    toggle,
    toggleTheme,
    toggleAdvanced,
    setAspect,
    setLayout,
    setCanvasTheme,
    setCursorColor,
    setHighlightColor,
    setActiveNoteColor,
    togglePlay,
    seek,
    startRender,
    cancelRender,
    closeRender,
    download,
    loadFile
  }
}

/** Create the store and provide it to descendants. Call once, in the page. */
export function provideSonotas(): SonotasStore {
  const store = createSonotas()
  provide(KEY, store)
  return store
}

/** Read the shared store from any descendant of the provider. */
export function useSonotas(): SonotasStore {
  const store = inject(KEY)
  if (!store) throw new Error('useSonotas() requires a provideSonotas() ancestor')
  return store
}

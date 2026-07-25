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
const SAMPLE_URL = '/tabs/test.gp'

// UI resolution → short edge (px). The renderer derives the other edge from the
// aspect: 16:9 is wider than tall, 9:16 taller than wide, 1:1 square.
const SHORT_BY_RES: Record<string, number> = { '1080p': 1080, '720p': 720, '480p': 480 }
const NOTATION_BY_STAVES: Record<string, string> = { 'Tab only': 'tab', 'Standard + Tab': 'both', 'Standard only': 'notation' }
const SCROLL_BY_UI: Record<string, string> = { 'Bar snap': 'bar', 'Continuous': 'smooth', 'Off': 'bar' }
const QUALITY_BY_UI: Record<string, string> = { Standard: 'medium', High: 'high', Max: 'high' }
// mediabunny's Quality factor per preset (see encode.js Quality._toVideoBitrate).
const QUALITY_FACTOR: Record<string, number> = { low: 0.6, medium: 1, high: 2 }
// Fraction of the target bitrate near-static notation actually spends. H.264 is
// VBR: bar-snap holds a still image between bars so it undershoots the target
// heavily; continuous scroll moves every frame and lands much closer. Empirical.
const MOTION_BY_SCROLL: Record<string, number> = { bar: 0.06, smooth: 0.55, pan: 0.4 }

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
    mode: 'simple',
    sourceName: 'Ritardando (demo)',
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
    layout: 'Page', // cosmetic
    speed: '1×',
    highlightNotes: true,
    showTitle: true, // cosmetic
    showChords: false, // cosmetic
    theme: 'dark', // canvas preset selector (Dark/Light) — sets the colors below
    bg: '#121316', // canvas background (paint-time)
    fg: '#e8e9eb', // notation color (build-time)
    barNum: '#e8e9eb', // bar-number color (build-time)
    uiTheme: 'dark', // page theme
    page: 'app',
    cursorColor: '#8f97ac',
    cursorOpacity: 70,
    cursorWidth: 3,
    cursorHeight: 100,
    cursorOffset: 0, // screen-space px nudged onto the playhead (can be negative)
    cursorMatchBar: false, // cursor height spans the played bar box instead of the frame
    highlightColor: '#e0a94c', // played-bar highlight (paint-time)
    highlightOpacity: 22,
    highlightPadding: 6,
    recolorNote: false, // recolor the currently-playing note (paint-time)
    activeNoteColor: '#e5484d',
    activeNoteOpacity: 90,
    showTrackName: true,
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
    barStarts: [] as number[], // start-ms of each rendered bar (from the renderer)
    outBytes: 0,
    posterUrl: '',
    videoUrl: '' // object URL of the produced MP4, for the done-modal player
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
  let blob: Blob | null = null
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
      showTrackName: s.showTrackName,
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
      cursor: { color: cursorCss(), width: s.cursorWidth, height: s.cursorHeight / 100, offsetX: s.cursorOffset, heightMode: s.cursorMatchBar ? 'bar' : 'frame' },
      highlight: { enabled: s.highlightNotes, color: highlightCss(), padding: s.highlightPadding },
      activeNote: { enabled: s.recolorNote, color: activeNoteCss() },
      background: { color: s.bg }
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

  // A real still of the current frame, for the "done" modal preview.
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
    return (target / 8) * s.duration * motion
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

  function setMode(m: string) {
    s.mode = m
  }

  function setAspect(a: string) {
    s.aspect = a
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

  function setPage(p: string) {
    s.page = p
    try {
      window.scrollTo(0, 0)
    } catch { /* ssr */
    }
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
    blob = null
    try {
      const out = await engine.encode({
        fps: parseInt(s.fps, 10) || 30,
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
      blob = out
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
  }

  function download() {
    if (!import.meta.client) return
    const url = blobUrl ?? URL.createObjectURL(blob ?? new Blob(['sonotas'], { type: 'video/mp4' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'sonotas-' + s.aspect.replace(':', 'x') + '-' + s.resolution + '.mp4'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────
  onMounted(rebuild)

  // Rebuild the sheet when a build-time option changes (debounced).
  watch(
    () => [s.trackIndex, s.aspect, s.fg, s.barNum, s.notationSize, s.staves, s.showTrackName, s.showTempo, s.showTimeSig, s.fromBar, s.toBar, s.renderOnlyBars, s.resolution].join('|'),
    scheduleRebuild
  )
  // Repaint the current frame when a paint-time option changes (not during play).
  watch(
    () => [s.bg, s.cursorColor, s.cursorOpacity, s.cursorWidth, s.cursorHeight, s.cursorOffset, s.cursorMatchBar, s.scroll, s.highlightNotes, s.highlightColor, s.highlightOpacity, s.highlightPadding, s.recolorNote, s.activeNoteColor, s.activeNoteOpacity].join('|'),
    () => {
      if (!s.playing) paintFrame()
    }
  )

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

  function sld(val: number, min: number, max: number, color: string) {
    const p = ((val - min) / (max - min)) * 100
    return 'linear-gradient(90deg,' + color + ' ' + p + '%,var(--track-empty) ' + p + '%)'
  }

  function chip(active: boolean) {
    return 'border:none;background:' + (active ? 'var(--tint6)' : 'transparent') + ';color:' + (active ? 'var(--inset)' : 'var(--t2)') + ';font-family:inherit;font-weight:600;font-size:12.5px;padding:6px 12px;border-radius:6px;cursor:pointer;transition:background .15s'
  }

  function tab(active: boolean) {
    return 'flex:1;display:flex;align-items:center;justify-content:center;gap:7px;border:none;background:' + (active ? 'var(--surface)' : 'transparent') + ';color:' + (active ? 'var(--text)' : 'var(--t4)') + ';box-shadow:' + (active ? 'inset 0 0 0 1px var(--tint5)' : 'none') + ';font-family:inherit;font-weight:500;font-size:13px;padding:8px;border-radius:7px;cursor:pointer;transition:all .15s'
  }

  function sw(hex: string, active: boolean) {
    return 'width:34px;height:34px;border-radius:8px;background:' + hex + ';cursor:pointer;border:2px solid ' + (active ? 'var(--text)' : 'transparent') + ';box-shadow:0 0 0 1px rgba(0,0,0,.4)' + (active ? ',0 0 12px ' + hex : '') + ';transition:border .12s'
  }

  function box(on: boolean) {
    return 'width:19px;height:19px;flex:none;border-radius:5px;display:flex;align-items:center;justify-content:center;background:' + (on ? 'var(--accent)' : 'transparent') + ';border:1.5px solid ' + (on ? 'var(--accent)' : 'var(--t5)') + ';transition:all .12s'
  }

  function nav(active: boolean) {
    return 'background:none;border:none;font-family:inherit;font-size:13.5px;cursor:pointer;padding:0;color:' + (active ? 'var(--text)' : 'inherit') + ';font-weight:' + (active ? 600 : 400)
  }

  // ── derived values (styles + labels consumed by components) ─────────────────
  const v = computed(() => {
    const dark = s.theme === 'dark'
    const frameBg = dark ? '#121316' : '#f7f7f4'
    const frameFg = dark ? '#e8e9eb' : '#1c1c24'
    const ratio = s.aspect === '16:9' ? 16 / 9 : s.aspect === '9:16' ? 9 / 16 : 1
    const eff = effDur()
    const resPxMap: Record<string, string> = {
      '1080p': ratio >= 1 ? '1920×1080' : ratio === 1 ? '1080×1080' : '1080×1920',
      '720p': ratio >= 1 ? '1280×720' : ratio === 1 ? '720×720' : '720×1280',
      '480p': ratio >= 1 ? '854×480' : ratio === 1 ? '480×480' : '480×854'
    }
    const r = s.render
    const done = r.status === 'done'
    // Real output geometry once built; the target-bitrate estimate before a
    // render, the produced file's real size once done.
    const resPx = s.sheetW ? `${s.sheetW}×${s.sheetH}` : resPxMap[s.resolution]
    const estSize = fmtSize(estBytes())
    const sizeLabel = done && s.outBytes ? fmtSize(s.outBytes) : estSize

    return {
      frameBg,
      frameFg,
      posterH: s.aspect === '16:9' ? '283px' : s.aspect === '1:1' ? '360px' : '400px',
      is169: s.aspect === '16:9',
      is916: s.aspect === '9:16',
      is11: s.aspect === '1:1',
      isDarkCanvas: dark,
      isLightCanvas: !dark,
      tabViewBox: ratio <= 1 ? '0 0 1000 520' : '0 0 1000 260',
      vertSysVis: ratio <= 1 ? 1 : 0,
      posterRatio: ratio.toString(),
      timeLabel: fmt(s.time),
      durLabel: fmt(s.duration),
      barLabel: barLabel(),
      scrubBg: sld(s.time, 0, s.duration, 'var(--accent)'),
      navHow: nav(s.page === 'how'),
      navFormats: nav(s.page === 'formats'),
      navFaq: nav(s.page === 'faq'),
      curHow: s.page === 'how' ? 'page' : 'false',
      curFormats: s.page === 'formats' ? 'page' : 'false',
      curFaq: s.page === 'faq' ? 'page' : 'false',
      tabSimple: tab(s.mode === 'simple'),
      tabAdvanced: tab(s.mode === 'advanced'),
      chip169: chip(s.aspect === '16:9'),
      chip916: chip(s.aspect === '9:16'),
      chip11: chip(s.aspect === '1:1'),
      chipDark: chip(s.theme === 'dark'),
      chipLight: chip(s.theme === 'light'),
      swAccent: sw('#8f97ac', s.cursorColor === '#8f97ac'),
      swRed: sw('#e5484d', s.cursorColor === '#e5484d'),
      swWhite: sw('#e9eaec', s.cursorColor === '#e9eaec'),
      swAmber: sw('#e0a94c', s.cursorColor === '#e0a94c'),
      sldOpacity: sld(s.cursorOpacity, 10, 100, 'var(--accent)'),
      sldWidth: sld(s.cursorWidth, 1, 10, 'var(--accent)'),
      sldHeight: sld(s.cursorHeight, 40, 100, 'var(--accent)'),
      sldOffset: sld(s.cursorOffset, -100, 100, 'var(--accent)'),
      swHlAmber: sw('#e0a94c', s.highlightColor === '#e0a94c'),
      swHlAccent: sw('#8f97ac', s.highlightColor === '#8f97ac'),
      swHlGreen: sw('#46a758', s.highlightColor === '#46a758'),
      swHlBlue: sw('#5b8def', s.highlightColor === '#5b8def'),
      sldHlOpacity: sld(s.highlightOpacity, 5, 60, 'var(--accent)'),
      sldHlPadding: sld(s.highlightPadding, 0, 20, 'var(--accent)'),
      swAnRed: sw('#e5484d', s.activeNoteColor === '#e5484d'),
      swAnAmber: sw('#e0a94c', s.activeNoteColor === '#e0a94c'),
      swAnGreen: sw('#46a758', s.activeNoteColor === '#46a758'),
      swAnBlue: sw('#5b8def', s.activeNoteColor === '#5b8def'),
      sldAnOpacity: sld(s.activeNoteOpacity, 30, 100, 'var(--accent)'),
      boxTrackName: box(s.showTrackName),
      boxTempo: box(s.showTempo),
      boxTimeSig: box(s.showTimeSig),
      boxOnlyBars: box(s.renderOnlyBars),
      boxHighlight: box(s.highlightNotes),
      boxRecolor: box(s.recolorNote),
      boxMatchBar: box(s.cursorMatchBar),
      boxTitle: box(s.showTitle),
      boxChords: box(s.showChords),
      estLine: s.resolution + ' · ' + fpsNum() + 'fps · ' + fmt(eff) + ' · ≈' + estSize,
      resPx,
      sizeLabel,
      renderOpen: r.status !== 'idle',
      isRendering: r.status === 'rendering',
      isDone: r.status === 'done',
      phase: r.phase,
      pctLabel: Math.round(r.pct) + '%',
      pctW: Math.round(r.pct) + '%',
      frame: r.frame,
      totalFrames: r.total
    }
  })

  // ── static content ──────────────────────────────────────────────────────────
  const howSteps = [
    { n: 1, title: 'Load your tab', body: 'Drop a Guitar Pro or MusicXML file, or start from the built-in sample. Nothing is uploaded.' },
    { n: 2, title: 'Frame & tune', body: 'Pick an aspect ratio and canvas theme, style the playhead, and trim to just the bars you need.' },
    { n: 3, title: 'Render', body: 'Export your slice to MP4 straight from the browser — no server, no queue, no waiting room.' },
    { n: 4, title: 'Post', body: 'Download and drop it into YouTube, Shorts, Reels or TikTok. Done — the aspect ratio already fits.' }
  ]
  const faq = [
    { q: 'Does my file get uploaded?', a: 'No. sonotas runs entirely in your browser — your tab never leaves your device.' },
    { q: 'Which files can I use?', a: 'Guitar Pro (.gp, .gpx, .gp3–.gp5) and MusicXML (.xml, .musicxml, .mxl).' },
    { q: 'Is there a length limit?', a: 'Only your device\'s memory. Short excerpts render fastest — use the bar range to trim before exporting.' },
    { q: 'Can I choose which instrument to show?', a: 'Yes. Multi-track files let you pick the track to render from the Track menu.' },
    { q: 'Any watermark or cost?', a: 'None. No watermark, no account, no cost.' }
  ]

  return {
    s,
    v,
    howSteps,
    faq,
    registerCanvas,
    setField,
    setNum,
    setTrack,
    toggle,
    toggleTheme,
    setMode,
    setAspect,
    setCanvasTheme,
    setCursorColor,
    setHighlightColor,
    setActiveNoteColor,
    setPage,
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

// Sonotas app store: all renderer UI state, actions and derived values, plus
// the wiring to the real `renderer` package (browser Guitar Pro → video).
// One instance is created by the page (provideSonotas) and shared with every
// child via provide/inject. The renderer is browser-only, so every call into
// it is guarded to the client and the module is imported dynamically.
import { computed, inject, onBeforeUnmount, onMounted, provide, reactive, watch } from 'vue'
import type { InjectionKey } from 'vue'
import { APP_DEFAULTS, THEMES, decodeSettings, encodeSettings, type Settings } from '~/utils/settings-code'
import { fileFormat, lengthBucket, loadTracker, tookBucket, track } from '~/utils/track'

export type SonotasStore = ReturnType<typeof createSonotas>

const KEY: InjectionKey<SonotasStore> = Symbol('sonotas')

type Dynamic = Record<string, unknown>

// The bundled demo tab, served from public/.
// Ink per canvas theme: the playhead's "Ink" preset follows it.
export const INK = { dark: '#e9eaec', light: '#13161c' }

const SAMPLE_URL = '/tabs/Catastrophic.gp'

// UI resolution → short edge (px). The renderer derives the other edge from the
// aspect: 16:9 is wider than tall, 9:16 taller than wide, 1:1 square.
const SHORT_BY_RES: Record<string, number> = { '1080p': 1080, '720p': 720, '480p': 480 }
const NOTATION_BY_STAVES: Record<string, string> = { 'Tab only': 'tab', 'Standard + Tab': 'both', 'Standard only': 'notation' }
const LAYOUT_BY_UI: Record<string, string> = { 'Scrolling line': 'line', 'Page': 'page' }
const QUALITY_BY_UI: Record<string, string> = { Standard: 'medium', High: 'high', Max: 'max' }
// Notation mode → the staves value censitas counts.
const STAVES_FOR_COUNT: Record<string, string> = { tab: 'tab', both: 'standard-tab', notation: 'standard' }
// Quiet time after the last settings change before the size probe runs.
const ESTIMATE_DELAY_MS = 400

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
    // The video's settings: the app's defaults, until a link's ?s= or the UI
    // changes them. New ones go in APP_DEFAULTS and FIELDS (app/utils/settings-code.ts),
    // never straight in here, or links drop them. See AGENTS.md.
    ...APP_DEFAULTS,
    settingsNotice: '', // why a link's settings didn't (all) apply ('' if they did)
    linkCopied: false, // the settings link was just copied
    undoReset: null as Settings | null, // what a reset just replaced, offered back for a moment
    sourceName: 'Catastrophic (demo)',
    isDemo: true, // false once the user loads their own file
    loadError: '', // surfaced when a picked file can't be parsed
    tracks: [] as { index: number, name: string }[],
    trackIndex: 0,
    uiTheme: 'dark', // page theme
    fromBar: 1,
    toBar: 4,
    renderOnlyBars: false,
    playing: false,
    soundLoading: false, // a play is waiting for its soundtrack to render
    time: 0, // seconds
    duration: 8.4, // seconds; replaced by the real render once built
    ready: false,
    building: false,
    engineError: '',
    exportError: '', // why the last export failed ('' if it didn't)
    canExport: true, // false where the browser has no WebCodecs encoder
    downloaded: false, // whether the finished video has been saved yet
    render: { status: 'idle', pct: 0, phase: '', frame: 0, total: 0 },
    // Real output geometry (set on build) + produced-file size + still frame.
    sheetW: 0,
    sheetH: 0,
    title: '', // song metadata the renderer read from the file ('' if none)
    artist: '',
    hasChords: false, // whether the rendered track defines any chords
    barStarts: [] as number[], // start-ms of each rendered bar (from the renderer)
    // The whole song's bars, kept from the last uncropped build so the timeline
    // can show every bar while only a range is rendered.
    songBars: [] as number[],
    songMs: 0,
    // Bars as played, repeats included ({ bar, startMs }): the rendered clip's,
    // and the whole song's from the last uncropped build. The strip draws these.
    plays: [] as { bar: number, startMs: number }[],
    songPlays: [] as { bar: number, startMs: number }[],
    stripZoom: 1, // timeline strip zoom: 1 fits the whole song
    outBytes: 0,
    estBytes: 0, // probed size of the export for the current settings (0 = not yet known)
    posterUrl: '',
    videoUrl: '' // object URL of the produced MP4; the stage shows it while set
  })

  // ── renderer instance + loop handles (non-reactive) ─────────────────────────
  let engine: Awaited<ReturnType<typeof import('renderer')['createRenderer']>> | null = null
  let bytes: Uint8Array | null = null
  let canvasEl: HTMLCanvasElement | null = null
  let raf: number | null = null
  let lastTs = 0
  let playToken = 0 // bumped on every stop, so a play still awaiting its soundtrack gives up
  let audioCtx: AudioContext | null = null
  let soundBuf: { engine: unknown, key: string, buf: AudioBuffer } | null = null // engine: the sheet it was made for
  // The soundtrack while it plays: the audio clock and song time (s) it started at.
  let voice: { node: AudioBufferSourceNode, at: number, from: number, speed: number } | null = null
  let ringing: AudioBufferSourceNode | null = null // a finished run's soundtrack, still ringing out
  let buildToken = 0
  let rendering: AbortController | null = null // the in-flight export
  let rebuildTimer: ReturnType<typeof setTimeout> | null = null
  let estimating: AbortController | null = null // the in-flight size probe
  let estTimer: ReturnType<typeof setTimeout> | null = null
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

  function layoutMode() {
    return LAYOUT_BY_UI[s.layout] ?? 'line'
  }

  // Bars fit across the frame (0 = off). Line layout only; showing just the
  // current bar always fits at least that one.
  function fitBarsNum() {
    if (layoutMode() !== 'line') return 0
    const n = parseInt(s.fitBars, 10) || 0
    return s.currentBarOnly ? Math.max(1, n) : n
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
      fitBars: fitBarsNum(),
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
      follow: {
        playhead: s.playhead,
        view: s.view,
        transitionMs: s.transition,
        anchor: s.followAt / 100,
        early: s.turnEarly,
        overscroll: s.runPast,
        steady: s.steady
      },
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

  // Export size estimate: the renderer really encodes a few 2s slices of the
  // clip with the export's exact settings and scales up. The size depends on
  // the content (the encoder runs at a constant quantizer, not a bitrate), so
  // no formula gets close. The probe costs a few hundred frames of main-thread
  // work, so it waits for the settings to settle and never runs while the
  // preview plays or an export renders; it aborts as soon as anything changes.
  function encodeOpts() {
    return {
      fps: fpsNum(),
      speed: speedNum(),
      quality: qualityMode(),
      fast: s.fastExport,
      audio: s.sound,
      sound: soundOpts(),
      startMs: 0,
      endMs: s.duration * 1000,
      ...paintOpts()
    }
  }

  function abortEstimate() {
    estimating?.abort()
    estimating = null
    if (estTimer) clearTimeout(estTimer)
    estTimer = null
  }

  function scheduleEstimate() {
    abortEstimate()
    if (!import.meta.client || !engine || s.estBytes || s.building || s.playing || s.render.status !== 'idle') return
    estTimer = setTimeout(runEstimate, ESTIMATE_DELAY_MS)
  }

  async function runEstimate() {
    if (!engine) return
    const ctl = (estimating = new AbortController())
    try {
      const n = await engine.estimateSize({ ...encodeOpts(), signal: ctl.signal } as never)
      if (n !== null && !ctl.signal.aborted) s.estBytes = n
    } catch {
      // No estimate is better than a broken export panel; the export itself
      // surfaces encoder errors.
    }
  }

  // Settings changed: the current estimate no longer applies.
  function invalidateEstimate() {
    s.estBytes = 0
    scheduleEstimate()
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
    abortEstimate()
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
      s.plays = [...inst.plays]
      if (!s.renderOnlyBars) {
        s.songBars = [...inst.bars]
        s.songPlays = [...inst.plays]
        s.songMs = inst.durationMs
      }
      if (s.time > s.duration) s.time = s.duration
      s.ready = true
      paintFrame()
      s.estBytes = 0 // new sheet → new estimate (scheduled once building clears)
    } catch (err) {
      if (token === buildToken) s.engineError = (err as Error).message
    } finally {
      if (token === buildToken) {
        s.building = false
        scheduleEstimate()
      }
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
    if (!import.meta.client || !file || s.render.status === 'rendering') return
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
      // A bar range belongs to the old file's bars.
      s.renderOnlyBars = false
      s.songBars = []
      s.songPlays = []
      s.stripZoom = 1
      if (s.render.status === 'done') closeRender()
      track('file-open', { format: fileFormat(file.name) })
      await rebuild()
    } catch (err) {
      s.loadError = (err as Error).message || 'Could not read that file.'
      track('file-error', { format: fileFormat(file.name) })
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

  // `ringOut`: playback reached the end, so let the soundtrack play its last
  // notes' release instead of cutting it.
  function stopLoop(ringOut = false) {
    playToken++
    s.soundLoading = false
    if (raf !== null) {
      cancelAnimationFrame(raf)
      raf = null
    }
    ringing?.stop()
    ringing = null
    if (ringOut) ringing = voice?.node ?? null
    else voice?.node.stop()
    voice = null
  }

  // What the soundtrack plays, from the Sound tab.
  function soundOpts() {
    return {
      mix: s.soundMix.toLowerCase() as 'all' | 'solo' | 'minus',
      metronome: s.metronome,
      countIn: s.countIn
    }
  }

  // The whole song as an AudioBuffer at the current speed and sound options,
  // synthesized once per sheet and those.
  async function soundBuffer(ctx: AudioContext): Promise<AudioBuffer> {
    const owner = engine!
    const speed = speedNum()
    const key = JSON.stringify([speed, soundOpts()])
    if (soundBuf?.engine === owner && soundBuf.key === key) return soundBuf.buf
    const { CHANNELS, SAMPLE_RATE } = await import('renderer')
    const pcm = await owner.soundtrack({ speed, ...soundOpts() })
    const frames = pcm.length / CHANNELS
    const buf = ctx.createBuffer(CHANNELS, frames, SAMPLE_RATE)
    for (let c = 0; c < CHANNELS; c++) {
      const ch = buf.getChannelData(c)
      for (let i = 0; i < frames; i++) ch[i] = pcm[i * CHANNELS + c]!
    }
    soundBuf = { engine: owner, key, buf }
    return buf
  }

  function tick(ts: number) {
    const dt = (ts - lastTs) / 1000
    lastTs = ts
    // With sound on, the audio clock leads (less what's still in the output
    // buffer), so the cursor can't drift from what's heard.
    const t = voice
      ? voice.from + Math.max(0, audioCtx!.currentTime - (audioCtx!.outputLatency || 0) - voice.at) * voice.speed
      : s.time + dt * speedNum()
    if (t >= s.duration) {
      s.time = s.duration
      s.playing = false
      stopLoop(true)
      paintFrame()
      return
    }
    s.time = Math.max(0, t) // a count-in runs before 0: hold the first frame
    paintFrame()
    raf = requestAnimationFrame(tick)
  }

  async function togglePlay() {
    if (s.playing) {
      stopLoop()
      s.playing = false
      return
    }
    if (s.time >= s.duration) s.time = 0
    s.playing = true
    stopLoop() // silences a previous run still ringing out
    if (s.sound && engine) {
      const token = playToken
      audioCtx ??= new AudioContext() // made inside the click, so the browser lets it play
      void audioCtx.resume()
      s.soundLoading = true
      try {
        const buf = await soundBuffer(audioCtx)
        if (token !== playToken) return // paused or seeked while it rendered (which cleared soundLoading)
        s.soundLoading = false
        const node = audioCtx.createBufferSource()
        node.buffer = buf
        node.connect(audioCtx.destination)
        const speed = speedNum()
        // The buffer opens with the count-in bar; from the top it plays, from
        // anywhere else it's skipped.
        const lead = s.countIn ? engine.countInMs / 1000 : 0
        const from = s.time === 0 ? -lead : s.time
        node.start(0, (from + lead) / speed)
        voice = { node, at: audioCtx.currentTime, from, speed }
      } catch (err) {
        if (token !== playToken) return
        s.soundLoading = false
        console.warn('sonotas: no sound', err) // play on silently
      }
    }
    lastTs = performance.now()
    raf = requestAnimationFrame(tick)
  }

  function seekTo(seconds: number) {
    stopLoop()
    s.playing = false
    s.time = Math.min(Math.max(seconds, 0), s.duration)
    paintFrame()
  }

  // Clicking the preview seeks to the beat drawn under the pointer.
  function seekAtCanvas(clientX: number, clientY: number) {
    if (!engine || !canvasEl || !s.ready || s.videoUrl) return
    const r = canvasEl.getBoundingClientRect()
    // Client px → frame px, allowing for the frame letterboxed in its box.
    const scale = Math.min(r.width / canvasEl.width, r.height / canvasEl.height)
    const x = (clientX - r.left - (r.width - canvasEl.width * scale) / 2) / scale
    const y = (clientY - r.top - (r.height - canvasEl.height * scale) / 2) / scale
    const ms = engine.timeAt(s.time * 1000, x, y, paintOpts() as never)
    if (ms === null) return
    const play = s.playing
    seekTo(ms / 1000)
    if (play && s.time < s.duration) void togglePlay() // plays on from the clicked beat
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
    track('track-switch')
  }

  function toggle(k: string) {
    (s as Dynamic)[k] = !(s as Dynamic)[k]
    normalise()
  }

  // Combinations the controls never offer, put right however they arose (a
  // switch, or a link): a page has nothing to track across or isolate, a lone
  // bar needs bars across to frame it and leaves no screen to turn.
  function normalise() {
    if (s.layout === 'Page') {
      s.currentBarOnly = false
      if (s.view === 'track') s.view = 'bar'
    }
    if (s.fitBars === 'Off') s.currentBarOnly = false
    if (s.currentBarOnly && s.view === 'screen') s.view = 'bar'
  }

  function zoomStrip(z: number) {
    s.stripZoom = Math.min(Math.max(z, 1), v.value.stripMaxZoom)
  }

  function toggleTheme() {
    s.uiTheme = s.uiTheme === 'dark' ? 'light' : 'dark'
  }

  function setAspect(a: string) {
    s.aspect = a
  }

  function setLayout(l: string) {
    s.layout = l
    normalise()
  }

  function setCanvasTheme(t: string) {
    // A playhead in the old theme's ink would vanish on the new paper.
    if (s.cursorColor === INK[s.theme as 'dark' | 'light'] && t !== s.theme) s.cursorColor = INK[t as 'dark' | 'light']
    s.theme = t
    // Presets set all three colors; the Advanced pickers can override afterward.
    Object.assign(s, THEMES[t])
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
    rendering?.abort()
    const ctl = (rendering = new AbortController())
    s.render = { status: 'rendering', pct: 0, phase: 'Preparing score…', frame: 0, total: 0 }
    s.exportError = ''
    s.downloaded = false
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      blobUrl = null
    }
    s.videoUrl = ''
    const counted = { resolution: s.resolution, fast: s.fastExport ? 'on' : 'off' }
    track('export-start', {
      ...counted,
      aspect: s.aspect,
      fps: String(fpsNum()),
      quality: s.quality.toLowerCase(),
      layout: layoutMode(),
      view: s.view,
      staves: STAVES_FOR_COUNT[notationMode()] ?? 'tab',
      theme: s.theme,
      length: lengthBucket(effDur())
    })
    // Its own event: censitas takes at most 10 props, and export-start has them.
    if (s.sound) {
      const { mix, metronome, countIn } = soundOpts()
      track('export-sound', { mix, metronome: metronome ? 'on' : 'off', countIn: countIn ? 'on' : 'off' })
    }
    const started = performance.now()
    try {
      const out = await engine.encode({
        ...encodeOpts(),
        signal: ctl.signal,
        onProgress: (frame: number, total: number) => {
          if (ctl.signal.aborted) return
          const pct = total ? (frame / total) * 100 : 0
          s.render = { status: 'rendering', pct, phase: phaseFor(pct), frame, total }
        }
      } as never)
      if (ctl.signal.aborted) return // cancelled
      rendering = null
      blobUrl = URL.createObjectURL(out)
      s.videoUrl = blobUrl
      s.outBytes = out.size
      makePoster()
      s.render = { ...s.render, status: 'done', pct: 100 }
      track('export-done', { ...counted, took: tookBucket((performance.now() - started) / 1000) })
    } catch (err) {
      if (ctl.signal.aborted) return // cancelled: the AbortError is expected
      track('export-fail', counted)
      rendering = null
      s.exportError = (err as Error).message || 'The encoder stopped.'
      s.render = { status: 'idle', pct: 0, phase: '', frame: 0, total: 0 }
    }
  }

  // Stop the in-flight export, if any: the renderer closes its encoders.
  function abortRender() {
    rendering?.abort()
    rendering = null
  }

  function cancelRender() {
    track('export-cancel')
    abortRender()
    s.render = { status: 'idle', pct: 0, phase: '', frame: 0, total: 0 }
  }

  function closeRender() {
    abortRender()
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
    s.downloaded = true
    track('video-download')
  }

  // ── settings link (?s=) ───────────────────────────────────────────────────
  // The URL always carries the video's settings as a code (nothing at the
  // app's defaults), so copying it shares them and a reload keeps them. A
  // link's code is applied before the first build; what can't apply keeps
  // its value from the code's baseline.
  const route = useRoute()
  const router = useRouter()
  const settingsCode = computed(() => {
    const keys = Object.keys(APP_DEFAULTS) as (keyof Settings)[]
    if (keys.every(k => s[k] === APP_DEFAULTS[k])) return ''
    return encodeSettings(Object.fromEntries(keys.map(k => [k, s[k]])) as Settings)
  })
  let linkTimer: ReturnType<typeof setTimeout> | null = null
  let copiedTimer: ReturnType<typeof setTimeout> | null = null

  function readLink() {
    const code = route.query.s
    if (typeof code !== 'string' || !code) return
    const d = decodeSettings(code)
    if (!d) {
      s.settingsNotice = 'The settings in this link couldn’t be read, so the defaults are used.'
      return
    }
    Object.assign(s, d.settings)
    normalise()
    if (d.skipped) s.settingsNotice = `${d.skipped === 1 ? 'One setting' : `${d.skipped} settings`} in this link couldn’t be used here, perhaps from a newer sonotas. The rest applied.`
  }

  function writeLink() {
    if (!import.meta.client) return
    const query = { ...route.query, s: settingsCode.value || undefined }
    if (query.s !== route.query.s) router.replace({ query })
  }

  watch(settingsCode, () => {
    if (linkTimer) clearTimeout(linkTimer)
    linkTimer = setTimeout(writeLink, 300)
  })

  async function copyLink() {
    writeLink()
    const url = location.origin + router.resolve({ query: { ...route.query, s: settingsCode.value || undefined } }).href
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // No clipboard access (an embed, or permission refused): the old way.
      const field = Object.assign(document.createElement('textarea'), { value: url })
      document.body.append(field)
      field.select()
      const ok = document.execCommand('copy')
      field.remove()
      if (!ok) {
        s.settingsNotice = `Couldn’t copy the link. It’s in the address bar: ${url}`
        return
      }
    }
    s.linkCopied = true
    track('link-copy')
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => (s.linkCopied = false), 2000)
  }

  // Every video setting back to the app's defaults (the song, track and bar
  // range stay). The URL follows, so the old ones can be put back for a moment.
  let undoTimer: ReturnType<typeof setTimeout> | null = null
  function resetSettings() {
    if (undoTimer) clearTimeout(undoTimer)
    if (s.undoReset) {
      Object.assign(s, s.undoReset)
      s.undoReset = null
      return
    }
    const keys = Object.keys(APP_DEFAULTS) as (keyof Settings)[]
    s.undoReset = Object.fromEntries(keys.map(k => [k, s[k]])) as Settings
    Object.assign(s, APP_DEFAULTS)
    s.settingsNotice = ''
    undoTimer = setTimeout(() => (s.undoReset = null), 6000)
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────
  // Leaving mid-export, or before the finished video is saved, loses it.
  function onBeforeUnload(e: BeforeUnloadEvent) {
    if (s.render.status === 'rendering' || (s.render.status === 'done' && !s.downloaded)) e.preventDefault()
  }

  onMounted(() => {
    s.canExport = typeof VideoEncoder !== 'undefined'
    window.addEventListener('beforeunload', onBeforeUnload)
    loadTracker()
  })
  // The prerendered page hydrates on its prerendered route (no query, even in
  // the address bar); the link's ?s= is back only once Nuxt is ready.
  onNuxtReady(() => {
    readLink()
    writeLink() // a link's code, cleaned up (or dropped when it was unreadable)
    rebuild()
  })

  // A finished export belongs to the settings it was made with; changing any
  // of them drops it and shows the live preview again.
  function invalidateResult() {
    if (s.render.status === 'done') closeRender()
  }

  // Rebuild the sheet when a build-time option changes (debounced).
  watch(
    () => [s.trackIndex, s.aspect, s.fg, s.barNum, s.notationSize, s.staves, s.layout, s.showChords, s.showTrackName, s.showBarNumbers, s.showAttribution, s.showTempo, s.showTimeSig, s.fromBar, s.toBar, s.renderOnlyBars, s.resolution, fitBarsNum()].join('|'),
    () => {
      invalidateResult()
      scheduleRebuild()
    }
  )
  // Repaint the current frame when a paint-time option changes (not during play).
  watch(
    () => [s.bg, s.cursorColor, s.cursorOpacity, s.cursorWidth, s.cursorHeight, s.cursorOffset, s.cursorMatchBar, s.playhead, s.view, s.transition, s.followAt, s.turnEarly, s.runPast, s.steady, s.currentBarOnly, s.showTitle, s.highlightBar, s.highlightColor, s.highlightOpacity, s.highlightPadding, s.recolorNote, s.activeNoteColor, s.activeNoteOpacity].join('|'),
    () => {
      invalidateResult()
      invalidateEstimate()
      if (!s.playing) paintFrame()
    }
  )
  // Encode-only options don't touch the preview but do change the file.
  watch(() => [s.fps, s.quality, s.fastExport, s.speed, s.sound, s.soundMix, s.metronome, s.countIn].join('|'), () => {
    invalidateResult()
    invalidateEstimate()
  })
  // The playing soundtrack was made for the old speed / sound setting: pause.
  watch(() => [s.speed, s.sound, s.soundMix, s.metronome, s.countIn], () => {
    if (s.playing) {
      stopLoop()
      s.playing = false
    }
  })
  // The probe yields to neither playback nor an export: pause it for both and
  // pick it up again once they stop (a finished estimate is kept).
  watch(() => [s.playing, s.render.status], scheduleEstimate)

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', onBeforeUnload)
    stopLoop()
    void audioCtx?.close()
    if (rebuildTimer) clearTimeout(rebuildTimer)
    abortEstimate()
    if (blobUrl) URL.revokeObjectURL(blobUrl)
    abortRender()
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
    // Real output geometry once built; the probed estimate before a render
    // ('…' while it runs), the produced file's real size once done.
    const resPx = s.sheetW ? `${s.sheetW}×${s.sheetH}` : resPxMap[s.resolution]
    const estSize = s.estBytes ? fmtSize(s.estBytes) : '…'
    const sizeLabel = done && s.outBytes ? fmtSize(s.outBytes) : estSize

    return {
      isPage: s.layout === 'Page',
      // Zoomed all the way in, about a dozen bars span the strip.
      stripMaxZoom: Math.max(1, (s.songPlays.length || s.plays.length) / 12),
      fitBars: fitBarsNum(),
      timeLabel: fmt(s.time),
      durLabel: fmt(s.duration),
      barLabel: barLabel(),
      scrubPct: s.duration ? (s.time / s.duration) * 100 : 0,
      // "1920×1080 · 30 fps · 0:08 · ~1.2 MB"
      // The size is probed only while the preview is still ("~…" read as truncated text).
      // A no-break space keeps each dot on its fact's line when the line wraps.
      estLine: resPx + '\u00a0· ' + fpsNum() + '\u00a0fps\u00a0· ' + fmt(eff) + '\u00a0· ' + (s.estBytes ? '~' + estSize : s.playing ? 'size once paused' : 'estimating size…'),
      resPx,
      sizeLabel,
      outName: outName(),
      isRendering: r.status === 'rendering',
      isDone: r.status === 'done',
      atDefaults: !settingsCode.value,
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
    zoomStrip,
    copyLink,
    resetSettings,
    setAspect,
    setLayout,
    setCanvasTheme,
    setCursorColor,
    setHighlightColor,
    setActiveNoteColor,
    togglePlay,
    seekTo,
    seekAtCanvas,
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

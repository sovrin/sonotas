<script setup>
// The song as a strip of bars on a tab staff, in the order they are played:
// a repeat plays its bars again, so they appear again, and every cell is as
// wide as that play lasts. Time and cells line up, so the playhead is always
// in the cell being played. The current bar and the playhead take the video's
// own highlight and cursor colours. Dragging scrubs; with a bar range on, two
// brackets set which bars are exported, and an export fills the clip as it
// renders. Zoomed in, the strip scrolls sideways and keeps the playhead in
// view; the overview under it shows the whole song and the window in view.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const { s, v, seekTo, togglePlay, zoomStrip } = useSonotas()

const strip = ref(null)
const scroller = ref(null)
const content = ref(null)
const overview = ref(null)
const scrollerId = useId()
const width = ref(0)
let observer = null

onMounted(() => {
  observer = new ResizeObserver((entries) => {
    for (const e of entries) {
      if (e.target === strip.value) width.value = e.contentRect.width
      if (e.target === sketchEl.value) sketchH.value = e.contentRect.height
    }
    syncView()
  })
  observer.observe(strip.value)
  observer.observe(scroller.value)
  observer.observe(sketchEl.value)
})
onBeforeUnmount(() => observer?.disconnect())

// The whole song when it's known, else whatever is rendered.
const plays = computed(() => (s.songPlays.length ? s.songPlays : s.plays))
const totalMs = computed(() => (s.songPlays.length ? s.songMs : s.duration * 1000) || 1)
// Distinct bars in the score (a range is picked in these, not in plays).
const count = computed(() => s.songBars.length || s.barStarts.length)

const startOf = i => plays.value[i]?.startMs ?? totalMs.value
const endOf = i => (i + 1 < plays.value.length ? plays.value[i + 1].startMs : totalMs.value)
const pct = ms => (ms / totalMs.value) * 100

// Where a bar's first play starts and its last play ends, for range brackets.
function barSpan(bar) {
  let from = totalMs.value
  let to = 0
  plays.value.forEach((p, i) => {
    if (p.bar !== bar) return
    from = Math.min(from, startOf(i))
    to = Math.max(to, endOf(i))
  })
  return [from, to]
}

// A range is only rendered once its rebuild lands; until then the preview's
// time still counts from the song's start.
const cropped = computed(() => s.renderOnlyBars && s.songBars.length > 0 && s.barStarts.length !== s.songBars.length)
const offsetMs = computed(() => (cropped.value ? barSpan(s.fromBar - 1)[0] : 0))
const headMs = computed(() => offsetMs.value + s.time * 1000)

function playAt(ms) {
  let i = 0
  while (i + 1 < plays.value.length && plays.value[i + 1].startMs <= ms) i++
  return i
}
const current = computed(() => playAt(headMs.value))
const currentBar = computed(() => plays.value[current.value]?.bar ?? 0)

// While a bracket is dragged its bar is a draft, committed on release so the
// score is rebuilt once, not on every bar the pointer crosses.
const draft = ref(null)
const range = computed(() => {
  if (draft.value) return draft.value
  if (!s.renderOnlyBars) return { from: 0, to: count.value - 1 }
  const to = Math.min(s.toBar, count.value) - 1
  return { from: Math.min(s.fromBar - 1, to), to }
})

// Bar numbers on an even step: every play, or every second, third… so they
// stay ~2rem apart, as on a ruler. A number never sits on the final barline.
// Once the cells get too narrow for a barline each (zoomed out on a long
// song), only numbered bars keep theirs and repeats lose their thick line.
const LABEL_GAP = 32
const cellPx = computed(() => width.value / Math.max(plays.value.length, 1))
const dense = computed(() => cellPx.value < 10)
const labelStep = computed(() => Math.max(1, Math.ceil(LABEL_GAP / cellPx.value)))

const cells = computed(() => plays.value.map((p, i) => {
  const left = pct(startOf(i))
  const px = (left / 100) * width.value
  const label = i % labelStep.value === 0 && width.value - px >= LABEL_GAP * 0.75
  return {
    key: i,
    n: p.bar + 1,
    left,
    width: pct(endOf(i) - startOf(i)),
    label,
    line: !dense.value || label,
    // The play goes back in the score: a repeat or a jump starts here.
    back: !dense.value && i > 0 && p.bar <= plays.value[i - 1].bar,
    current: i === current.value && !v.value.isRendering,
    out: p.bar < range.value.from || p.bar > range.value.to
  }
}))

// The tab in brief: every note a flat bar on its string line, as long as it
// sounds less a hair's gap, drawn in pixels so it stays crisp at any zoom.
// The bar being played lights its notes, as the video lights the bar.
const sketchEl = ref(null)
const sketchH = ref(0)
const NOTE_H = 3
const NOTE_GAP = 1.5

function sketchPath(notes) {
  const k = width.value / totalMs.value
  const h = sketchH.value - 1 // the bottom line's centre
  const f = x => x.toFixed(1)
  return notes.map((n) => {
    const w = Math.max(NOTE_H - 1, (n.endMs - n.startMs) * k - NOTE_GAP)
    return `M${f(n.startMs * k)} ${f(n.y * h + 0.5 - NOTE_H / 2)}h${f(w)}v${NOTE_H}h-${f(w)}z`
  }).join('')
}

const sketch = computed(() => (width.value && sketchH.value ? sketchPath(s.songNotes) : ''))
const sketchNow = computed(() => {
  if (!sketch.value || v.value.isRendering) return ''
  const from = startOf(current.value)
  const to = endOf(current.value)
  return sketchPath(s.songNotes.filter(n => n.startMs >= from && n.startMs < to))
})

const rangeLeft = computed(() => pct(barSpan(range.value.from)[0]))
const rangeRight = computed(() => pct(barSpan(range.value.to)[1]))

// Export progress runs across the clip being exported.
const progressWidth = computed(() => (rangeRight.value - rangeLeft.value) * (v.value.pct / 100))

// ── scrubbing ───────────────────────────────────────────────────────────────
let scrubbing = false
let resume = false // playing when the drag began: plays on from where it ends

// Seeking pauses; `play` picks playback up again from the new spot.
function playOn(play) {
  if (play && !s.playing && s.time < s.duration) togglePlay()
}

function msAt(clientX) {
  const r = strip.value.getBoundingClientRect()
  return Math.min(Math.max((clientX - r.left) / r.width, 0), 1) * totalMs.value
}

function seekMs(ms, play = false) {
  const lo = barSpan(range.value.from)[0]
  const hi = barSpan(range.value.to)[1]
  seekTo((Math.min(Math.max(ms, lo), hi) - offsetMs.value) / 1000)
  playOn(play)
}

function onDown(e) {
  if (e.button !== 0 || v.value.isRendering || !s.ready || s.videoUrl) return
  scrubbing = true
  resume = s.playing
  strip.value.setPointerCapture(e.pointerId)
  seekMs(msAt(e.clientX))
}

function onMove(e) {
  if (scrubbing) seekMs(msAt(e.clientX))
}

function onUp() {
  if (scrubbing) playOn(resume)
  scrubbing = false
}

// The strip is the seek slider: arrows step a played bar, Home/End jump to
// the ends of what is exported, + and − zoom.
function onKeydown(e) {
  const zoom = { '+': 2, '=': 2, '-': 0.5 }[e.key]
  if (zoom) {
    e.preventDefault()
    zoomStrip(s.stripZoom * zoom)
    return
  }
  const i = current.value
  const back = headMs.value - startOf(i) > 250 ? i : i - 1
  const target = { ArrowRight: i + 1, ArrowUp: i + 1, ArrowLeft: back, ArrowDown: back }[e.key]
  if (s.videoUrl) return
  if (e.key === 'Home' || e.key === 'End') {
    e.preventDefault()
    seekMs(e.key === 'Home' ? 0 : totalMs.value, s.playing)
    return
  }
  if (target === undefined) return
  e.preventDefault()
  seekMs(startOf(Math.min(Math.max(target, 0), plays.value.length - 1)), s.playing)
}

// ── zoom ────────────────────────────────────────────────────────────────────
// A zoom keeps one point of the strip where it is on screen: the pointer for a
// pinch, else the playhead while it is in view, else the middle.
let anchorX = null

watch(() => s.stripZoom, (z, old) => {
  const el = scroller.value
  if (!el) return
  const w = el.clientWidth
  const headX = (pct(headMs.value) / 100) * w * old - el.scrollLeft
  const ax = anchorX ?? (headX >= 0 && headX <= w ? headX : w / 2)
  const at = (el.scrollLeft + ax) / (w * old)
  anchorX = null
  // Set the width now, not on the next render, so the scroll lands in one go.
  content.value.style.inlineSize = z * 100 + '%'
  el.scrollLeft = at * w * z - ax
  syncView()
}, { flush: 'sync' })

// The part of the song in view, as fractions of it, for the overview.
const view = ref({ from: 0, to: 1 })
function syncView() {
  const el = scroller.value
  if (!el?.scrollWidth) return
  view.value = { from: el.scrollLeft / el.scrollWidth, to: (el.scrollLeft + el.clientWidth) / el.scrollWidth }
}

// ── overview ────────────────────────────────────────────────────────────────
// Drag the window to move along the song, drag one of its ends to zoom with
// the other end held, press outside it to bring that part into view.
let grab = null

function fracAt(clientX) {
  const r = overview.value.getBoundingClientRect()
  return Math.min(Math.max((clientX - r.left) / r.width, 0), 1)
}

function scrollToFrac(from) {
  scroller.value.scrollLeft = from * scroller.value.scrollWidth
}

function onOverviewDown(e) {
  if (e.button !== 0) return
  const f = fracAt(e.clientX)
  const edge = e.target.dataset.edge
  if (!edge && (f < view.value.from || f > view.value.to)) {
    scrollToFrac(f - (view.value.to - view.value.from) / 2)
  }
  grab = { edge: edge ?? 'move', f, from: scroller.value.scrollLeft / scroller.value.scrollWidth }
  overview.value.setPointerCapture(e.pointerId)
}

function onOverviewMove(e) {
  if (!grab) return
  const f = fracAt(e.clientX)
  const { from, to } = view.value
  const min = 1 / v.value.stripMaxZoom
  if (grab.edge === 'move') {
    scrollToFrac(grab.from + f - grab.f)
  } else if (grab.edge === 'from') {
    anchorX = scroller.value.clientWidth // hold the right end
    zoomStrip(1 / (to - Math.min(f, to - min)))
  } else {
    anchorX = 0 // hold the left end
    zoomStrip(1 / (Math.max(f, from + min) - from))
  }
}

function onOverviewUp() {
  grab = null
}

// The window is the scrollbar: arrows move it a tenth of a view, Home/End to
// the song's ends, + and − zoom.
function onOverviewKey(e) {
  const el = scroller.value
  const step = { ArrowLeft: -0.1, ArrowRight: 0.1, PageUp: -1, PageDown: 1 }[e.key]
  const zoom = { '+': 2, '=': 2, '-': 0.5 }[e.key]
  if (step) el.scrollLeft += step * el.clientWidth
  else if (e.key === 'Home') el.scrollLeft = 0
  else if (e.key === 'End') el.scrollLeft = el.scrollWidth
  else if (zoom) zoomStrip(s.stripZoom * zoom)
  else return
  e.preventDefault()
}

// Pinch or Ctrl/⌘-wheel zooms around the pointer; a plain wheel scrolls.
function onWheel(e) {
  const el = scroller.value
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    anchorX = e.clientX - el.getBoundingClientRect().left
    zoomStrip(s.stripZoom * Math.exp(-e.deltaY * 0.01))
  } else if (s.stripZoom > 1 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    e.preventDefault()
    el.scrollLeft += e.deltaY
  }
}

// Playing or stepping past the edge turns the strip over, like a page, so
// the playhead comes back in near the left. Not while dragging it.
watch(headMs, (ms) => {
  const el = scroller.value
  if (!el || scrubbing || s.stripZoom === 1) return
  const x = (pct(ms) / 100) * el.scrollWidth
  if (x < el.scrollLeft || x > el.scrollLeft + el.clientWidth) el.scrollLeft = x - el.clientWidth * 0.1
})

// ── range brackets ──────────────────────────────────────────────────────────
let dragging = null

// The bar whose first play starts (or last play ends) nearest to `ms`.
function nearestBoundary(ms, edge) {
  const at = bar => barSpan(bar)[edge === 'from' ? 0 : 1]
  let best = 0
  for (let bar = 1; bar < count.value; bar++) {
    if (Math.abs(at(bar) - ms) < Math.abs(at(best) - ms)) best = bar
  }
  return best
}

function setDraft(edge, i) {
  const r = { ...range.value }
  if (edge === 'from') r.from = Math.min(Math.max(i, 0), r.to)
  else r.to = Math.max(Math.min(i, count.value - 1), r.from)
  draft.value = r
}

function commit() {
  if (!draft.value) return
  const { from, to } = draft.value
  draft.value = null
  if (from + 1 === s.fromBar && to + 1 === s.toBar) return
  s.fromBar = from + 1
  s.toBar = to + 1
  seekTo(0)
}

function onHandleDown(e, edge) {
  if (e.button !== 0 || v.value.isRendering) return
  e.stopPropagation()
  dragging = edge
  e.currentTarget.setPointerCapture(e.pointerId)
}

function onHandleMove(e) {
  if (dragging) setDraft(dragging, nearestBoundary(msAt(e.clientX), dragging))
}

function onHandleUp() {
  dragging = null
  commit()
}

function onHandleKey(e, edge) {
  const i = range.value[edge]
  const next = { ArrowRight: i + 1, ArrowUp: i + 1, ArrowLeft: i - 1, ArrowDown: i - 1, PageUp: i + 4, PageDown: i - 4, Home: 0, End: count.value - 1 }[e.key]
  if (next === undefined) return
  e.preventDefault()
  e.stopPropagation() // not to the strip's own arrow keys; Space still reaches the page
  setDraft(edge, next)
  commit()
}

const fmt = (ms) => {
  const t = ms / 1000
  return Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0')
}
</script>

<template>
  <div
    class="bar-strip"
    :style="{ '--strip-now': s.highlightBar ? s.highlightColor : 'var(--ae-text)', '--strip-head': s.cursorColor }"
  >
    <div
      :id="scrollerId"
      ref="scroller"
      class="bar-strip-scroller"
      @wheel="onWheel"
      @scroll="syncView"
    >
      <div
        ref="content"
        class="bar-strip-content"
        :style="{ inlineSize: s.stripZoom * 100 + '%' }"
      >
        <div
          ref="strip"
          class="bar-strip-track"
          role="slider"
          tabindex="0"
          aria-label="Song position"
          :aria-valuemin="1"
          :aria-valuemax="Math.max(count, 1)"
          :aria-valuenow="currentBar + 1"
          :aria-valuetext="`Bar ${currentBar + 1} of ${count}, ${fmt(headMs)}`"
          :aria-busy="!s.ready ? 'true' : undefined"
          @pointerdown="onDown"
          @pointermove="onMove"
          @pointerup="onUp"
          @pointercancel="onUp"
          @keydown="onKeydown"
        >
          <div
            v-for="b in cells"
            :key="b.key"
            class="bar-strip-bar"
            :style="{ left: b.left + '%', width: b.width + '%' }"
            :data-line="b.line || undefined"
            :data-back="b.back || undefined"
            :data-current="b.current || undefined"
            :data-out="b.out || undefined"
          >
            <span
              v-if="b.label"
              aria-hidden="true"
            >{{ b.n }}</span>
          </div>

          <svg
            ref="sketchEl"
            class="bar-strip-sketch"
            aria-hidden="true"
          >
            <path :d="sketch" />
            <path
              :d="sketchNow"
              data-now
            />
          </svg>

          <div
            v-if="v.isRendering"
            class="bar-strip-progress"
            :style="{ left: rangeLeft + '%', width: progressWidth + '%' }"
          />
          <div
            v-else-if="s.ready"
            class="bar-strip-head"
            :style="{ left: pct(headMs) + '%' }"
          />
        </div>

        <template v-if="s.renderOnlyBars && count">
          <span
            class="bar-strip-bracket"
            data-edge="from"
            :style="{ left: rangeLeft + '%' }"
            role="slider"
            tabindex="0"
            aria-label="First bar to export"
            :aria-valuemin="1"
            :aria-valuemax="range.to + 1"
            :aria-valuenow="range.from + 1"
            :aria-valuetext="`Bar ${range.from + 1}, ${fmt(barSpan(range.from)[0])}`"
            @pointerdown="onHandleDown($event, 'from')"
            @pointermove="onHandleMove"
            @pointerup="onHandleUp"
            @pointercancel="onHandleUp"
            @keydown="onHandleKey($event, 'from')"
          />
          <span
            class="bar-strip-bracket"
            data-edge="to"
            :style="{ left: rangeRight + '%' }"
            role="slider"
            tabindex="0"
            aria-label="Last bar to export"
            :aria-valuemin="range.from + 1"
            :aria-valuemax="count"
            :aria-valuenow="range.to + 1"
            :aria-valuetext="`Bar ${range.to + 1}, ends ${fmt(barSpan(range.to)[1])}`"
            @pointerdown="onHandleDown($event, 'to')"
            @pointermove="onHandleMove"
            @pointerup="onHandleUp"
            @pointercancel="onHandleUp"
            @keydown="onHandleKey($event, 'to')"
          />
        </template>
      </div>
    </div>

    <!-- Hidden, not removed, for a short song: its room stays, so the strip doesn't jump once the song is read. -->
    <div
      ref="overview"
      class="bar-strip-overview"
      :style="v.stripMaxZoom > 1 ? undefined : { visibility: 'hidden' }"
      @pointerdown="onOverviewDown"
      @pointermove="onOverviewMove"
      @pointerup="onOverviewUp"
      @pointercancel="onOverviewUp"
    >
      <div
        v-if="s.renderOnlyBars"
        class="bar-strip-overview-range"
        :style="{ left: rangeLeft + '%', width: rangeRight - rangeLeft + '%' }"
      />
      <div
        v-if="s.ready"
        class="bar-strip-overview-head"
        :style="{ left: pct(headMs) + '%' }"
      />
      <div
        class="bar-strip-overview-window"
        role="scrollbar"
        tabindex="0"
        :aria-controls="scrollerId"
        aria-label="Part of the song in view"
        aria-orientation="horizontal"
        :aria-valuenow="Math.round(view.from * 100)"
        aria-valuemin="0"
        aria-valuemax="100"
        data-tip="Drag to move, drag an end to zoom"
        :style="{ left: view.from * 100 + '%', width: (view.to - view.from) * 100 + '%' }"
        @keydown="onOverviewKey"
        @dblclick="zoomStrip(1)"
      >
        <span data-edge="from" />
        <span data-edge="to" />
      </div>
    </div>
  </div>
</template>

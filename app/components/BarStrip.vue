<script setup>
// The song as a strip of bars on a tab staff. Each bar is as wide as it lasts,
// so tempo changes show; the current bar and the playhead take the video's own
// highlight and cursor colours. Dragging scrubs; with a bar range on, two
// brackets set which bars are exported, and an export fills the bars as it
// renders them.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const { s, v, seekTo } = useSonotas()

const strip = ref(null)
const width = ref(0)
let observer = null

onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    width.value = entry.contentRect.width
  })
  observer.observe(strip.value)
})
onBeforeUnmount(() => observer?.disconnect())

// The whole song when it's known, else whatever is rendered.
const starts = computed(() => (s.songBars.length ? s.songBars : s.barStarts))
const totalMs = computed(() => (s.songBars.length ? s.songMs : s.duration * 1000) || 1)
const count = computed(() => starts.value.length)

const startOf = i => starts.value[i] ?? totalMs.value
const endOf = i => (i + 1 < count.value ? starts.value[i + 1] : totalMs.value)
const pct = ms => (ms / totalMs.value) * 100

// A range is only rendered once its rebuild lands; until then the preview's
// time still counts from the song's start.
const cropped = computed(() => s.renderOnlyBars && s.songBars.length > 0 && s.barStarts.length !== s.songBars.length)
const offsetMs = computed(() => (cropped.value ? startOf(s.fromBar - 1) : 0))
const headMs = computed(() => offsetMs.value + s.time * 1000)

function barAt(ms) {
  let i = 0
  while (i + 1 < count.value && starts.value[i + 1] <= ms) i++
  return i
}
const current = computed(() => barAt(headMs.value))

// While a bracket is dragged its bar is a draft, committed on release so the
// score is rebuilt once, not on every bar the pointer crosses.
const draft = ref(null)
const range = computed(() => {
  if (draft.value) return draft.value
  if (!s.renderOnlyBars) return { from: 0, to: count.value - 1 }
  const to = Math.min(s.toBar, count.value) - 1
  return { from: Math.min(s.fromBar - 1, to), to }
})

// Bar numbers stay at least ~2rem apart, every 1st, 2nd, 4th… bar.
const labelEvery = computed(() => {
  const avg = width.value / Math.max(count.value, 1)
  let step = 1
  while (avg * step < 32 && step < 256) step *= 2
  return step
})

const bars = computed(() => starts.value.map((ms, i) => ({
  n: i + 1,
  left: pct(ms),
  width: pct(endOf(i) - ms),
  label: i % labelEvery.value === 0,
  current: i === current.value && !v.value.isRendering,
  out: i < range.value.from || i > range.value.to
})))

const rangeLeft = computed(() => pct(startOf(range.value.from)))
const rangeRight = computed(() => pct(endOf(range.value.to)))

// Export progress runs across the bars being exported.
const progressWidth = computed(() => (rangeRight.value - rangeLeft.value) * (v.value.pct / 100))

// ── scrubbing ───────────────────────────────────────────────────────────────
let scrubbing = false

function msAt(clientX) {
  const r = strip.value.getBoundingClientRect()
  return Math.min(Math.max((clientX - r.left) / r.width, 0), 1) * totalMs.value
}

function seekMs(ms) {
  const lo = startOf(range.value.from)
  const hi = endOf(range.value.to)
  seekTo((Math.min(Math.max(ms, lo), hi) - offsetMs.value) / 1000)
}

function onDown(e) {
  if (e.button !== 0 || v.value.isRendering || !s.ready || s.videoUrl) return
  scrubbing = true
  strip.value.setPointerCapture(e.pointerId)
  seekMs(msAt(e.clientX))
}

function onMove(e) {
  if (scrubbing) seekMs(msAt(e.clientX))
}

function onUp() {
  scrubbing = false
}

// The strip is the seek slider: arrows step a bar, Home/End jump to the ends.
function onKeydown(e) {
  const { from, to } = range.value
  const i = current.value
  const target = {
    ArrowRight: Math.min(i + 1, to),
    ArrowUp: Math.min(i + 1, to),
    ArrowLeft: headMs.value - startOf(i) > 250 ? i : Math.max(i - 1, from),
    ArrowDown: headMs.value - startOf(i) > 250 ? i : Math.max(i - 1, from),
    Home: from,
    End: to
  }[e.key]
  if (target === undefined || s.videoUrl) return
  e.preventDefault()
  seekMs(e.key === 'End' ? endOf(to) : startOf(target))
}

// ── range brackets ──────────────────────────────────────────────────────────
let dragging = null

function nearestBoundary(ms, edge) {
  let best = 0
  for (let i = 0; i < count.value; i++) {
    const at = edge === 'from' ? startOf(i) : endOf(i)
    const bestAt = edge === 'from' ? startOf(best) : endOf(best)
    if (Math.abs(at - ms) < Math.abs(bestAt - ms)) best = i
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
      ref="strip"
      class="bar-strip-track"
      role="slider"
      tabindex="0"
      aria-label="Song position"
      :aria-valuemin="1"
      :aria-valuemax="Math.max(count, 1)"
      :aria-valuenow="current + 1"
      :aria-valuetext="`Bar ${current + 1} of ${count}, ${fmt(headMs)}`"
      :aria-busy="!s.ready ? 'true' : undefined"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
      @keydown="onKeydown"
    >
      <div
        v-for="b in bars"
        :key="b.n"
        class="bar-strip-bar"
        :style="{ left: b.left + '%', width: b.width + '%' }"
        :data-current="b.current || undefined"
        :data-out="b.out || undefined"
      >
        <span v-if="b.label">{{ b.n }}</span>
      </div>

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
        @pointerdown="onHandleDown($event, 'from')"
        @pointermove="onHandleMove"
        @pointerup="onHandleUp"
        @pointercancel="onHandleUp"
        @keydown.stop="onHandleKey($event, 'from')"
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
        @pointerdown="onHandleDown($event, 'to')"
        @pointermove="onHandleMove"
        @pointerup="onHandleUp"
        @pointercancel="onHandleUp"
        @keydown.stop="onHandleKey($event, 'to')"
      />
    </template>
  </div>
</template>

<script setup>
// The song as a strip of bars on a tab staff, in the order they are played:
// a repeat plays its bars again, so they appear again, and every cell is as
// wide as that play lasts. Time and cells line up, so the playhead is always
// in the cell being played. The current bar and the playhead take the video's
// own highlight and cursor colours. Dragging scrubs; with a bar range on, two
// brackets set which bars are exported, and an export fills the clip as it
// renders.
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

// Bar numbers at least ~2rem apart, placed by where they land, not by index,
// so long and short bars both read. Where a repeat jumps back always gets its
// number; the rest fill in around those. Barlines thin out the same way when
// the cells get too narrow to draw one each.
const LABEL_GAP = 32
const dense = computed(() => width.value / Math.max(plays.value.length, 1) < 6)

const cells = computed(() => {
  const list = plays.value.map((p, i) => {
    const left = pct(startOf(i))
    return {
      key: i,
      n: p.bar + 1,
      left,
      px: (left / 100) * width.value,
      width: pct(endOf(i) - startOf(i)),
      // The play goes back in the score: a repeat or a jump starts here.
      back: i > 0 && p.bar <= plays.value[i - 1].bar,
      current: i === current.value && !v.value.isRendering,
      out: p.bar < range.value.from || p.bar > range.value.to
    }
  })
  const anchors = list.filter((c, i) => i === 0 || c.back).map(c => c.px)
  let lastLabel = -Infinity
  let lastLine = -Infinity
  let next = 0 // index into anchors of the first one at or after this cell
  for (const c of list) {
    while (next < anchors.length && anchors[next] < c.px) next++
    const anchor = c.key === 0 || c.back
    // The strip's end counts as an anchor too, so no number sits on the final barline.
    const room = c.px - lastLabel >= LABEL_GAP && (anchors[next] ?? width.value) - c.px >= LABEL_GAP
    c.label = anchor || room
    if (c.label) lastLabel = c.px
    c.line = !dense.value || c.px - lastLine >= 8
    if (c.line) lastLine = c.px
  }
  return list
})

const rangeLeft = computed(() => pct(barSpan(range.value.from)[0]))
const rangeRight = computed(() => pct(barSpan(range.value.to)[1]))

// Export progress runs across the clip being exported.
const progressWidth = computed(() => (rangeRight.value - rangeLeft.value) * (v.value.pct / 100))

// ── scrubbing ───────────────────────────────────────────────────────────────
let scrubbing = false

function msAt(clientX) {
  const r = strip.value.getBoundingClientRect()
  return Math.min(Math.max((clientX - r.left) / r.width, 0), 1) * totalMs.value
}

function seekMs(ms) {
  const lo = barSpan(range.value.from)[0]
  const hi = barSpan(range.value.to)[1]
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

// The strip is the seek slider: arrows step a played bar, Home/End jump to
// the ends of what is exported.
function onKeydown(e) {
  const i = current.value
  const back = headMs.value - startOf(i) > 250 ? i : i - 1
  const target = { ArrowRight: i + 1, ArrowUp: i + 1, ArrowLeft: back, ArrowDown: back }[e.key]
  if (s.videoUrl) return
  if (e.key === 'Home' || e.key === 'End') {
    e.preventDefault()
    seekMs(e.key === 'Home' ? 0 : totalMs.value)
    return
  }
  if (target === undefined) return
  e.preventDefault()
  seekMs(startOf(Math.min(Math.max(target, 0), plays.value.length - 1)))
}

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
        :aria-valuetext="`Bar ${range.to + 1}, ends ${fmt(barSpan(range.to)[1])}`"
        @pointerdown="onHandleDown($event, 'to')"
        @pointermove="onHandleMove"
        @pointerup="onHandleUp"
        @pointercancel="onHandleUp"
        @keydown.stop="onHandleKey($event, 'to')"
      />
    </template>
  </div>
</template>

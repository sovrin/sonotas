<script setup>
// Play, where you are (as a timecode and as a bar), the strip of bars, and
// whether the export covers the whole song or only some of its bars. A long
// song's strip zooms in, so its bars stay readable; one click shows it whole.
import { t } from '~/utils/i18n'

const { s, v, togglePlay, seekTo, zoomStrip } = useSonotas()

const count = computed(() => (s.songBars.length || s.barStarts.length))

// The bar being played in the rendered clip, repeats included (0-based within
// the clip; a cropped clip's bars count from its first bar).
function barUnderHead() {
  const ms = s.time * 1000
  let i = 0
  while (i + 1 < s.plays.length && s.plays[i + 1].startMs <= ms) i++
  return s.plays[i]?.bar ?? 0
}
const cropped = computed(() => s.renderOnlyBars && s.songBars.length && s.barStarts.length !== s.songBars.length)

// Turning the range on starts it at the bar under the playhead; either way
// the preview rewinds to the start of what will be exported.
function toggleRange() {
  if (!s.renderOnlyBars && count.value) {
    const i = barUnderHead()
    s.fromBar = i + 1
    s.toBar = Math.min(i + 4, count.value)
  }
  s.renderOnlyBars = !s.renderOnlyBars
  seekTo(0)
}

// Tenths, the way an editor's timecode counts: 0:04.2
const tc = sec => Math.floor(sec / 60) + ':' + (sec % 60).toFixed(1).padStart(4, '0')

const barNow = computed(() => (cropped.value ? s.fromBar : 1) + barUnderHead())

// I and O set the first and last exported bar to the bar under the playhead,
// turning the range on (four bars from there) if it was off.
function setEdge(edge) {
  const b = barNow.value
  if (!count.value) return
  if (!s.renderOnlyBars) {
    s.fromBar = edge === 'from' ? b : Math.max(1, b - 3)
    s.toBar = edge === 'from' ? Math.min(b + 3, count.value) : b
    s.renderOnlyBars = true
  } else if (edge === 'from') {
    s.fromBar = Math.min(b, s.toBar)
  } else {
    s.toBar = Math.max(b, s.fromBar)
  }
  seekTo(0)
}

// Page-wide keys, left alone while typing or when a control has its own use
// for the key (a focused button already plays on Space). Sliders have none for
// Space, so it plays even after the scrubber took focus from a drag.
function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey || !s.ready || s.videoUrl || v.value.isRendering) return
  if (e.target.closest?.('input:not([type="range"]), select, textarea, button, a, [contenteditable]')) return
  const k = e.key.toLowerCase()
  if (k === ' ') togglePlay()
  else if (k === 'i') setEdge('from')
  else if (k === 'o') setEdge('to')
  else return
  e.preventDefault()
}
// On a desktop the transport floats over the stage's foot; its height, shared
// with the stage, keeps the fitted preview and its zoom control clear of it.
const el = ref(null)
let observer
onMounted(() => {
  window.addEventListener('keydown', onKey)
  observer = new ResizeObserver(([e]) => el.value.parentElement.style.setProperty('--transport-h', `${e.borderBoxSize[0].blockSize}px`))
  observer.observe(el.value)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  observer?.disconnect()
})
</script>

<template>
  <section
    ref="el"
    class="transport"
    :aria-label="t('timeline.label')"
    :inert="v.isRendering"
  >
    <button
      class="btn"
      data-icon
      data-size="l"
      :aria-label="s.playing ? t('timeline.pause') : t('timeline.play')"
      :data-tip="s.playing ? t('timeline.pause.tip') : t('timeline.play.tip')"
      aria-keyshortcuts="Space"
      :aria-pressed="s.playing ? 'true' : 'false'"
      :aria-busy="s.soundLoading ? 'true' : undefined"
      :disabled="!s.ready || !!s.videoUrl"
      @click="togglePlay"
    >
      <i
        class="icon"
        :data-icon="s.playing ? 'pause' : 'play'"
      />
    </button>

    <div class="transport-readout">
      <b>{{ tc(s.time) }}</b>
      <span>{{ t('timeline.time.of', { total: s.ready ? tc(s.duration) : '—' }) }}</span>
    </div>

    <BarStrip class="transport-strip" />

    <div class="transport-readout items-end">
      <b>{{ barNow }}</b>
      <span v-if="cropped">{{ t('timeline.bars.in', { from: s.fromBar, to: s.toBar }) }}</span>
      <span v-else>{{ t('timeline.bars.of', { count: count || '—' }) }}</span>
    </div>

    <div class="transport-range">
      <label>
        <input
          type="checkbox"
          :checked="s.renderOnlyBars"
          :disabled="!count"
          @change="toggleRange"
        >
        <span v-if="s.renderOnlyBars && s.fromBar === s.toBar">{{ t('timeline.range.bar', { bar: s.fromBar }) }}</span>
        <span v-else-if="s.renderOnlyBars">{{ t('timeline.range.bars', { from: s.fromBar, to: s.toBar }) }}</span>
        <span v-else>{{ t('timeline.range.off') }}</span>
      </label>
      <span
        v-if="s.renderOnlyBars"
        class="caption"
      >{{ t('timeline.range.hint') }}</span>
      <button
        v-if="s.stripZoom > 1"
        class="btn transport-zoom"
        data-size="s"
        data-variant="ghost"
        :data-tip="t('timeline.whole.tip')"
        @click="zoomStrip(1)"
      >
        <i
          class="icon"
          data-icon="zoom-out"
        />
        {{ t('timeline.whole') }}
      </button>
    </div>
  </section>
</template>

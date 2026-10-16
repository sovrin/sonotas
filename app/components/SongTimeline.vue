<script setup>
// Play, where you are (as a timecode and as a bar), the strip of bars, and
// whether the export covers the whole song or only some of its bars.
const { s, v, togglePlay, seekTo } = useSonotas()

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
const tc = t => Math.floor(t / 60) + ':' + (t % 60).toFixed(1).padStart(4, '0')

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
// for the key (a focused button already plays on Space).
function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey || !s.ready || s.videoUrl || v.value.isRendering) return
  if (e.target.closest?.('input, select, textarea, button, a, [role="slider"], [contenteditable]')) return
  const k = e.key.toLowerCase()
  if (k === ' ') togglePlay()
  else if (k === 'i') setEdge('from')
  else if (k === 'o') setEdge('to')
  else return
  e.preventDefault()
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <section
    class="transport"
    aria-label="Timeline"
    :inert="v.isRendering"
  >
    <button
      class="btn"
      data-icon
      data-size="l"
      :aria-label="s.playing ? 'Pause' : 'Play'"
      :data-tip="s.playing ? 'Pause (Space)' : 'Play (Space)'"
      aria-keyshortcuts="Space"
      :aria-pressed="s.playing ? 'true' : 'false'"
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
      <span>of {{ tc(s.duration) }}</span>
    </div>

    <BarStrip class="transport-strip" />

    <div class="transport-readout items-end">
      <b>{{ barNow }}</b>
      <span v-if="cropped">in bars {{ s.fromBar }}–{{ s.toBar }}</span>
      <span v-else>of {{ count || '—' }} bars</span>
    </div>

    <div class="transport-range">
      <label>
        <input
          type="checkbox"
          :checked="s.renderOnlyBars"
          :disabled="!count"
          @change="toggleRange"
        >
        <span v-if="s.renderOnlyBars && s.fromBar === s.toBar">Export only bar <b class="font-mono">{{ s.fromBar }}</b></span>
        <span v-else-if="s.renderOnlyBars">Export only bars <b class="font-mono">{{ s.fromBar }}–{{ s.toBar }}</b></span>
        <span v-else>Export only some bars</span>
      </label>
      <span
        v-if="s.renderOnlyBars"
        class="caption"
      >Drag the brackets, or press I and O at the playhead.</span>
    </div>
  </section>
</template>

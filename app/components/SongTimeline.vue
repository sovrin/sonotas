<script setup>
// Play, where you are (as a timecode and as a bar), the strip of bars, and
// whether the export covers the whole song or only some of its bars.
const { s, togglePlay, seekTo } = useSonotas()

const count = computed(() => (s.songBars.length || s.barStarts.length))

// Turning the range on starts it at the bar under the playhead; either way
// the preview rewinds to the start of what will be exported.
function toggleRange() {
  if (!s.renderOnlyBars && count.value) {
    const ms = s.time * 1000
    let i = 0
    while (i + 1 < s.barStarts.length && s.barStarts[i + 1] <= ms) i++
    s.fromBar = i + 1
    s.toBar = Math.min(i + 4, count.value)
  }
  s.renderOnlyBars = !s.renderOnlyBars
  seekTo(0)
}

// Tenths, the way an editor's timecode counts: 0:04.2
const tc = t => Math.floor(t / 60) + ':' + (t % 60).toFixed(1).padStart(4, '0')

const barNow = computed(() => {
  const ms = s.time * 1000
  let i = 0
  while (i + 1 < s.barStarts.length && s.barStarts[i + 1] <= ms) i++
  return (s.renderOnlyBars && s.songBars.length && s.barStarts.length !== s.songBars.length ? s.fromBar : 1) + i
})
</script>

<template>
  <section
    class="transport"
    aria-label="Timeline"
  >
    <button
      class="btn"
      data-icon
      data-size="l"
      :aria-label="s.playing ? 'Pause' : 'Play'"
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
      <span>of {{ count || '—' }} bars</span>
    </div>

    <div class="transport-range">
      <label>
        <input
          type="checkbox"
          role="switch"
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
      >Drag the brackets to change which.</span>
    </div>
  </section>
</template>

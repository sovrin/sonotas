<script setup>
const { s, v, togglePlay, seek } = useSonotas()
</script>

<template>
  <div class="transport">
    <button
      class="playbtn"
      :aria-label="s.playing ? 'Pause' : 'Play'"
      @click="togglePlay"
    >
      <UIcon
        :name="s.playing ? 'i-lucide-pause' : 'i-lucide-play'"
        size="16"
      />
    </button>
    <span class="time mono">{{ v.timeLabel }}</span>
    <input
      type="range"
      aria-label="Seek"
      min="0"
      :max="s.duration"
      step="0.01"
      :value="s.time"
      :style="{ '--p': v.scrubPct + '%' }"
      @input="seek"
    >
    <span class="time dur mono">{{ v.durLabel }}</span>
    <span class="bar mono">{{ v.barLabel }}</span>
  </div>
</template>

<script setup>
const { s, setField, setAspect } = useSonotas()

const ASPECTS = [
  { v: '16:9', label: '16:9', hint: 'YouTube' },
  { v: '9:16', label: '9:16', hint: 'Shorts, Reels, TikTok' },
  { v: '1:1', label: '1:1', hint: 'Square' }
]
</script>

<template>
  <div class="section">
    <h2>Video</h2>
    <div
      class="seg fill"
      role="group"
      aria-label="Aspect ratio"
    >
      <button
        v-for="a in ASPECTS"
        :key="a.v"
        :aria-pressed="s.aspect === a.v"
        :title="a.hint"
        @click="setAspect(a.v)"
      >
        {{ a.label }}
      </button>
    </div>
    <div class="row2">
      <label class="field">
        <span>Resolution</span>
        <select
          name="resolution"
          class="select"
          :value="s.resolution"
          @change="setField"
        >
          <option>1080p</option>
          <option>720p</option>
          <option>480p</option>
        </select>
      </label>
      <label class="field">
        <span>Frame rate</span>
        <select
          name="fps"
          class="select"
          :value="s.fps"
          @change="setField"
        >
          <option>24 fps</option>
          <option>30 fps</option>
          <option>60 fps</option>
        </select>
      </label>
    </div>
  </div>
</template>

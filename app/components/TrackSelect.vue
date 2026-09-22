<script setup>
const { s, setTrack } = useSonotas()
</script>

<template>
  <div
    v-if="s.tracks.length !== 1"
    class="section"
  >
    <h2>Track</h2>
    <label class="field">
      <select
        name="trackIndex"
        class="select"
        :value="s.trackIndex"
        :disabled="!s.tracks.length"
        @change="setTrack"
      >
        <option
          v-if="!s.tracks.length"
          :value="0"
        >
          Loading…
        </option>
        <option
          v-for="t in s.tracks"
          :key="t.index"
          :value="t.index"
        >
          {{ t.name }}
        </option>
      </select>
    </label>
  </div>
</template>

<script setup>
const { s, v, togglePlay, seek } = useSonotas()
</script>

<template>
  <div
    class="transport"
    style="display:flex;align-items:center;gap:16px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 16px"
  >
    <button
      aria-label="Play/pause"
      style="width:42px;height:42px;flex:none;border-radius:50%;border:1.5px solid var(--accent);background:var(--tint);color:var(--a2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s"
      @click="togglePlay"
    >
      <svg
        v-if="s.playing"
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <rect
          x="6"
          y="5"
          width="4"
          height="14"
          rx="1"
        />
        <rect
          x="14"
          y="5"
          width="4"
          height="14"
          rx="1"
        />
      </svg>
      <svg
        v-else
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="currentColor"
        style="margin-left:2px"
      >
        <path d="M7 5l12 7-12 7z" />
      </svg>
    </button>
    <span style="font-variant-numeric:tabular-nums;font-size:13px;color:var(--heading);min-width:38px">{{ v.timeLabel }}</span>
    <input
      type="range"
      aria-label="Seek"
      min="0"
      :max="s.duration"
      step="0.01"
      :value="s.time"
      :style="`background:${v.scrubBg};flex:1`"
      @change="seek"
      @input="seek"
    >
    <span style="font-variant-numeric:tabular-nums;font-size:13px;color:var(--t4);min-width:38px;text-align:right">{{ v.durLabel }}</span>
    <div
      class="bar-meta"
      style="width:1px;height:22px;background:var(--border2)"
    />
    <span
      class="bar-meta"
      style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--t3);white-space:nowrap"
    ><svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    ><rect
      x="3"
      y="5"
      width="18"
      height="14"
      rx="2"
    /><path
      d="M3 9h18M8 5v14"
    /></svg>{{ v.barLabel }}</span>
  </div>
</template>

<script setup>
const { s, setTrack } = useSonotas()
</script>

<template>
  <div style="padding:16px;border-bottom:1px solid var(--border-soft)">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--accent)"
        stroke-width="2"
        stroke-linecap="round"
      >
        <path d="M9 18V5l10-2v13" />
        <circle
          cx="6"
          cy="18"
          r="3"
        />
        <circle
          cx="16"
          cy="16"
          r="3"
        />
      </svg>
      <h3 style="font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--heading);margin:0;font-weight:600">
        Track
      </h3>
    </div>
    <label style="position:relative;display:block">
      <select
        name="trackIndex"
        :value="s.trackIndex"
        :disabled="!s.tracks.length"
        style="width:100%;appearance:none;-webkit-appearance:none;background:var(--inset);color:var(--text);border:1px solid var(--border2);border-radius:8px;padding:9px 32px 9px 11px;font:inherit;font-size:13.5px;cursor:pointer"
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
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--t4)"
        stroke-width="2"
        style="position:absolute;right:11px;top:50%;transform:translateY(-50%);pointer-events:none"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </label>
  </div>
</template>

<script setup>
const { s, v, toggle } = useSonotas()
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
        stroke-linejoin="round"
      >
        <path d="M20.6 13.4L11 3.8A2 2 0 0 0 9.6 3H4v5.6a2 2 0 0 0 .6 1.4l9.6 9.6a2 2 0 0 0 2.8 0l3.6-3.6a2 2 0 0 0 0-2.6z" />
        <circle
          cx="7.5"
          cy="7.5"
          r="1"
        />
      </svg>
      <h3 style="font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--heading);margin:0;font-weight:600">
        Labels
      </h3>
    </div>
    <button
      role="checkbox"
      :aria-checked="s.showTrackName"
      style="display:flex;align-items:center;gap:10px;width:100%;background:none;border:none;padding:6px 0;cursor:pointer;text-align:left"
      @click="toggle('showTrackName')"
    >
      <span :style="v.boxTrackName"><svg
        v-if="s.showTrackName"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--inset)"
        stroke-width="3.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      ><path d="M20 6L9 17l-5-5" /></svg></span>
      <span style="font-size:13.5px;color:var(--text)">Show track name</span>
    </button>
    <button
      role="checkbox"
      :aria-checked="s.showTempo"
      style="display:flex;align-items:center;gap:10px;width:100%;background:none;border:none;padding:6px 0;cursor:pointer;text-align:left"
      @click="toggle('showTempo')"
    >
      <span :style="v.boxTempo"><svg
        v-if="s.showTempo"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--inset)"
        stroke-width="3.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      ><path d="M20 6L9 17l-5-5" /></svg></span>
      <span style="font-size:13.5px;color:var(--text)">Show tempo marker</span>
    </button>
    <button
      role="checkbox"
      :aria-checked="s.showTimeSig"
      style="display:flex;align-items:center;gap:10px;width:100%;background:none;border:none;padding:6px 0;cursor:pointer;text-align:left"
      @click="toggle('showTimeSig')"
    >
      <span :style="v.boxTimeSig"><svg
        v-if="s.showTimeSig"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--inset)"
        stroke-width="3.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      ><path d="M20 6L9 17l-5-5" /></svg></span>
      <span style="font-size:13.5px;color:var(--text)">Show time signature</span>
    </button>
    <button
      role="checkbox"
      :aria-checked="s.showTitle"
      style="display:flex;align-items:center;gap:10px;width:100%;background:none;border:none;padding:6px 0;cursor:pointer;text-align:left"
      @click="toggle('showTitle')"
    >
      <span :style="v.boxTitle"><svg
        v-if="s.showTitle"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--inset)"
        stroke-width="3.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      ><path d="M20 6L9 17l-5-5" /></svg></span>
      <span style="font-size:13.5px;color:var(--text)">Show song title</span>
    </button>
    <button
      role="checkbox"
      :aria-checked="s.showChords"
      style="display:flex;align-items:center;gap:10px;width:100%;background:none;border:none;padding:6px 0;cursor:pointer;text-align:left"
      @click="toggle('showChords')"
    >
      <span :style="v.boxChords"><svg
        v-if="s.showChords"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--inset)"
        stroke-width="3.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      ><path d="M20 6L9 17l-5-5" /></svg></span>
      <span style="font-size:13.5px;color:var(--text)">Show chord diagrams</span>
    </button>
  </div>
</template>

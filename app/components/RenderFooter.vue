<script setup>
const { v, startRender } = useSonotas()
</script>

<template>
  <div style="padding:16px;border-top:1px solid var(--border);background:var(--surface)">
    <div style="display:flex;align-items:center;justify-content:space-between;font-size:11.5px;color:var(--t4);margin-bottom:11px">
      <span>Estimated output</span>
      <span style="color:var(--t2);font-variant-numeric:tabular-nums">{{ v.estLine }}</span>
    </div>
    <button
      class="render-btn"
      style="width:100%;display:flex;align-items:center;justify-content:center;gap:9px;height:48px;border-radius:10px;border:1.5px solid var(--accent);background:var(--tint2);color:var(--a3);font-family:inherit;font-weight:600;font-size:15px;cursor:pointer;box-shadow:0 0 24px var(--tint3);transition:background .15s,box-shadow .15s"
      @click="startRender"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M23 7l-7 5 7 5V7z" />
        <rect
          x="1"
          y="5"
          width="15"
          height="14"
          rx="2"
        />
      </svg>
      Render MP4
    </button>
  </div>
</template>

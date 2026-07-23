<script setup>
const { s, setField } = useSonotas()
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
      >
        <rect
          x="2"
          y="7"
          width="20"
          height="14"
          rx="2"
        />
        <path d="M17 2l-5 5-5-5" />
      </svg>
      <h3 style="font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--heading);margin:0;font-weight:600">
        Format
      </h3>
    </div>
    <div style="display:grid;grid-template-columns:1fr;gap:10px">
      <label style="position:relative;display:block">
        <div style="font-size:11px;color:var(--t3);margin-bottom:5px">Resolution</div>
        <select
          name="resolution"
          :value="s.resolution"
          style="width:100%;appearance:none;-webkit-appearance:none;background:var(--inset);color:var(--text);border:1px solid var(--border2);border-radius:8px;padding:9px 30px 9px 11px;font:inherit;font-size:13.5px;cursor:pointer"
          @change="setField"
        >
          <option>1080p</option>
          <option>720p</option>
          <option>480p</option>
        </select>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--t4)"
          stroke-width="2"
          style="position:absolute;right:10px;top:34px;pointer-events:none"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </label>
    </div>
  </div>
</template>

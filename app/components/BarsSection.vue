<script setup>
const { s, v, setNum, toggle } = useSonotas()
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
        <path d="M4 6v12M9 4v16M14 8v8M19 5v14" />
      </svg>
      <h3 style="font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--heading);margin:0;font-weight:600">
        Bars
      </h3>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <label>
        <div style="font-size:11px;color:var(--t3);margin-bottom:5px">From bar</div>
        <input
          type="number"
          name="fromBar"
          min="1"
          :max="s.toBar"
          :value="s.fromBar"
          style="width:100%;background:var(--inset);color:var(--text);border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font:inherit;font-size:13.5px"
          @input="setNum"
        ></label>
      <label>
        <div style="font-size:11px;color:var(--t3);margin-bottom:5px">To bar</div>
        <input
          type="number"
          name="toBar"
          :min="s.fromBar"
          :value="s.toBar"
          style="width:100%;background:var(--inset);color:var(--text);border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font:inherit;font-size:13.5px"
          @input="setNum"
        ></label>
    </div>
    <button
      role="checkbox"
      :aria-checked="s.renderOnlyBars"
      style="display:flex;align-items:center;gap:10px;width:100%;background:none;border:none;padding:6px 0;cursor:pointer;text-align:left"
      @click="toggle('renderOnlyBars')"
    >
      <span :style="v.boxOnlyBars"><svg
        v-if="s.renderOnlyBars"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--inset)"
        stroke-width="3.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      ><path d="M20 6L9 17l-5-5" /></svg></span>
      <span style="font-size:13.5px;color:var(--text)">Render only these bars</span>
    </button>
    <p style="font-size:11.5px;color:var(--t4);margin:8px 0 0;line-height:1.5">
      Applies when exporting an excerpt that starts after bar 1.
    </p>
  </div>
</template>

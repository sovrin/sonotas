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
        <path d="M4 4h16v16H4z" />
        <path d="M4 9h16M9 4v16" />
      </svg>
      <h3 style="font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--heading);margin:0;font-weight:600">
        Output
      </h3>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 12px">
      <label style="position:relative;display:block">
        <div style="font-size:11px;color:var(--t3);margin-bottom:5px">Notation size</div>
        <select
          name="notationSize"
          :value="s.notationSize"
          style="width:100%;appearance:none;-webkit-appearance:none;background:var(--inset);color:var(--text);border:1px solid var(--border2);border-radius:8px;padding:8px 28px 8px 10px;font:inherit;font-size:13px;cursor:pointer"
          @change="setField"
        >
          <option>80%</option>
          <option>100%</option>
          <option>120%</option>
          <option>150%</option>
        </select>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--t4)"
          stroke-width="2"
          style="position:absolute;right:9px;top:33px;pointer-events:none"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </label>
      <label style="position:relative;display:block">
        <div style="font-size:11px;color:var(--t3);margin-bottom:5px">Staves</div>
        <select
          name="staves"
          :value="s.staves"
          style="width:100%;appearance:none;-webkit-appearance:none;background:var(--inset);color:var(--text);border:1px solid var(--border2);border-radius:8px;padding:8px 28px 8px 10px;font:inherit;font-size:13px;cursor:pointer"
          @change="setField"
        >
          <option>Tab only</option>
          <option>Standard + Tab</option>
          <option>Standard only</option>
        </select>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--t4)"
          stroke-width="2"
          style="position:absolute;right:9px;top:33px;pointer-events:none"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </label>
      <label style="position:relative;display:block">
        <div style="font-size:11px;color:var(--t3);margin-bottom:5px">Frame rate</div>
        <select
          name="fps"
          :value="s.fps"
          style="width:100%;appearance:none;-webkit-appearance:none;background:var(--inset);color:var(--text);border:1px solid var(--border2);border-radius:8px;padding:8px 28px 8px 10px;font:inherit;font-size:13px;cursor:pointer"
          @change="setField"
        >
          <option>24 fps</option>
          <option>30 fps</option>
          <option>60 fps</option>
        </select>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--t4)"
          stroke-width="2"
          style="position:absolute;right:9px;top:33px;pointer-events:none"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </label>
      <label style="position:relative;display:block">
        <div style="font-size:11px;color:var(--t3);margin-bottom:5px">Quality</div>
        <select
          name="quality"
          :value="s.quality"
          style="width:100%;appearance:none;-webkit-appearance:none;background:var(--inset);color:var(--text);border:1px solid var(--border2);border-radius:8px;padding:8px 28px 8px 10px;font:inherit;font-size:13px;cursor:pointer"
          @change="setField"
        >
          <option>Standard</option>
          <option>High</option>
          <option>Max</option>
        </select>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--t4)"
          stroke-width="2"
          style="position:absolute;right:9px;top:33px;pointer-events:none"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </label>
      <label style="position:relative;display:block">
        <div style="font-size:11px;color:var(--t3);margin-bottom:5px">Layout</div>
        <select
          name="layout"
          :value="s.layout"
          style="width:100%;appearance:none;-webkit-appearance:none;background:var(--inset);color:var(--text);border:1px solid var(--border2);border-radius:8px;padding:8px 28px 8px 10px;font:inherit;font-size:13px;cursor:pointer"
          @change="setField"
        >
          <option>Page</option>
          <option>Scrolling line</option>
        </select>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--t4)"
          stroke-width="2"
          style="position:absolute;right:9px;top:33px;pointer-events:none"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </label>
      <label style="position:relative;display:block">
        <div style="font-size:11px;color:var(--t3);margin-bottom:5px">Scroll behaviour</div>
        <select
          name="scroll"
          :value="s.scroll"
          style="width:100%;appearance:none;-webkit-appearance:none;background:var(--inset);color:var(--text);border:1px solid var(--border2);border-radius:8px;padding:8px 28px 8px 10px;font:inherit;font-size:13px;cursor:pointer"
          @change="setField"
        >
          <option>Bar snap</option>
          <option>Continuous</option>
          <option>Off</option>
        </select>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--t4)"
          stroke-width="2"
          style="position:absolute;right:9px;top:33px;pointer-events:none"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </label>
    </div>
  </div>
</template>

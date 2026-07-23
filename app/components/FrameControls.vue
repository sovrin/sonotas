<script setup>
const { v, setAspect, setCanvasTheme } = useSonotas()
</script>

<template>
  <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--t4)">Frame</span>
      <div style="display:flex;background:var(--surface);border:1px solid var(--border2);border-radius:9px;padding:3px;gap:2px">
        <button
          :aria-pressed="v.is169"
          :style="v.chip169"
          @click="setAspect('16:9')"
        >
          16:9
        </button>
        <button
          :aria-pressed="v.is916"
          :style="v.chip916"
          @click="setAspect('9:16')"
        >
          9:16
        </button>
        <button
          :aria-pressed="v.is11"
          :style="v.chip11"
          @click="setAspect('1:1')"
        >
          1:1
        </button>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-left:auto">
      <span style="font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--t4)">Canvas</span>
      <div style="display:flex;background:var(--surface);border:1px solid var(--border2);border-radius:9px;padding:3px;gap:2px">
        <button
          :aria-pressed="v.isDarkCanvas"
          :style="v.chipDark"
          @click="setCanvasTheme('dark')"
        >
          Dark
        </button>
        <button
          :aria-pressed="v.isLightCanvas"
          :style="v.chipLight"
          @click="setCanvasTheme('light')"
        >
          Light
        </button>
      </div>
    </div>
  </div>
</template>

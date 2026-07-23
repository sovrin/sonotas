<script setup>
import { onMounted, ref } from 'vue'

const { s, registerCanvas } = useSonotas()
const canvasRef = ref(null)

onMounted(() => {
  if (canvasRef.value) registerCanvas(canvasRef.value)
})
</script>

<template>
  <div
    class="canvas-pad"
    style="background:var(--canvas);border:1px solid var(--border);border-radius:14px;padding:28px;display:flex;align-items:center;justify-content:center;min-height:460px;box-shadow:inset 0 1px 0 rgba(255,255,255,.02)"
  >
    <canvas
      v-show="s.ready"
      ref="canvasRef"
      style="max-width:100%;max-height:66vh;height:auto;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.55),0 0 0 1px var(--border-soft)"
    />
    <div
      v-if="!s.ready && !s.engineError"
      style="display:flex;align-items:center;gap:9px;color:var(--t4);font-size:13px"
    >
      <span style="width:16px;height:16px;flex:none;border-radius:50%;border:2px solid var(--tint3);border-top-color:var(--accent);animation:sp .8s linear infinite" />
      Loading score…
    </div>
    <div
      v-if="s.engineError"
      style="max-width:360px;text-align:center;color:var(--t3);font-size:12.5px;line-height:1.5"
    >
      Couldn’t render the score.<br>
      <span style="color:var(--t4)">{{ s.engineError }}</span>
    </div>
  </div>
</template>

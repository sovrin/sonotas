<script setup>
// The stage shows the live preview canvas, and the finished MP4 in its place
// once an export completes. The canvas stays mounted (v-show) because the
// store paints straight into it.
import { onMounted, ref } from 'vue'

const { s, v, registerCanvas, cancelRender } = useSonotas()
const canvasRef = ref(null)

onMounted(() => {
  if (canvasRef.value) registerCanvas(canvasRef.value)
})
</script>

<template>
  <div class="stage">
    <canvas
      v-show="s.ready && !s.videoUrl"
      ref="canvasRef"
    />

    <video
      v-if="s.videoUrl"
      :src="s.videoUrl"
      :poster="s.posterUrl || undefined"
      controls
      playsinline
      preload="metadata"
    />

    <div
      v-if="!s.ready && !s.engineError"
      class="stage-msg"
    >
      <span class="spinner" />
      Loading score…
    </div>

    <div
      v-if="s.engineError"
      class="stage-msg"
      style="flex-direction:column"
    >
      <span>Couldn’t render the score.</span>
      <span class="err">{{ s.engineError }}</span>
    </div>

    <div
      v-if="v.isRendering"
      class="stage-overlay"
    >
      <div class="mono">
        Exporting… {{ v.pct }}%
      </div>
      <div class="progress">
        <i :style="{ width: v.pct + '%' }" />
      </div>
      <div
        class="mono"
        style="font-size:12px;color:var(--t3)"
      >
        frame {{ v.frame }} / {{ v.totalFrames }}
      </div>
      <button
        class="btn"
        @click="cancelRender"
      >
        Cancel
      </button>
    </div>
  </div>
</template>

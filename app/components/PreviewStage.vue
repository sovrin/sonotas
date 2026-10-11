<script setup>
// The stage shows the live preview canvas, and the finished MP4 in its place
// once an export completes. The canvas stays mounted (v-show) because the
// store paints straight into it.
import { onMounted, ref } from 'vue'

const { s, v, registerCanvas } = useSonotas()
const canvasRef = ref(null)

onMounted(() => {
  if (canvasRef.value) registerCanvas(canvasRef.value)
})
</script>

<template>
  <section
    class="stage"
    data-grow
    :style="{ '--frame': s.aspect.replace(':', ' / ') }"
    aria-label="Preview"
  >
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
      class="cluster gap-2 text-s text-muted"
    >
      <span
        class="spinner"
        aria-hidden="true"
      ><span /></span>
      Reading the score…
    </div>

    <div
      v-if="s.engineError"
      class="alert"
      data-tone="danger"
      role="alert"
    >
      <div><strong>Couldn’t render the score.</strong> {{ s.engineError }}</div>
    </div>

    <div
      v-if="v.isRendering"
      class="overlay"
    >
      <div
        class="stack gap-2 items-center text-center"
        role="status"
      >
        <span class="render-pct">{{ v.pct }}%</span>
        <span class="text-s text-muted">{{ v.phase }} <span class="font-mono tabular">{{ v.frame }} / {{ v.totalFrames }}</span> frames</span>
      </div>
    </div>
  </section>
</template>

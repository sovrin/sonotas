<script setup>
// The goal of the page, pinned under the settings: what the export will make,
// the button that makes it, its progress, and the file once it exists.
const { s, v, startRender, cancelRender, closeRender, download } = useSonotas()

const scope = computed(() => {
  if (!s.renderOnlyBars) return 'Whole song'
  return s.fromBar === s.toBar ? `Bar ${s.fromBar}` : `Bars ${s.fromBar}–${s.toBar}`
})
</script>

<template>
  <footer
    class="export-panel stack gap-3"
    aria-label="Export"
  >
    <template v-if="v.isDone">
      <div
        class="stack gap-1"
        role="status"
      >
        <strong class="text-s">Your video is ready</strong>
        <span class="text-s text-muted font-mono tabular">{{ v.outName }} · {{ v.sizeLabel }}</span>
      </div>
      <button
        class="btn w-full"
        data-variant="primary"
        @click="download"
      >
        <i
          class="icon"
          data-icon="download"
        />
        Download MP4
      </button>
      <button
        class="btn w-full"
        data-size="s"
        data-variant="ghost"
        @click="closeRender"
      >
        {{ s.downloaded ? 'Back to preview' : 'Discard video' }}
      </button>
    </template>

    <template v-else-if="v.isRendering">
      <div class="stack gap-2">
        <div class="flex justify-between text-s">
          <span role="status">{{ v.phase }}</span>
          <span class="font-mono tabular">{{ v.pct }}%</span>
        </div>
        <progress
          :value="v.pct"
          max="100"
          aria-label="Export progress"
        />
      </div>
      <button
        class="btn w-full"
        data-size="s"
        @click="cancelRender"
      >
        Cancel export
      </button>
    </template>

    <template v-else>
      <div
        v-if="!s.canExport"
        class="alert"
        data-tone="warning"
        role="alert"
      >
        <div><strong>This browser can’t export video.</strong> Export needs the WebCodecs video encoder. Open sonotas in a recent Chrome or Edge.</div>
      </div>
      <div
        v-else-if="s.exportError"
        class="alert"
        data-tone="danger"
        role="alert"
      >
        <div><strong>Couldn’t export the video.</strong> {{ s.exportError }} Try again, or turn off Fast export under Output.</div>
      </div>
      <div class="stack gap-1">
        <span class="text-s">{{ scope }} · {{ v.aspectLabel }}</span>
        <span class="text-s font-mono tabular">{{ v.estLine }}</span>
      </div>
      <button
        class="btn w-full"
        data-variant="primary"
        :disabled="!s.ready || s.building || !s.canExport"
        @click="startRender"
      >
        Export MP4
      </button>
    </template>
  </footer>
</template>

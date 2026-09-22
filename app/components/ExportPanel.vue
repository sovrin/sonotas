<script setup>
// The one thing the page is for: the button that produces the MP4, and once
// it exists, the button that saves it.
const { s, v, startRender, closeRender, download } = useSonotas()
</script>

<template>
  <div class="export">
    <template v-if="v.isDone">
      <div class="meta">
        <span
          class="name"
          :title="v.outName"
        ><b>{{ v.outName }}</b></span>
        <span class="mono">{{ v.sizeLabel }}</span>
      </div>
      <button
        class="btn primary"
        @click="download"
      >
        <UIcon
          name="i-lucide-download"
          size="16"
        />
        Download MP4
      </button>
      <div class="actions">
        <span
          class="mono"
          style="font-size:12px;color:var(--t3)"
        >{{ v.resPx }} · {{ v.durLabel }}</span>
        <button
          class="linkbtn"
          @click="closeRender"
        >
          Back to preview
        </button>
      </div>
    </template>

    <template v-else>
      <div class="meta">
        <span class="mono">{{ v.estLine }}</span>
      </div>
      <button
        class="btn primary"
        :disabled="!s.ready || s.building || v.isRendering"
        @click="startRender"
      >
        Export MP4
      </button>
    </template>
  </div>
</template>

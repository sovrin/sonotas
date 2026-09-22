<script setup>
const { s, loadFile } = useSonotas()

const ACCEPT = '.gp,.gpx,.gp3,.gp4,.gp5,.xml,.musicxml,.mxl'
const fileInput = ref(null)

function onPick(e) {
  const file = e.target.files?.[0]
  if (file) loadFile(file)
  e.target.value = '' // allow re-picking the same file
}
</script>

<template>
  <div class="section">
    <h2>File</h2>
    <input
      ref="fileInput"
      type="file"
      :accept="ACCEPT"
      style="display:none"
      @change="onPick"
    >
    <div class="file-row">
      <div class="file-name">
        {{ s.sourceName }}
        <small>{{ s.isDemo ? 'Sample file' : 'Your file' }}</small>
      </div>
      <button
        class="btn"
        @click="fileInput?.click()"
      >
        <UIcon
          name="i-lucide-folder-open"
          size="14"
        />
        Open…
      </button>
    </div>
    <p
      v-if="s.loadError"
      class="hint error"
    >
      {{ s.loadError }}
    </p>
    <p
      v-else-if="s.isDemo"
      class="hint"
    >
      Drop your own .gp anywhere on the page to replace it.
    </p>
  </div>
</template>

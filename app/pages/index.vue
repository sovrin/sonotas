<script setup>
const { s, loadFile } = provideSonotas()

// Page-wide drag & drop: any file dropped anywhere replaces the loaded tab.
const dragDepth = ref(0)
const dragging = computed(() => dragDepth.value > 0)

function onDragEnter(e) {
  if (!e.dataTransfer?.types?.includes('Files')) return
  dragDepth.value++
}

function onDragLeave() {
  dragDepth.value = Math.max(0, dragDepth.value - 1)
}

function onDrop(e) {
  dragDepth.value = 0
  const file = e.dataTransfer?.files?.[0]
  if (file) loadFile(file)
}
</script>

<template>
  <div
    class="app"
    :data-theme="s.uiTheme"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <AppHeader />

    <main class="wrap workspace">
      <section style="min-width:0">
        <PreviewStage />
        <TransportBar v-if="!s.videoUrl" />
      </section>

      <SettingsPanel />
    </main>

    <AppFooter />

    <div
      v-if="dragging"
      class="drop-overlay"
    >
      Drop to load the file
    </div>
  </div>
</template>

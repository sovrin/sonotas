<script setup>
const { s, loadFile } = provideSonotas()

// aequitas reads the theme from <html data-theme>.
useHead({
  htmlAttrs: { 'data-theme': () => s.uiTheme }
})

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
    class="shell"
    data-header
    data-inspector
    data-float
    data-fill
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <AppHeader />

    <main>
      <FileHeader />
      <PreviewStage />
      <SongTimeline />
      <AppFooter />
    </main>

    <AppInspector />

    <!-- On a phone the credits close the page, after the settings. -->
    <AppFooter class="shell-credits" />

    <div
      class="dropzone"
      data-page
      :data-active="dragging || undefined"
    >
      <strong>Drop to load the file</strong>
    </div>
  </div>
</template>

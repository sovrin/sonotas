<script setup>
import { languages, setLanguage, t } from '~/utils/i18n'

// One prerendered page per language the build has texts for; another tag is a 404.
definePageMeta({ validate: route => languages.includes(route.params.lang) })
const route = useRoute()
const lang = computed(() => route.params.lang)
// Before anything renders, so the page renders in its language; again when the switcher moves on.
setLanguage(lang.value)
watch(lang, setLanguage)

const { s, loadFile } = provideSonotas()

// aequitas reads the theme and density from <html data-theme data-density>.
useHead({
  htmlAttrs: { 'lang': lang, 'data-theme': () => s.uiTheme, 'data-density': 'compact' },
  link: languages.map(l => ({ rel: 'alternate', hreflang: l, href: `/${l}/` }))
})
useSeoMeta({
  title: () => t('app.title'),
  description: () => t('app.description'),
  ogTitle: () => t('app.title'),
  ogDescription: () => t('app.description'),
  twitterCard: 'summary_large_image'
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
    data-fill
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- Reading or re-engraving the score: the preview catches up after. -->
    <div
      class="loading-bar"
      :data-active="s.building || undefined"
      :data-done="!s.building || undefined"
      aria-hidden="true"
    />

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

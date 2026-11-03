<script setup>
// Every setting, in tabs ordered the way a video is made: where the score sits
// in the picture, how it looks, what marks the playing note, what it sounds
// like, and the file that comes out, right above the Export button pinned below.
import { t } from '~/utils/i18n'

// Computed, so the labels follow the language.
const tabs = computed(() => [
  { id: 'frame', label: t('settings.tab.frame') },
  { id: 'look', label: t('settings.tab.look') },
  { id: 'playhead', label: t('settings.tab.playhead') },
  { id: 'sound', label: t('settings.tab.sound') },
  { id: 'output', label: t('settings.tab.output') }
])

// Settings hold still while an export reads them.
const { v } = useSonotas()

const current = ref('frame')
const tabEls = ref([])
const panels = ref(null)

// The tabs share one scroller; each opens at its top, not at the last one's offset.
watch(current, () => {
  if (panels.value) panels.value.scrollTop = 0
})

// Arrow keys move along the tabs (wrapping), Home/End jump to the ends.
function onKeydown(e, i) {
  const n = tabs.value.length
  const next = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key]
  if (next === undefined) return
  e.preventDefault()
  current.value = tabs.value[next].id
  tabEls.value[next]?.focus()
}
</script>

<template>
  <aside
    class="inspector"
    :aria-label="t('settings.label')"
  >
    <div
      class="tabs"
      role="tablist"
      :aria-label="t('settings.label')"
      :inert="v.isRendering"
    >
      <button
        v-for="(tab, i) in tabs"
        :id="`tab-${tab.id}`"
        :key="tab.id"
        ref="tabEls"
        role="tab"
        :aria-selected="current === tab.id ? 'true' : 'false'"
        :aria-controls="`panel-${tab.id}`"
        :tabindex="current === tab.id ? 0 : -1"
        @click="current = tab.id"
        @keydown="onKeydown($event, i)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div
      ref="panels"
      :inert="v.isRendering"
    >
      <FrameTab
        id="panel-frame"
        role="tabpanel"
        aria-labelledby="tab-frame"
        :hidden="current !== 'frame'"
      />
      <LookTab
        id="panel-look"
        role="tabpanel"
        aria-labelledby="tab-look"
        :hidden="current !== 'look'"
      />
      <PlayheadTab
        id="panel-playhead"
        role="tabpanel"
        aria-labelledby="tab-playhead"
        :hidden="current !== 'playhead'"
      />
      <SoundTab
        id="panel-sound"
        role="tabpanel"
        aria-labelledby="tab-sound"
        :hidden="current !== 'sound'"
      />
      <OutputTab
        id="panel-output"
        role="tabpanel"
        aria-labelledby="tab-output"
        :hidden="current !== 'output'"
      />
    </div>

    <ExportPanel />
  </aside>
</template>

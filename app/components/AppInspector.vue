<script setup>
// Every setting, in three tabs by what it changes: the file that comes out,
// how the score looks, and what moves with the music. Export sits pinned below.
const TABS = [
  { id: 'video', label: 'Output' },
  { id: 'score', label: 'Look' },
  { id: 'playhead', label: 'Motion' }
]

const current = ref('video')
const tabEls = ref([])

// Arrow keys move along the tabs (wrapping), Home/End jump to the ends.
function onKeydown(e, i) {
  const n = TABS.length
  const next = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key]
  if (next === undefined) return
  e.preventDefault()
  current.value = TABS[next].id
  tabEls.value[next]?.focus()
}
</script>

<template>
  <aside
    class="inspector"
    aria-label="Settings"
  >
    <div
      class="tabs"
      role="tablist"
      aria-label="Settings"
    >
      <button
        v-for="(t, i) in TABS"
        :id="`tab-${t.id}`"
        :key="t.id"
        ref="tabEls"
        role="tab"
        :aria-selected="current === t.id ? 'true' : 'false'"
        :aria-controls="`panel-${t.id}`"
        :tabindex="current === t.id ? 0 : -1"
        @click="current = t.id"
        @keydown="onKeydown($event, i)"
      >
        {{ t.label }}
      </button>
    </div>

    <div>
      <VideoTab
        id="panel-video"
        role="tabpanel"
        aria-labelledby="tab-video"
        :hidden="current !== 'video'"
      />
      <LookTab
        id="panel-score"
        role="tabpanel"
        aria-labelledby="tab-score"
        :hidden="current !== 'score'"
      />
      <MotionTab
        id="panel-playhead"
        role="tabpanel"
        aria-labelledby="tab-playhead"
        :hidden="current !== 'playhead'"
      />
    </div>

    <ExportPanel />
  </aside>
</template>

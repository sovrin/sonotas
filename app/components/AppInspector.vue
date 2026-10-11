<script setup>
// Every setting, in tabs ordered the way a video is made: where the score sits
// in the picture, how it looks, what marks the playing note, and the file that
// comes out, right above the Export button pinned below.
const TABS = [
  { id: 'frame', label: 'Frame' },
  { id: 'look', label: 'Look' },
  { id: 'playhead', label: 'Playhead' },
  { id: 'output', label: 'Output' }
]

const current = ref('frame')
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

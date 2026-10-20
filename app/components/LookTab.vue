<script setup>
// How the score looks: a theme first, then which staves, then what is drawn.
// Exact colours wait behind a fold. Where it sits is the Frame tab's job.
const { s, setField, setCanvasTheme, toggle } = useSonotas()
const route = useRoute()

const THEMES = [
  { v: 'dark', label: 'Dark', note: 'Light notation on near-black', bg: '#121316', fg: '#e8e9eb' },
  { v: 'light', label: 'Light', note: 'Ink on paper', bg: '#f5f7f9', fg: '#13161c' }
]

const STAVES = [
  { v: 'Tab only', label: 'Tab' },
  { v: 'Standard + Tab', label: 'Both' },
  { v: 'Standard only', label: 'Notes' }
]
const RHYTHM = [
  { v: 'Auto', label: 'Auto' },
  { v: 'Beams', label: 'Beams' },
  { v: 'Bars', label: 'Bars' },
  { v: 'None', label: 'None' }
]
const SHOW = [
  { key: 'showTitle', label: 'Song title', missing: () => !s.title },
  { key: 'showTuning', label: 'Tuning and capo', missing: () => !s.tuning },
  { key: 'showTrackName', label: 'Track name' },
  { key: 'showBarNumbers', label: 'Bar numbers' },
  { key: 'showTempo', label: 'Tempo marking' },
  { key: 'showChords', label: 'Chord diagrams', missing: () => !s.hasChords },
  { key: 'showLyrics', label: 'Lyrics', missing: () => !s.hasLyrics },
  { key: 'showSections', label: 'Section names', missing: () => !s.hasSections },
  { key: 'showDynamics', label: 'Dynamics and text' },
  { key: 'showFingering', label: 'Fingering and pick strokes' },
  // Only meaningful when the export starts mid-song.
  { key: 'showTimeSig', label: 'Time signature at the first bar', when: () => s.renderOnlyBars && s.fromBar > 1 },
  // Hidden unless the page is opened with ?attribution, so the line stays on by default.
  { key: 'showAttribution', label: '“rendered by alphaTab”', when: () => 'attribution' in route.query }
]
const shown = computed(() => SHOW.filter(i => !i.when || i.when()))
const isOn = item => s[item.key] && !(s.ready && item.missing?.())
const activeCount = computed(() => shown.value.filter(isOn).length)
const missing = computed(() => s.ready ? shown.value.filter(i => i.missing?.()).map(i => i.label) : [])

const COLOR_ROWS = [
  { name: 'bg', label: 'Background' },
  { name: 'fg', label: 'Notation' },
  { name: 'barNum', label: 'Bar numbers' }
]
// No bar-number colour to pick while bar numbers are hidden.
const colorRows = computed(() => COLOR_ROWS.filter(r => r.name !== 'barNum' || s.showBarNumbers))
</script>

<template>
  <div
    class="stack"
    data-divided
  >
    <InspectorGroup title="Theme">
      <div
        class="stack gap-2"
        role="radiogroup"
        aria-label="Theme"
      >
        <label
          v-for="t in THEMES"
          :key="t.v"
          class="choice"
        >
          <input
            type="radio"
            name="canvasTheme"
            :checked="s.theme === t.v"
            @change="setCanvasTheme(t.v)"
          >
          <span>
            <b>{{ t.label }}</b>
            <small>{{ t.note }}</small>
          </span>
          <i
            class="theme-thumb"
            :style="{ '--bg': t.bg, '--fg': t.fg, '--now': s.highlightColor }"
            aria-hidden="true"
          />
        </label>
      </div>
      <details class="accordion">
        <summary>Custom colours</summary>
        <div class="stack gap-3">
          <div
            v-for="row in colorRows"
            :key="row.name"
            class="flex items-center justify-between gap-3"
          >
            <label :for="row.name">{{ row.label }}</label>
            <span class="cluster gap-2">
              <span class="text-s text-muted font-mono uppercase">{{ s[row.name] }}</span>
              <input
                :id="row.name"
                type="color"
                class="input"
                :name="row.name"
                :value="s[row.name]"
                @input="setField"
              >
            </span>
          </div>
          <small class="text-muted">A colour picked here overrides the theme.</small>
        </div>
      </details>
    </InspectorGroup>

    <InspectorGroup title="Notation">
      <SegmentedField
        name="staves"
        label="Staves"
        :options="STAVES"
      />
      <SegmentedField
        v-if="s.staves !== 'Standard only'"
        name="tabRhythm"
        label="Rhythm under the tab"
        :options="RHYTHM"
      >
        <small
          v-if="s.tabRhythm === 'Auto'"
          class="text-muted"
        >As the file sets it: under the tab only when the file hides standard notation.</small>
      </SegmentedField>
    </InspectorGroup>

    <InspectorGroup title="Show elements">
      <template #toggle>
        <span class="text-s text-muted tabular">{{ activeCount }} active</span>
      </template>
      <div class="cluster gap-2">
        <label
          v-for="item in shown"
          :key="item.key"
          class="chip"
        >
          <input
            type="checkbox"
            :checked="isOn(item)"
            :disabled="s.ready && item.missing?.()"
            @change="toggle(item.key)"
          >
          <i
            class="icon"
            :data-icon="isOn(item) ? 'check' : s.ready && item.missing?.() ? 'minus' : 'plus'"
            aria-hidden="true"
          />
          {{ item.label }}
        </label>
      </div>
      <small
        v-if="missing.length"
        class="text-muted"
      >{{ new Intl.ListFormat('en').format(missing) }}: none in this file.</small>
    </InspectorGroup>
  </div>
</template>

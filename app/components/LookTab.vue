<script setup>
// How the score looks: a theme first, then which staves, then what is drawn.
// Exact colours wait behind a fold. Where it sits is the Frame tab's job.
const { s, setField, setCanvasTheme, toggle } = useSonotas()

const THEMES = [
  { v: 'dark', label: 'Dark', note: 'Light notation on near-black', bg: '#121316', fg: '#e8e9eb' },
  { v: 'light', label: 'Light', note: 'Ink on paper', bg: '#f7f7f4', fg: '#1c1c24' }
]

const STAVES = [
  { v: 'Tab only', label: 'Tab' },
  { v: 'Standard + Tab', label: 'Both' },
  { v: 'Standard only', label: 'Notes' }
]
const SHOW = [
  { key: 'showTitle', label: 'Song title', missing: () => !s.title, note: 'none in this file' },
  { key: 'showTrackName', label: 'Track name' },
  { key: 'showBarNumbers', label: 'Bar numbers' },
  { key: 'showTempo', label: 'Tempo marking' },
  { key: 'showChords', label: 'Chord diagrams', missing: () => !s.hasChords, note: 'none in this file' },
  // Only meaningful when the export starts mid-song.
  { key: 'showTimeSig', label: 'Time signature at the first bar', when: () => s.renderOnlyBars && s.fromBar > 1 },
  { key: 'showAttribution', label: '“rendered by alphaTab” line' }
]
const shown = computed(() => SHOW.filter(i => !i.when || i.when()))

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
              <span class="text-xs text-muted font-mono uppercase">{{ s[row.name] }}</span>
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
    </InspectorGroup>

    <InspectorGroup title="Show">
      <div class="stack gap-2">
        <label
          v-for="item in shown"
          :key="item.key"
        >
          <input
            type="checkbox"
            role="switch"
            :checked="s[item.key]"
            @change="toggle(item.key)"
          >
          <span>
            {{ item.label }}
            <small
              v-if="s.ready && item.missing?.()"
              class="text-muted"
            >· {{ item.note }}</small>
          </span>
        </label>
      </div>
    </InspectorGroup>
  </div>
</template>

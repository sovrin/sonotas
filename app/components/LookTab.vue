<script setup>
// How the score looks: a theme first, then which staves, then what is drawn.
// Exact colours wait behind a fold. Where it sits is the Frame tab's job.
import { t } from '~/utils/i18n'

const { s, setField, setCanvasTheme, toggle } = useSonotas()
const route = useRoute()

// Computed, so the texts follow a change of language.
const THEMES = computed(() => [
  { v: 'dark', label: t('look.theme.dark'), note: t('look.theme.dark.note'), bg: '#121316', fg: '#e8e9eb' },
  { v: 'light', label: t('look.theme.light'), note: t('look.theme.light.note'), bg: '#f5f7f9', fg: '#13161c' }
])

const STAVES = computed(() => [
  { v: 'Tab only', label: t('look.staves.tab') },
  { v: 'Standard + Tab', label: t('look.staves.both') },
  { v: 'Standard only', label: t('look.staves.notes') }
])
const RHYTHM = computed(() => [
  { v: 'Auto', label: t('look.rhythm.auto') },
  { v: 'Beams', label: t('look.rhythm.beams') },
  { v: 'Bars', label: t('look.rhythm.bars') },
  { v: 'None', label: t('look.rhythm.none') }
])
const SHOW = computed(() => [
  { key: 'showTitle', label: t('look.show.title'), missing: () => !s.title },
  { key: 'showTuning', label: t('look.show.tuning'), missing: () => !s.tuning },
  { key: 'showTrackName', label: t('look.show.track_name') },
  { key: 'showBarNumbers', label: t('look.show.bar_numbers') },
  { key: 'showTempo', label: t('look.show.tempo') },
  { key: 'showChords', label: t('look.show.chords'), missing: () => !s.hasChords },
  { key: 'showLyrics', label: t('look.show.lyrics'), missing: () => !s.hasLyrics },
  { key: 'showSections', label: t('look.show.sections'), missing: () => !s.hasSections },
  { key: 'showDynamics', label: t('look.show.dynamics') },
  { key: 'showFingering', label: t('look.show.fingering') },
  // Only meaningful when the export starts mid-song.
  { key: 'showTimeSig', label: t('look.show.time_sig'), when: () => s.renderOnlyBars && s.fromBar > 1 },
  // Hidden unless the page is opened with ?attribution, so the line stays on by default.
  // Not translated: it quotes the line the video draws, which stays English.
  { key: 'showAttribution', label: '“rendered by alphaTab”', when: () => 'attribution' in route.query }
])
const shown = computed(() => SHOW.value.filter(i => !i.when || i.when()))
const isOn = item => s[item.key] && !(s.ready && item.missing?.())
const activeCount = computed(() => shown.value.filter(isOn).length)
const missing = computed(() => s.ready ? shown.value.filter(i => i.missing?.()).map(i => i.label) : [])
// The list in the page's language, which the route names.
const missingList = computed(() => new Intl.ListFormat(route.params.lang || 'en').format(missing.value))

const COLOR_ROWS = computed(() => [
  { name: 'bg', label: t('look.color.bg') },
  { name: 'fg', label: t('look.color.fg') },
  { name: 'barNum', label: t('look.color.bar_numbers') }
])
// No bar-number colour to pick while bar numbers are hidden.
const colorRows = computed(() => COLOR_ROWS.value.filter(r => r.name !== 'barNum' || s.showBarNumbers))
</script>

<template>
  <div
    class="stack"
    data-divided
  >
    <InspectorGroup :title="t('look.theme')">
      <div
        class="stack gap-2"
        role="radiogroup"
        :aria-label="t('look.theme')"
      >
        <label
          v-for="th in THEMES"
          :key="th.v"
          class="choice"
        >
          <input
            type="radio"
            name="canvasTheme"
            :checked="s.theme === th.v"
            @change="setCanvasTheme(th.v)"
          >
          <span>
            <b>{{ th.label }}</b>
            <small>{{ th.note }}</small>
          </span>
          <i
            class="theme-thumb"
            :style="{ '--bg': th.bg, '--fg': th.fg, '--now': s.highlightColor }"
            aria-hidden="true"
          />
        </label>
      </div>
      <details class="accordion">
        <summary>{{ t('look.custom_colors') }}</summary>
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
          <RangeField
            name="staffLines"
            :label="t('look.staff_lines')"
            :min="20"
            :max="100"
            unit="%"
          />
          <small class="text-muted">{{ t('look.custom_colors.hint') }}</small>
        </div>
      </details>
    </InspectorGroup>

    <InspectorGroup :title="t('look.notation')">
      <SegmentedField
        name="staves"
        :label="t('look.staves')"
        :options="STAVES"
      />
      <SegmentedField
        v-if="s.staves !== 'Standard only'"
        name="tabRhythm"
        :label="t('look.rhythm')"
        :options="RHYTHM"
      >
        <small
          v-if="s.tabRhythm === 'Auto'"
          class="text-muted"
        >{{ t('look.rhythm.auto.hint') }}</small>
      </SegmentedField>
      <div class="field">
        <label>
          <input
            type="checkbox"
            role="switch"
            :checked="s.songBook"
            @change="toggle('songBook')"
          >
          {{ t('look.song_book') }}
        </label>
        <small class="text-muted">{{ t('look.song_book.hint') }}</small>
      </div>
    </InspectorGroup>

    <InspectorGroup :title="t('look.show')">
      <template #toggle>
        <span class="text-s text-muted tabular">{{ t('look.show.active', { n: activeCount }) }}</span>
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
      >{{ t('look.show.missing', { list: missingList }) }}</small>
    </InspectorGroup>
  </div>
</template>

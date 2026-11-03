<script setup>
// Where the score sits in the picture, decided in order: the picture's shape,
// how the score is laid out in it, how big it is, and how the view follows the
// music. Each control says what its current value does.
import { FREE_MAX, FREE_MIN, fitEdge } from '~/utils/frame'
import { t } from '~/utils/i18n'

const { s, v, setAspect, setLayout, toggle } = useSonotas()

// Computed, so the texts follow a change of language.
const ASPECTS = computed(() => [
  { v: '16:9', hint: t('frame.aspect.landscape.hint') },
  { v: '9:16', hint: t('frame.aspect.portrait.hint') },
  { v: '1:1', hint: t('frame.aspect.square.hint') },
  { v: 'Custom', label: t('frame.aspect.free'), hint: t('frame.aspect.free.hint') }
])
const aspectHint = computed(() => ASPECTS.value.find(a => a.v === s.aspect)?.hint)
// Held even, 240–3840 px and within a 4K frame's area; the field shows what was kept.
function setFree(e) {
  const n = Number(e.target.value)
  const name = e.target.name
  if (n > 0) s[name] = fitEdge(n, name === 'freeW' ? s.freeH : s.freeW)
  e.target.value = s[name]
}

const LAYOUTS = computed(() => [
  { v: 'Scrolling line', label: t('frame.layout.line'), hint: t('frame.layout.line.hint') },
  { v: 'Page', label: t('frame.layout.page'), hint: t('frame.layout.page.hint') }
])
const layoutHint = computed(() => LAYOUTS.value.find(l => l.v === s.layout)?.hint)
const BARS_PER_LINE = computed(() => ['Auto', '2', '3', '4', '6'].map(n => ({ v: n, label: n === 'Auto' ? t('frame.bars_per_line.auto') : n })))
const SPACINGS = computed(() => [
  { v: 'Tight', label: t('frame.spacing.tight'), hint: t('frame.spacing.tight.hint') },
  { v: 'Normal', label: t('frame.spacing.normal'), hint: t('frame.spacing.normal.hint') },
  { v: 'Wide', label: t('frame.spacing.wide'), hint: t('frame.spacing.wide.hint') }
])
const spacingHint = computed(() => SPACINGS.value.find(o => o.v === s.spacing)?.hint)

// Zoom has two modes: a notation size, or a number of bars that span the width
// (line layout only). The store keeps the latter as fitBars ('Off' | 'N bars').
const byBars = computed(() => !v.value.isPage && s.fitBars !== 'Off')
const bars = computed(() => parseInt(s.fitBars, 10) || 4)

function zoomBy(mode) {
  if (mode === 'bars') {
    s.fitBars = `${bars.value} bars`
  } else {
    s.fitBars = 'Off'
    s.currentBarOnly = false // isolating needs a bar count to frame
  }
}

function setBars(e) {
  const n = Number(e.target.value)
  s.fitBars = n === 1 ? '1 bar' : `${n} bars`
}

const SIZES = computed(() => [
  { v: '80%', label: t('frame.size.s') },
  { v: '100%', label: t('frame.size.m') },
  { v: '120%', label: t('frame.size.l') },
  { v: '150%', label: t('frame.size.xl') }
])

// Follow sets the playhead and the view apart; the knobs under them only show
// where they do something. Page layout moves down, not across: it steps per
// line, and has nothing to track or run past.
const PLAYHEADS = computed(() => [
  { v: 'jump', label: t('frame.playhead.jump'), hint: t('frame.playhead.jump.hint') },
  { v: 'glide', label: t('frame.playhead.glide'), hint: t('frame.playhead.glide.hint') }
])
const playheadHint = computed(() => PLAYHEADS.value.find(p => p.v === s.playhead)?.hint)

const VIEWS = computed(() => [
  { v: 'bar', label: t('frame.view.bar'), hint: t('frame.view.bar.hint'), centred: t('frame.view.bar.centred.hint'), page: t('frame.view.bar.page.hint'), pageLabel: t('frame.view.line') },
  { v: 'screen', label: t('frame.view.screen'), hint: t('frame.view.screen.hint'), page: t('frame.view.screen.page.hint') },
  { v: 'track', label: t('frame.view.track'), hint: t('frame.view.track.hint'), line: true }
])
// Showing only the current bars leaves no screen to turn.
const views = computed(() => VIEWS.value
  .filter(o => !(v.value.isPage && o.line) && !(s.currentBarOnly && o.v === 'screen'))
  .map(o => ({ ...o, label: (v.value.isPage && o.pageLabel) || o.label })))
const viewHint = computed(() => {
  const o = VIEWS.value.find(x => x.v === s.view)
  if (!o) return ''
  if (v.value.isPage) return o.page ?? o.hint
  // Framed bars are centred instead of pinned left in the bar view.
  return (byBars.value && o.centred) || o.hint
})

const TRANSITIONS = computed(() => [
  { v: 0, label: t('frame.transition.cut') },
  { v: 250, label: t('frame.transition.quick') },
  { v: 600, label: t('frame.transition.slow') }
])
const transitionHint = computed(() => {
  if (s.view === 'track') return s.transition ? t('frame.transition.track.hint') : t('frame.transition.track.cut.hint')
  return s.transition ? t('frame.transition.hint') : t('frame.transition.cut.hint')
})

// Where now sits: the leading bar's left edge, the playhead, or the current
// line's middle. Centred bars (framed or alone) leave nothing to place.
const showAt = computed(() => s.view !== 'screen' && !s.currentBarOnly && !(byBars.value && s.view === 'bar'))
const at = computed(() => s.followAt)
const atLabel = computed(() => v.value.isPage ? t('frame.at.page') : s.view === 'track' ? t('frame.at.track') : t('frame.at.bar'))
const atHint = computed(() => {
  if (v.value.isPage) return t('frame.at.page.hint', { n: at.value })
  if (s.view === 'track') return at.value < 50 ? t('frame.at.track.ahead.hint', { n: at.value }) : t('frame.at.track.hint', { n: at.value })
  return t('frame.at.bar.hint', { n: at.value })
})
function setAt(e) {
  s.followAt = Number(e.target.value)
}
// Each view has its own natural spot (a bar near the left edge, the playhead
// or a line mid-frame); picking a view or a layout starts there again. Only
// when picked here: a link's settings keep their own spot.
function resetAt() {
  s.followAt = v.value.isPage || s.view === 'track' ? 50 : 5
}
function pickView(x) {
  s.view = x
  resetAt()
}
function pickLayout(l) {
  setLayout(l)
  resetAt()
}
</script>

<template>
  <div
    class="stack"
    data-divided
  >
    <InspectorGroup :title="t('frame.shape')">
      <div class="field">
        <div
          class="segmented"
          data-fill
          role="radiogroup"
          :aria-label="t('frame.shape')"
        >
          <label
            v-for="a in ASPECTS"
            :key="a.v"
          >
            <input
              type="radio"
              name="aspect"
              :checked="s.aspect === a.v"
              @change="setAspect(a.v)"
            >
            <span>{{ a.label ?? a.v }}</span>
          </label>
        </div>
        <small>{{ aspectHint }}</small>
      </div>
      <div
        v-if="s.aspect === 'Custom'"
        class="field"
      >
        <div class="flex items-center gap-2">
          <input
            type="number"
            class="input"
            name="freeW"
            :aria-label="t('frame.free.width')"
            :min="FREE_MIN"
            :max="FREE_MAX"
            step="8"
            :value="s.freeW"
            @change="setFree"
          >
          <span aria-hidden="true">×</span>
          <input
            type="number"
            class="input"
            name="freeH"
            :aria-label="t('frame.free.height')"
            :min="FREE_MIN"
            :max="FREE_MAX"
            step="8"
            :value="s.freeH"
            @change="setFree"
          >
        </div>
        <small>{{ t('frame.free.hint') }}</small>
      </div>
    </InspectorGroup>

    <InspectorGroup :title="t('frame.layout')">
      <div class="field">
        <div
          class="segmented"
          data-fill
          role="radiogroup"
          :aria-label="t('frame.layout')"
        >
          <label
            v-for="l in LAYOUTS"
            :key="l.v"
          >
            <input
              type="radio"
              name="layout"
              :checked="s.layout === l.v"
              @change="pickLayout(l.v)"
            >
            <span>{{ l.label }}</span>
          </label>
        </div>
        <small>{{ layoutHint }}</small>
      </div>
      <SegmentedField
        v-if="v.isPage"
        name="barsPerLine"
        :label="t('frame.bars_per_line')"
        :options="BARS_PER_LINE"
      >
        <small>{{ s.barsPerLine === 'Auto' ? t('frame.bars_per_line.auto.hint') : t('frame.bars_per_line.fixed.hint', { n: s.barsPerLine }) }}</small>
      </SegmentedField>
    </InspectorGroup>

    <InspectorGroup :title="t('frame.zoom')">
      <div
        v-if="!v.isPage"
        class="field"
      >
        <div
          class="segmented"
          data-fill
          role="radiogroup"
          :aria-label="t('frame.zoom.by')"
        >
          <label>
            <input
              type="radio"
              name="zoomBy"
              :checked="!byBars"
              @change="zoomBy('size')"
            >
            <span>{{ t('frame.zoom.by.size') }}</span>
          </label>
          <label>
            <input
              type="radio"
              name="zoomBy"
              :checked="byBars"
              @change="zoomBy('bars')"
            >
            <span>{{ t('frame.zoom.by.bars') }}</span>
          </label>
        </div>
      </div>

      <template v-if="byBars">
        <div class="field">
          <label
            for="fitBars"
            class="flex justify-between"
          >
            <span>{{ t('frame.fit_bars') }}</span>
            <span class="tabular">{{ bars }}</span>
          </label>
          <input
            id="fitBars"
            type="range"
            min="1"
            max="8"
            step="1"
            :value="bars"
            :style="{ '--value': ((bars - 1) / 7) * 100 + '%' }"
            @input="setBars"
          >
          <small>{{ t('frame.fit_bars.hint', { n: bars }) }}</small>
        </div>
        <label>
          <input
            type="checkbox"
            role="switch"
            :checked="s.currentBarOnly"
            @change="toggle('currentBarOnly')"
          >
          {{ t('frame.only_bars', { n: bars }) }}
        </label>
      </template>

      <SegmentedField
        v-else
        name="notationSize"
        :label="t('frame.size')"
        :options="SIZES"
      >
        <small>{{ v.isPage ? t('frame.size.page.hint') : t('frame.size.line.hint') }}</small>
      </SegmentedField>

      <SegmentedField
        name="spacing"
        :label="t('frame.spacing')"
        :options="SPACINGS"
      >
        <small>{{ spacingHint }}</small>
      </SegmentedField>
    </InspectorGroup>

    <InspectorGroup :title="t('frame.follow')">
      <SegmentedField
        name="playhead"
        :label="t('frame.playhead')"
        :options="PLAYHEADS"
      >
        <small>{{ playheadHint }}</small>
      </SegmentedField>

      <SegmentedField
        name="view"
        :label="t('frame.view')"
        :options="views"
        :set="pickView"
      >
        <small>{{ viewHint }}</small>
      </SegmentedField>

      <SegmentedField
        name="transition"
        :label="t('frame.transition')"
        :options="TRANSITIONS"
      >
        <small>{{ transitionHint }}</small>
      </SegmentedField>

      <div
        v-if="showAt"
        class="field"
      >
        <label
          for="followAt"
          class="flex justify-between"
        >
          <span>{{ atLabel }}</span>
          <span class="tabular">{{ at }}%</span>
        </label>
        <input
          id="followAt"
          type="range"
          min="0"
          max="90"
          step="5"
          :value="at"
          :style="{ '--value': (at / 90) * 100 + '%' }"
          @input="setAt"
        >
        <small>{{ atHint }}</small>
      </div>

      <label v-if="s.view === 'screen'">
        <input
          type="checkbox"
          role="switch"
          :checked="s.turnEarly"
          @change="toggle('turnEarly')"
        >
        {{ v.isPage ? t('frame.turn_early.line') : t('frame.turn_early.bar') }}
      </label>

      <template v-if="s.view === 'track' && !v.isPage">
        <label>
          <input
            type="checkbox"
            role="switch"
            :checked="s.steady"
            @change="toggle('steady')"
          >
          {{ t('frame.steady') }}
        </label>
        <label>
          <input
            type="checkbox"
            role="switch"
            :checked="s.runPast"
            @change="toggle('runPast')"
          >
          {{ t('frame.run_past') }}
        </label>
      </template>
    </InspectorGroup>
  </div>
</template>

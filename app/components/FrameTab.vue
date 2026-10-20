<script setup>
// Where the score sits in the picture, decided in order: the picture's shape,
// how the score is laid out in it, how big it is, and how the view follows the
// music. Each control says what its current value does.
const { s, v, setAspect, setLayout, toggle } = useSonotas()

const ASPECTS = [
  { v: '16:9', hint: 'Landscape, for YouTube.' },
  { v: '9:16', hint: 'Portrait, for Shorts, Reels and TikTok.' },
  { v: '1:1', hint: 'Square, for feeds.' }
]
const aspectHint = computed(() => ASPECTS.find(a => a.v === s.aspect)?.hint)

const LAYOUTS = [
  { v: 'Scrolling line', label: 'Line', hint: 'One long line of notation running through the frame.' },
  { v: 'Page', label: 'Page', hint: 'Lines stacked like printed sheet music; the view moves down.' }
]
const layoutHint = computed(() => LAYOUTS.find(l => l.v === s.layout)?.hint)
const BARS_PER_LINE = ['Auto', '2', '3', '4', '6'].map(n => ({ v: n, label: n }))
const SPACINGS = [
  { v: 'Tight', label: 'Tight', hint: 'Notes sit close together, so more bars fit.' },
  { v: 'Normal', label: 'Normal', hint: 'The spacing alphaTab engraves by default.' },
  { v: 'Wide', label: 'Wide', hint: 'Notes spread out, so each bar reads more easily.' }
]
const spacingHint = computed(() => SPACINGS.find(o => o.v === s.spacing)?.hint)

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

const SIZES = [
  { v: '80%', label: 'S' },
  { v: '100%', label: 'M' },
  { v: '120%', label: 'L' },
  { v: '150%', label: 'XL' }
]

// Follow sets the playhead and the view apart; the knobs under them only show
// where they do something. Page layout moves down, not across: it steps per
// line, and has nothing to track or run past.
const PLAYHEADS = [
  { v: 'jump', label: 'Jump', hint: 'The playhead steps from note to note.' },
  { v: 'glide', label: 'Glide', hint: 'The playhead sweeps through each bar in time.' }
]
const playheadHint = computed(() => PLAYHEADS.find(p => p.v === s.playhead)?.hint)

const VIEWS = [
  { v: 'bar', label: 'Bar', hint: 'The view moves once per bar.', centred: 'The view moves once per bar, keeping the bars centred.', page: 'The view moves once per line.', pageLabel: 'Line' },
  { v: 'screen', label: 'Screen', hint: 'The view holds still, then turns a whole screen.', page: 'The view holds a screenful of lines, then turns the page.' },
  { v: 'track', label: 'Track', hint: 'The view moves all the time, keeping the playhead in place.', line: true }
]
// Showing only the current bars leaves no screen to turn.
const views = computed(() => VIEWS
  .filter(o => !(v.value.isPage && o.line) && !(s.currentBarOnly && o.v === 'screen'))
  .map(o => ({ ...o, label: (v.value.isPage && o.pageLabel) || o.label })))
const viewHint = computed(() => {
  const o = VIEWS.find(x => x.v === s.view)
  if (!o) return ''
  if (v.value.isPage) return o.page ?? o.hint
  // Framed bars are centred instead of pinned left in the bar view.
  return (byBars.value && o.centred) || o.hint
})

const TRANSITIONS = [
  { v: 0, label: 'Cut' },
  { v: 250, label: 'Quick' },
  { v: 600, label: 'Slow' }
]
const transitionHint = computed(() => {
  if (s.view === 'track') return s.transition ? 'How the view moves over to repeats and jumps.' : 'The view cuts to repeats and jumps.'
  return s.transition ? 'How long the view takes to move over.' : 'The view cuts straight to its new place.'
})

// Where now sits: the leading bar's left edge, the playhead, or the current
// line's middle. Centred bars (framed or alone) leave nothing to place.
const showAt = computed(() => s.view !== 'screen' && !s.currentBarOnly && !(byBars.value && s.view === 'bar'))
const at = computed(() => s.followAt)
const atLabel = computed(() => v.value.isPage ? 'Current line sits at' : s.view === 'track' ? 'Playhead sits at' : 'Current bar starts at')
const atHint = computed(() => {
  if (v.value.isPage) return `${at.value}% down the frame.`
  if (s.view === 'track') return at.value < 50 ? `${at.value}% across, leaving more of what is coming in view.` : `${at.value}% across the frame.`
  return `${at.value}% in from the left edge.`
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
    <InspectorGroup title="Shape">
      <div class="field">
        <div
          class="segmented"
          data-fill
          role="radiogroup"
          aria-label="Shape"
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
            <span>{{ a.v }}</span>
          </label>
        </div>
        <small>{{ aspectHint }}</small>
      </div>
    </InspectorGroup>

    <InspectorGroup title="Layout">
      <div class="field">
        <div
          class="segmented"
          data-fill
          role="radiogroup"
          aria-label="Layout"
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
        label="Bars per line"
        :options="BARS_PER_LINE"
      >
        <small>{{ s.barsPerLine === 'Auto' ? 'As many bars as fit the width.' : `${s.barsPerLine} bars on every line, squeezed or stretched to fit.` }}</small>
      </SegmentedField>
    </InspectorGroup>

    <InspectorGroup title="Zoom">
      <div
        v-if="!v.isPage"
        class="field"
      >
        <div
          class="segmented"
          data-fill
          role="radiogroup"
          aria-label="Zoom by"
        >
          <label>
            <input
              type="radio"
              name="zoomBy"
              :checked="!byBars"
              @change="zoomBy('size')"
            >
            <span>Size</span>
          </label>
          <label>
            <input
              type="radio"
              name="zoomBy"
              :checked="byBars"
              @change="zoomBy('bars')"
            >
            <span>Bars across</span>
          </label>
        </div>
      </div>

      <template v-if="byBars">
        <div class="field">
          <label
            for="fitBars"
            class="flex justify-between"
          >
            <span>Bars across the frame</span>
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
          <small>The notation is sized so {{ bars === 1 ? 'one bar spans' : `${bars} bars span` }} the width.</small>
        </div>
        <label>
          <input
            type="checkbox"
            role="switch"
            :checked="s.currentBarOnly"
            @change="toggle('currentBarOnly')"
          >
          {{ bars === 1 ? 'Show only this bar' : `Show only these ${bars} bars` }}
        </label>
      </template>

      <SegmentedField
        v-else
        name="notationSize"
        label="Notation size"
        :options="SIZES"
      >
        <small>{{ v.isPage ? 'Larger notation fits fewer bars on each line.' : 'Larger notation shows fewer bars at once.' }}</small>
      </SegmentedField>

      <SegmentedField
        name="spacing"
        label="Spacing"
        :options="SPACINGS"
      >
        <small>{{ spacingHint }}</small>
      </SegmentedField>
    </InspectorGroup>

    <InspectorGroup title="Follow">
      <SegmentedField
        name="playhead"
        label="Playhead"
        :options="PLAYHEADS"
      >
        <small>{{ playheadHint }}</small>
      </SegmentedField>

      <SegmentedField
        name="view"
        label="View"
        :options="views"
        :set="pickView"
      >
        <small>{{ viewHint }}</small>
      </SegmentedField>

      <SegmentedField
        name="transition"
        label="Transition"
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
        Turn a {{ v.isPage ? 'line' : 'bar' }} early, so what comes next is in view
      </label>

      <template v-if="s.view === 'track' && !v.isPage">
        <label>
          <input
            type="checkbox"
            role="switch"
            :checked="s.steady"
            @change="toggle('steady')"
          >
          Steady speed through busy and sparse passages
        </label>
        <label>
          <input
            type="checkbox"
            role="switch"
            :checked="s.runPast"
            @change="toggle('runPast')"
          >
          Keep the playhead in place past the song's ends
        </label>
      </template>
    </InspectorGroup>
  </div>
</template>

<script setup>
// Where the score sits in the picture, decided in order: the picture's shape,
// how the score is laid out in it, how big it is, and how the view follows the
// music. Each control says what its current value does.
const { s, v, setAspect, setLayout, toggle } = useSonotas()

const ASPECTS = [
  { v: '16:9', w: 16, h: 9, hint: 'Landscape, for YouTube.' },
  { v: '9:16', w: 9, h: 16, hint: 'Portrait, for Shorts, Reels and TikTok.' },
  { v: '1:1', w: 1, h: 1, hint: 'Square, for feeds.' }
]
const aspectHint = computed(() => ASPECTS.find(a => a.v === s.aspect)?.hint)

const LAYOUTS = [
  { v: 'Scrolling line', label: 'Line', hint: 'One long line of notation running through the frame.' },
  { v: 'Page', label: 'Page', hint: 'Lines stacked like printed sheet music; the view moves down.' }
]
const layoutHint = computed(() => LAYOUTS.find(l => l.v === s.layout)?.hint)

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

// Page layout moves down, not across: centring has nothing to centre there.
const FOLLOWS = [
  { v: 'Bar snap', label: 'Snap', hint: 'The view cuts to each new bar.', centred: 'The view cuts to each new bar, centred.', page: 'The view cuts to each new line.' },
  { v: 'Bar pan', label: 'Pan', hint: 'The view slides over to each new bar.', centred: 'The view slides over to each new bar, centred.', page: 'The view slides down to each new line.' },
  { v: 'Continuous', label: 'Smooth', hint: 'The view glides along with the music.', page: 'The playhead glides; the view slides down to each new line.' },
  { v: 'Centered', label: 'Center', hint: 'The playhead stays mid-frame and the score runs under it.', line: true }
]
const follows = computed(() => FOLLOWS.filter(f => !v.value.isPage || !f.line))
const followHint = computed(() => {
  const f = FOLLOWS.find(o => o.v === s.scroll)
  if (!f) return ''
  if (v.value.isPage) return f.page ?? f.hint
  // Framed bars are centred instead of pinned left when snapping or panning.
  return (byBars.value && f.centred) || f.hint
})

// A page has no bars-across zoom to isolate, and nothing to centre across:
// drop both, since their switches are hidden there.
watch(() => v.value.isPage, (page) => {
  if (!page) return
  s.currentBarOnly = false
  if (s.scroll === 'Centered') s.scroll = 'Continuous'
})
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
            <span>
              <i
                class="ratio-glyph"
                :style="{ aspectRatio: `${a.w} / ${a.h}` }"
                aria-hidden="true"
              />
              {{ a.v }}
            </span>
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
              @change="setLayout(l.v)"
            >
            <span>{{ l.label }}</span>
          </label>
        </div>
        <small>{{ layoutHint }}</small>
      </div>
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
    </InspectorGroup>

    <InspectorGroup title="Follow">
      <SegmentedField
        name="scroll"
        label="How the view follows the music"
        :options="follows"
      >
        <small>{{ followHint }}</small>
      </SegmentedField>
    </InspectorGroup>
  </div>
</template>

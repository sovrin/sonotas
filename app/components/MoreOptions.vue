<script setup>
// Everything beyond the defaults, grouped by what it changes. Slider fill is a
// CSS custom property so the track shows how far along the range the value is.
const { s, v, setField, setNum, toggle, setHighlightColor, setActiveNoteColor } = useSonotas()

const HL_COLORS = [
  { hex: '#e0a94c', name: 'Amber' },
  { hex: '#8f97ac', name: 'Grey' },
  { hex: '#46a758', name: 'Green' },
  { hex: '#5b8def', name: 'Blue' }
]
const NOTE_COLORS = [
  { hex: '#e5484d', name: 'Red' },
  { hex: '#e0a94c', name: 'Amber' },
  { hex: '#46a758', name: 'Green' },
  { hex: '#5b8def', name: 'Blue' }
]
const COLOR_ROWS = [
  { name: 'bg', label: 'Background' },
  { name: 'fg', label: 'Notation' },
  { name: 'barNum', label: 'Bar numbers' }
]

// No bar-number colour to pick while bar numbers are hidden.
const colorRows = computed(() => COLOR_ROWS.filter(r => r.name !== 'barNum' || s.showBarNumbers))

const pct = (val, min, max) => ({ '--p': ((val - min) / (max - min)) * 100 + '%' })
</script>

<template>
  <div>
    <div class="section">
      <h2>Notation</h2>
      <div class="row2">
        <label class="field">
          <span>Staves</span>
          <select
            name="staves"
            class="select"
            :value="s.staves"
            @change="setField"
          >
            <option>Tab only</option>
            <option>Standard + Tab</option>
            <option>Standard only</option>
          </select>
        </label>
        <label class="field">
          <span>Size</span>
          <select
            name="notationSize"
            class="select"
            :value="s.notationSize"
            @change="setField"
          >
            <option>80%</option>
            <option>100%</option>
            <option>120%</option>
            <option>150%</option>
          </select>
        </label>
      </div>
      <div class="sub">
        <label class="check">
          <input
            type="checkbox"
            :checked="s.showTrackName"
            @change="toggle('showTrackName')"
          >
          Track name
        </label>
        <label class="check">
          <input
            type="checkbox"
            :checked="s.showBarNumbers"
            @change="toggle('showBarNumbers')"
          >
          Bar numbers
        </label>
        <label class="check">
          <input
            type="checkbox"
            :checked="s.showTempo"
            @change="toggle('showTempo')"
          >
          Tempo marking
        </label>
        <label class="check">
          <input
            type="checkbox"
            :checked="s.showTitle"
            @change="toggle('showTitle')"
          >
          Song title
          <span
            v-if="s.ready && !s.title"
            class="muted"
          >(none in this file)</span>
        </label>
        <label class="check">
          <input
            type="checkbox"
            :checked="s.showChords"
            @change="toggle('showChords')"
          >
          Chord diagrams
          <span
            v-if="s.ready && !s.hasChords"
            class="muted"
          >(no chords in this file)</span>
        </label>
      </div>
    </div>

    <div class="section">
      <h2>Bars</h2>
      <label class="check">
        <input
          type="checkbox"
          :checked="s.renderOnlyBars"
          @change="toggle('renderOnlyBars')"
        >
        Export only a range of bars
      </label>
      <template v-if="s.renderOnlyBars">
        <div class="row2">
          <label class="field">
            <span>From bar</span>
            <input
              type="number"
              name="fromBar"
              class="input"
              min="1"
              :max="s.toBar"
              :value="s.fromBar"
              @input="setNum"
            >
          </label>
          <label class="field">
            <span>To bar</span>
            <input
              type="number"
              name="toBar"
              class="input"
              :min="s.fromBar"
              :value="s.toBar"
              @input="setNum"
            >
          </label>
        </div>
        <label
          v-if="s.fromBar > 1"
          class="check"
          style="margin-top:8px"
        >
          <input
            type="checkbox"
            :checked="s.showTimeSig"
            @change="toggle('showTimeSig')"
          >
          Repeat the time signature at the first bar
        </label>
      </template>
    </div>

    <div class="section">
      <h2>Motion</h2>
      <div class="row2">
        <label class="field">
          <span>Speed</span>
          <select
            name="speed"
            class="select"
            :value="s.speed"
            @change="setField"
          >
            <option>0.25×</option>
            <option>0.5×</option>
            <option>0.75×</option>
            <option>1×</option>
            <option>1.25×</option>
            <option>1.5×</option>
            <option>2×</option>
          </select>
        </label>
        <label class="field">
          <span>Scrolling</span>
          <select
            name="scroll"
            class="select"
            :value="s.scroll"
            @change="setField"
          >
            <option>Bar snap</option>
            <option>Bar pan</option>
            <option>Continuous</option>
          </select>
        </label>
      </div>
      <p class="hint">
        Speed also scales the length of the exported video.
      </p>
    </div>

    <div class="section">
      <h2>Playhead</h2>
      <div class="range-label">
        <span>Opacity</span><b class="mono">{{ s.cursorOpacity }}%</b>
      </div>
      <input
        type="range"
        name="cursorOpacity"
        aria-label="Playhead opacity"
        min="10"
        max="100"
        step="1"
        :value="s.cursorOpacity"
        :style="pct(s.cursorOpacity, 10, 100)"
        @input="setNum"
      >
      <div class="range-label">
        <span>Width</span><b class="mono">{{ s.cursorWidth }} px</b>
      </div>
      <input
        type="range"
        name="cursorWidth"
        aria-label="Playhead width"
        min="1"
        max="10"
        step="1"
        :value="s.cursorWidth"
        :style="pct(s.cursorWidth, 1, 10)"
        @input="setNum"
      >
      <div class="range-label">
        <span>Horizontal offset</span><b class="mono">{{ s.cursorOffset }} px</b>
      </div>
      <input
        type="range"
        name="cursorOffset"
        aria-label="Playhead offset"
        min="-100"
        max="100"
        step="1"
        :value="s.cursorOffset"
        :style="pct(s.cursorOffset, -100, 100)"
        @input="setNum"
      >
      <p
        v-if="v.isPage"
        class="hint"
      >
        In page layout the playhead always spans the current bar.
      </p>
      <label
        v-else
        class="check"
        style="margin-top:8px"
      >
        <input
          type="checkbox"
          :checked="s.cursorMatchBar"
          @change="toggle('cursorMatchBar')"
        >
        Same height as the current bar
      </label>
      <template v-if="!v.isPage && !s.cursorMatchBar">
        <div class="range-label">
          <span>Height</span><b class="mono">{{ s.cursorHeight }}%</b>
        </div>
        <input
          type="range"
          name="cursorHeight"
          aria-label="Playhead height"
          min="40"
          max="100"
          step="1"
          :value="s.cursorHeight"
          :style="pct(s.cursorHeight, 40, 100)"
          @input="setNum"
        >
      </template>
    </div>

    <div
      v-if="s.highlightBar"
      class="section"
    >
      <h2>Bar highlight</h2>
      <div class="kv">
        <span>Colour</span>
        <div class="swatches">
          <button
            v-for="c in HL_COLORS"
            :key="c.hex"
            class="swatch"
            :title="c.name"
            :aria-label="c.name"
            :aria-pressed="s.highlightColor === c.hex"
            :style="{ background: c.hex }"
            @click="setHighlightColor(c.hex)"
          />
        </div>
      </div>
      <div class="range-label">
        <span>Opacity</span><b class="mono">{{ s.highlightOpacity }}%</b>
      </div>
      <input
        type="range"
        name="highlightOpacity"
        aria-label="Highlight opacity"
        min="5"
        max="60"
        step="1"
        :value="s.highlightOpacity"
        :style="pct(s.highlightOpacity, 5, 60)"
        @input="setNum"
      >
      <div class="range-label">
        <span>Padding</span><b class="mono">{{ s.highlightPadding }} px</b>
      </div>
      <input
        type="range"
        name="highlightPadding"
        aria-label="Highlight padding"
        min="0"
        max="20"
        step="1"
        :value="s.highlightPadding"
        :style="pct(s.highlightPadding, 0, 20)"
        @input="setNum"
      >
    </div>

    <div class="section">
      <h2>Current note</h2>
      <label class="check">
        <input
          type="checkbox"
          :checked="s.recolorNote"
          @change="toggle('recolorNote')"
        >
        Colour the note being played
      </label>
      <template v-if="s.recolorNote">
        <div class="kv">
          <span>Colour</span>
          <div class="swatches">
            <button
              v-for="c in NOTE_COLORS"
              :key="c.hex"
              class="swatch"
              :title="c.name"
              :aria-label="c.name"
              :aria-pressed="s.activeNoteColor === c.hex"
              :style="{ background: c.hex }"
              @click="setActiveNoteColor(c.hex)"
            />
          </div>
        </div>
        <div class="range-label">
          <span>Opacity</span><b class="mono">{{ s.activeNoteOpacity }}%</b>
        </div>
        <input
          type="range"
          name="activeNoteOpacity"
          aria-label="Note opacity"
          min="30"
          max="100"
          step="1"
          :value="s.activeNoteOpacity"
          :style="pct(s.activeNoteOpacity, 30, 100)"
          @input="setNum"
        >
      </template>
    </div>

    <div class="section">
      <h2>Colours</h2>
      <div
        v-for="row in colorRows"
        :key="row.name"
        class="kv"
      >
        <span>{{ row.label }}</span>
        <span style="display:flex;align-items:center;gap:8px">
          <span class="val mono">{{ s[row.name] }}</span>
          <input
            type="color"
            class="color"
            :name="row.name"
            :value="s[row.name]"
            :aria-label="row.label"
            @input="setField"
          >
        </span>
      </div>
      <p class="hint">
        Overrides the Dark/Light background preset.
      </p>
    </div>

    <div class="section">
      <h2>Encoding</h2>
      <label class="field">
        <span>Quality</span>
        <select
          name="quality"
          class="select"
          :value="s.quality"
          @change="setField"
        >
          <option>Standard</option>
          <option>High</option>
          <option>Max</option>
        </select>
      </label>
    </div>
  </div>
</template>

<script setup>
const { s, v, setCanvasTheme, setCursorColor, setField, setLayout, toggle } = useSonotas()

const FIT_BARS = [1, 2, 3, 4, 5, 6, 7, 8]

const CURSOR_COLORS = [
  { hex: '#8f97ac', name: 'Grey' },
  { hex: '#e5484d', name: 'Red' },
  { hex: '#e9eaec', name: 'White' },
  { hex: '#e0a94c', name: 'Amber' }
]
</script>

<template>
  <div class="section">
    <h2>Look</h2>
    <div class="kv">
      <span>Layout</span>
      <div
        class="seg"
        role="group"
        aria-label="Layout"
      >
        <button
          :aria-pressed="s.layout === 'Scrolling line'"
          title="One line of notation that scrolls along"
          @click="setLayout('Scrolling line')"
        >
          Line
        </button>
        <button
          :aria-pressed="s.layout === 'Page'"
          title="Systems wrap and stack like a printed page; the view follows down"
          @click="setLayout('Page')"
        >
          Page
        </button>
      </div>
    </div>
    <div class="kv">
      <span>Background</span>
      <div
        class="seg"
        role="group"
        aria-label="Canvas theme"
      >
        <button
          :aria-pressed="s.theme === 'dark'"
          @click="setCanvasTheme('dark')"
        >
          Dark
        </button>
        <button
          :aria-pressed="s.theme === 'light'"
          @click="setCanvasTheme('light')"
        >
          Light
        </button>
      </div>
    </div>
    <div class="kv">
      <span>Playhead</span>
      <div class="swatches">
        <button
          v-for="c in CURSOR_COLORS"
          :key="c.hex"
          class="swatch"
          :title="c.name"
          :aria-label="c.name"
          :aria-pressed="s.cursorColor === c.hex"
          :style="{ background: c.hex }"
          @click="setCursorColor(c.hex)"
        />
      </div>
    </div>
    <label class="check">
      <input
        type="checkbox"
        :checked="s.highlightBar"
        @change="toggle('highlightBar')"
      >
      Highlight the current bar
    </label>
    <label class="check">
      <input
        type="checkbox"
        :checked="s.currentBarOnly"
        @change="toggle('currentBarOnly')"
      >
      {{ v.fitBars > 1 ? `Show only the current ${v.fitBars} bars` : 'Show only the current bar' }}
    </label>
    <div
      v-if="!v.isPage"
      class="kv"
    >
      <span title="Size the notation so this many bars span nearly the whole frame width">Fit to width</span>
      <select
        name="fitBars"
        class="select fit-select"
        aria-label="Fit to width"
        :value="v.fitBars ? (v.fitBars === 1 ? '1 bar' : `${v.fitBars} bars`) : 'Off'"
        @change="setField"
      >
        <option :disabled="s.currentBarOnly">
          Off
        </option>
        <option
          v-for="n in FIT_BARS"
          :key="n"
        >
          {{ n === 1 ? '1 bar' : `${n} bars` }}
        </option>
      </select>
    </div>
  </div>
</template>

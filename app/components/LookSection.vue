<script setup>
const { s, setCanvasTheme, setCursorColor, setLayout, toggle } = useSonotas()

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
        :checked="s.highlightNotes"
        @change="toggle('highlightNotes')"
      >
      Highlight the current bar
    </label>
  </div>
</template>

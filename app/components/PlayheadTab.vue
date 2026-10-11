<script setup>
// What marks the music as it plays: the playhead line, the bar it is in and
// the note being played. Each shows its colour; the measurements wait
// behind a fold, since the defaults suit most videos.
const { s, v, toggle, setCursorColor, setHighlightColor, setActiveNoteColor } = useSonotas()

const CURSOR_COLORS = [
  { hex: '#8f97ac', name: 'Grey' },
  { hex: '#e5484d', name: 'Red' },
  { hex: '#e9eaec', name: 'White' },
  { hex: '#e0a94c', name: 'Amber' }
]
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
</script>

<template>
  <div
    class="stack"
    data-divided
  >
    <InspectorGroup title="Playhead">
      <SwatchPicker
        :colors="CURSOR_COLORS"
        :selected="s.cursorColor"
        label="Playhead colour"
        @pick="setCursorColor"
      />
      <details class="accordion">
        <summary>Fine-tune</summary>
        <div class="stack gap-3">
          <RangeField
            name="cursorOpacity"
            label="Opacity"
            aria-label="Playhead opacity"
            :min="10"
            :max="100"
            unit="%"
          />
          <RangeField
            name="cursorWidth"
            label="Width"
            aria-label="Playhead width"
            :min="1"
            :max="10"
            unit=" px"
          />
          <RangeField
            name="cursorOffset"
            label="Horizontal offset"
            aria-label="Playhead offset"
            :min="-100"
            :max="100"
            unit=" px"
          />
          <p
            v-if="v.isPage"
            class="caption"
          >
            In page layout the playhead always spans the current bar.
          </p>
          <template v-else>
            <label>
              <input
                type="checkbox"
                role="switch"
                :checked="s.cursorMatchBar"
                @change="toggle('cursorMatchBar')"
              >
              Same height as the bar
            </label>
            <RangeField
              v-if="!s.cursorMatchBar"
              name="cursorHeight"
              label="Height"
              aria-label="Playhead height"
              :min="40"
              :max="100"
              unit="%"
            />
          </template>
        </div>
      </details>
    </InspectorGroup>

    <InspectorGroup title="Bar highlight">
      <template #toggle="{ labelledby }">
        <input
          type="checkbox"
          role="switch"
          :aria-labelledby="labelledby"
          :checked="s.highlightBar"
          @change="toggle('highlightBar')"
        >
      </template>
      <template v-if="s.highlightBar">
        <SwatchPicker
          :colors="HL_COLORS"
          :selected="s.highlightColor"
          label="Highlight colour"
          @pick="setHighlightColor"
        />
        <details class="accordion">
          <summary>Fine-tune</summary>
          <div class="stack gap-3">
            <RangeField
              name="highlightOpacity"
              label="Opacity"
              aria-label="Highlight opacity"
              :min="5"
              :max="60"
              unit="%"
            />
            <RangeField
              name="highlightPadding"
              label="Padding"
              aria-label="Highlight padding"
              :min="0"
              :max="20"
              unit=" px"
            />
          </div>
        </details>
      </template>
      <p
        v-else
        class="caption"
      >
        Tints the bar the playhead is in.
      </p>
    </InspectorGroup>

    <InspectorGroup title="Current note">
      <template #toggle="{ labelledby }">
        <input
          type="checkbox"
          role="switch"
          :aria-labelledby="labelledby"
          :checked="s.recolorNote"
          @change="toggle('recolorNote')"
        >
      </template>
      <template v-if="s.recolorNote">
        <SwatchPicker
          :colors="NOTE_COLORS"
          :selected="s.activeNoteColor"
          label="Note colour"
          @pick="setActiveNoteColor"
        />
        <details class="accordion">
          <summary>Fine-tune</summary>
          <RangeField
            name="activeNoteOpacity"
            label="Opacity"
            aria-label="Note opacity"
            :min="30"
            :max="100"
            unit="%"
          />
        </details>
      </template>
      <p
        v-else
        class="caption"
      >
        Colours the note being played.
      </p>
    </InspectorGroup>
  </div>
</template>

<script setup>
// What marks the music as it plays: the playhead line, the bar it is in and
// the note being played. Each shows its colour; the measurements wait
// behind a fold, since the defaults suit most videos.
import { t } from '~/utils/i18n'

const { s, v, toggle, setCursorColor, setHighlightColor, setActiveNoteColor } = useSonotas()

// Grey holds 3:1 on both canvas themes; Ink is white on dark and near-black
// on light, so a thin line never disappears into the paper.
const CURSOR_COLORS = computed(() => [
  { hex: '#737b87', name: t('playhead.color.grey') },
  { hex: '#e5484d', name: t('playhead.color.red') },
  { hex: INK[s.theme] ?? INK.dark, name: t('playhead.color.ink') },
  { hex: '#e0a94c', name: t('playhead.color.amber') }
])
// Computed, so the names follow a change of language.
const HL_COLORS = computed(() => [
  { hex: '#e0a94c', name: t('playhead.color.amber') },
  { hex: '#737b87', name: t('playhead.color.grey') },
  { hex: '#46a758', name: t('playhead.color.green') },
  { hex: '#5b8def', name: t('playhead.color.blue') }
])
const NOTE_COLORS = computed(() => [
  { hex: '#e5484d', name: t('playhead.color.red') },
  { hex: '#e0a94c', name: t('playhead.color.amber') },
  { hex: '#46a758', name: t('playhead.color.green') },
  { hex: '#5b8def', name: t('playhead.color.blue') }
])
</script>

<template>
  <div
    class="stack"
    data-divided
  >
    <InspectorGroup :title="t('playhead.playhead')">
      <SwatchPicker
        :colors="CURSOR_COLORS"
        :selected="s.cursorColor"
        :label="t('playhead.playhead.color')"
        @pick="setCursorColor"
      />
      <details class="accordion">
        <summary>{{ t('playhead.fine_tune') }}</summary>
        <div class="stack gap-3">
          <RangeField
            name="cursorOpacity"
            :label="t('playhead.opacity')"
            :aria-label="t('playhead.playhead.opacity')"
            :min="10"
            :max="100"
            unit="%"
          />
          <RangeField
            name="cursorWidth"
            :label="t('playhead.width')"
            :aria-label="t('playhead.playhead.width')"
            :min="1"
            :max="10"
            unit=" px"
          />
          <RangeField
            name="cursorOffset"
            :label="t('playhead.offset')"
            :aria-label="t('playhead.playhead.offset')"
            :min="-100"
            :max="100"
            unit=" px"
          />
          <p
            v-if="v.isPage"
            class="caption"
          >
            {{ t('playhead.playhead.page') }}
          </p>
          <template v-else>
            <label>
              <input
                type="checkbox"
                role="switch"
                :checked="s.cursorMatchBar"
                @change="toggle('cursorMatchBar')"
              >
              {{ t('playhead.playhead.match_bar') }}
            </label>
            <RangeField
              v-if="!s.cursorMatchBar"
              name="cursorHeight"
              :label="t('playhead.height')"
              :aria-label="t('playhead.playhead.height')"
              :min="40"
              :max="100"
              unit="%"
            />
          </template>
        </div>
      </details>
    </InspectorGroup>

    <InspectorGroup :title="t('playhead.highlight')">
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
          :label="t('playhead.highlight.color')"
          @pick="setHighlightColor"
        />
        <details class="accordion">
          <summary>{{ t('playhead.fine_tune') }}</summary>
          <div class="stack gap-3">
            <RangeField
              name="highlightOpacity"
              :label="t('playhead.opacity')"
              :aria-label="t('playhead.highlight.opacity')"
              :min="5"
              :max="60"
              unit="%"
            />
            <RangeField
              name="highlightPadding"
              :label="t('playhead.padding')"
              :aria-label="t('playhead.highlight.padding')"
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
        {{ t('playhead.highlight.off') }}
      </p>
    </InspectorGroup>

    <InspectorGroup :title="t('playhead.note')">
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
          :label="t('playhead.note.color')"
          @pick="setActiveNoteColor"
        />
        <details class="accordion">
          <summary>{{ t('playhead.fine_tune') }}</summary>
          <RangeField
            name="activeNoteOpacity"
            :label="t('playhead.opacity')"
            :aria-label="t('playhead.note.opacity')"
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
        {{ t('playhead.note.off') }}
      </p>
    </InspectorGroup>
  </div>
</template>

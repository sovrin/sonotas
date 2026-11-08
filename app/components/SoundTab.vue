<script setup>
// What the video sounds like: a built-in synth plays the song in the preview
// and the exported file, with a metronome and a count-in to play along to.
import { t } from '~/utils/i18n'

const { s, v, toggle, loadSoundFont } = useSonotas()
const fontInput = ref()

function onPickFont(e) {
  const file = e.target.files?.[0]
  e.target.value = '' // so picking the same file again still fires
  if (file) loadSoundFont(file)
}

const MIX = computed(() => [
  { v: 'All', label: t('sound.mix.all') },
  { v: 'Solo', label: t('sound.mix.solo') },
  { v: 'Minus', label: t('sound.mix.minus') }
])
const trackName = computed(() => s.tracks[s.trackIndex]?.name || t('sound.mix.this_track'))
const mixHint = computed(() => ({
  All: () => t('sound.mix.all.hint'),
  Solo: () => t('sound.mix.solo.hint', { track: trackName.value }),
  Minus: () => t('sound.mix.minus.hint', { track: trackName.value })
})[s.soundMix]?.())
</script>

<template>
  <div
    class="stack"
    data-divided
  >
    <InspectorGroup :title="t('sound.title')">
      <template #toggle="{ labelledby }">
        <input
          type="checkbox"
          role="switch"
          :aria-labelledby="labelledby"
          :checked="s.sound"
          @change="toggle('sound')"
        >
      </template>
      <p
        v-if="!s.sound"
        class="caption"
      >
        {{ t('sound.off.hint') }}
      </p>
      <SegmentedField
        v-else-if="s.tracks.length > 1"
        name="soundMix"
        :label="t('sound.mix.label')"
        :options="MIX"
      >
        <small>{{ mixHint }}</small>
      </SegmentedField>
      <div
        v-if="s.sound"
        class="field"
      >
        <span>{{ t('sound.font.label') }}</span>
        <input
          ref="fontInput"
          type="file"
          accept=".sf2,.sf3"
          hidden
          @change="onPickFont"
        >
        <div class="cluster">
          <button
            class="btn"
            data-size="s"
            :inert="v.isRendering"
            @click="fontInput?.click()"
          >
            {{ s.soundFontName ? t('sound.font.change') : t('sound.font.own') }}
          </button>
          <button
            v-if="s.soundFontName"
            class="btn"
            data-size="s"
            data-variant="ghost"
            data-tone="neutral"
            :inert="v.isRendering"
            @click="loadSoundFont(null)"
          >
            {{ t('sound.font.builtin') }}
          </button>
        </div>
        <small v-if="s.soundFontError">{{ s.soundFontError }}</small>
        <small v-else>{{ s.soundFontName ? t('sound.font.playing', { name: s.soundFontName }) : t('sound.font.builtin.hint') }}</small>
      </div>
    </InspectorGroup>

    <InspectorGroup
      v-if="s.sound"
      :title="t('sound.aids.title')"
    >
      <div class="field">
        <label>
          <input
            type="checkbox"
            role="switch"
            :checked="s.metronome"
            @change="toggle('metronome')"
          >
          {{ t('sound.metronome.label') }}
        </label>
        <small>{{ t('sound.metronome.hint') }}</small>
      </div>
      <div class="field">
        <label>
          <input
            type="checkbox"
            role="switch"
            :checked="s.countIn"
            @change="toggle('countIn')"
          >
          {{ t('sound.countin.label') }}
        </label>
        <small>{{ t('sound.countin.hint') }}</small>
      </div>
    </InspectorGroup>
  </div>
</template>

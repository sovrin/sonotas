<script setup>
// What the video sounds like: a built-in synth plays the song in the preview
// and the exported file, with a metronome and a count-in to play along to.
// While it's off, what it would offer stays in view, stepped back.
import { t } from '~/utils/i18n'
import { GROUPS } from '~/utils/settings-groups'

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
    <InspectorGroup
      :title="t('sound.title')"
      :keys="GROUPS.sound.sound"
    >
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
      <div
        class="stack gap-3"
        :inert="!s.sound"
      >
        <SegmentedField
          v-if="s.tracks.length > 1"
          name="soundMix"
          :label="t('sound.mix.label')"
          :options="MIX"
        >
          <small v-if="s.sound">{{ mixHint }}</small>
        </SegmentedField>
        <div class="field">
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
          <small v-else-if="s.sound">{{ s.soundFontName ? t('sound.font.playing', { name: s.soundFontName }) : t('sound.font.builtin.hint') }}</small>
        </div>
      </div>
    </InspectorGroup>

    <InspectorGroup
      :title="t('sound.aids.title')"
      :keys="GROUPS.sound.aids"
    >
      <div
        class="stack gap-3"
        :inert="!s.sound"
      >
        <SwitchField
          name="metronome"
          :label="t('sound.metronome.label')"
        >
          <small v-if="s.sound">{{ t('sound.metronome.hint') }}</small>
        </SwitchField>
        <SwitchField
          name="countIn"
          :label="t('sound.countin.label')"
        >
          <small v-if="s.sound">{{ t('sound.countin.hint') }}</small>
        </SwitchField>
      </div>
    </InspectorGroup>
  </div>
</template>

<script setup>
// What the video sounds like: a built-in synth plays the song in the preview
// and the exported file, with a metronome and a count-in to play along to.
const { s, v, toggle, loadSoundFont } = useSonotas()
const fontInput = ref()

function onPickFont(e) {
  const file = e.target.files?.[0]
  e.target.value = '' // so picking the same file again still fires
  if (file) loadSoundFont(file)
}

const MIX = ['All', 'Solo', 'Minus'].map(v => ({ v, label: v }))
const trackName = computed(() => s.tracks[s.trackIndex]?.name || 'this track')
const mixHint = computed(() => ({
  All: 'Every track plays.',
  Solo: `Only ${trackName.value} plays.`,
  Minus: `Every track but ${trackName.value} plays: a backing track to play along with.`
})[s.soundMix])
</script>

<template>
  <div
    class="stack"
    data-divided
  >
    <InspectorGroup title="Sound">
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
        The video is silent. With sound on, a built-in synth plays the song in the preview and the exported video.
      </p>
      <SegmentedField
        v-else-if="s.tracks.length > 1"
        name="soundMix"
        label="Tracks"
        :options="MIX"
      >
        <small>{{ mixHint }}</small>
      </SegmentedField>
      <div
        v-if="s.sound"
        class="field"
      >
        <span>Soundfont</span>
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
            {{ s.soundFontName ? 'Change…' : 'Use your own…' }}
          </button>
          <button
            v-if="s.soundFontName"
            class="btn"
            data-size="s"
            data-variant="ghost"
            :inert="v.isRendering"
            @click="loadSoundFont(null)"
          >
            Use built-in
          </button>
        </div>
        <small v-if="s.soundFontError">{{ s.soundFontError }}</small>
        <small v-else>{{ s.soundFontName ? `Playing with ${s.soundFontName}.` : 'The built-in General MIDI set. Pick an .sf2 or .sf3 file to use your own instruments.' }}</small>
      </div>
    </InspectorGroup>

    <InspectorGroup
      v-if="s.sound"
      title="Timing aids"
    >
      <div class="field">
        <label>
          <input
            type="checkbox"
            role="switch"
            :checked="s.metronome"
            @change="toggle('metronome')"
          >
          Metronome
        </label>
        <small>A click on every beat, following the tempo.</small>
      </div>
      <div class="field">
        <label>
          <input
            type="checkbox"
            role="switch"
            :checked="s.countIn"
            @change="toggle('countIn')"
          >
          Count-in
        </label>
        <small>A bar of clicks before the first note. The video holds its first frame meanwhile.</small>
      </div>
    </InspectorGroup>
  </div>
</template>

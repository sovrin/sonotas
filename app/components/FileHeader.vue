<script setup>
// Said right under the toolbar: what sonotas is while the sample is up, a file
// that wouldn't open (what to open and how is the Open button's tip), or a
// settings link that didn't fully apply.
import { ACCEPT } from '~/utils/formats'

const { s, loadFile, togglePlay } = useSonotas()

// The intro goes with the sample, or for this visit once dismissed.
const introClosed = ref(false)
const fileInput = ref(null)

function onPick(e) {
  const file = e.target.files?.[0]
  if (file) loadFile(file)
  e.target.value = '' // allow re-picking the same file
}
</script>

<template>
  <div
    v-if="s.isDemo && !introClosed"
    class="alert intro"
    role="note"
  >
    <div>
      <strong>sonotas turns a Guitar Pro tab into a video with a moving playhead</strong>, rendered right in your browser.
      This is a sample: press play to see it move, or open your own tab.
    </div>
    <span class="cluster gap-2 ms-auto">
      <button
        class="btn"
        data-size="s"
        data-variant="primary"
        :disabled="!s.ready"
        @click="togglePlay()"
      >
        <i
          class="icon"
          :data-icon="s.playing ? 'pause' : 'play'"
        />
        {{ s.playing ? 'Pause' : 'Play' }}
      </button>
      <input
        ref="fileInput"
        type="file"
        :accept="ACCEPT"
        hidden
        @change="onPick"
      >
      <button
        class="btn"
        data-size="s"
        @click="fileInput?.click()"
      >
        <i
          class="icon"
          data-icon="folder-open"
        />
        Open a tab…
      </button>
      <button
        class="btn"
        data-icon
        data-size="s"
        data-variant="ghost"
        aria-label="Dismiss"
        @click="introClosed = true"
      >
        <i
          class="icon"
          data-icon="x"
        />
      </button>
    </span>
  </div>
  <div
    v-if="s.loadError"
    class="alert"
    data-tone="danger"
    role="alert"
  >
    <div><strong>Couldn’t open that file.</strong> {{ s.loadError }} Try a .gp, .gpx, .gp3–5 or MusicXML file.</div>
  </div>
  <div
    v-if="s.settingsNotice"
    class="alert"
    data-tone="warning"
    role="status"
  >
    <div>{{ s.settingsNotice }}</div>
    <button
      class="btn ms-auto"
      data-icon
      data-size="s"
      data-variant="ghost"
      aria-label="Dismiss"
      @click="s.settingsNotice = ''"
    >
      <i
        class="icon"
        data-icon="x"
      />
    </button>
  </div>
</template>

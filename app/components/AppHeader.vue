<script setup>
// One toolbar: the app, the song being worked on (and its track), and the way
// to open another. Export is not up here; it waits under the settings.
const { s, loadFile, setTrack, toggleTheme } = useSonotas()

const ACCEPT = '.gp,.gpx,.gp3,.gp4,.gp5,.xml,.musicxml,.mxl'
const fileInput = ref(null)

function onPick(e) {
  const file = e.target.files?.[0]
  if (file) loadFile(file)
  e.target.value = '' // allow re-picking the same file
}

const bars = computed(() => s.songBars.length || s.barStarts.length)
// The song's own title when the file carries one, else its file name.
const name = computed(() => s.title || s.sourceName.replace(/\.[^.]+$/, ''))
const facts = computed(() => [
  s.isDemo ? 'Sample file' : s.sourceName,
  s.artist,
  bars.value ? `${bars.value} bars` : ''
].filter(Boolean).join(' · '))
</script>

<template>
  <header class="navbar">
    <img
      src="/favicon.svg"
      alt="sonotas"
      width="20"
      height="20"
    >
    <div class="song min-w-0">
      <h1 class="song-title truncate">
        {{ name }}
      </h1>
      <span class="text-xs text-muted truncate">{{ facts }}</span>
    </div>
    <div class="end cluster gap-2">
      <div
        v-if="s.tracks.length > 1"
        class="select"
      >
        <select
          name="trackIndex"
          class="input"
          data-size="s"
          aria-label="Track"
          :value="s.trackIndex"
          @change="setTrack"
        >
          <option
            v-for="t in s.tracks"
            :key="t.index"
            :value="t.index"
          >
            {{ t.name }}
          </option>
        </select>
      </div>
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
        :aria-label="s.uiTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
        @click="toggleTheme"
      >
        <i
          class="icon"
          :data-icon="s.uiTheme === 'dark' ? 'sun' : 'moon'"
        />
      </button>
    </div>
  </header>
</template>

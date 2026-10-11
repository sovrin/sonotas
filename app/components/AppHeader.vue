<script setup>
// One toolbar: the app, then — past a hairline — the song being worked on,
// its track, and the way to open another. Export is not up here; it waits
// under the settings.
const { s, v, loadFile, setTrack, toggleTheme } = useSonotas()

const ACCEPT = '.gp,.gpx,.gp3,.gp4,.gp5,.xml,.musicxml,.mxl'
const OPEN_TIP = 'Guitar Pro (.gp, .gpx, .gp3–5) or MusicXML. Or drop a file anywhere. It stays in your browser.'
const fileInput = ref(null)

function onPick(e) {
  const file = e.target.files?.[0]
  if (file) loadFile(file)
  e.target.value = '' // allow re-picking the same file
}

const bars = computed(() => s.songBars.length || s.barStarts.length)
// The whole song's length, even while only a range is rendered.
const length = computed(() => {
  if (!s.ready) return '' // the store's placeholder until the song is read
  const t = (s.songMs || s.duration * 1000) / 1000
  return t ? Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0') : ''
})
// The song's own title when the file carries one, else its file name.
// The Sample badge already says it is the demo.
const name = computed(() => s.title || s.sourceName.replace(/\.[^.]+$/, '').replace(/\s*\(demo\)/i, ''))
const facts = computed(() => [
  s.isDemo ? '' : s.sourceName,
  s.artist,
  bars.value ? `${bars.value} bars` : '',
  length.value
].filter(Boolean).join(' · '))
</script>

<template>
  <header class="navbar">
    <span class="brand">
      <img
        src="/favicon.svg?v=2"
        alt=""
        width="22"
        height="22"
      >
      <strong class="s:hidden">sonotas</strong>
    </span>

    <div class="song min-w-0">
      <div class="flex items-center gap-2 min-w-0">
        <h1 class="song-title truncate">
          {{ name }}
        </h1>
        <span
          v-if="s.isDemo"
          class="badge s:hidden"
        >Sample</span>
      </div>
      <span class="text-s text-muted truncate tabular">{{ facts }}</span>
    </div>

    <div class="end cluster gap-3">
      <label
        v-if="s.tracks.length > 1"
        class="cluster gap-2 text-s text-muted"
        :inert="v.isRendering"
      >
        <span class="s:hidden">Track</span>
        <span class="select">
          <select
            name="trackIndex"
            class="input"
            data-size="s"
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
        </span>
      </label>
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
        :data-tip="OPEN_TIP"
        data-tip-side="bottom"
        :aria-description="OPEN_TIP"
        aria-label="Open a tab…"
        :inert="v.isRendering"
        @click="fileInput?.click()"
      >
        <i
          class="icon"
          data-icon="folder-open"
        />
        <span class="s:hidden">Open a tab…</span>
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

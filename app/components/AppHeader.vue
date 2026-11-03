<script setup>
// One toolbar: the app, then — past a hairline — the song being worked on,
// its track, and the way to open another. Export is not up here; it waits
// under the settings.
import { ACCEPT } from '~/utils/formats'
import { languages, t } from '~/utils/i18n'

const { s, v, loadFile, setTrack, toggleTheme, copyLink, resetSettings } = useSonotas()
const route = useRoute()

// Each language is its own page; the settings (?s=) and the hash go along.
function switchLanguage(e) {
  navigateTo({ path: `/${e.target.value}/`, query: route.query, hash: route.hash })
}
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
  const sec = (s.songMs || s.duration * 1000) / 1000
  return sec ? Math.floor(sec / 60) + ':' + String(Math.floor(sec % 60)).padStart(2, '0') : ''
})
// The song's own title when the file carries one, else its file name.
// The Sample badge already says it is the demo.
const name = computed(() => s.title || s.sourceName.replace(/\.[^.]+$/, '').replace(/\s*\(demo\)/i, ''))
const facts = computed(() => [
  s.isDemo ? '' : s.sourceName,
  s.artist,
  bars.value ? t('header.bars', { count: bars.value }) : '',
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
        >{{ t('header.sample') }}</span>
      </div>
      <span class="text-s text-muted truncate tabular">
        <span
          v-if="!s.ready"
          class="skeleton song-facts-skeleton"
          aria-hidden="true"
        >&nbsp;</span>
        <template v-else>{{ facts }}</template>
      </span>
    </div>

    <div class="end cluster gap-3">
      <!-- Always there, so it doesn't pop in once the song is read; a one-track song can't switch. -->
      <label
        class="cluster gap-2 text-s text-muted"
        :inert="v.isRendering"
      >
        <span class="s:hidden">{{ t('header.track') }}</span>
        <span class="select">
          <select
            name="trackIndex"
            class="input"
            data-size="s"
            :value="s.trackIndex"
            :disabled="s.tracks.length < 2"
            @change="setTrack"
          >
            <option
              v-for="track in s.tracks"
              :key="track.index"
              :value="track.index"
            >
              {{ track.name }}
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
        :data-tip="t('header.open.tip')"
        data-tip-side="bottom"
        :aria-description="t('header.open.tip')"
        :aria-label="t('header.open.label')"
        :inert="v.isRendering"
        @click="fileInput?.click()"
      >
        <i
          class="icon"
          data-icon="folder-open"
        />
        <span class="s:hidden">{{ t('header.open.label') }}</span>
      </button>
      <button
        class="btn"
        data-icon
        data-size="s"
        data-variant="ghost"
        :aria-label="t('header.link.label')"
        :data-tip="s.linkCopied ? t('header.link.copied') : t('header.link.label')"
        data-tip-side="bottom"
        @click="copyLink"
      >
        <i
          class="icon"
          :data-icon="s.linkCopied ? 'check' : 'link'"
        />
        <span
          class="sr-only"
          role="status"
        >{{ s.linkCopied ? t('header.link.copied') : '' }}</span>
      </button>
      <button
        class="btn"
        data-icon
        data-size="s"
        data-variant="ghost"
        :aria-label="s.undoReset ? t('header.reset.undo') : t('header.reset.label')"
        :data-tip="s.undoReset ? t('header.reset.undo') : t('header.reset.tip')"
        data-tip-side="bottom"
        :disabled="(v.atDefaults && !s.undoReset) || v.isRendering"
        @click="resetSettings"
      >
        <i
          class="icon"
          :data-icon="s.undoReset ? 'undo' : 'rotate-ccw'"
        />
        <span
          class="sr-only"
          role="status"
        >{{ s.undoReset ? t('header.reset.done') : '' }}</span>
      </button>
      <AppHelp />
      <span
        v-if="languages.length > 1"
        class="select"
      >
        <select
          class="input"
          data-size="s"
          :aria-label="t('header.language')"
          :value="route.params.lang"
          @change="switchLanguage"
        >
          <option
            v-for="l in languages"
            :key="l"
            :value="l"
          >
            {{ l.toUpperCase() }}
          </option>
        </select>
      </span>
      <button
        class="btn"
        data-icon
        data-size="s"
        data-variant="ghost"
        :aria-label="s.uiTheme === 'dark' ? t('header.theme.light') : t('header.theme.dark')"
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

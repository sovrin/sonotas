<script setup>
// What is not a setting, the keys and how the app works, each behind a quiet
// icon in the toolbar and shown in a dialog.
const keysDlg = ref(null)
const helpDlg = ref(null)
const newsDlg = ref(null)

// Baked in at build time, so it always matches what is deployed. Before the
// first release there is no CHANGELOG.md and no button.
const changelog = Object.values(import.meta.glob('../../CHANGELOG.md', { query: '?raw', import: 'default', eager: true }))[0] ?? ''
const releases = parseChangelog(changelog)
// A fixed locale and zone, so the prerendered page and the browser agree.
const longDate = d => new Date(d).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

// No aequitas.js here, so a click on the backdrop closes the dialog by hand.
function lightDismiss(e) {
  if (e.target === e.currentTarget) e.currentTarget.close()
}
</script>

<template>
  <!-- A phone has no keyboard to list. -->
  <button
    class="btn s:hidden"
    data-icon
    data-size="s"
    data-variant="ghost"
    aria-label="Keyboard shortcuts"
    data-tip="Keyboard shortcuts"
    data-tip-side="bottom"
    @click="keysDlg?.showModal()"
  >
    <i
      class="icon"
      data-icon="keyboard"
    />
  </button>
  <button
    class="btn"
    data-icon
    data-size="s"
    data-variant="ghost"
    aria-label="How it works"
    data-tip="How it works"
    data-tip-side="bottom"
    @click="helpDlg?.showModal()"
  >
    <i
      class="icon"
      data-icon="help"
    />
  </button>
  <button
    v-if="releases.length"
    class="btn"
    data-icon
    data-size="s"
    data-variant="ghost"
    aria-label="What's new"
    data-tip="What's new"
    data-tip-side="bottom"
    @click="newsDlg?.showModal()"
  >
    <i
      class="icon"
      data-icon="sparkles"
    />
  </button>

  <dialog
    ref="keysDlg"
    aria-labelledby="keys-title"
    @click="lightDismiss"
  >
    <form
      method="dialog"
      class="stack gap-4"
    >
      <h3 id="keys-title">
        Keyboard shortcuts
      </h3>
      <dl class="properties">
        <dt><kbd>Space</kbd></dt>
        <dd>Play or pause the preview</dd>
        <dt><kbd>I</kbd></dt>
        <dd>Start the export at the bar under the playhead</dd>
        <dt><kbd>O</kbd></dt>
        <dd>End the export at the bar under the playhead</dd>
        <dt><kbd>←</kbd> <kbd>→</kbd></dt>
        <dd>On the bar strip: step a bar back or on. On a bracket: move it a bar</dd>
        <dt><kbd>Home</kbd> <kbd>End</kbd></dt>
        <dd>On the bar strip: jump to the start or end</dd>
        <dt><kbd>PgUp</kbd> <kbd>PgDn</kbd></dt>
        <dd>On a bracket: move it four bars</dd>
        <dt><kbd>+</kbd> <kbd>−</kbd></dt>
        <dd>On the bar strip or its overview: zoom in or out. Pinch or Ctrl-scroll over the strip, or drag an end of the overview window</dd>
      </dl>
      <button class="btn self-end">
        Close
      </button>
    </form>
  </dialog>

  <dialog
    ref="helpDlg"
    aria-labelledby="help-title"
    @click="lightDismiss"
  >
    <form
      method="dialog"
      class="stack gap-4"
    >
      <h3 id="help-title">
        How it works
      </h3>
      <ol class="stack gap-2">
        <li><b>Open a tab.</b> Guitar Pro (.gp, .gpx, .gp3–5) or MusicXML, picked or dropped anywhere on the page.</li>
        <li><b>Set the picture.</b> Frame, Look and Playhead decide where the score sits and how it is drawn.</li>
        <li><b>Pick the bars.</b> Export the whole song, or only some bars: drag the brackets on the bar strip, or press I and O.</li>
        <li><b>Export.</b> The MP4 is rendered and muxed right here, and comes back to the stage to watch or save.</li>
      </ol>
      <p class="text-muted text-s">
        Everything runs in your browser. The file you open is never uploaded.
      </p>
      <button class="btn self-end">
        Close
      </button>
    </form>
  </dialog>

  <dialog
    v-if="releases.length"
    ref="newsDlg"
    aria-labelledby="news-title"
    @click="lightDismiss"
  >
    <form
      method="dialog"
      class="stack gap-4"
    >
      <h3 id="news-title">
        What's new
      </h3>
      <!-- Newest first, a hairline between releases; inside one, the
           inspector's eyebrow labels name what kind of change it is. -->
      <div
        class="stack"
        data-divided
      >
        <section
          v-for="r in releases"
          :key="r.version"
          class="stack gap-3"
        >
          <h4 class="flex items-baseline justify-between gap-3 text-m">
            {{ longDate(r.date) }}
            <span class="text-s text-muted font-mono">v{{ r.version }}</span>
          </h4>
          <div
            v-for="s in r.sections"
            :key="s.title"
            class="stack gap-2"
          >
            <h5 class="eyebrow">
              {{ s.title }}
            </h5>
            <ul class="stack gap-1">
              <li
                v-for="item in s.items"
                :key="item"
              >
                {{ item }}
              </li>
            </ul>
          </div>
        </section>
      </div>
      <div class="flex items-center justify-between gap-3">
        <a
          class="cluster gap-1 text-s"
          href="https://github.com/sovrin/sonotas/blob/master/CHANGELOG.md"
          target="_blank"
          rel="noopener"
        >Every release<i
          class="icon"
          data-icon="external"
          data-size="s"
          aria-hidden="true"
        /></a>
        <button
          class="btn"
          autofocus
        >
          Close
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup>
import { version } from '~~/package.json'
import { t } from '~/utils/i18n'

// What is not a setting, the keys and how the app works, each behind a quiet
// icon in the toolbar and shown in a dialog.
const keysDlg = ref(null)
const helpDlg = ref(null)
const newsDlg = ref(null)

// Baked in at build time, so it always matches what is deployed. Before the
// first release there is no CHANGELOG.md and no button.
const changelog = Object.values(import.meta.glob('../../CHANGELOG.md', { query: '?raw', import: 'default', eager: true }))[0] ?? ''
const releases = parseChangelog(changelog)
// A fixed locale and zone, so the prerendered page and the browser agree; English like the notes.
const longDate = d => new Date(d).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

// Feedback goes to collatas, which serves the form as a web component. It is
// loaded only once someone opens the dialog, so until then sonotas talks to no
// other server but censitas, which counts anonymous usage (utils/track). The
// form shows what it sends: the message, this page's address (the settings are
// in it) and the context below, as far as collatas accepts it.
const FEEDBACK_FORM = 'https://nexitas.sovrin.de/v1/form.js'
// A server that takes the connection but never answers must not leave the dialog empty.
const FORM_TIMEOUT = 10_000
const feedbackDlg = ref(null)
const feedbackOpen = ref(false)
const formState = ref('idle') // loading, ready or failed
const feedbackContext = ref({})
let formLoaded = null

/** Loads the form component once. A failed or timed-out load is tried again on the next open;
 *  whatever goes wrong stays in this dialog, the rest of sonotas never waits on collatas. */
function loadForm() {
  formLoaded ??= Promise.race([
    import(/* @vite-ignore */ FEEDBACK_FORM),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), FORM_TIMEOUT))
  ]).then(
    () => (formState.value = 'ready'),
    () => {
      formLoaded = null
      formState.value = 'failed'
    }
  )
  if (formState.value !== 'ready') formState.value = 'loading'
}

function openFeedback() {
  loadForm()
  feedbackContext.value = { version, browser: navigator.userAgent }
  // A fresh form each time: a new token, and room for another message after a sent one.
  feedbackOpen.value = true
  feedbackDlg.value?.showModal()
}

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
    :aria-label="t('help.keys.title')"
    :data-tip="t('help.keys.title')"
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
    :aria-label="t('help.how.title')"
    :data-tip="t('help.how.title')"
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
    :aria-label="t('help.news.title')"
    :data-tip="t('help.news.title')"
    data-tip-side="bottom"
    @click="newsDlg?.showModal()"
  >
    <i
      class="icon"
      data-icon="sparkles"
    />
  </button>

  <button
    class="btn"
    data-icon
    data-size="s"
    data-variant="ghost"
    :aria-label="t('help.feedback.title')"
    :data-tip="t('help.feedback.title')"
    data-tip-side="bottom"
    @click="openFeedback"
  >
    <i
      class="icon"
      data-icon="message-square"
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
        {{ t('help.keys.title') }}
      </h3>
      <dl class="properties">
        <dt><kbd>Space</kbd></dt>
        <dd>{{ t('help.keys.space') }}</dd>
        <dt><kbd>I</kbd></dt>
        <dd>{{ t('help.keys.in') }}</dd>
        <dt><kbd>O</kbd></dt>
        <dd>{{ t('help.keys.out') }}</dd>
        <dt><kbd>←</kbd> <kbd>→</kbd></dt>
        <dd>{{ t('help.keys.arrows') }}</dd>
        <dt><kbd>Home</kbd> <kbd>End</kbd></dt>
        <dd>{{ t('help.keys.home-end') }}</dd>
        <dt><kbd>PgUp</kbd> <kbd>PgDn</kbd></dt>
        <dd>{{ t('help.keys.page') }}</dd>
        <dt><kbd>+</kbd> <kbd>−</kbd></dt>
        <dd>{{ t('help.keys.zoom') }}</dd>
        <dt><kbd>Ctrl</kbd> + {{ t('help.keys.scroll') }}</dt>
        <dd>{{ t('help.keys.ctrl-scroll') }}</dd>
      </dl>
      <button class="btn self-end">
        {{ t('help.close') }}
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
        {{ t('help.how.title') }}
      </h3>
      <ol class="stack gap-2">
        <li><b>{{ t('help.how.open.title') }}</b> {{ t('help.how.open.text') }}</li>
        <li><b>{{ t('help.how.picture.title') }}</b> {{ t('help.how.picture.text') }}</li>
        <li><b>{{ t('help.how.sound.title') }}</b> {{ t('help.how.sound.text') }}</li>
        <li><b>{{ t('help.how.bars.title') }}</b> {{ t('help.how.bars.text') }}</li>
        <li><b>{{ t('help.how.export.title') }}</b> {{ t('help.how.export.text') }}</li>
      </ol>
      <p class="text-muted text-s">
        {{ t('help.how.privacy') }}
      </p>
      <button class="btn self-end">
        {{ t('help.close') }}
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
        {{ t('help.news.title') }}
      </h3>
      <!-- Newest first and only the newest open; inside one, the
           inspector's eyebrow labels name what kind of change it is. -->
      <div>
        <details
          v-for="(r, i) in releases"
          :key="r.version"
          class="accordion"
          :open="i === 0"
        >
          <summary>
            <h4 class="flex flex-1 items-baseline justify-between gap-3 text-m">
              {{ longDate(r.date) }}
              <span class="text-s text-muted font-mono">v{{ r.version }}</span>
            </h4>
          </summary>
          <div class="stack gap-3">
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
          </div>
        </details>
      </div>
      <div class="flex items-center justify-between gap-3">
        <a
          class="cluster gap-1 text-s"
          href="https://github.com/sovrin/sonotas/blob/master/CHANGELOG.md"
          target="_blank"
          rel="noopener"
        >{{ t('help.news.all') }}<i
          class="icon"
          data-icon="external"
          data-size="s"
          aria-hidden="true"
        /></a>
        <button
          class="btn"
          autofocus
        >
          {{ t('help.close') }}
        </button>
      </div>
    </form>
  </dialog>

  <dialog
    ref="feedbackDlg"
    aria-labelledby="feedback-title"
    @click="lightDismiss"
    @close="feedbackOpen = false"
  >
    <!-- The form is its own <form>, so the dialog's close button sits apart. -->
    <div class="stack gap-4">
      <h3 id="feedback-title">
        {{ t('help.feedback.title') }}
      </h3>
      <p
        v-if="formState === 'failed'"
        class="text-muted"
      >
        {{ t('help.feedback.failed') }}
      </p>
      <p
        v-else-if="formState === 'loading'"
        class="text-muted"
        role="status"
      >
        {{ t('help.feedback.loading') }}
      </p>
      <collatas-form
        v-else-if="feedbackOpen"
        app="sonotas"
        :context.prop="feedbackContext"
      />
      <p class="text-muted text-s">
        {{ t('help.feedback.privacy') }}
      </p>
      <form
        method="dialog"
        class="self-end"
      >
        <button class="btn">
          {{ t('help.close') }}
        </button>
      </form>
    </div>
  </dialog>
</template>

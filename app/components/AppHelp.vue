<script setup>
// What is not a setting, the keys and how the app works, each behind a quiet
// icon in the toolbar and shown in a dialog.
const keysDlg = ref(null)
const helpDlg = ref(null)

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
</template>

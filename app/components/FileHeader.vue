<script setup>
// Said right under the toolbar: a file that wouldn't open (what to open and
// how is the Open button's tip), or a settings link that didn't fully apply.
const { s } = useSonotas()
</script>

<template>
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

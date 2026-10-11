<script setup>
// A file that wouldn't open, said right under the toolbar. (What to open and
// how is the Open button's tip.)
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
</template>

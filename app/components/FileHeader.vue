<script setup>
// Step one, said once: while the sample is up, invite your own file. A load
// error takes its place.
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
  <p
    v-else-if="s.isDemo"
    class="caption"
  >
    This is a sample. Open your own Guitar Pro (.gp, .gpx, .gp3–5) or MusicXML file, or drop it anywhere. It stays in your browser; nothing is uploaded.
  </p>
</template>

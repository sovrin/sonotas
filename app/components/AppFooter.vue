<script setup>
// Bumped by the release PR, so it names the release this build belongs to.
import { version } from '~~/package.json'
import { t } from '~/utils/i18n'
</script>

<template>
  <footer class="cluster gap-2 text-s text-muted">
    <span>
      {{ t('footer.engraved') }} <a
        href="https://www.alphatab.net"
        target="_blank"
        rel="noopener"
      >alphaTab</a>, {{ t('footer.font') }} <a
        href="https://github.com/steinbergmedia/bravura"
        target="_blank"
        rel="noopener"
      >Bravura</a>, {{ t('footer.muxed') }} <a
        href="https://mediabunny.dev"
        target="_blank"
        rel="noopener"
      >mediabunny</a> · <a
        href="https://github.com/sovrin/sonotas/blob/master/THIRD_PARTY_NOTICES.md"
        target="_blank"
        rel="noopener"
      >{{ t('footer.licenses') }}</a>
    </span>
    <span class="end">
      <span class="font-mono">v{{ version }}</span> · <a
        href="https://github.com/sovrin/sonotas"
        target="_blank"
        rel="noopener"
      >{{ t('footer.source') }}</a> · <a
        href="https://sovrin.de"
        target="_blank"
        rel="noopener"
      >sovrin.de</a>
    </span>
  </footer>
</template>

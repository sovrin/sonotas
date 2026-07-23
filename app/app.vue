<script setup>
const title = 'sonotas — render Guitar Pro tabs to video'
const description = 'Drop a Guitar Pro file, frame it for any platform, and export a clean MP4 with a synced playhead — all in your browser, nothing uploaded.'

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: { lang: 'en' }
})

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <NuxtPage />
</template>

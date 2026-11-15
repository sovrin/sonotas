<script setup>
// The page sets the language, the title, the description and its og:url (pages/); these hold for all.
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg?v=4' }
  ]
})
useSeoMeta({
  ogType: 'website',
  ogSiteName: 'sonotas',
  twitterCard: 'summary_large_image'
})
// The preview image needs an absolute URL, so only a build that knows its address has one.
const site = useSiteUrl()
if (site) {
  useSeoMeta({
    ogImage: `${site}/og.png`,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageAlt: 'sonotas: Guitar Pro tabs to video'
  })
}
</script>

<template>
  <NuxtPage />
</template>

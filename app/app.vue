<script setup>
// The page sets the language, the title and the description (pages/[lang]); these hold for all.
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg?v=2' }
  ]
})
</script>

<template>
  <NuxtPage />
</template>

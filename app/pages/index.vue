<script setup>
import { languages, sourceLanguage } from '~/utils/i18n'

// The bare address sends the browser to its language's page, keeping a shared link's settings
// (?s=) and hash. It runs in <head>, before anything is drawn or Nuxt touches the address. Plain
// text, not a function's source: the server build rewrites browser globals such as navigator.
// Without script, the links below.
const redirect = `(function (langs, source) {
  var asked = navigator.languages || [navigator.language], pick = source
  for (var i = 0; i < asked.length && pick === source; i++) {
    var tag = String(asked[i]), base = tag.split('-')[0]
    if (langs.indexOf(tag) >= 0) pick = tag
    else if (langs.indexOf(base) >= 0) pick = base
  }
  location.replace('/' + pick + '/' + location.search + location.hash)
})(${JSON.stringify(languages)}, ${JSON.stringify(sourceLanguage)})`

useHead({ title: 'sonotas', script: [{ innerHTML: redirect }] })
</script>

<template>
  <noscript>
    <ul>
    <li
    v-for="lang in languages"
    :key="lang"
    >
    <a :href="`/${lang}/`">{{ lang }}</a>
    </li>
    </ul>
  </noscript>
</template>

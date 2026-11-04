<script setup>
import { languages, sourceLanguage } from '~/utils/i18n'

// The bare address sends the browser to its language's page, keeping a shared link's settings
// (?s=) and hash. It runs in <head>, before anything is drawn or Nuxt touches the address. Plain
// text, not a function's source: the server build rewrites browser globals such as navigator.
// Without script, the links below. The first language asked for that the build has wins, so
// en-US before de stays English; Norwegian browsers often ask for no or nn, which read as nb.
const redirect = `(function (langs, source) {
  var asked = navigator.languages || [navigator.language], pick = null
  for (var i = 0; i < asked.length && !pick; i++) {
    var tag = String(asked[i]), base = tag.split('-')[0]
    if (base === 'no' || base === 'nn') base = 'nb'
    if (langs.indexOf(tag) >= 0) pick = tag
    else if (langs.indexOf(base) >= 0) pick = base
  }
  location.replace('/' + (pick || source) + '/' + location.search + location.hash)
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

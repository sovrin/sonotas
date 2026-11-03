// sonotas' texts, from linguitas: committed in app/linguitas, so they work offline and without
// nexitas; new ones come with the next build. Each language is its own prerendered page (/en/,
// /de/), so the language comes from the address.
import * as client from '~/linguitas/client.js'
import texts from '~/linguitas/texts.json'

client.start(texts)
// Bumped whenever the language changes, so what t() rendered renders again.
const revision = ref(0)
client.subscribe(() => revision.value++)

/** The languages this build has a page for, the source first. */
export const languages = [texts.source, ...Object.keys(texts.texts).filter(l => l !== texts.source)]
export const sourceLanguage = texts.source

export const t: typeof client.t = (key, ...params) => {
  void revision.value
  return client.t(key, ...params)
}

/** Switches the texts to the page's language, before it renders. */
export function setLanguage(lang: string) {
  if (client.getLocale() !== lang) client.setLocale(lang)
}
